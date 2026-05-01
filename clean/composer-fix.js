function textFromFake(fake){
  return (fake?.innerText || '').replace(/\u00a0/g,' ').trim();
}
function updateSend(fake){
  const send=document.querySelector('#sendBtn');
  if(!send)return;
  const has=!!textFromFake(fake);
  send.textContent=has?'➤':'🎙';
  send.classList.toggle('ready',has);
}
function insertPlainText(text){
  const sel=window.getSelection();
  if(!sel || !sel.rangeCount)return;
  const range=sel.getRangeAt(0);
  range.deleteContents();
  range.insertNode(document.createTextNode(text));
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}
function patchComposer(){
  const native=document.querySelector('#msgInput');
  const compose=document.querySelector('.compose');
  if(!native || !compose || document.querySelector('#msgInputFake'))return;
  native.classList.add('msgInputNativeHidden');
  native.setAttribute('tabindex','-1');
  native.setAttribute('aria-hidden','true');
  const fake=document.createElement('div');
  fake.id='msgInputFake';
  fake.className='msgInputFake';
  fake.contentEditable='true';
  fake.setAttribute('role','textbox');
  fake.setAttribute('enterkeyhint','send');
  fake.setAttribute('data-placeholder','Напишите сообщение...');
  native.insertAdjacentElement('afterend',fake);
  fake.addEventListener('input',()=>{native.value=fake.innerText;updateSend(fake);window.dispatchEvent(new Event('resize'))});
  fake.addEventListener('keydown',e=>{
    if(e.key==='Enter' && !e.shiftKey){
      e.preventDefault();
      native.value=textFromFake(fake);
      document.querySelector('#sendBtn')?.click();
      setTimeout(()=>{fake.textContent='';native.value='';updateSend(fake)},0);
    }
  });
  fake.addEventListener('paste',e=>{
    e.preventDefault();
    insertPlainText((e.clipboardData||window.clipboardData).getData('text/plain'));
    native.value=fake.innerText;
    updateSend(fake);
  });
  const send=document.querySelector('#sendBtn');
  if(send && !send.__ucmuFakeBound){
    send.__ucmuFakeBound=1;
    send.addEventListener('click',()=>setTimeout(()=>{
      fake.textContent=''; native.value=''; updateSend(fake);
    },30),true);
  }
  updateSend(fake);
}
new MutationObserver(patchComposer).observe(document.documentElement,{childList:true,subtree:true});
setInterval(patchComposer,500);
patchComposer();
window.UCMU_COMPOSER_READY='contenteditable-v1';
