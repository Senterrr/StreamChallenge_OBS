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
const APEXLEGENDS = path.join(ASSETS, 'ApexLegends');
const CHAR_DIR    = path.join(APEXLEGENDS, 'characters');
const WEAP_DIR    = path.join(APEXLEGENDS, 'weapons');

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

// ---------- HTTP server ----------
const server = http.createServer((req, res) => {
  // CORS (so controller/overlay from OBS/file:// can hit this)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  // ----- Slots manifest (NOW inside the handler)
  if (req.url === '/slots-manifest') {
    const legends = listDir(CHAR_DIR, 'Assets/ApexLegends/characters');
    const weapons = listDir(WEAP_DIR, 'Assets/ApexLegends/weapons');
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ legends, weapons }));
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
    // msg.type === 'request-state' → no-op; panels push state proactively
  });
});

server.listen(PORT, HOST, () => {
  console.log(`WS+HTTP listening at http://${HOST}:${PORT}`);
  console.log(`Slots manifest: http://${HOST}:${PORT}/slots-manifest`);
});
