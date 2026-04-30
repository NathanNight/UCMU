let activeResolve = null;

function ensureModal(){
  if(document.getElementById('ucmuCenterModal')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="ucmuModalLayer" id="ucmuModalLayer" aria-hidden="true">
      <div class="ucmuModalBack" id="ucmuModalBack"></div>
      <section class="ucmuCenterModal" id="ucmuCenterModal">
        <div class="ucmuModalHead">
          <span id="ucmuModalTitle">Подтверждение</span>
          <button id="ucmuModalClose" type="button">×</button>
        </div>
        <div class="ucmuModalBody" id="ucmuModalBody"></div>
        <div class="ucmuModalActions" id="ucmuModalActions"></div>
      </section>
    </div>
  `);
  const style = document.createElement('style');
  style.textContent = `
    .ucmuModalLayer{position:fixed;inset:0;z-index:90000;display:grid;place-items:center;opacity:0;pointer-events:none;transition:opacity .22s ease}.ucmuModalLayer.show{opacity:1;pointer-events:auto}.ucmuModalBack{position:absolute;inset:0;background:rgba(0,0,0,.56);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);opacity:0;transition:opacity .22s ease}.ucmuModalLayer.show .ucmuModalBack{opacity:1}.ucmuCenterModal{position:relative;width:min(460px,calc(100vw - 28px));background:linear-gradient(180deg,rgba(18,24,24,.96),rgba(7,10,10,.98));box-shadow:0 26px 90px rgba(0,0,0,.72),inset 0 1px 0 rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);transform:scale(.01);opacity:0;transition:transform .24s cubic-bezier(.16,.92,.18,1),opacity .18s ease;overflow:hidden}.ucmuModalLayer.show .ucmuCenterModal{transform:scale(1);opacity:1}.ucmuModalLayer.closing .ucmuCenterModal{transform:scale(.01);opacity:0}.ucmuModalHead{height:48px;display:flex;align-items:center;justify-content:space-between;padding:0 14px;border-bottom:1px solid rgba(255,255,255,.08);background:linear-gradient(90deg,rgba(215,25,32,.16),rgba(255,255,255,.025))}.ucmuModalHead span{font-weight:900;letter-spacing:.08em;text-transform:uppercase}.ucmuModalHead button{width:34px;height:34px;background:transparent;border:0;color:#fff;font-size:22px}.ucmuModalBody{padding:16px}.ucmuModalBody p{margin:0 0 12px;color:#cfd6d6}.ucmuModalBody input,.ucmuModalBody textarea{width:100%;margin:7px 0 10px;padding:0 12px;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.13);color:#fff}.ucmuModalBody input{height:42px}.ucmuModalBody textarea{height:76px;padding-top:10px;resize:none}.ucmuModalActions{display:flex;gap:10px;justify-content:flex-end;padding:0 16px 16px}.ucmuModalActions button{height:40px;padding:0 16px;border:1px solid rgba(255,255,255,.12);color:#fff;background:rgba(255,255,255,.055);font-weight:900}.ucmuModalActions .primary{background:linear-gradient(135deg,#d71920,#7a0d12);border-color:rgba(255,75,75,.55)}.ucmuModalActions .danger{background:linear-gradient(135deg,#d71920,#4d070b);border-color:rgba(255,75,75,.7)}.ucmuColorRow{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 4px}.ucmuColorRow button{width:32px;height:32px;border:1px solid rgba(255,255,255,.18)}.ucmuColorRow button.active{outline:2px solid #fff;outline-offset:2px}.ucmuMuted{color:#8f9999;font-size:12px;margin-top:8px}
  `;
  document.head.appendChild(style);
  document.getElementById('ucmuModalClose').onclick = () => closeModal(null);
  document.getElementById('ucmuModalBack').onclick = () => closeModal(null);
}

function closeModal(value){
  const layer=document.getElementById('ucmuModalLayer');
  if(!layer) return;
  layer.classList.add('closing');
  layer.classList.remove('show');
  setTimeout(()=>{
    layer.classList.remove('closing');
    document.getElementById('ucmuModalBody').innerHTML='';
    document.getElementById('ucmuModalActions').innerHTML='';
    if(activeResolve){activeResolve(value);activeResolve=null;}
  },230);
}

export function initModalPatch(){ ensureModal(); }

export function askModal({title='Подтверждение', html='', ok='OK', cancel='Отмена', danger=false}={}){
  ensureModal();
  document.getElementById('ucmuModalTitle').textContent=title;
  document.getElementById('ucmuModalBody').innerHTML=html;
  document.getElementById('ucmuModalActions').innerHTML=`<button type="button" id="ucmuModalCancel">${cancel}</button><button type="button" class="${danger?'danger':'primary'}" id="ucmuModalOk">${ok}</button>`;
  const layer=document.getElementById('ucmuModalLayer');
  requestAnimationFrame(()=>layer.classList.add('show'));
  document.getElementById('ucmuModalCancel').onclick=()=>closeModal(null);
  return new Promise(resolve=>{activeResolve=resolve;document.getElementById('ucmuModalOk').onclick=()=>closeModal(true);});
}

export function formModal({title='Настройки', html='', ok='Сохранить', cancel='Отмена', danger=false, read}={}){
  ensureModal();
  document.getElementById('ucmuModalTitle').textContent=title;
  document.getElementById('ucmuModalBody').innerHTML=html;
  document.getElementById('ucmuModalActions').innerHTML=`<button type="button" id="ucmuModalCancel">${cancel}</button><button type="button" class="${danger?'danger':'primary'}" id="ucmuModalOk">${ok}</button>`;
  const layer=document.getElementById('ucmuModalLayer');
  requestAnimationFrame(()=>layer.classList.add('show'));
  document.getElementById('ucmuModalCancel').onclick=()=>closeModal(null);
  return new Promise(resolve=>{activeResolve=resolve;document.getElementById('ucmuModalOk').onclick=()=>closeModal(read ? read() : true);});
}
