// ws-server/server.js
import http from 'http';
import { WebSocketServer } from 'ws';
import url from 'url';

const PORT = 17311;
const clientsByChannel = new Map(); // channel => Set<WebSocket>

function broadcastAction(channel, msgObj) {
  const set = clientsByChannel.get(channel);
  if (!set) return;
  const payload = JSON.stringify(msgObj);
  for (const ws of set) {
    if (ws.readyState === ws.OPEN) ws.send(payload);
  }
}

// 1) Single HTTP+WS server (so firewall allows one thing)
const server = http.createServer(async (req, res) => {
  const { pathname, query } = url.parse(req.url, true);

  // Health check
  if (pathname === '/health') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    return res.end('ok');
  }

  // Simple GET trigger (easy for Stream Deck “Open URL” or curl)
  // Example: http://127.0.0.1:17311/trigger?channel=obs_challenge_overlay&action=next
  if (pathname === '/trigger' && req.method === 'GET') {
    const channel = query.channel || 'obs_challenge_overlay';
    const action  = (query.action || '').toLowerCase();
    const value   = query.value; // optional (e.g., jump index)
    if (!action) {
      res.writeHead(400); return res.end('missing action');
    }
    broadcastAction(channel, { type: 'remoteAction', action, value });
    res.writeHead(204); return res.end();
  }

  // JSON POST trigger: {channel, action, value}
  if (pathname === '/trigger' && req.method === 'POST') {
    let body = '';
    req.on('data', c => (body += c));
    req.on('end', () => {
      try {
        const { channel = 'obs_challenge_overlay', action, value } = JSON.parse(body || '{}');
        if (!action) { res.writeHead(400); return res.end('missing action'); }
        broadcastAction(channel, { type: 'remoteAction', action: String(action).toLowerCase(), value });
        res.writeHead(204); res.end();
      } catch {
        res.writeHead(400); res.end('bad json');
      }
    });
    return;
  }

  // Fallback
  res.writeHead(404); res.end('not found');
});

// 2) WebSocket relay
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  let channel = null; // assigned after first message

  ws.on('message', (buf) => {
    let msg = null;
    try { msg = JSON.parse(buf.toString()); } catch { return; }

    // Accept legacy 'register' or newer 'hello'
    if ((msg.type === 'register' || msg.type === 'hello') && msg.channel) {
      channel = msg.channel;
      if (!clientsByChannel.has(channel)) clientsByChannel.set(channel, new Set());
      clientsByChannel.get(channel).add(ws);
      ws.send(JSON.stringify({ type: 'hello-ack', channel }));
      return;
    }

    // Forward important channel messages
    if (channel && (
        msg.type === 'state' ||
        msg.type === 'cmd' ||
        msg.type === 'request-state' ||
        msg.type === 'remoteAction'
      )) {
      broadcastAction(channel, msg);
    }
  });

  ws.on('close', () => {
    if (channel && clientsByChannel.has(channel)) {
      clientsByChannel.get(channel).delete(ws);
      if (clientsByChannel.get(channel).size === 0) clientsByChannel.delete(channel);
    }
  });
});


server.listen(PORT, '127.0.0.1', () => {
  console.log(`[relay] listening on http/ws://127.0.0.1:${PORT}`);
});
