// controller/modes/slots.js
const MANIFEST_URL = '/slots-manifest';

export function init(ctx){
  const { root, state, setMode, persist, sendState, sendCmd } = ctx;
  const panel = root.slots;
  let wired = false;

  function html(){
    return `
      <div class="title">Slots Mode (Apex)</div>
      <div class="desc" style="margin-bottom:12px">
        <div class="field" style="flex-direction:column; align-items:stretch; gap:6px">
          <button class="toolbtn" id="sl-weapons-only">Weapons Only</button>
          <button class="toolbtn" id="sl-character-only">Character Only</button>
          <button class="toolbtn" id="sl-include-all">Include All</button>
        </div>
      </div>
      <div class="card" style="margin-bottom:12px">
        <div class="field" style="flex-wrap:wrap; gap:10px">
          <label for="sl-style">Style</label>
          <select id="sl-style" class="select">
            <option value="classic">Classic (Purple/Cyan)</option>
            <option value="neon">Neon (Pink/Teal)</option>
            <option value="gold">Gold (Warm)</option>
            <option value="cyber">Cyber (Blue/Cyan)</option>
            <option value="crimson">Crimson (Red/Orange)</option>
          </select>
          <div class="hint">Live color preset for the slots overlay.</div>
        </div>
      </div>
      <div class="card" style="margin-bottom:12px">
        <div class="field" style="flex-wrap:wrap; gap:10px">
          <label for="sl-frame">Frame</label>
          <select id="sl-frame" class="select">
            <option value="rounded">Rounded</option>
            <option value="square">Square</option>
            <option value="pill">Pill</option>
            <option value="cut">Cut Corners</option>
          </select>
          <div class="hint">Shape of the reel frame. Useful for different overlay aesthetics.</div>
        </div>
      </div>
      <div class="card" style="margin-bottom:12px">
        <div class="field" style="flex-wrap:wrap; gap:10px">
          <label for="sl-framefx">Frame FX</label>
          <select id="sl-framefx" class="select">
            <option value="standard">Standard</option>
            <option value="nohighlight">No Highlight Bar</option>
            <option value="curved">Curved Glass</option>
            <option value="tilt">Tilted</option>
            <option value="minimal">Minimal</option>
            <option value="glow">Strong Glow</option>
          </select>
          <div class="hint">Aggressive presentation tweaks (hide center bar, curved glass, tilt, etc.).</div>
        </div>
      </div>
      <div class="card" style="margin-bottom:12px">
        <div class="field" style="flex-wrap:wrap; gap:12px; align-items:center">
          <label style="display:inline-flex; align-items:center; gap:8px">
            <input type="checkbox" id="sl-sfx" checked> Enable SFX
          </label>
          <label style="display:inline-flex; align-items:center; gap:8px">
            <input type="checkbox" id="sl-vfx" checked> Enable VFX
          </label>
          <label for="sl-vignette">Vignette</label>
          <select id="sl-vignette" class="select">
            <option value="off">Off</option>
            <option value="normal">Normal</option>
            <option value="reverse">Reverse</option>
            <option value="both">Both (Normal + Glow)</option>
          </select>
          <div class="hint">Spin-only vignette and effects. Toggle SFX/VFX if needed.</div>
        </div>
      </div>
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
      
      <div class="card" style="margin-top:12px">
        <div class="field" style="flex-direction:column; align-items:stretch; gap:8px">
          <label class="hint">Last 3 spins</label>
          <div id="sl-history"></div>
        </div>
      </div>
    `;
  }

  function ensureSlotsState(){
  if (!state.slots) state.slots = { duration: 2.5, stagger: 0.5, invert: false, legends: [], weapons: [], view: 'all', style: 'classic', frame: 'rounded', frameFx: 'standard', sfx: true, vfx: true, vignette: 'normal' };
    if (typeof state.slots.duration !== 'number') state.slots.duration = 2.5;
    if (typeof state.slots.stagger  !== 'number') state.slots.stagger  = 0.5;
    if (typeof state.slots.invert   !== 'boolean') state.slots.invert   = false;
    if (!Array.isArray(state.slots.legends)) state.slots.legends = [];
    if (!Array.isArray(state.slots.weapons)) state.slots.weapons = [];
    if (typeof state.slots.view !== 'string') state.slots.view = 'all';
    if (typeof state.slots.style !== 'string') state.slots.style = 'classic';
  if (typeof state.slots.frame !== 'string') state.slots.frame = 'rounded';
  if (typeof state.slots.frameFx !== 'string') state.slots.frameFx = 'standard';
  if (typeof state.slots.sfx !== 'boolean') state.slots.sfx = true;
  if (typeof state.slots.vfx !== 'boolean') state.slots.vfx = true;
  if (typeof state.slots.vignette !== 'string') state.slots.vignette = 'normal';
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

  function niceName(x){
  if (!x) return '';
  if (x.name) return x.name;
  // fallback to file-derived
  const base = (x.src||'').split('/').pop().replace(/\.[^.]+$/,'');
  const cleaned = base.replace(/[_-]?(mobile|icon)(?:[_-]|$)/gi,' ').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim();
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : '';
}

function renderHistory(){
  const holder = panel.querySelector('#sl-history');
  const rows = (ctx.state.slotsHistory || []).map(h => {
    const t = new Date(h.ts || Date.now());
    const when = t.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    return `
      <tr>
        <td>${when}</td>
        <td>${niceName(h.legend)}</td>
        <td>${niceName(h.weapon1)}</td>
        <td>${niceName(h.weapon2)}</td>
      </tr>`;
  }).join('') || `<tr><td colspan="4" class="hint">No spins yet.</td></tr>`;

  holder.innerHTML = `
    <table class="table" style="width:100%; border-collapse:collapse">
      <thead>
        <tr>
          <th style="text-align:left; padding:4px 6px; border-bottom:1px solid var(--border)">Time</th>
          <th style="text-align:left; padding:4px 6px; border-bottom:1px solid var(--border)">Legend</th>
          <th style="text-align:left; padding:4px 6px; border-bottom:1px solid var(--border)">Weapon 1</th>
          <th style="text-align:left; padding:4px 6px; border-bottom:1px solid var(--border)">Weapon 2</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>`;
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

  // Pick one enabled item (fallback to whole list if user disabled all)
  function pickEnabled(list){
    const pool = (list || []).filter(x => x.enabled !== false);
    const src = pool.length ? pool : (list || []);
    if (!src.length) return null;
    const i = Math.floor(Math.random() * src.length);
    return src[i]; // {src, name, enabled}
  }

  // Pick two different items (if only one available, duplicates are allowed)
  function uniquePickTwo(list){
    const pool = (list || []).filter(x => x.enabled !== false);
    const src = pool.length ? pool : (list || []);
    if (!src.length) return [null, null];
    if (src.length === 1) return [src[0], src[0]];
    const i1 = Math.floor(Math.random() * src.length);
    let i2 = Math.floor(Math.random() * (src.length - 1));
    if (i2 >= i1) i2++;
    return [src[i1], src[i2]];
  }

  function wire(){
    if (wired) return; wired = true;
    panel.innerHTML = html();

    const $ = (id)=>panel.querySelector(id);
    const slDuration = $('#sl-duration');
    const slStagger  = $('#sl-stagger');
    const slInvert   = $('#sl-invert');
  const slStyle    = $('#sl-style');
  const slFrame    = $('#sl-frame');
  const slFrameFx  = $('#sl-framefx');
  const slSfx      = $('#sl-sfx');
  const slVfx      = $('#sl-vfx');
  const slVignette = $('#sl-vignette');
    const slRescan   = $('#sl-rescan');
    const slSpin     = $('#sl-spin');
    const slStop     = $('#sl-stop');
    const slLegends  = $('#sl-legends');
    const slWeapons  = $('#sl-weapons');
    // NEW: view mode buttons
    const slWeaponsOnly   = $('#sl-weapons-only');
    const slCharacterOnly = $('#sl-character-only');
    const slIncludeAll    = $('#sl-include-all');

    ensureSlotsState();
    slDuration.value = state.slots.duration;
    slStagger.value  = state.slots.stagger;
    slInvert.checked = !!state.slots.invert;
  slStyle.value    = state.slots.style || 'classic';
  slFrame.value    = state.slots.frame || 'rounded';
  slFrameFx.value  = state.slots.frameFx || 'standard';
  slSfx.checked    = state.slots.sfx !== false;
  slVfx.checked    = state.slots.vfx !== false;
  slVignette.value = state.slots.vignette || 'normal';

    // NEW: toggle visibility of pick lists based on view mode
    const slLegendsCard = slLegends.closest('.card');
    const slWeaponsCard = slWeapons.closest('.card');
    function applySlotsView(){
      const view = state.slots.view || 'all';
      // weapons-only -> hide legends list; character-only -> hide weapons list
      slLegendsCard.style.display = (view === 'weapons') ? 'none' : '';
      slWeaponsCard.style.display = (view === 'character') ? 'none' : '';
      // optional: reflect active button state
      [slIncludeAll, slWeaponsOnly, slCharacterOnly].forEach(btn=>btn?.classList.remove('active'));
      if (view==='all') slIncludeAll?.classList.add('active');
      if (view==='weapons') slWeaponsOnly?.classList.add('active');
      if (view==='character') slCharacterOnly?.classList.add('active');
    }

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
    slStyle.addEventListener('change', ()=>{
      state.slots.style = slStyle.value || 'classic';
      persist(); sendState();
    });
    slFrame.addEventListener('change', ()=>{
      state.slots.frame = slFrame.value || 'rounded';
      persist(); sendState();
    });
    slFrameFx.addEventListener('change', ()=>{
      state.slots.frameFx = slFrameFx.value || 'standard';
      persist(); sendState();
    });
    slSfx.addEventListener('change', ()=>{
      state.slots.sfx = !!slSfx.checked;
      persist(); sendState();
    });
    slVfx.addEventListener('change', ()=>{
      state.slots.vfx = !!slVfx.checked;
      persist(); sendState();
    });
    slVignette.addEventListener('change', ()=>{
      state.slots.vignette = slVignette.value || 'off';
      persist(); sendState();
    });

    // NEW: view mode handlers
    slIncludeAll.addEventListener('click', ()=>{
      ensureSlotsState();
      state.slots.view = 'all';
      applySlotsView();
      persist(); sendState();
    });
    slWeaponsOnly.addEventListener('click', ()=>{
      ensureSlotsState();
      state.slots.view = 'weapons';
      applySlotsView();
      persist(); sendState();
    });
    slCharacterOnly.addEventListener('click', ()=>{
      ensureSlotsState();
      state.slots.view = 'character';
      applySlotsView();
      persist(); sendState();
    });

    slRescan.addEventListener('click', ()=> rescanAndRender(slLegends, slWeapons));
    slSpin.addEventListener('click', ()=>{
      ensureSlotsState();

      const legend   = pickEnabled(state.slots.legends);
      const [w1, w2] = uniquePickTwo(state.slots.weapons);

      // build the plan ONCE
      const plan = {
        legendSrc:  legend?.src || '',
        weapon1Src: w1?.src || '',
        weapon2Src: w2?.src || '',
      };

      // and SEND that plan
      sendCmd('slotSpin', {
        plan,
        duration: state.slots.duration,
        stagger:  state.slots.stagger,
        invert:   !!state.slots.invert
      });
    });

    slStop.addEventListener('click', ()=> sendCmd('slotStop'));

    renderHistory();
    panel._renderHistory = renderHistory;

    // initial render
    (async () => {
      await loadManifestIfEmpty();
      renderGrid(slLegends, state.slots.legends);
      renderGrid(slWeapons, state.slots.weapons);
      applySlotsView(); // NEW
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
