// controller/main.js (ES module)
import * as listMode from './Modes/list.js';
import * as wheelMode from './Modes/wheel.js';
import * as slotsMode from './Modes/slots.js'; // stub for now

// ===================== Constants / utils =====================
const KEY='controller_state_v2';
const LEFT_KEY='controller_left_width_px';
const THEME_KEY='controller_theme';
const BINDS_KEY='controller_binds_v1';

const DEFAULT_STATE = {
  title:'Challenge',
  items:['Pistol','SMG','Shotgun','AR','Sniper'],
  mode:'list',                 // 'list' | 'wheel' | 'slots'
  progressive:false,
  orientation:'horizontal',
  align:'center',
  scale:1,
  insets:'36,48,36,48',
  current:0,
  done:[],
  slots: { duration: 2.5, legends: [], weapons: [] } // ready for later
};

const DEFAULT_BINDS = {
  next:  ['Enter','Space'],
  prev:  ['Backspace','ArrowLeft'],
  toggle:['KeyD'],
  reset: ['KeyR'],
};

const WHEEL_VEL = 0.24;
const WHEEL_FRICTION = 0.985;

const clamp = (v,a,b)=>Math.min(b,Math.max(a,v));
const debounce = (fn,ms=120)=>{ let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args),ms); }; };
const safeParse = j => { try { return JSON.parse(j); } catch { return null; } };

// ===================== DOM =====================
const $ = (sel)=>document.querySelector(sel);
const el = {
  tabs: {
    list: $('#tab-list'), wheel: $('#tab-wheel'), slots: $('#tab-slots'), settings: $('#tab-settings')
  },
  panels: {
    list: $('#panel-list'), wheel: $('#panel-wheel'), slots: $('#panel-slots'), settings: $('#panel-settings')
  },
  themeToggle: $('#themeToggle'),
  status: $('#status'), wsUrl: $('#wsUrl'), channel: $('#channel'),
  kbNext: $('#kb-next'), kbPrev: $('#kb-prev'), kbToggle: $('#kb-toggle'), kbReset: $('#kb-reset'),
  previewCard: $('#previewCard'), previewTitle: $('#previewTitle'), previewEmbed: $('#previewEmbed'), previewStage: $('#previewStage'), overlayPreview: $('#overlayPreview'),
  divider: $('#divider'), left: document.querySelector('.left')
};

// ===================== Load persisted =====================
const saved = safeParse(localStorage.getItem(KEY)) || {};
const state = Object.assign({}, DEFAULT_STATE, saved);
let wsUrlVal = saved.wsUrl || 'ws://127.0.0.1:17311';
let channelVal = saved.channel || 'obs_challenge_overlay';
const binds = safeParse(localStorage.getItem(BINDS_KEY)) || DEFAULT_BINDS;

// ===================== Theme =====================
function applyTheme(t){ document.documentElement.setAttribute('data-theme', t); localStorage.setItem(THEME_KEY, t); }
applyTheme(localStorage.getItem(THEME_KEY) || 'dark');
el.themeToggle.addEventListener('click', ()=>{
  const cur=document.documentElement.getAttribute('data-theme')||'dark';
  applyTheme(cur==='dark'?'light':'dark');
});

// ===================== Persist / Preview =====================
function persist(){ localStorage.setItem(KEY, JSON.stringify({...state, wsUrl:wsUrlVal, channel:channelVal})); }
const persistDebounced = debounce(persist, 100);

function renderPreview(){
  el.previewTitle.textContent = state.title || '';
  el.previewTitle.style.display = state.title ? 'inline-block' : 'none';
  el.previewCard.classList.toggle('pvProgressive', !!state.progressive);
}

function fitPreview(){
  const BASE_W=1280, BASE_H=720;
  const rect=el.previewEmbed.getBoundingClientRect();
  const scale=Math.max(0.1, Math.min(rect.width/BASE_W, rect.height/BASE_H));
  el.previewStage.style.setProperty('--pvScale', scale);
}
new ResizeObserver(fitPreview).observe(el.previewEmbed);
window.addEventListener('resize', fitPreview);

// ===================== Divider drag =====================
(function restoreLeftWidth(){
  const savedW=parseInt(localStorage.getItem(LEFT_KEY),10);
  if(!isNaN(savedW)){ document.documentElement.style.setProperty('--leftWidth', savedW+'px'); }
})();
let dragging=false, startX=0, startWidth=0;
el.divider.addEventListener('mousedown', (e)=>{
  dragging=true; startX=e.clientX; startWidth=el.left.getBoundingClientRect().width;
  document.body.style.cursor='col-resize';
  const mm = (ev)=>{
    if(!dragging) return;
    const dx=ev.clientX-startX;
    const newW=clamp(startWidth+dx, 360, 980);
    document.documentElement.style.setProperty('--leftWidth', newW+'px');
    localStorage.setItem(LEFT_KEY, String(newW));
    fitPreview();
  };
  const mu = ()=>{
    dragging=false; document.body.style.cursor='';
    document.removeEventListener('mousemove', mm);
    document.removeEventListener('mouseup', mu);
  };
  document.addEventListener('mousemove', mm);
  document.addEventListener('mouseup', mu);
});

// ===================== Tabs =====================
let activeTab = 'list';
function showTab(tab){
  activeTab = tab;
  // update aria-selected and visibility
  Object.entries(el.tabs).forEach(([k,btn])=>{
    if (!btn) return;
    const on = (k===tab);
    btn.setAttribute('aria-selected', on?'true':'false');
    el.panels[k]?.toggleAttribute('hidden', !on);
  });
  // notify modes about visibility so they can lazy-init UI
  modes[tab]?.show();
}
Object.values(el.tabs).forEach(btn=>{
  btn?.addEventListener('click', ()=> showTab(btn.dataset.tab));
});

// ===================== Server / WS =====================
let ws=null, backoff=800;
function setStatus(s){ el.status && (el.status.textContent=s); }

function wsSend(obj){ try { if (ws && ws.readyState===1) ws.send(JSON.stringify(obj)); } catch {} }
const sendState = debounce(()=>wsSend({type:'state',channel:channelVal,payload:state}), 60);
const sendStateNow = ()=>wsSend({type:'state',channel:channelVal,payload:state});
function sendCmd(cmd,payload){ wsSend({type:'cmd',channel:channelVal,cmd,payload}); }

function connect(){
  try{ ws=new WebSocket(wsUrlVal); }catch(e){ setStatus('error'); return; }
  ws.onopen=()=>{ setStatus('connected'); backoff=800; wsSend({type:'register',role:'panel',channel:channelVal}); sendStateNow(); };
  ws.onmessage=(ev)=>{ const msg = safeParse(ev.data); if (msg && msg.type==='request-state') sendStateNow(); };
  ws.onclose = ()=>{ setStatus('disconnected'); setTimeout(connect, backoff); backoff=Math.min(backoff*1.6,5000); };
  ws.onerror = ()=>{ setStatus('error'); try{ws.close();}catch{} };
}

// ===================== Keybinds =====================
function captureInto(inputEl, actionKey) {
  if (!inputEl) return;
  inputEl.addEventListener('focus', () => { inputEl.value = '(press a key)'; });
  inputEl.addEventListener('keydown', (e) => {
    e.preventDefault();
    const code = e.code || e.key;
    binds[actionKey] = [code];
    localStorage.setItem(BINDS_KEY, JSON.stringify(binds));
    inputEl.value = code; inputEl.blur();
  });
}
function handleAction(action, value){
  switch(action){
    case 'next':
      if(state.mode==='wheel'){ const payload={ vel:WHEEL_VEL, friction:WHEEL_FRICTION }; sendCmd('spin', payload); }
      else if(state.mode==='slots'){ sendCmd('slotSpin'); }
      else { sendCmd('next'); }
      break;
    case 'prev': sendCmd('prev'); break;
    case 'toggledone': sendCmd('toggleDone'); break;
    case 'reset': sendStateNow(); break;
    case 'spin':
      if(state.mode==='wheel'){ const payload={ vel:WHEEL_VEL, friction:WHEEL_FRICTION }; sendCmd('spin', payload); }
      else if(state.mode==='slots'){ sendCmd('slotSpin'); }
      break;
    case 'stop':
      if(state.mode==='wheel') sendCmd('stop');
      else if(state.mode==='slots') sendCmd('slotStop');
      break;
    case 'jump': {
      const n = clamp(parseInt(value,10)||1, 1, 9);
      const idx = n - 1;
      sendCmd('goto', idx);
    } break;
  }
}

document.addEventListener('keydown', (e)=>{
  const tag=(e.target.tagName||'').toLowerCase(); if(tag==='input'||tag==='textarea') return;
  const code = e.code || e.key;
  if ((binds.next||[]).includes(code))   { e.preventDefault(); return handleAction('next'); }
  if ((binds.prev||[]).includes(code))   { e.preventDefault(); return handleAction('prev'); }
  if ((binds.toggle||[]).includes(code)) { e.preventDefault(); return handleAction('toggledone'); }
  if ((binds.reset||[]).includes(code))  { e.preventDefault(); return handleAction('reset'); }
  if (code==='KeyH'){ state.orientation='horizontal'; persistDebounced(); renderPreview(); sendState(); }
  else if (code==='KeyV'){ state.orientation='vertical'; persistDebounced(); renderPreview(); sendState(); }
  if (/^Digit[1-9]$/.test(code)) { e.preventDefault(); return handleAction('jump', code.replace('Digit','')); }
});

// Wire Settings tab fields
if (el.wsUrl) el.wsUrl.value = wsUrlVal;
if (el.channel) el.channel.value = channelVal;
el.wsUrl?.addEventListener('change', ()=>{ wsUrlVal=el.wsUrl.value.trim(); persist(); try{ws&&ws.close();}catch{} connect(); updatePreviewSrc(); });
el.channel?.addEventListener('change', ()=>{ channelVal=el.channel.value.trim()||'obs_challenge_overlay'; persist(); try{ws&&ws.close();}catch{} connect(); updatePreviewSrc(); });

if (el.kbNext){  captureInto(el.kbNext,'next');   el.kbNext.value  = (binds.next  ||DEFAULT_BINDS.next).join(', '); }
if (el.kbPrev){  captureInto(el.kbPrev,'prev');   el.kbPrev.value  = (binds.prev  ||DEFAULT_BINDS.prev).join(', '); }
if (el.kbToggle){captureInto(el.kbToggle,'toggle');el.kbToggle.value= (binds.toggle||DEFAULT_BINDS.toggle).join(', '); }
if (el.kbReset){ captureInto(el.kbReset,'reset'); el.kbReset.value = (binds.reset ||DEFAULT_BINDS.reset).join(', '); }

// ===================== Overlay preview =====================
function overlayUrl(){
  const params=new URLSearchParams({ ws: wsUrlVal, channel: channelVal, frame: '1', mute: '1', insets: state.insets||'36,48,36,48' });
  return `/overlay.html?${params.toString()}`; // served by the same server
}
function updatePreviewSrc(){ el.overlayPreview.src = overlayUrl(); }

// ===================== Modes registry =====================
const ctx = {
  root: el.panels,
  state,
  renderPreview,
  persist: persistDebounced,
  sendCmd,
  sendState,
  setMode: (m)=>{ state.mode=m; persistDebounced(); renderPreview(); sendState(); },
};

const modes = {
  list:  listMode.init(ctx),
  wheel: wheelMode.init(ctx),
  slots: slotsMode.init(ctx), // stub now
};

// ===================== Init =====================
renderPreview();
connect();
updatePreviewSrc();
fitPreview();
showTab(activeTab);