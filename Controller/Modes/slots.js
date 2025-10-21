// controller/modes/slots.js
const MANIFEST_URL = '/slots-manifest';
const clamp = (v,a,b)=>Math.min(b,Math.max(a,v));

export function init(ctx){
  const { root, state, setMode, persist, sendState, sendCmd } = ctx;
  const panel = root.slots;
  let wired = false;

  function html(){
    return `
      <div class="title">Slots Mode</div>
      <div class="desc" style="margin-bottom:12px">
        <div class="field" style="flex-direction:column; align-items:stretch; gap:6px">
          <button class="toolbtn" id="sl-weapons-only">Weapons Only</button>
          <button class="toolbtn" id="sl-weapon-one">Single Weapon</button>
          <button class="toolbtn" id="sl-character-only">Character Only</button>
          <button class="toolbtn" id="sl-include-all">Include All</button>
        </div>
      </div>
      <div class="card" style="margin-bottom:12px">
        <div class="field" style="flex-wrap:wrap; gap:10px">
          <label for="sl-game">Game</label>
          <select id="sl-game" class="select"></select>
          <div class="hint">Choose which game's assets to use. Detected under /Assets/*</div>
        </div>
      </div>
      <div class="card" id="sl-side-card" style="margin-bottom:12px; display:none">
        <div class="field" style="flex-wrap:wrap; gap:10px; align-items:center">
          <label>CS2 Side</label>
          <div style="display:flex; gap:6px">
            <button class="toolbtn" id="sl-side-all">All</button>
            <button class="toolbtn" id="sl-side-ct">CT</button>
            <button class="toolbtn" id="sl-side-t">T</button>
          </div>
          <div class="hint">Filters CS2 weapons by Counter-Terrorist or Terrorist side.</div>
        </div>
      </div>
      <div class="card" style="margin-bottom:12px">
        <div class="field" style="flex-wrap:wrap; gap:12px; align-items:center">
          <label for="sl-frame-color">Slot Border</label>
          <input id="sl-frame-color" type="color" class="input" value="#ffffff">
          <div style="flex-basis:100%"></div>
          <label>Gradient</label>
          <select id="sl-grad-type" class="select">
            <option value="linear">Linear</option>
            <option value="radial">Radial</option>
          </select>
          <label style="margin-left:8px">Angle</label>
          <input id="sl-grad-angle" type="range" min="0" max="360" step="1" value="180" style="width:140px">
          <div id="sl-grad-angle-val" class="hint" style="min-width:44px; text-align:right">180°</div>
          <div style="flex-basis:100%"></div>
          <label for="sl-accent1">Stop 1</label>
          <input id="sl-accent1" type="color" class="input" value="#7c3aed">
          <input id="sl-grad-p1" type="number" class="input" min="0" max="100" step="1" value="0" style="width:80px" title="Position %">
          <label for="sl-accent2" style="margin-left:10px">Stop 2</label>
          <input id="sl-accent2" type="color" class="input" value="#22d3ee">
          <input id="sl-grad-p2" type="number" class="input" min="0" max="100" step="1" value="100" style="width:80px" title="Position %">
          <label for="sl-glow-color">Glow Color</label>
          <input id="sl-glow-color" type="color" class="input" value="#22d3ee">
          <div class="hint">Single slot fill defined by a gradient. Adjust type, angle and two color stops (with positions). Glow Color is used for glows only.</div>
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
            <div id="sl-preview" style="width:200px;height:100px;border-radius:10px;display:flex;align-items:center;justify-content:center;position:relative;background:#0e0e11;border:1px solid rgba(255,255,255,0.06)">
              <div id="sl-preview-frame" style="width:150px;height:70px;border-radius:10px;box-shadow:0 8px 20px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden"></div>
            </div>
            <div style="flex:1">Preview (reflects colors and transparency)</div>
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
        <div class="field" style="flex-wrap:wrap; gap:12px; align-items:center">
          <label style="display:inline-flex; align-items:center; gap:8px">
            <input type="checkbox" id="sl-stars-enabled" checked> Stars during spin
          </label>
          <label style="display:inline-flex; align-items:center; gap:8px">
            <input type="checkbox" id="sl-hit-enabled" checked> Landing burst
          </label>
          <label for="sl-stars-amount">Stars Amount</label>
          <input id="sl-stars-amount" class="input" type="number" step="1" min="0" max="500" value="60" style="width:84px">
          <div class="hint">Floating star particles while reels spin; amount controls intensity.</div>
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
  if (!state.slots) state.slots = { duration: 2.5, stagger: 0.5, invert: false, legends: [], weapons: [], view: 'all', style: 'classic', frame: 'rounded', frameFx: 'standard', sfx: true, vfx: true, vignette: 'normal', game: '' };
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
  if (typeof state.slots.cs2Side !== 'string') state.slots.cs2Side = 'all';
  if (typeof state.slots.starsEnabled !== 'boolean') state.slots.starsEnabled = true;
  if (typeof state.slots.hitEnabled !== 'boolean') state.slots.hitEnabled = true;
  if (typeof state.slots.starsAmount !== 'number') state.slots.starsAmount = 60;
  }

  async function fetchIntoState(){
    try{
      const q = new URLSearchParams();
      if (state.slots?.game) q.set('game', state.slots.game);
      const url = q.toString() ? `${MANIFEST_URL}?${q}` : MANIFEST_URL;
      const r = await fetch(url, { cache:'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      state.slots.legends = j.legends || [];
      state.slots.weapons = j.weapons || [];
      if (j.game) state.slots.game = j.game;
      persist(); sendState();
    }catch(e){
      console.warn('Slots manifest load failed', e);
    }
  }
  async function fetchGames(){
    try{
      const r = await fetch('/slots-games', { cache:'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      return (j.games||[]);
    }catch(e){ console.warn('Games list load failed', e); return []; }
  }
  async function populateGames(){
    try{
      const games = await fetchGames();
      const slGame = (panel && panel.querySelector('#sl-game'));
      if (!slGame) return;
      const preferred = state.slots.game || '';
      const opts = games.map(g=>`<option value="${g.id}">${g.name||g.id}</option>`).join('');
      slGame.innerHTML = opts || '<option value="">(No games found)</option>';
      if (preferred && games.some(g=>g.id===preferred)) slGame.value = preferred;
      else if (games.length){
        const apex = games.find(g=>g.id==='ApexLegends');
        slGame.value = apex ? apex.id : games[0].id;
        state.slots.game = slGame.value;
        persist();
      }
    }catch(e){ console.warn('populateGames failed', e); }
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
  const view = (state.slots && state.slots.view) || 'all';
  const rows = (ctx.state.slotsHistory || []).map(h => {
    const t = new Date(h.ts || Date.now());
    const when = t.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    if (view === 'weapon-one'){
      return `
        <tr>
          <td>${when}</td>
          <td>${niceName(h.weapon1 || h.weapon)}</td>
        </tr>`;
    } else if (view === 'weapons'){
      return `
        <tr>
          <td>${when}</td>
          <td>${niceName(h.weapon1)}</td>
          <td>${niceName(h.weapon2)}</td>
        </tr>`;
    } else if (view === 'character'){
      return `
        <tr>
          <td>${when}</td>
          <td>${niceName(h.legend)}</td>
        </tr>`;
    } else {
      return `
        <tr>
          <td>${when}</td>
          <td>${niceName(h.legend)}</td>
          <td>${niceName(h.weapon1)}</td>
          <td>${niceName(h.weapon2)}</td>
        </tr>`;
    }
  }).join('') || `<tr><td colspan="4" class="hint">No spins yet.</td></tr>`;

  let thead = '';
  if (view === 'weapon-one'){
    thead = `
      <tr>
        <th style="text-align:left; padding:4px 6px; border-bottom:1px solid var(--border)">Time</th>
        <th style="text-align:left; padding:4px 6px; border-bottom:1px solid var(--border)">Weapon</th>
      </tr>`;
  } else if (view === 'weapons'){
    thead = `
      <tr>
        <th style="text-align:left; padding:4px 6px; border-bottom:1px solid var(--border)">Time</th>
        <th style="text-align:left; padding:4px 6px; border-bottom:1px solid var(--border)">Weapon 1</th>
        <th style="text-align:left; padding:4px 6px; border-bottom:1px solid var(--border)">Weapon 2</th>
      </tr>`;
  } else if (view === 'character'){
    thead = `
      <tr>
        <th style="text-align:left; padding:4px 6px; border-bottom:1px solid var(--border)">Time</th>
        <th style="text-align:left; padding:4px 6px; border-bottom:1px solid var(--border)">Legend</th>
      </tr>`;
  } else {
    thead = `
      <tr>
        <th style="text-align:left; padding:4px 6px; border-bottom:1px solid var(--border)">Time</th>
        <th style="text-align:left; padding:4px 6px; border-bottom:1px solid var(--border)">Legend</th>
        <th style="text-align:left; padding:4px 6px; border-bottom:1px solid var(--border)">Weapon 1</th>
        <th style="text-align:left; padding:4px 6px; border-bottom:1px solid var(--border)">Weapon 2</th>
      </tr>`;
  }

  holder.innerHTML = `
    <table class="table" style="width:100%; border-collapse:collapse">
      <thead>
        ${thead}
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
        // preserve user intent in enabledUser when available (for CS2 side filter)
        if (Object.prototype.hasOwnProperty.call(list[i], 'enabledUser')){
          list[i].enabledUser = !(list[i].enabledUser);
        }
        // toggle enabled directly as well
        list[i].enabled = !list[i].enabled;
        node.classList.toggle('off', !list[i].enabled);
        // if we are on weapons grid, re-apply side filter to recompute effective enabled
        const isWeapons = container && container.id === 'sl-weapons';
        if (isWeapons && typeof applyCs2SideFilter === 'function'){
          applyCs2SideFilter();
          // re-render to reflect potential re-filtering
          renderGrid(container, list);
        }
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
  const slGame     = $('#sl-game');
    const slStagger  = $('#sl-stagger');
    const slInvert   = $('#sl-invert');
  // slStyle removed: using custom color pickers instead
  const slFrame    = $('#sl-frame');
  const slFrameFx  = $('#sl-framefx');
  const slSfx      = $('#sl-sfx');
  const slVfx      = $('#sl-vfx');
  const slVignette = $('#sl-vignette');
  // Particles controls
  const slStarsEnabled = $('#sl-stars-enabled');
  const slHitEnabled   = $('#sl-hit-enabled');
  const slStarsAmount  = $('#sl-stars-amount');
  const slFrameAlpha = $('#sl-frame-alpha');
  const slGlowAlpha  = $('#sl-glow-alpha');
  const slFrameAlphaVal = $('#sl-frame-alpha-val');
  const slGlowAlphaVal  = $('#sl-glow-alpha-val');
    const slRescan   = $('#sl-rescan');
    const slSpin     = $('#sl-spin');
    const slStop     = $('#sl-stop');
    const slLegends  = $('#sl-legends');
    const slWeapons  = $('#sl-weapons');
  const slIncludeAll = $('#sl-include-all');
  const slPreviewFrame = $('#sl-preview-frame');
  const slFrameColor = $('#sl-frame-color');
  const slAccent1 = $('#sl-accent1');
  const slAccent2 = $('#sl-accent2');
  const slGlowColor = $('#sl-glow-color');
  const slGradType = $('#sl-grad-type');
  const slGradAngle = $('#sl-grad-angle');
  const slGradAngleVal = $('#sl-grad-angle-val');
  const slGradP1 = $('#sl-grad-p1');
  const slGradP2 = $('#sl-grad-p2');
  const slVignetteAlpha = $('#sl-vignette-alpha');
  const slCenterAlpha = $('#sl-center-alpha');
  const slSpinAlpha = $('#sl-spin-alpha');
    // NEW: view mode buttons
    const slWeaponsOnly   = $('#sl-weapons-only');
  const slWeaponOne     = $('#sl-weapon-one');
    const slCharacterOnly = $('#sl-character-only');
  // CS2 side controls
  const slSideCard = $('#sl-side-card');
  const slSideAll  = $('#sl-side-all');
  const slSideCT   = $('#sl-side-ct');
  const slSideT    = $('#sl-side-t');

    ensureSlotsState();
    slDuration.value = state.slots.duration;
    slStagger.value  = state.slots.stagger;
    slInvert.checked = !!state.slots.invert;
  // slStyle removed
  // custom color picks
  slAccent1.value  = state.slots.accent1 || '#7c3aed';
  slAccent2.value  = state.slots.accent2 || '#22d3ee';
  slFrameColor.value = state.slots.frameColor || '#ffffff';
  // remove panelColor: using dedicated glow color instead
  slFrame.value    = state.slots.frame || 'rounded';
  slFrameFx.value  = state.slots.frameFx || 'standard';
  slSfx.checked    = state.slots.sfx !== false;
  slVfx.checked    = state.slots.vfx !== false;
  slVignette.value = state.slots.vignette || 'normal';
  // particles defaults
  if (slStarsEnabled) slStarsEnabled.checked = state.slots.starsEnabled !== false;
  if (slHitEnabled)   slHitEnabled.checked   = state.slots.hitEnabled   !== false;
  if (slStarsAmount)  slStarsAmount.value    = String(typeof state.slots.starsAmount === 'number' ? state.slots.starsAmount : 60);
  slGlowColor.value = state.slots.glowColor || state.slots.accent2 || '#22d3ee';
  slGradType.value  = state.slots.gradType || 'linear';
  slGradAngle.value = String(state.slots.gradAngle ?? 180);
  slGradAngleVal.textContent = `${slGradAngle.value}°`;
  slGradP1.value = String(state.slots.gradP1 ?? 0);
  slGradP2.value = String(state.slots.gradP2 ?? 100);
  // sync slider positions from state
  if (typeof state.slots.frameAlpha === 'number') slFrameAlpha.value = String(Math.round(state.slots.frameAlpha*100));
  if (typeof state.slots.glowAlpha  === 'number') slGlowAlpha.value  = String(Math.round(state.slots.glowAlpha*100));
  if (typeof state.slots.vignetteAlpha === 'number') slVignetteAlpha.value = String(Math.round(state.slots.vignetteAlpha*100));
  if (typeof state.slots.centerAlpha   === 'number') slCenterAlpha.value   = String(Math.round(state.slots.centerAlpha*100));
  if (typeof state.slots.spinAlpha     === 'number') slSpinAlpha.value     = String(Math.round(state.slots.spinAlpha*100));

    // NEW: toggle visibility of pick lists based on view mode
    const slLegendsCard = slLegends.closest('.card');
    const slWeaponsCard = slWeapons.closest('.card');
    function isCS2GameId(id){ if(!id) return false; const s=String(id).toLowerCase(); return s.includes('counter') || s==='cs2' || s.includes('cs2'); }
    function inferCS2SideFromName(src){
      const s = (src||'').toLowerCase();
      // Rough heuristics based on common CS weapon names
      const tNames = ['ak-47','ak47','galil','sg553','sg-553','tec-9','tec9','glock','mac-10','mac10'];
      const ctNames= ['m4a1','m4a1-s','m4a4','famas','aug','five-seven','fiveseven','usp','usp-s','mp5','mp5-sd'];
      if (tNames.some(k=>s.includes(k))) return 't';
      if (ctNames.some(k=>s.includes(k))) return 'ct';
      return 'both';
    }
    function applyCs2SideFilter(){
      // Preserve user choice in enabledUser; compute effective enabled by side
      const side = state.slots.cs2Side || 'all';
      (state.slots.weapons||[]).forEach(it=>{
        if (typeof it.enabledUser === 'undefined') it.enabledUser = (it.enabled !== false);
        const sideOf = inferCS2SideFromName(it.name || it.src || '');
        const sideMatch = (side==='all') || (side==='ct' && (sideOf==='ct' || sideOf==='both')) || (side==='t' && (sideOf==='t' || sideOf==='both'));
        it.enabled = !!(it.enabledUser && sideMatch);
      });
    }
    function reflectCs2SideButtons(){
      [slSideAll, slSideCT, slSideT].forEach(b=>b?.classList.remove('active'));
      const v = state.slots.cs2Side || 'all';
      if (v==='all') slSideAll?.classList.add('active');
      if (v==='ct')  slSideCT?.classList.add('active');
      if (v==='t')   slSideT?.classList.add('active');
    }
    function updateModeButtonsForGame(){
      const hasLegends = (state.slots.legends||[]).length > 0;
      // Hide modes that require legends if none are present
      slCharacterOnly.style.display = hasLegends ? '' : 'none';
      slIncludeAll.style.display    = hasLegends ? '' : 'none';
      // Always allow weapons-only and single-weapon
      slWeaponsOnly.style.display   = '';
      if (slWeaponOne) slWeaponOne.style.display = '';
      // CS2 side selector visibility
      const cs2 = isCS2GameId(state.slots.game);
      if (slSideCard) slSideCard.style.display = cs2 ? '' : 'none';
      if (cs2){ applyCs2SideFilter(); reflectCs2SideButtons(); }
      // Auto-select sensible view when swapping games
      if (!hasLegends) {
        if (state.slots.view !== 'weapon-one' && state.slots.view !== 'weapons') {
          state.slots.view = 'weapon-one';
          persist(); sendState();
        }
      } else {
        if (state.slots.view === 'weapon-one') {
          state.slots.view = 'all';
          persist(); sendState();
        }
      }
    }
    function applySlotsView(){
      const view = state.slots.view || 'all';
      // weapons-only and weapon-one -> hide legends list; character-only -> hide weapons list
      slLegendsCard.style.display = (view === 'weapons' || view === 'weapon-one') ? 'none' : '';
      slWeaponsCard.style.display = (view === 'character') ? 'none' : '';
      // optional: reflect active button state
      [slIncludeAll, slWeaponsOnly, slWeaponOne, slCharacterOnly].forEach(btn=>btn?.classList.remove('active'));
      if (view==='all') slIncludeAll?.classList.add('active');
      if (view==='weapons') slWeaponsOnly?.classList.add('active');
      if (view==='weapon-one') slWeaponOne?.classList.add('active');
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
    // slStyle removed; styles are driven by custom color pickers now
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
    // particles events
    if (slStarsEnabled) slStarsEnabled.addEventListener('change', ()=>{ state.slots.starsEnabled = !!slStarsEnabled.checked; persist(); sendState(); });
    if (slHitEnabled)   slHitEnabled.addEventListener('change',   ()=>{ state.slots.hitEnabled   = !!slHitEnabled.checked;   persist(); sendState(); });
    if (slStarsAmount)  slStarsAmount.addEventListener('change',  ()=>{ const v=Math.max(0, Math.min(500, parseInt(slStarsAmount.value||'0',10))); state.slots.starsAmount=v; slStarsAmount.value=String(v); persist(); sendState(); });

    function makeSlotFill(){
      const type = state.slots.gradType || 'linear';
      const a1 = state.slots.accent1 || '#7c3aed';
      const a2 = state.slots.accent2 || '#22d3ee';
      const p1 = clamp(Number(state.slots.gradP1 ?? 0), 0, 100);
      const p2 = clamp(Number(state.slots.gradP2 ?? 100), 0, 100);
      const angle = clamp(Number(state.slots.gradAngle ?? 180), 0, 360);
      if (type === 'radial'){
        return `radial-gradient(120% 100% at 50% 0%, ${a1} ${p1}%, ${a2} ${p2}%)`;
      }
      return `linear-gradient(${angle}deg, ${a1} ${p1}%, ${a2} ${p2}%)`;
    }

    function updatePreview(){
      // local preview: simulate a single slot cell with our colors/alphas
      const border = state.slots.frameColor || '#ffffff';
      const fill = makeSlotFill();
      const glow = state.slots.glowColor || a2;
      const fa = typeof state.slots.frameAlpha === 'number' ? state.slots.frameAlpha : 0.16;
      const ga = typeof state.slots.glowAlpha === 'number' ? state.slots.glowAlpha : 0.36;
      const pa = typeof state.slots.panelAlpha === 'number' ? state.slots.panelAlpha : fa;
      if (slPreviewFrame){
        slPreviewFrame.style.border = `1px solid ${hexToRgba(border, fa)}`;
        slPreviewFrame.style.background = fill;
        slPreviewFrame.style.boxShadow = `inset 0 0 24px ${hexToRgba(glow, ga)}, 0 8px 22px rgba(0,0,0,.38)`;
      }
    }
    function hexToRgba(hex, alpha){
      if (!hex) return `rgba(255,255,255,${alpha ?? 1})`;
      const h = hex.replace('#','');
      const b = h.length===3 ? h.split('').map(c=>c+c).join('') : h;
      const r = parseInt(b.substring(0,2),16);
      const g = parseInt(b.substring(2,4),16);
      const bl= parseInt(b.substring(4,6),16);
      const a = Math.max(0, Math.min(1, Number(alpha ?? 1)));
      return `rgba(${r},${g},${bl},${a})`;
    }

    // colors
    slFrameColor.addEventListener('input', ()=>{ state.slots.frameColor = slFrameColor.value; persist(); sendState(); updatePreview(); });
  slAccent1.addEventListener('input', ()=>{ state.slots.accent1 = slAccent1.value; state.slots.slotFill = makeSlotFill(); persist(); sendState(); updatePreview(); });
  slAccent2.addEventListener('input', ()=>{ state.slots.accent2 = slAccent2.value; state.slots.slotFill = makeSlotFill(); persist(); sendState(); updatePreview(); });
    if (slGlowColor) slGlowColor.addEventListener('input', ()=>{ state.slots.glowColor = slGlowColor.value; persist(); sendState(); updatePreview(); });
  slGradType.addEventListener('change', ()=>{ state.slots.gradType = slGradType.value; state.slots.slotFill = makeSlotFill(); persist(); sendState(); updatePreview(); });
  slGradAngle.addEventListener('input', ()=>{ slGradAngleVal.textContent = `${slGradAngle.value}°`; state.slots.gradAngle = Number(slGradAngle.value); state.slots.slotFill = makeSlotFill(); persist(); sendState(); updatePreview(); });
  slGradP1.addEventListener('change', ()=>{ const v=clamp(parseInt(slGradP1.value||'0',10),0,100); slGradP1.value=String(v); state.slots.gradP1=v; state.slots.slotFill = makeSlotFill(); persist(); sendState(); updatePreview(); });
  slGradP2.addEventListener('change', ()=>{ const v=clamp(parseInt(slGradP2.value||'100',10),0,100); slGradP2.value=String(v); state.slots.gradP2=v; state.slots.slotFill = makeSlotFill(); persist(); sendState(); updatePreview(); });

    // transparency sliders
    const bindAlpha = (inputEl, labelEl, key)=>{
      const setFromUI = ()=>{
        const v = Math.max(0, Math.min(100, parseInt(inputEl.value||'0',10)));
        if (labelEl) labelEl.textContent = `${v}%`;
        state.slots[key] = v/100;
        persist(); sendState(); updatePreview();
      };
      inputEl.addEventListener('input', setFromUI);
      inputEl.addEventListener('change', setFromUI);
    };
    bindAlpha(slFrameAlpha, slFrameAlphaVal, 'frameAlpha');
    bindAlpha(slGlowAlpha,  slGlowAlphaVal,  'glowAlpha');
    bindAlpha(slVignetteAlpha, $('#sl-vignette-alpha-val'), 'vignetteAlpha');
    bindAlpha(slCenterAlpha,   $('#sl-center-alpha-val'),   'centerAlpha');
    bindAlpha(slSpinAlpha,     $('#sl-spin-alpha-val'),     'spinAlpha');

    // Game change
    slGame.addEventListener('change', async ()=>{
      state.slots.game = slGame.value || '';
      persist();
      await fetchIntoState();
      // Initialize enabledUser baselines
      (state.slots.legends||[]).forEach(it=>{ it.enabledUser = (it.enabled !== false); });
      (state.slots.weapons||[]).forEach(it=>{ it.enabledUser = (it.enabled !== false); });
      // Apply CS2 side filter if needed
      updateModeButtonsForGame();
      applyCs2SideFilter();
      // Re-render grids with new game data
      renderGrid(slLegends, state.slots.legends);
      renderGrid(slWeapons, state.slots.weapons);
      applySlotsView();
      sendState();
    });
    // NEW: view mode handlers (buttons)
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
    if (slWeaponOne) slWeaponOne.addEventListener('click', ()=>{
      ensureSlotsState();
      state.slots.view = 'weapon-one';
      applySlotsView();
      persist(); sendState();
    });
    slCharacterOnly.addEventListener('click', ()=>{
      ensureSlotsState();
      state.slots.view = 'character';
      applySlotsView();
      persist(); sendState();
    });
    // CS2 side events
    if (slSideAll) slSideAll.addEventListener('click', ()=>{
      ensureSlotsState(); state.slots.cs2Side='all'; applyCs2SideFilter(); reflectCs2SideButtons(); renderGrid(slWeapons, state.slots.weapons); persist(); sendState();
    });
    if (slSideCT) slSideCT.addEventListener('click', ()=>{
      ensureSlotsState(); state.slots.cs2Side='ct';  applyCs2SideFilter(); reflectCs2SideButtons(); renderGrid(slWeapons, state.slots.weapons); persist(); sendState();
    });
    if (slSideT) slSideT.addEventListener('click', ()=>{
      ensureSlotsState(); state.slots.cs2Side='t';   applyCs2SideFilter(); reflectCs2SideButtons(); renderGrid(slWeapons, state.slots.weapons); persist(); sendState();
    });


    slRescan.addEventListener('click', ()=> rescanAndRender(slLegends, slWeapons));
    slSpin.addEventListener('click', ()=>{
      ensureSlotsState();

      const view = state.slots.view || 'all';
      let plan = { legendSrc:'', weapon1Src:'', weapon2Src:'' };
      if (view === 'weapon-one'){
        const w = pickEnabled(state.slots.weapons);
        plan.weapon1Src = w?.src || '';
      } else if (view === 'weapons'){
        const [w1, w2] = uniquePickTwo(state.slots.weapons);
        plan.weapon1Src = w1?.src || '';
        plan.weapon2Src = w2?.src || '';
      } else if (view === 'character'){
        const legend = pickEnabled(state.slots.legends);
        plan.legendSrc = legend?.src || '';
      } else {
        const legend   = pickEnabled(state.slots.legends);
        const [w1, w2] = uniquePickTwo(state.slots.weapons);
        plan.legendSrc  = legend?.src || '';
        plan.weapon1Src = w1?.src || '';
        plan.weapon2Src = w2?.src || '';
      }

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
      await populateGames();
      await loadManifestIfEmpty();
      renderGrid(slLegends, state.slots.legends);
      // Initialize enabledUser baselines
      (state.slots.legends||[]).forEach(it=>{ if (typeof it.enabledUser==='undefined') it.enabledUser = (it.enabled !== false); });
      (state.slots.weapons||[]).forEach(it=>{ if (typeof it.enabledUser==='undefined') it.enabledUser = (it.enabled !== false); });
      updateModeButtonsForGame();
      applyCs2SideFilter();
      renderGrid(slWeapons, state.slots.weapons);
      applySlotsView(); // NEW
      // initialize alphas display + preview
      slFrameAlphaVal.textContent = `${Math.round((state.slots.frameAlpha??0.16)*100)}%`;
      slGlowAlphaVal.textContent  = `${Math.round((state.slots.glowAlpha??0.36)*100)}%`;
      if (typeof state.slots.vignetteAlpha==='number') $('#sl-vignette-alpha-val').textContent = `${Math.round(state.slots.vignetteAlpha*100)}%`;
      if (typeof state.slots.centerAlpha==='number')   $('#sl-center-alpha-val').textContent   = `${Math.round(state.slots.centerAlpha*100)}%`;
      if (typeof state.slots.spinAlpha==='number')     $('#sl-spin-alpha-val').textContent     = `${Math.round(state.slots.spinAlpha*100)}%`;
      // compute initial slotFill and kick a preview render
      if (!state.slots.slotFill){
        const ev = new Event('change'); slGradType.dispatchEvent(ev);
      }
      const evt = new Event('input');
      slFrameColor.dispatchEvent(evt); slAccent1.dispatchEvent(evt); slAccent2.dispatchEvent(evt);
      if (slGlowColor) slGlowColor.dispatchEvent(evt);
      renderHistory();
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
      // update history columns when switching back to this tab
      if (typeof panel._renderHistory === 'function') panel._renderHistory();
    }
  };
}
