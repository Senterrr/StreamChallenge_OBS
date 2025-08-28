// modes/list.js
export function init(ctx){
  const { root, state, persist, sendCmd, sendState, setMode, renderPreview } = ctx;
  const panel = root.list;
  let wired = false;

  function html(){
    return `
      <div class="title">List Mode</div>
      <div class="card" style="margin-bottom:12px">
        <div class="field"><label>Title</label><input id="li-title" class="input" placeholder="Challenge"/></div>
        <div class="field"><label>Progressive</label><label><input type="checkbox" id="li-prog"> Enable</label></div>
        <div class="field"><label>Orientation</label>
          <button class="toolbtn" data-orient="horizontal" id="li-h">Horizontal</button>
          <button class="toolbtn" data-orient="vertical"   id="li-v">Vertical</button>
        </div>
        <div class="field"><label>Alignment</label>
          <button class="toolbtn" data-align="left"   id="li-al">Left</button>
          <button class="toolbtn" data-align="center" id="li-ac">Center</button>
          <button class="toolbtn" data-align="right"  id="li-ar">Right</button>
        </div>
        <div class="field"><label>Scale</label><input id="li-scale" class="input" type="number" step="0.05" min="0.2" max="3" value="1"></div>
        <div class="field"><label>Insets</label><input id="li-insets" class="input" placeholder="36,48,36,48" title="Top,Right,Bottom,Left"/></div>
      </div>

      <div class="card" style="margin-bottom:12px">
        <div class="field" style="flex-direction:column;align-items:stretch">
          <label class="hint">Items (one per line)</label>
          <textarea id="li-items" class="textarea"></textarea>
        </div>
        <div class="panel">
          <button class="toolbtn" id="li-apply">Apply Items</button>
          <button class="toolbtn" id="li-reset">Reset</button>
          <button class="toolbtn" id="li-prev">Prev</button>
          <button class="toolbtn" id="li-next">Next / Progress</button>
          <button class="toolbtn" id="li-toggle">Toggle Done</button>
          <button class="toolbtn" id="li-goto1">Goto 1</button>
        </div>
      </div>
    `;
  }

  function wire(){
    if (wired) return; wired = true;
    panel.innerHTML = html();
    const $ = (id)=>panel.querySelector(id);
    const liTitle = $('#li-title');
    const liProg  = $('#li-prog');
    const liH     = $('##li-h'.slice(1));
    const liV     = $('##li-v'.slice(1));
    const liAL    = $('##li-al'.slice(1));
    const liAC    = $('##li-ac'.slice(1));
    const liAR    = $('##li-ar'.slice(1));
    const liScale = $('#li-scale');
    const liInsets= $('#li-insets');
    const liItems = $('#li-items');
    const liApply = $('#li-apply');
    const liReset = $('#li-reset');
    const liPrev  = $('#li-prev');
    const liNext  = $('#li-next');
    const liToggle= $('#li-toggle');
    const liGoto1 = $('#li-goto1');

    // seed
    liTitle.value = state.title;
    liProg.checked = !!state.progressive;
    liScale.value = state.scale;
    liInsets.value = state.insets;
    liItems.value = (state.items||[]).join('\n');

    // events
    liTitle.addEventListener('input', ()=>{ state.title=liTitle.value; persist(); renderPreview(); sendState(); });
    liProg.addEventListener('change', ()=>{ state.progressive=liProg.checked; persist(); renderPreview(); sendState(); });
    liH.addEventListener('click', ()=>{ state.orientation='horizontal'; persist(); renderPreview(); sendState(); });
    liV.addEventListener('click', ()=>{ state.orientation='vertical'; persist(); renderPreview(); sendState(); });
    liAL.addEventListener('click',()=>{ state.align='left';   persist(); renderPreview(); sendState(); });
    liAC.addEventListener('click',()=>{ state.align='center'; persist(); renderPreview(); sendState(); });
    liAR.addEventListener('click',()=>{ state.align='right';  persist(); renderPreview(); sendState(); });
    liScale.addEventListener('change', ()=>{ state.scale=parseFloat(liScale.value)||1; persist(); sendState(); });
    liInsets.addEventListener('change',()=>{ state.insets=liInsets.value.trim(); persist(); sendState(); });

    function applyItems(){
      const arr=liItems.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
      if(arr.length){ state.items=arr; state.current=0; state.done=[]; }
      persist(); renderPreview(); sendState();
    }
    liApply.addEventListener('click', applyItems);

    liReset.addEventListener('click', ()=>{ state.current=0; state.done=[]; persist(); sendState(); });
    liPrev.addEventListener('click',  ()=>{ sendCmd('prev'); });
    liNext.addEventListener('click',  ()=>{ sendCmd('next'); });
    liToggle.addEventListener('click',()=>{ sendCmd('toggleDone'); });
    liGoto1.addEventListener('click', ()=>{ sendCmd('goto',0); });
  }

  return {
    show(){
      // when tab is shown, ensure mode is list
      if (state.mode !== 'list') { setMode('list'); }
      wire();
    }
  };
}