// WebSocket relay with state + command routing
// Run: node server.js  (requires: npm i ws)

import { WebSocketServer } from 'ws';

const PORT = process.env.PORT ? Number(process.env.PORT) : 17311;
const wss = new WebSocketServer({ port: PORT });

// channel -> { overlays:Set<ws>, panels:Set<ws> }
const chans = new Map();
const meta = new WeakMap(); // ws -> {channel, role}

function ensureChan(name){ if(!chans.has(name)) chans.set(name,{overlays:new Set(), panels:new Set()}); return chans.get(name); }
function join(ws, channel, role){
  const c = ensureChan(channel);
  meta.set(ws,{channel, role});
  (role==='panel'? c.panels : c.overlays).add(ws);
}
function leave(ws){ const m = meta.get(ws); if(!m) return; const c = chans.get(m.channel); if(c){ (m.role==='panel'? c.panels : c.overlays).delete(ws); if(!c.overlays.size && !c.panels.size) chans.delete(m.channel); } meta.delete(ws); }
function toOverlays(channel, msg){ const c=chans.get(channel); if(!c) return; for(const ws of c.overlays) if(ws.readyState===1) ws.send(JSON.stringify(msg)); }
function toPanels(channel, msg){ const c=chans.get(channel); if(!c) return; for(const ws of c.panels) if(ws.readyState===1) ws.send(JSON.stringify(msg)); }

wss.on('connection', (ws)=>{
  ws.on('message', data=>{
    let msg; try{ msg = JSON.parse(String(data)); }catch{ return; }
    if(msg.type==='register'){
      const role = msg.role==='panel' ? 'panel' : 'overlay';
      const channel = msg.channel || 'obs_challenge_overlay';
      join(ws, channel, role); return;
    }
    // Commands from panel -> overlays
    if(msg.type==='cmd'){
      const channel = msg.channel || meta.get(ws)?.channel || 'obs_challenge_overlay';
      toOverlays(channel, {type:'cmd', cmd:msg.cmd, payload:msg.payload}); return;
    }
    // State from panel -> overlays
    if(msg.type==='state'){
      const channel = msg.channel || meta.get(ws)?.channel || 'obs_challenge_overlay';
      toOverlays(channel, {type:'state', payload:msg.payload}); return;
    }
    // Overlays may request initial state -> forward to panels
    if(msg.type==='request-state'){
      const channel = msg.channel || meta.get(ws)?.channel || 'obs_challenge_overlay';
      toPanels(channel, {type:'request-state'}); return;
    }
  });
  ws.on('close', ()=> leave(ws));
  ws.on('error', ()=> leave(ws));
});

console.log(`[relay] listening on ws://127.0.0.1:${PORT}`);
