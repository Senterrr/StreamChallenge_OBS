// ESM server: HTTP (static + /slots-manifest) + WebSocket relay
// Requires: "type": "module" in ws-server/package.json

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';

// Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 17311);

// In-memory channel map: channel -> { overlays:Set, panels:Set }
const channels = new Map();
function bucketFor(channel) {
  if (!channels.has(channel)) {
    channels.set(channel, { overlays: new Set(), panels: new Set() });
  }
  return channels.get(channel);
}

// Static roots
const ROOT        = path.resolve(__dirname, '..'); // repo root
const ASSETS      = path.join(ROOT, 'Assets');

const IMG_EXTS = new Set(['.png', '.svg', '.jpg', '.jpeg', '.webp', '.gif']);

function fileNameToNice(fileBase) {
  let name = fileBase.replace(/\.[^.]+$/, '');
  name = name.replace(/[_-]?(mobile|icon)(?:[_-]|$)/gi, ' ');
  name = name.replace(/[_-]+/g, ' ');
  name = name.replace(/\s+/g, ' ').trim();
  return name
    .split(' ')
    .map(w => (w ? w[0].toUpperCase() + w.slice(1) : ''))
    .join(' ');
}

function listDir(dirAbs, webRelPrefix) {
  try {
    const files = fs.readdirSync(dirAbs, { withFileTypes: true });
    return files
      .filter(d => d.isFile() && IMG_EXTS.has(path.extname(d.name).toLowerCase()))
      .map(d => ({
        name: fileNameToNice(d.name),
        // Root-relative so it works from /controller/* and /overlay.html
        src: '/' + path.posix.join(webRelPrefix, d.name).replace(/^\/+/, ''),
        enabled: true,
      }));
  } catch {
    return [];
  }
}

function listSubdirs(dirAbs){
  try {
    return fs.readdirSync(dirAbs, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
  } catch { return []; }
}

function discoverGames(){
  const names = listSubdirs(ASSETS);
  return names.map(id => ({ id, name: fileNameToNice(id) }));
}

// Given a gameId (folder under Assets), find character/weapon folders by heuristics
function getGameCategoryDirs(gameId){
  const gameRoot = path.join(ASSETS, gameId);
  const subs = listSubdirs(gameRoot);
  const low = subs.map(s => s.toLowerCase());
  const pick = (preds)=> subs.filter((n,i)=> preds.some(p=> low[i].includes(p)) ).map(n=> path.join(gameRoot, n));
  const charPreds = ['character','characters','legend','legends','agent','agents','hero','heroes','operator','operators','champion','champions'];
  const weapPreds = ['weapon','weapons','gun','guns','rifle','rifles','smg','shotgun','lmg','pistol','sniper','melee','bow'];
  const charDirs = pick(charPreds);
  const weapDirs = pick(weapPreds);
  return { gameRoot, charDirs, weapDirs };
}

function buildManifestForGame(gameId){
  const games = discoverGames();
  const ids = new Set(games.map(g=>g.id));
  let chosen = gameId && ids.has(gameId) ? gameId : null;
  if (!chosen){
    // prefer ApexLegends if present, else first
    if (ids.has('ApexLegends')) chosen = 'ApexLegends';
    else chosen = games[0]?.id || '';
  }
  if (!chosen) return { legends: [], weapons: [], game: null };
  const { charDirs, weapDirs } = getGameCategoryDirs(chosen);
  const legends = charDirs.flatMap(dir => listDir(dir, path.posix.join('Assets', chosen, path.basename(dir))));
  const weapons = weapDirs.flatMap(dir => listDir(dir, path.posix.join('Assets', chosen, path.basename(dir))));
  return { legends, weapons, game: chosen };
}

// ---------- HTTP server ----------
const server = http.createServer((req, res) => {
  // CORS (so controller/overlay from OBS/file:// can hit this)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  // ----- Available games
  if ((req.url || '').split('?')[0] === '/slots-games') {
    const games = discoverGames();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ games }));
    return;
  }

  // ----- Slots manifest (supports ?game=<id>)
  if ((req.url || '').split('?')[0] === '/slots-manifest') {
    const fullUrl = new URL(req.url, `http://${HOST}:${PORT}`);
    const game = fullUrl.searchParams.get('game');
    const { legends, weapons, game: chosen } = buildManifestForGame(game);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ legends, weapons, game: chosen }));
    return;
  }

    if (req.url && req.url.startsWith('/trigger')) {
    (async () => {
      try {
        let body = '';
        if (req.method === 'POST') {
          for await (const chunk of req) body += chunk;
        }

        const fullUrl = new URL(req.url, `http://${HOST}:${PORT}`);
        const params = fullUrl.searchParams;
        const channel = params.get('channel') || 'obs_challenge_overlay';
        const cmd = params.get('cmd') || null;

        let payload = null;
        // prefer POST JSON body
        if (body) {
          try { payload = JSON.parse(body); } catch { payload = null; }
        } else if (params.has('payload')) {
          try { payload = JSON.parse(decodeURIComponent(params.get('payload'))); } catch { payload = null; }
        }

        if (!cmd) {
          res.writeHead(400, {'Content-Type':'application/json; charset=utf-8'});
          return res.end(JSON.stringify({ error: 'missing cmd parameter' }));
        }

        const b = bucketFor(channel);
        const message = JSON.stringify({ type: 'cmd', channel, cmd, payload });

        // send to overlays subscribed to that channel
        b.overlays.forEach(sock => { if (sock.readyState === 1) sock.send(message); });

        res.writeHead(200, {'Content-Type':'application/json; charset=utf-8'});
        return res.end(JSON.stringify({ ok: true, channel, cmd }));
      } catch (err) {
        res.writeHead(500, {'Content-Type':'application/json; charset=utf-8'});
        return res.end(JSON.stringify({ error: 'server error' }));
      }
    })();
    return;
  }

  // Duplicate route guard (kept for safety if earlier block was missed)
  if ((req.url || '').split('?')[0] === '/slots-manifest') {
    const fullUrl = new URL(req.url, `http://${HOST}:${PORT}`);
    const game = fullUrl.searchParams.get('game');
    const { legends, weapons, game: chosen } = buildManifestForGame(game);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ legends, weapons, game: chosen }));
    return;
  }

  // ----- Static serving
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const safePath = path
    .normalize(urlPath)
    .replace(/^(\.\.[/\\])+/g, '') // strip leading ../
    .replace(/^\/+/, '');          // strip leading slash

  let filePath = path.join(ROOT, safePath || 'index.html');

  // If path is a directory, try common entry files (prefer controller.html for /controller/)
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    const candidates = ['controller.html', 'index.html'];
    for (const cand of candidates) {
      const p = path.join(filePath, cand);
      if (fs.existsSync(p) && fs.statSync(p).isFile()) { filePath = p; break; }
    }
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mime =
      ext === '.html' ? 'text/html; charset=utf-8' :
      ext === '.css'  ? 'text/css; charset=utf-8' :
      ext === '.js'   ? 'application/javascript; charset=utf-8' :
      ext === '.svg'  ? 'image/svg+xml' :
      ext === '.png'  ? 'image/png' :
      ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
      ext === '.webp' ? 'image/webp' :
      ext === '.gif'  ? 'image/gif' :
      'application/octet-stream';

    res.writeHead(200, { 'Content-Type': mime });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'not found' }));
});

// ---------- WebSocket relay ----------
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  let role = null, channel = null;

  ws.on('message', (buf) => {
    let msg; try { msg = JSON.parse(String(buf)); } catch { return; }

    if (msg.type === 'register') {
      role = String(msg.role || '');
      channel = String(msg.channel || 'obs_challenge_overlay');
      const b = bucketFor(channel);
      (role === 'overlay' ? b.overlays : b.panels).add(ws);
      ws.on('close', () => { const bb = bucketFor(channel); bb.overlays.delete(ws); bb.panels.delete(ws); });
      return;
    }

    if (msg.type === 'state' && channel) {
      const b = bucketFor(channel);
      const payload = JSON.stringify({ type:'state', channel, payload: msg.payload });
      b.overlays.forEach(sock => { if (sock.readyState === 1) sock.send(payload); });
      return;
    }

    if (msg.type === 'cmd' && channel) {
      const b = bucketFor(channel);
      const payload = JSON.stringify({ type:'cmd', channel, cmd: msg.cmd, payload: msg.payload });
      b.overlays.forEach(sock => { if (sock.readyState === 1) sock.send(payload); });
      return;
    }
        // Overlay -> Panels: generic events (results, etc.)
    if (msg.type === 'event' && channel) {
      const b = bucketFor(channel);
      const payload = JSON.stringify({ type: 'event', channel, event: msg.event, payload: msg.payload });
      b.panels.forEach(sock => { if (sock.readyState === 1) sock.send(payload); });
      return;
    }

    // msg.type === 'request-state' → no-op; panels push state proactively
  });
});

server.listen(PORT, HOST, () => {
  console.log(`WS+HTTP listening at http://${HOST}:${PORT}`);
  console.log(`Slots manifest: http://${HOST}:${PORT}/slots-manifest`);
});
