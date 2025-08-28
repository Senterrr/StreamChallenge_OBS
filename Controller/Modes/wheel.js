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

      <div class="card">
        <div class="panel">
          <button class="toolbtn" id="wh-spin">Spin</button>
          <button class="toolbtn" id="wh-stop">Stop</button>
        </div>
        <div class="hint">Enter/Space = Spin · Stop to finalize result.</div>
      </div>
    `;
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

    // seed
    whTitle.value = state.title;
    whItems.value = (state.items||[]).join('\n');

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
  }

  return {
    show(){ if (state.mode !== 'wheel') { setMode('wheel'); } wire(); }
  };
}