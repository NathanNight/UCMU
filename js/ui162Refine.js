import {$,show,hide,toggle} from './dom.js';
import {state} from './state.js';

function placeStickersPanel(){
  const panel=$('#stickers');
  const btn=$('#stickerBtn');
  if(!panel||!btn)return;
  toggle(panel);
  const r=btn.getBoundingClientRect();
  panel.style.right=(window.innerWidth-r.right)+'px';
  panel.style.left='auto';
  panel.style.bottom=(window.innerHeight-r.top+10)+'px';
  panel.style.top='auto';
}

function updateSendMode(){
  const input=$('#input');
  const send=$('#send');
  if(!input||!send)return;
  const hasText=!!input.value.trim();
  send.classList.toggle('hasText',hasText);
  send.classList.toggle('isMic',!hasText);
  send.textContent=hasText?'➤':'🎙';
  send.title=hasText?'Отправить':'Голосовое сообщение';
}

function polishDeleteModal(){
  const modal=$('#deleteModal');
  if(!modal)return;
  const title=modal.querySelector('.ph span');
  if(title)title.textContent='УДАЛИТЬ?';
  const hint=modal.querySelector('.deleteHint');
  if(hint)hint.textContent='';
  const row=modal.querySelector('.deleteAllRow');
  if(row&&modal.classList.contains('messageDeleteStrict')){
    row.style.setProperty('display','flex','important');
  }
}

function fixContactsPosition(){
  const cm=$('#contactsModal');
  if(!cm)return;
  const side=$('#side');
  const w=side?.getBoundingClientRect?.().width||330;
  cm.style.left=w+'px';
  cm.style.right='auto';
  cm.style.top='96px';
}

export function initUi162Refine(){
  const input=$('#input');
  const send=$('#send');
  const sticker=$('#stickerBtn');
  if(input){input.addEventListener('input',updateSendMode);input.addEventListener('change',updateSendMode)}
  if(send){send.addEventListener('click',e=>{if(!$('#input')?.value?.trim()){e.preventDefault();}},true)}
  if(sticker){sticker.onclick=e=>{e.preventDefault();placeStickersPanel()}}
  updateSendMode();

  document.addEventListener('click',e=>{
    if(e.target.closest?.('[data-a="delete"]'))setTimeout(polishDeleteModal,0);
    if(e.target.closest?.('#contactsBtn'))setTimeout(fixContactsPosition,0);
    if(e.target.closest?.('[data-chat-id]'))setTimeout(()=>{
      hide($('#deleteModal'));hide($('#profileModal'));hide($('#contactsModal'));
    },0);
  },true);

  const mo=new MutationObserver(()=>{polishDeleteModal();fixContactsPosition();updateSendMode()});
  mo.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
}
