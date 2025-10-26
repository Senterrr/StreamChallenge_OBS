// modes/wheel.js
export function init(ctx){
  const { root, state, persist, sendCmd, sendState, setMode, renderPreview } = ctx;
  const panel = root.wheel;
  let wired = false;

  function html(){
    return `
      <div class="title">Wheel Mode</div>
      <div class="card" style="margin-bottom:12px">
        <div class="field"><label>Title</label><input id="wh-title" class="input" placeholder="Challenge"/></div>
        <div class="field" style="flex-direction:column;align-items:stretch">
          <label class="hint">Items (one per line)</label>
          <textarea id="wh-items" class="textarea"></textarea>
        </div>
        <div class="panel">
          <button class="toolbtn" id="wh-apply">Apply Items</button>
          <button class="toolbtn" id="wh-reset">Reset</button>
        </div>
      </div>

      <div class="card" style="margin-bottom:12px">
        <div class="field" style="flex-wrap:wrap; gap:12px; align-items:center">
          <label>Colors</label>
          <input id="wh-col1" type="color" class="input" value="#7c3aed">
          <input id="wh-col2" type="color" class="input" value="#22d3ee">
          <input id="wh-col3" type="color" class="input" value="#10b981">
          <div class="hint">Wedge colors cycle, avoiding identical neighbors.</div>
        </div>
      </div>

      <div class="card" style="margin-bottom:12px">
        <div class="field" style="flex-wrap:wrap; gap:12px; align-items:center">
          <label style="display:inline-flex; align-items:center; gap:8px">
            <input type="checkbox" id="wh-sfx" checked> Enable SFX
          </label>
          <label style="display:inline-flex; align-items:center; gap:8px">
            <input type="checkbox" id="wh-vfx" checked> Enable VFX
          </label>
          <label for="wh-vignette">Vignette</label>
          <select id="wh-vignette" class="select">
            <option value="off">Off</option>
            <option value="normal">Normal</option>
            <option value="reverse">Reverse</option>
            <option value="both">Both (Normal + Glow)</option>
          </select>
          <div class="hint">Spin-only vignette and effects for the wheel.</div>
        </div>
      </div>

      <div class="card">
        <div class="panel">
          <button class="toolbtn" id="wh-spin">Spin</button>
          <button class="toolbtn" id="wh-stop">Stop</button>
        </div>
        <div class="hint">Enter/Space = Spin · Stop to finalize result.</div>
      </div>
    `;
  }

  function ensureWheelState(){
    if (!state.wheel) state.wheel = { sfx:true, vfx:true, vignette:'off', colors:['#7c3aed','#22d3ee','#10b981'] };
    if (!Array.isArray(state.wheel.colors)) state.wheel.colors = ['#7c3aed','#22d3ee','#10b981'];
    if (typeof state.wheel.sfx !== 'boolean') state.wheel.sfx = true;
    if (typeof state.wheel.vfx !== 'boolean') state.wheel.vfx = true;
    if (typeof state.wheel.vignette !== 'string') state.wheel.vignette = 'off';
  }

  function wire(){
    if (wired) return; wired = true;
    panel.innerHTML = html();
    const $ = (id)=>panel.querySelector(id);
    const whTitle = $('#wh-title');
    const whItems = $('#wh-items');
    const whApply = $('#wh-apply');
    const whReset = $('#wh-reset');
    const whSpin  = $('#wh-spin');
    const whStop  = $('#wh-stop');
    const whCol1  = $('#wh-col1');
    const whCol2  = $('#wh-col2');
    const whCol3  = $('#wh-col3');
    const whSfx   = $('#wh-sfx');
    const whVfx   = $('#wh-vfx');
    const whVignette = $('#wh-vignette');

    // seed
    ensureWheelState();
    whTitle.value = state.title;
    whItems.value = (state.items||[]).join('\n');
    whCol1.value = state.wheel.colors[0] || '#7c3aed';
    whCol2.value = state.wheel.colors[1] || '#22d3ee';
    whCol3.value = state.wheel.colors[2] || '#10b981';
    whSfx.checked = state.wheel.sfx !== false;
    whVfx.checked = state.wheel.vfx !== false;
    whVignette.value = state.wheel.vignette || 'off';

    // events
    whTitle.addEventListener('input', ()=>{ state.title=whTitle.value; persist(); renderPreview(); sendState(); });
    function applyItems(){
      const arr=whItems.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
      if(arr.length){ state.items=arr; state.current=0; state.done=[]; }
      persist(); renderPreview(); sendState();
    }
    whApply.addEventListener('click', applyItems);

    whReset.addEventListener('click', ()=>{ state.current=0; state.done=[]; persist(); sendState(); });
    whSpin.addEventListener('click',  ()=>{ const payload={ vel:0.24, friction:0.985 }; sendCmd('spin', payload); });
    whStop.addEventListener('click',  ()=>{ sendCmd('stop'); });

    // wheel colors
    function pushColors(){ state.wheel.colors=[whCol1.value, whCol2.value, whCol3.value]; persist(); sendState(); }
    whCol1.addEventListener('input', pushColors);
    whCol2.addEventListener('input', pushColors);
    whCol3.addEventListener('input', pushColors);

    // wheel fx
    whSfx.addEventListener('change', ()=>{ state.wheel.sfx = !!whSfx.checked; persist(); sendState(); });
    whVfx.addEventListener('change', ()=>{ state.wheel.vfx = !!whVfx.checked; persist(); sendState(); });
    whVignette.addEventListener('change', ()=>{ state.wheel.vignette = whVignette.value || 'off'; persist(); sendState(); });
  }

  return {
    show(){ if (state.mode !== 'wheel') { setMode('wheel'); } wire(); }
  };
}