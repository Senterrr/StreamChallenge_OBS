// controller/modes/slots.js
const MANIFEST_URL = '/slots-manifest';
const clamp = (v,a,b)=>Math.min(b,Math.max(a,v));

export function init(ctx){
  const { root, state, setMode, persist, sendState, sendCmd } = ctx;
  const panel = root.slots;
  let wired = false;

  function html(){
    return `
      <div class="title">Slots Mode (Apex)</div>
      <div class="desc" style="margin-bottom:12px">
        <div class="field" style="flex-direction:row; align-items:center; gap:8px">
          <label for="sl-view">View</label>
          <select id="sl-view" class="select">
            <option value="all">Include All</option>
            <option value="weapons">Weapons Only</option>
            <option value="one-weapon">1 Weapon Only</option>
            <option value="character">Character Only</option>
          </select>
          <div class="hint">Choose which reels are visible.</div>
        </div>
      </div>
      <div class="card" style="margin-bottom:12px">
        <div class="field" style="flex-wrap:wrap; gap:12px; align-items:center">
          <label for="sl-accent1">Accent 1</label>
          <input id="sl-accent1" type="color" class="input" value="#7c3aed">
          <label for="sl-accent2">Accent 2</label>
          <input id="sl-accent2" type="color" class="input" value="#22d3ee">
          <label for="sl-panel-color">Panel Color</label>
          <input id="sl-panel-color" type="color" class="input" value="#ffffff">
          <div class="hint">Pick two base colors used for reel accents and glows.</div>
        </div>
      </div>
      <div class="card" style="margin-bottom:12px">
        <div class="field" style="flex-wrap:wrap; gap:10px">
          <label for="sl-frame">Slot Frame Shape</label>
          <select id="sl-frame" class="select">
            <option value="rounded">Rounded</option>
            <option value="square">Square</option>
            <option value="pill">Pill</option>
            <option value="cut">Cut Corners</option>
          </select>
          <div class="hint">Shape of the slot frame (cell border). Useful for different overlay aesthetics.</div>
        </div>
      </div>
      <div class="card" style="margin-bottom:12px">
        <div class="field" style="flex-wrap:wrap; gap:10px">
          <label for="sl-framefx">Slot Frame FX</label>
          <select id="sl-framefx" class="select">
            <option value="standard">Standard</option>
            <option value="nohighlight">No Highlight Bar</option>
            <option value="curved">Curved Glass</option>
            <option value="tilt">Tilted</option>
            <option value="minimal">Minimal</option>
            <option value="glow">Strong Glow</option>
          </select>
            <div class="hint">Aggressive slot frame presentation tweaks (hide center bar, curved glass, tilt, etc.).</div>
        </div>
      </div>
      <div class="card" style="margin-bottom:12px">
        <div class="field" style="align-items:center; gap:12px">
          <label for="sl-frame-color">Slot Frame Color</label>
          <input id="sl-frame-color" type="color" class="input" value="#ffffff">
          <div class="hint">Choose the slot frame (cell border) color for each reel panel.</div>
        </div>
        <div class="field" style="align-items:center; gap:12px; margin-top:8px">
          <label for="sl-frame-alpha" style="min-width:140px">Slot Frame Transparency</label>
          <input id="sl-frame-alpha" type="range" min="0" max="100" step="1" class="input" value="16" style="flex:1">
          <div id="sl-frame-alpha-val" class="hint" style="min-width:44px; text-align:right">16%</div>
        </div>
        <div class="field" style="align-items:center; gap:12px; margin-top:6px">
          <label for="sl-glow-alpha" style="min-width:140px">Glow Transparency</label>
          <input id="sl-glow-alpha" type="range" min="0" max="100" step="1" class="input" value="36" style="flex:1">
          <div id="sl-glow-alpha-val" class="hint" style="min-width:44px; text-align:right">36%</div>
        </div>
        <div class="field" style="align-items:center; gap:12px; margin-top:12px">
          <label for="sl-vignette-alpha" style="min-width:140px">Vignette</label>
          <input id="sl-vignette-alpha" type="range" min="0" max="100" step="1" class="input" value="100" style="flex:1">
          <div id="sl-vignette-alpha-val" class="hint" style="min-width:44px; text-align:right">100%</div>
        </div>
        <div class="field" style="align-items:center; gap:12px; margin-top:6px">
          <label for="sl-center-alpha" style="min-width:140px">Center Glow</label>
          <input id="sl-center-alpha" type="range" min="0" max="100" step="1" class="input" value="55" style="flex:1">
          <div id="sl-center-alpha-val" class="hint" style="min-width:44px; text-align:right">55%</div>
        </div>
        <div class="field" style="align-items:center; gap:12px; margin-top:6px">
          <label for="sl-spin-alpha" style="min-width:140px">Spin Glow</label>
          <input id="sl-spin-alpha" type="range" min="0" max="100" step="1" class="input" value="70" style="flex:1">
          <div id="sl-spin-alpha-val" class="hint" style="min-width:44px; text-align:right">70%</div>
        </div>
        <div class="hint" style="margin-top:8px">
          <div style="display:flex;align-items:center;gap:12px">
            <div id="sl-preview" style="width:160px;height:80px;border-radius:8px;display:flex;align-items:center;justify-content:center;position:relative;background:#0e0e11;border:1px solid rgba(255,255,255,0.06)">
              <div id="sl-preview-frame" style="width:120px;height:56px;border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center"></div>
            </div>
            <div style="flex:1">Preview (local)</div>
          </div>
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
  // transparency controls (0.0 - 1.0)
  if (typeof state.slots.frameAlpha !== 'number') state.slots.frameAlpha = 0.16; // used for slot frame (cell border) opacity
  if (typeof state.slots.glowAlpha  !== 'number') state.slots.glowAlpha  = 0.36; // used for accent glows
  // custom colors
  if (typeof state.slots.accent1 !== 'string') state.slots.accent1 = '#7c3aed';
  if (typeof state.slots.accent2 !== 'string') state.slots.accent2 = '#22d3ee';
  if (typeof state.slots.frameColor !== 'string') state.slots.frameColor = '#ffffff';
  if (typeof state.slots.panelColor !== 'string') state.slots.panelColor = '#ffffff';
  // effect alphas
  if (typeof state.slots.vignetteAlpha !== 'number') state.slots.vignetteAlpha = 1.0;
  if (typeof state.slots.centerAlpha !== 'number') state.slots.centerAlpha = 0.55;
  if (typeof state.slots.spinAlpha !== 'number') state.slots.spinAlpha = 0.7;
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
  // slStyle removed: using custom color pickers instead
  const slFrame    = $('#sl-frame');
  const slFrameFx  = $('#sl-framefx');
  const slSfx      = $('#sl-sfx');
  const slVfx      = $('#sl-vfx');
  const slVignette = $('#sl-vignette');
  const slFrameAlpha = $('#sl-frame-alpha');
  const slGlowAlpha  = $('#sl-glow-alpha');
  const slFrameAlphaVal = $('#sl-frame-alpha-val');
  const slGlowAlphaVal  = $('#sl-glow-alpha-val');
    const slRescan   = $('#sl-rescan');
    const slSpin     = $('#sl-spin');
    const slStop     = $('#sl-stop');
    const slLegends  = $('#sl-legends');
    const slWeapons  = $('#sl-weapons');
  const slPreviewFrame = $('#sl-preview-frame');
  const slFrameColor = $('#sl-frame-color');
  const slPanelColor = $('#sl-panel-color');
  const slAccent1 = $('#sl-accent1');
  const slAccent2 = $('#sl-accent2');
  const slVignetteAlpha = $('#sl-vignette-alpha');
  const slCenterAlpha = $('#sl-center-alpha');
  const slSpinAlpha = $('#sl-spin-alpha');
    // NEW: view mode buttons
  const slViewSelect     = $('#sl-view');

    ensureSlotsState();
    slDuration.value = state.slots.duration;
    slStagger.value  = state.slots.stagger;
    slInvert.checked = !!state.slots.invert;
  // slStyle removed
  // custom color picks
  slAccent1.value  = state.slots.accent1 || '#7c3aed';
  slAccent2.value  = state.slots.accent2 || '#22d3ee';
  slFrameColor.value = state.slots.frameColor || '#ffffff';
  slPanelColor && (slPanelColor.value = state.slots.panelColor || '#ffffff');
  slFrame.value    = state.slots.frame || 'rounded';
  slFrameFx.value  = state.slots.frameFx || 'standard';
  slSfx.checked    = state.slots.sfx !== false;
  slVfx.checked    = state.slots.vfx !== false;
  slVignette.value = state.slots.vignette || 'normal';
  // transparency (UI uses 0..100 percent; state uses 0..1)
  const framePct = (typeof state.slots.frameAlpha === 'number') ? Math.round(state.slots.frameAlpha * 100) : 16;
  const glowPct  = (typeof state.slots.glowAlpha === 'number')  ? Math.round(state.slots.glowAlpha * 100)  : 36;
  slFrameAlpha.value = framePct;
  slGlowAlpha.value  = glowPct;
  slFrameAlphaVal.textContent = framePct + '%';
  slGlowAlphaVal.textContent  = glowPct + '%';
  // effect alphas
  slVignetteAlpha.value = Math.round((state.slots.vignetteAlpha||1)*100);
  slCenterAlpha.value   = Math.round((state.slots.centerAlpha||0.55)*100);
  slSpinAlpha.value     = Math.round((state.slots.spinAlpha||0.7)*100);
  document.getElementById('sl-vignette-alpha-val').textContent = Math.round((state.slots.vignetteAlpha||1)*100) + '%';
  document.getElementById('sl-center-alpha-val').textContent = Math.round((state.slots.centerAlpha||0.55)*100) + '%';
  document.getElementById('sl-spin-alpha-val').textContent = Math.round((state.slots.spinAlpha||0.7)*100) + '%';

    // NEW: toggle visibility of pick lists based on view mode
    const slLegendsCard = slLegends.closest('.card');
    const slWeaponsCard = slWeapons.closest('.card');
    function applySlotsView(){
      const view = state.slots.view || 'all';
      slLegendsCard.style.display = (view === 'weapons') ? 'none' : '';
      slWeaponsCard.style.display = (view === 'character') ? 'none' : '';
      if (slViewSelect) slViewSelect.value = view;
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
    // slStyle removed; styles are driven by custom color pickers now
    slFrame.addEventListener('change', ()=>{
      state.slots.frame = slFrame.value || 'rounded';
      persist(); sendState();
    });
    slFrameFx.addEventListener('change', ()=>{
      state.slots.frameFx = slFrameFx.value || 'standard';
      persist(); sendState();
    });
    slFrameAlpha.addEventListener('input', ()=>{
      const pct = parseInt(slFrameAlpha.value, 10) || 0;
      const norm = clamp(pct / 100, 0, 1);
      state.slots.frameAlpha = norm;
      slFrameAlphaVal.textContent = Math.round(norm * 100) + '%';
      // update preview: slot frame border (inset) and inner panel fill
      if (slPreviewFrame) {
        const frameColor = slFrameColor.value || '#ffffff';
        const panelColor = (slPanelColor && slPanelColor.value) ? slPanelColor.value : slFrameColor.value || '#ffffff';
        slPreviewFrame.style.boxShadow = `0 0 ${8 + (slGlowAlpha.value/100)*24}px ${slAccent2.value}, inset 0 0 0 2px rgba(${parseInt(frameColor.slice(1,3),16)},${parseInt(frameColor.slice(3,5),16)},${parseInt(frameColor.slice(5,7),16)},${norm})`;
        // inner panel uses panelColor (mirror of frameAlpha in controller UI)
        slPreviewFrame.style.background = `rgba(${parseInt(panelColor.slice(1,3),16)},${parseInt(panelColor.slice(3,5),16)},${parseInt(panelColor.slice(5,7),16)},${norm})`;
      }
      persist(); sendState();
    });
    slGlowAlpha.addEventListener('input', ()=>{
      const pct = parseInt(slGlowAlpha.value, 10) || 0;
      const norm = clamp(pct / 100, 0, 1);
      state.slots.glowAlpha = norm;
      slGlowAlphaVal.textContent = Math.round(norm * 100) + '%';
      // update preview (simulate glow by applying box-shadow) while preserving slot frame inset
      if (slPreviewFrame) {
        const fNorm = state.slots.frameAlpha || (parseInt(slFrameAlpha.value,10)/100) || 0;
        const frameColor = slFrameColor.value || '#ffffff';
        slPreviewFrame.style.boxShadow = `0 0 ${8 + norm*24}px ${slAccent2.value}, inset 0 0 0 2px rgba(${parseInt(frameColor.slice(1,3),16)},${parseInt(frameColor.slice(3,5),16)},${parseInt(frameColor.slice(5,7),16)},${fNorm})`;
      }
      persist(); sendState();
    });

    // color pickers
    slAccent1.addEventListener('input', ()=>{
      state.slots.accent1 = slAccent1.value;
      // live preview accent via border/glow (maintain slot frame inset color)
      if (slPreviewFrame) {
        const fNorm = state.slots.frameAlpha || (parseInt(slFrameAlpha.value,10)/100) || 0;
        const frameColor = slFrameColor.value || '#ffffff';
        slPreviewFrame.style.boxShadow = `0 0 ${8 + (slGlowAlpha.value/100)*24}px ${slAccent2.value}, inset 0 0 0 2px rgba(${parseInt(frameColor.slice(1,3),16)},${parseInt(frameColor.slice(3,5),16)},${parseInt(frameColor.slice(5,7),16)},${fNorm})`;
      }
      persist(); sendState();
    });
    slAccent2.addEventListener('input', ()=>{
      state.slots.accent2 = slAccent2.value;
      if (slPreviewFrame) {
        const fNorm = state.slots.frameAlpha || (parseInt(slFrameAlpha.value,10)/100) || 0;
        const frameColor = slFrameColor.value || '#ffffff';
        const panelColor = (slPanelColor && slPanelColor.value) ? slPanelColor.value : frameColor;
        slPreviewFrame.style.boxShadow = `0 0 ${8 + (slGlowAlpha.value/100)*24}px ${slAccent2.value}, inset 0 0 0 2px rgba(${parseInt(frameColor.slice(1,3),16)},${parseInt(frameColor.slice(3,5),16)},${parseInt(frameColor.slice(5,7),16)},${fNorm})`;
        slPreviewFrame.style.background = `rgba(${parseInt(panelColor.slice(1,3),16)},${parseInt(panelColor.slice(3,5),16)},${parseInt(panelColor.slice(5,7),16)},${fNorm})`;
      }
      persist(); sendState();
    });

    // frame color (slot frame color)
    slFrameColor.addEventListener('input', ()=>{
      state.slots.frameColor = slFrameColor.value;
      if (slPreviewFrame){
        const fNorm = state.slots.frameAlpha || (parseInt(slFrameAlpha.value,10)/100) || 0;
        const fc = slFrameColor.value || '#ffffff';
        const panelColor = (slPanelColor && slPanelColor.value) ? slPanelColor.value : fc;
        slPreviewFrame.style.boxShadow = `0 0 ${8 + (slGlowAlpha.value/100)*24}px ${slAccent2.value}, inset 0 0 0 2px rgba(${parseInt(fc.slice(1,3),16)},${parseInt(fc.slice(3,5),16)},${parseInt(fc.slice(5,7),16)},${fNorm})`;
        slPreviewFrame.style.background = `rgba(${parseInt(panelColor.slice(1,3),16)},${parseInt(panelColor.slice(3,5),16)},${parseInt(panelColor.slice(5,7),16)},${fNorm})`;
      }
      persist(); sendState();
    });

    // panel color (inner panel) picker
    if (slPanelColor) slPanelColor.addEventListener('input', ()=>{
      state.slots.panelColor = slPanelColor.value;
      if (slPreviewFrame){
        const fNorm = state.slots.frameAlpha || (parseInt(slFrameAlpha.value,10)/100) || 0;
        const pc = slPanelColor.value || '#ffffff';
        slPreviewFrame.style.background = `rgba(${parseInt(pc.slice(1,3),16)},${parseInt(pc.slice(3,5),16)},${parseInt(pc.slice(5,7),16)},${fNorm})`;
      }
      persist(); sendState();
    });

    // extra effect alpha sliders
    slVignetteAlpha.addEventListener('input', ()=>{
      const pct = parseInt(slVignetteAlpha.value,10)||0; state.slots.vignetteAlpha = clamp(pct/100,0,1);
      document.getElementById('sl-vignette-alpha-val').textContent = pct + '%'; persist(); sendState();
    });
    slCenterAlpha.addEventListener('input', ()=>{
      const pct = parseInt(slCenterAlpha.value,10)||0; state.slots.centerAlpha = clamp(pct/100,0,1);
      document.getElementById('sl-center-alpha-val').textContent = pct + '%'; persist(); sendState();
    });
    slSpinAlpha.addEventListener('input', ()=>{
      const pct = parseInt(slSpinAlpha.value,10)||0; state.slots.spinAlpha = clamp(pct/100,0,1);
      document.getElementById('sl-spin-alpha-val').textContent = pct + '%'; persist(); sendState();
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

    // NEW: view mode handler (compact select)
    if (slViewSelect) slViewSelect.addEventListener('change', ()=>{
      ensureSlotsState();
      state.slots.view = slViewSelect.value || 'all';
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
      // Initialize preview visuals
      try{
        const fp = parseInt(slFrameAlpha.value,10) || 0;
        const gp = parseInt(slGlowAlpha.value,10) || 0;
          if (slPreviewFrame){
    const fNorm = clamp(fp/100,0,1);
    const gNorm = clamp(gp/100,0,1);
    const fc = slFrameColor.value || '#ffffff';
    const pc = (slPanelColor && slPanelColor.value) ? slPanelColor.value : fc;
    slPreviewFrame.style.boxShadow = `0 0 ${8 + gNorm*24}px ${slAccent2.value}, inset 0 0 0 2px rgba(${parseInt(fc.slice(1,3),16)},${parseInt(fc.slice(3,5),16)},${parseInt(fc.slice(5,7),16)},${fNorm})`;
    slPreviewFrame.style.background = `rgba(${parseInt(pc.slice(1,3),16)},${parseInt(pc.slice(3,5),16)},${parseInt(pc.slice(5,7),16)},${fNorm})`;
        }
      }catch(e){}
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
