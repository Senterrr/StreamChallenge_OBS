// controller/modes/slots.js
const MANIFEST_URL = '/slots-manifest';

export function init(ctx){
  const { root, state, setMode, persist, sendState, sendCmd } = ctx;
  const panel = root.slots;
  let wired = false;

  function html(){
    return `
      <div class="title">Slots Mode (Apex)</div>

      <div class="card" style="margin-bottom:12px">
        <div class="field" style="flex-wrap:wrap; gap:10px">
          <label>Spin Duration (s)</label>
          <input id="sl-duration" class="input" type="number" step="0.1" min="0.5" max="10" value="2.5">

          <label>Reel Stagger (s)</label>
          <input id="sl-stagger"  class="input" type="number" step="0.1" min="0" max="5" value="0.5">

          <label style="display:inline-flex; align-items:center; gap:8px; margin-left:auto">
            <input id="sl-invert" type="checkbox"> Invert images
          </label>

          <button class="toolbtn" id="sl-rescan">Rescan Folders</button>
          <button class="toolbtn" id="sl-spin">Spin</button>
          <button class="toolbtn" id="sl-stop">Stop</button>
        </div>
        <div class="hint">Reels stop with a short stagger; “Reel Stagger” sets the delay between Reel 1 → 2 → 3.</div>
      </div>

      <div class="card" style="margin-bottom:12px">
        <div class="field" style="flex-direction:column; align-items:stretch; gap:8px">
          <label class="hint">Legends — click to include/exclude</label>
          <div id="sl-legends" class="grid"></div>
        </div>
      </div>

      <div class="card">
        <div class="field" style="flex-direction:column; align-items:stretch; gap:8px">
          <label class="hint">Weapons — click to include/exclude</label>
          <div id="sl-weapons" class="grid"></div>
        </div>
      </div>
    `;
  }

  function ensureSlotsState(){
    if (!state.slots) state.slots = { duration: 2.5, stagger: 0.5, invert: false, legends: [], weapons: [] };
    if (typeof state.slots.duration !== 'number') state.slots.duration = 2.5;
    if (typeof state.slots.stagger  !== 'number') state.slots.stagger  = 0.5;
    if (typeof state.slots.invert   !== 'boolean') state.slots.invert   = false;
    if (!Array.isArray(state.slots.legends)) state.slots.legends = [];
    if (!Array.isArray(state.slots.weapons)) state.slots.weapons = [];
  }

  async function fetchIntoState(){
    try{
      const r = await fetch(MANIFEST_URL, { cache:'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      state.slots.legends = j.legends || [];
      state.slots.weapons = j.weapons || [];
      persist(); sendState();
    }catch(e){
      console.warn('Slots manifest load failed', e);
    }
  }
  async function loadManifestIfEmpty(){
    ensureSlotsState();
    if (state.slots.legends.length && state.slots.weapons.length) return;
    await fetchIntoState();
  }

  function fileNameToNice(src){
    const base = src.split('/').pop().replace(/\.[^.]+$/,'');
    const cleaned = base.replace(/[_-]?(mobile|icon)(?:[_-]|$)/gi,' ').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim();
    return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : '';
  }

  function renderGrid(container, list){
    container.innerHTML = list.map((it,idx)=>{
      const nm  = it.name || fileNameToNice(it.src);
      const off = it.enabled === false ? 'off' : '';
      const src = it?.src?.startsWith('/') ? it.src : '/' + (it.src||'').replace(/^\/+/, '');
      return `<div class="it ${off}" data-idx="${idx}">
        <img src="${src}" alt="${nm}"><div class="nm">${nm}</div>
      </div>`;
    }).join('');
    container.querySelectorAll('.it').forEach(node=>{
      node.addEventListener('click', ()=>{
        const i = Number(node.dataset.idx);
        list[i].enabled = !list[i].enabled;
        node.classList.toggle('off', !list[i].enabled);
        persist(); sendState();
      });
    });
  }

  async function rescanAndRender(slLegends, slWeapons){
    state.slots.legends = [];
    state.slots.weapons = [];
    persist();
    await fetchIntoState();
    renderGrid(slLegends, state.slots.legends);
    renderGrid(slWeapons, state.slots.weapons);
    sendState();
  }

  function wire(){
    if (wired) return; wired = true;
    panel.innerHTML = html();

    const $ = (id)=>panel.querySelector(id);
    const slDuration = $('#sl-duration');
    const slStagger  = $('#sl-stagger');
    const slInvert   = $('#sl-invert');
    const slRescan   = $('#sl-rescan');
    const slSpin     = $('#sl-spin');
    const slStop     = $('#sl-stop');
    const slLegends  = $('#sl-legends');
    const slWeapons  = $('#sl-weapons');

    ensureSlotsState();
    slDuration.value = state.slots.duration;
    slStagger.value  = state.slots.stagger;
    slInvert.checked = !!state.slots.invert;

    // events
    slDuration.addEventListener('change', ()=>{
      const v = parseFloat(slDuration.value);
      state.slots.duration = Number.isFinite(v) ? Math.max(0.3, Math.min(15, v)) : 2.5;
      slDuration.value = state.slots.duration;
      persist(); sendState();
    });
    slStagger.addEventListener('change', ()=>{
      const v = parseFloat(slStagger.value);
      state.slots.stagger = Number.isFinite(v) ? Math.max(0, Math.min(5, v)) : 0.5;
      slStagger.value = state.slots.stagger;
      persist(); sendState();
    });
    slInvert.addEventListener('change', ()=>{
      state.slots.invert = !!slInvert.checked;
      persist(); sendState();
    });

    slRescan.addEventListener('click', ()=> rescanAndRender(slLegends, slWeapons));
    slSpin.addEventListener('click', ()=> sendCmd('slotSpin'));
    slStop.addEventListener('click', ()=> sendCmd('slotStop'));

    // initial render
    (async () => {
      await loadManifestIfEmpty();
      renderGrid(slLegends, state.slots.legends);
      renderGrid(slWeapons, state.slots.weapons);
    })();

    // store for auto-rescan on tab show
    panel._slotsRescan = () => rescanAndRender(slLegends, slWeapons);
  }

  return {
    show(){
      if (state.mode !== 'slots') setMode('slots');
      wire();
      // auto-rescan whenever Slots tab is selected
      if (typeof panel._slotsRescan === 'function') panel._slotsRescan();
    }
  };
}
