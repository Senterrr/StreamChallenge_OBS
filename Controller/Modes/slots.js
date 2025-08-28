// controller/modes/slots.js
// Apex Slots: Legend • Weapon • Weapon
const MANIFEST_URL = '/slots-manifest';

export function init(ctx){
  const { root, state, setMode, persist, sendState, sendCmd } = ctx;
  const panel = root.slots;
  let wired = false;

  function html(){
    return `
      <div class="title">Slots Mode (Apex)</div>

      <div class="card" style="margin-bottom:12px">
        <div class="field">
          <label>Spin Duration (s)</label>
          <input id="sl-duration" class="input" type="number" step="0.1" min="0.5" max="10" value="2.5">
          <button class="toolbtn" id="sl-rescan" style="margin-left:8px">Rescan Folders</button>
          <button class="toolbtn" id="sl-spin" style="margin-left:auto">Spin</button>
          <button class="toolbtn" id="sl-stop">Stop</button>
        </div>
        <div class="hint">Reels stop with a short stagger. Duration controls when the first reel stops.</div>
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
    if (!state.slots) state.slots = { duration: 2.5, legends: [], weapons: [] };
    if (typeof state.slots.duration !== 'number') state.slots.duration = 2.5;
    if (!Array.isArray(state.slots.legends)) state.slots.legends = [];
    if (!Array.isArray(state.slots.weapons)) state.slots.weapons = [];
  }

  async function loadManifestIfEmpty(){
    ensureSlotsState();
    if (state.slots.legends.length && state.slots.weapons.length) return; // already loaded/remembered
    try{
      const r = await fetch(MANIFEST_URL, { cache:'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      // Only set if user hasn't got lists yet (don't wipe toggles)
      if (!state.slots.legends.length) state.slots.legends = j.legends || [];
      if (!state.slots.weapons.length) state.slots.weapons = j.weapons || [];
      persist(); sendState();
    }catch(e){
      console.warn('Slots manifest load failed', e);
    }
  }

  function fileNameToNice(src){
    const base = src.split('/').pop().replace(/\.[^.]+$/,'');
    const cleaned = base.replace(/[_-]?(mobile|icon)(?:[_-]|$)/gi,' ').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim();
    return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : '';
  }

  function renderGrid(container, list){
    container.innerHTML = list.map((it,idx)=>{
      const nm = it.name || fileNameToNice(it.src);
      const off = it.enabled === false ? 'off' : '';
      return `<div class="it ${off}" data-idx="${idx}">
        <img src="${it.src}" alt="${nm}"><div class="nm">${nm}</div>
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

  function wire(){
    if (wired) return; wired = true;
    panel.innerHTML = html();

    const $ = (id)=>panel.querySelector(id);
    const slDuration = $('#sl-duration');
    const slRescan   = $('#sl-rescan');
    const slSpin     = $('#sl-spin');
    const slStop     = $('#sl-stop');
    const slLegends  = $('#sl-legends');
    const slWeapons  = $('#sl-weapons');

    ensureSlotsState();
    slDuration.value = state.slots.duration;

    // events
    slDuration.addEventListener('change', ()=>{
      const v = parseFloat(slDuration.value);
      state.slots.duration = Number.isFinite(v) ? Math.max(0.5, Math.min(10, v)) : 2.5;
      slDuration.value = state.slots.duration;
      persist(); sendState();
    });
    slRescan.addEventListener('click', async ()=>{
      // clear then load fresh
      state.slots.legends = []; state.slots.weapons = [];
      persist(); await loadManifestIfEmpty(); // repopulate
      renderGrid(slLegends, state.slots.legends);
      renderGrid(slWeapons, state.slots.weapons);
      sendState();
    });
    slSpin.addEventListener('click', ()=> sendCmd('slotSpin'));
    slStop.addEventListener('click', ()=> sendCmd('slotStop'));

    // initial render
    (async () => {
      await loadManifestIfEmpty();
      renderGrid(slLegends, state.slots.legends);
      renderGrid(slWeapons, state.slots.weapons);
    })();
  }

  return {
    show(){
      if (state.mode !== 'slots') setMode('slots');
      wire();
    }
  };
}
