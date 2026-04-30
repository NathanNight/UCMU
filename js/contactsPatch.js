import {state,findChat,activeMessages} from './state.js';
import {$,show,hide,placeMenu} from './dom.js';
import {renderAll,renderFeed,markMessageLocallyGone,unmarkMessageLocallyGone} from './render.js';
import {listKnownUsers,searchUsersByUsername,createOrOpenChatWithUsers,createStandaloneChat,updateActiveChatMeta,clearActiveChatHistory,deleteActiveChat} from './chatStore.js';

const esc=s=>String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
let selected=new Map(),contacts=[],searchResults=[];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
window.__ucmuDeleteIndex ||= {};

function toast(text){let el=document.getElementById('fireDebugToast');if(!el){el=document.createElement('div');el.id='fireDebugToast';el.style.cssText='position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:99999;background:rgba(10,12,12,.96);color:#fff;border:1px solid rgba(255,255,255,.18);padding:10px 14px;box-shadow:0 12px 40px rgba(0,0,0,.55);font:12px system-ui;max-width:min(520px,calc(100vw - 28px));white-space:pre-wrap;pointer-events:none';document.body.appendChild(el)}el.textContent=text;clearTimeout(el._t);el._t=setTimeout(()=>el.remove(),4200)}
function personName(u){return u.displayName||u.username||u.email||'User'}
function personUser(u){return u.username?'@'+u.username:(u.email||u.uid||'')}

function inject(){
  if($('#contactsModal'))return;
  const profile=document.querySelector('.profile');
  if(profile)profile.insertAdjacentHTML('afterend','<div class="sideQuickActions"><button class="sideQuick" id="contactsBtn" title="Контакты">♙</button><button class="sideQuick" id="sideNewChatBtn" title="Новый чат">＋</button></div>');
  document.body.insertAdjacentHTML('beforeend',`
    <section class="private float hidden contactsModal" id="contactsModal">
      <div class="ph"><span>Контакты</span><button class="close" id="closeContacts">×</button></div>
      <input id="contactsSearch" placeholder="Поиск контактов или @username">
      <div class="contactHint">Выбери одного или нескольких людей, потом нажми “Начать чат”.</div>
      <div id="contactsSelected" class="contactsSelected"></div>
      <div class="sec">Контакты</div><div id="contactsList"></div>
      <div class="sec">Поиск по @username</div><div id="contactsResults"></div>
      <button class="primary" id="startSelectedChat">НАЧАТЬ ЧАТ</button>
    </section>
    <div class="float hidden ctx" id="moreChatCtx">
      <button class="ctxAction moreChatAction" data-a="settings">⚙ Настройки чата</button>
      <button class="ctxAction moreChatAction" data-a="clear">🧹 Очистить историю</button>
      <button class="ctxAction moreChatAction danger" data-a="delete">🗑 Удалить чат</button>
    </div>
    <div class="modalShade hidden" id="modalShade"></div>
    <section class="centerModal hidden" id="centerModal"><div class="centerModalCard"><div class="modalKicker" id="modalKicker"></div><h3 id="modalTitle"></h3><p id="modalText"></p><div id="modalDynamic"></div><div class="modalActions"><button class="modalCancel" id="modalCancel">ОТМЕНА</button><button class="modalConfirm" id="modalConfirm">ПОДТВЕРДИТЬ</button></div></div></section>
  `);
  document.getElementById('ucmu-forced-modal-v143-style')?.remove();
  document.getElementById('ucmu-forced-modal-v141-style')?.remove();
  const style=document.createElement('style');
  style.id='ucmu-forced-modal-v144-style';
  style.textContent=`
.sideQuickActions{display:flex;gap:8px;margin:0 14px 10px}.sideQuick{width:42px;height:38px;background:rgba(255,255,255,.045);border:1px solid var(--line);color:#fff;font-weight:900}.sideQuick:hover{background:rgba(255,255,255,.08)}.contactsModal{width:min(420px,calc(100vw - 28px));left:310px;top:96px}.contactsModal input,.centerModal input{width:100%;height:42px;margin:8px 0 10px;padding:0 12px}.contactHint{font-size:12px;color:var(--mut);margin:0 0 10px}.contactRow{width:100%;display:grid;grid-template-columns:34px 1fr auto auto;gap:10px;align-items:center;padding:8px;background:rgba(255,255,255,.055);border:0;margin-bottom:4px;text-align:left;backdrop-filter:blur(10px)}.contactRow.active{background:rgba(255,255,255,.13)}.contactRow b{display:block;color:#fff}.contactRow small{color:var(--mut)}.contactIconBtn{width:32px;height:30px;background:rgba(255,255,255,.055);border:1px solid var(--line);color:#fff}.contactsSelected{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}.contactChip{padding:4px 8px;background:rgba(255,255,255,.09);font-size:12px;color:#fff}.modalColors{display:flex!important;gap:10px!important;flex-wrap:wrap!important;margin-top:12px!important}.modalColors button,.modalColorBtn,[data-modal-color]{width:34px!important;height:34px!important;min-width:34px!important;border-radius:50%!important;border:0!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18),0 0 18px rgba(255,255,255,.05)!important;overflow:hidden!important;padding:0!important}.modalColors button.active,.modalColorBtn.active,[data-modal-color].active{outline:2px solid #fff!important;outline-offset:3px!important;box-shadow:0 0 18px rgba(255,255,255,.25)!important}.collapsed .sideQuickActions{display:flex;flex-direction:column;margin:8px 0;align-items:center}.collapsed .sideQuick{width:44px}.collapsed .scrollList{max-height:calc(100vh - 170px)}.collapsed .folderBtn{display:none!important}.collapsed .chat{width:58px!important;margin:0 auto!important}.collapsed .chat .logo,.collapsed .chat .ava{margin:0!important}.collapsed .chat>div:not(.logo):not(.ava),.collapsed .chat .extra{display:none!important}.modalShade{position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.54);backdrop-filter:blur(8px);opacity:0;transition:opacity .15s ease}.modalShade.show{opacity:1}.centerModal{position:fixed;inset:0;z-index:9001;display:grid;place-items:center;pointer-events:none}.centerModalCard{width:min(430px,calc(100vw - 28px));position:relative;overflow:hidden;background:linear-gradient(135deg,rgba(28,34,34,.94),rgba(7,10,10,.96));border:1px solid rgba(255,255,255,.14);box-shadow:0 28px 90px rgba(0,0,0,.68),inset 0 1px 0 rgba(255,255,255,.08);padding:22px;transform:scale(.64);opacity:0;filter:blur(10px);transition:transform .17s cubic-bezier(.16,.86,.22,1),opacity .15s ease,filter .15s ease;pointer-events:auto}.centerModalCard::after{content:'';position:absolute;inset:-2px;border:1px solid transparent;background:linear-gradient(135deg,transparent 0%,transparent 42%,rgba(255,30,40,.85) 50%,transparent 58%,transparent 100%) border-box;mask:linear-gradient(#000 0 0) padding-box,linear-gradient(#000 0 0);mask-composite:exclude;opacity:0;pointer-events:none}.centerModal.seq-ready .centerModalCard::after{animation:modalRedSweep .62s ease-out 1}.centerModal.show .centerModalCard{transform:scale(1);opacity:1;filter:blur(0)}.modalKicker{font-size:11px;color:#ff444b;letter-spacing:.18em;font-weight:900;min-height:14px}.centerModal h3{margin:8px 0 8px;font-size:22px;min-height:28px}.centerModal p{margin:0 0 14px;color:var(--mut);min-height:18px}.modalActions{display:flex;gap:10px;justify-content:flex-end;margin-top:16px;opacity:0;transform:translateY(8px);transition:opacity .16s ease,transform .16s ease}.centerModal.seq-ready .modalActions{opacity:1;transform:none}.modalCancel,.modalConfirm{height:40px;padding:0 15px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.045);color:#fff;font-weight:900}.modalConfirm{background:linear-gradient(135deg,#d71920,#8a1116)}#modalDynamic{opacity:0;filter:blur(8px);transform:translateY(10px);transition:opacity .18s ease,filter .18s ease,transform .18s ease}#modalDynamic.show{opacity:1;filter:blur(0);transform:none}.bubble,.chat,.folder-item{background:rgba(255,255,255,.065)!important;backdrop-filter:blur(12px)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.075),0 12px 38px rgba(0,0,0,.12)!important}.bubble{border:0!important}.chat{border:0!important}.ucmu-clear-delete .bubble{position:relative!important;box-shadow:0 0 0 1px rgba(255,45,55,.95),0 0 44px rgba(215,25,32,.9),0 0 110px rgba(215,25,32,.5)!important}.ucmu-clear-delete .bubble::after{content:''!important;position:absolute!important;inset:-30px!important;background:radial-gradient(circle,rgba(255,35,45,.72),rgba(215,25,32,.28) 38%,transparent 72%)!important;z-index:-1!important;pointer-events:none!important;animation:clearRedPulse .95s ease-out 1!important}@keyframes clearRedPulse{0%{opacity:0;transform:scale(.72)}20%{opacity:1;transform:scale(1)}75%{opacity:.82;transform:scale(1.12)}100%{opacity:0;transform:scale(1.28)}}@keyframes modalBlink3{0%,22%,44%{opacity:1}11%,33%,55%{opacity:.12}100%{opacity:1}}@keyframes modalRedSweep{0%{opacity:0;transform:translateX(-35%) translateY(35%)}20%{opacity:.95}100%{opacity:0;transform:translateX(35%) translateY(-35%)}}.modalBlinkDone{animation:modalBlink3 .36s steps(2,end) 1}`;
  document.head.appendChild(style);
}

async function typeInto(el,text,delay=12){el.textContent='';for(const ch of String(text||'')){el.textContent+=ch;await wait(delay)}el.classList.remove('modalBlinkDone');void el.offsetWidth;el.classList.add('modalBlinkDone')}
function openCenterModal({kicker='CONFIRM',title='Подтверждение',text='',html='',confirm='ПОДТВЕРДИТЬ',danger=false,onConfirm}){
  const shade=$('#modalShade'),modal=$('#centerModal'),dyn=$('#modalDynamic');
  modal.classList.remove('seq-ready');dyn.classList.remove('show');
  $('#modalKicker').textContent='';$('#modalTitle').textContent='';$('#modalText').textContent='';dyn.innerHTML=html;
  $('#modalConfirm').textContent=confirm;$('#modalConfirm').style.background=danger?'linear-gradient(135deg,#d71920,#6f0b10)':'linear-gradient(135deg,#d71920,#8a1116)';
  state.centerModalConfirm=onConfirm;hide(modal);hide(shade);show(shade);show(modal);
  requestAnimationFrame(async()=>{shade.classList.add('show');modal.classList.add('show');await wait(95);typeInto($('#modalKicker'),kicker,12);await wait(120);typeInto($('#modalTitle'),title,14);await wait(95);typeInto($('#modalText'),text,9);await wait(120);dyn.classList.add('show');await wait(230);modal.classList.add('seq-ready')});
}
function closeCenterModal(){const shade=$('#modalShade'),modal=$('#centerModal');shade.classList.remove('show');modal.classList.remove('show','seq-ready');setTimeout(()=>{hide(shade);hide(modal);$('#modalDynamic').innerHTML=''},170)}

async function openContacts(){selected.clear();contacts=await listKnownUsers().catch(e=>{toast('Не удалось загрузить контакты:\n'+(e.message||e));return[]});searchResults=[];$('#contactsSearch').value='';renderContacts();show($('#contactsModal'))}
function colorPicker(active='#d71920'){return `<div class="modalColors">${['#d71920','#2f7dff','#2fc46b','#d6a22c','#8b5cf6','#ff4fb8','#7dd3fc','#777'].map(c=>`<button class="modalColorBtn ${c===active?'active':''}" style="background:${c}" data-modal-color="${c}"></button>`).join('')}</div>`}
function openCreateChatForm(){state.modalChatColor='#d71920';openCenterModal({kicker:'CREATE CHAT',title:'Создать чат',text:'Задай имя, описание и цвет.',html:`<input id="newChatTitle" placeholder="Название чата"><input id="newChatDesc" placeholder="Описание">${colorPicker()}`,confirm:'СОЗДАТЬ',onConfirm:async()=>{const title=$('#newChatTitle')?.value?.trim()||'Новый чат',description=$('#newChatDesc')?.value?.trim()||'',styleColor=state.modalChatColor||'#d71920';closeCenterModal();await createStandaloneChat({title,description,styleColor}).catch(e=>toast('Не удалось создать чат:\n'+(e.message||e)));renderAll()}})}
function renderSelected(){$('#contactsSelected').innerHTML=[...selected.values()].map(u=>`<span class="contactChip">${esc(personName(u))}</span>`).join('')}
function rowTpl(u){const active=selected.has(u.uid);return `<button class="contactRow ${active?'active':''}" data-contact-uid="${esc(u.uid)}"><div class="ava s"></div><div><b>${esc(personName(u))}</b><small>${esc(personUser(u))}</small></div><button class="contactIconBtn" data-profile-uid="${esc(u.uid)}">👁</button><button class="contactIconBtn" data-start-uid="${esc(u.uid)}">➤</button></button>`}
function renderContacts(){renderSelected();$('#contactsList').innerHTML=contacts.length?contacts.map(rowTpl).join(''):'<div class="reactionEmpty">Пока контактов нет. Найди человека по @username.</div>';$('#contactsResults').innerHTML=searchResults.length?searchResults.map(rowTpl).join(''):'<div class="reactionEmpty">Введите @username для поиска.</div>'}
function findPerson(uid){return[...contacts,...searchResults].find(u=>u.uid===uid)}
async function doUsernameSearch(){const q=$('#contactsSearch').value.trim();if(!q||q.length<2){searchResults=[];renderContacts();return}searchResults=await searchUsersByUsername(q).catch(e=>{toast('Поиск не сработал:\n'+(e.message||e));return[]});renderContacts()}
function openProfileFor(u){if(!u)return;$('#profileName').textContent=personName(u)+(u.username?' · @'+u.username:'');show($('#profileModal'))}
async function startWith(users){const id=await createOrOpenChatWithUsers(users).catch(e=>{toast('Не удалось создать чат:\n'+(e.message||e));return null});if(id){hide($('#contactsModal'));selected.clear();renderAll()}}
function openChatSettings(){const c=findChat(state.activeChat);if(!c)return;state.modalChatColor=c.styleColor||'#d71920';openCenterModal({kicker:'CHAT SETTINGS',title:'Настройки чата',text:'Имя, описание и цвет плашки.',html:`<input id="chatSetTitle2" placeholder="Название чата" value="${esc(c.title||'')}"><input id="chatSetDesc2" placeholder="Описание чата" value="${esc(c.description||'')}">${colorPicker(state.modalChatColor)}`,confirm:'СОХРАНИТЬ',onConfirm:async()=>{const title=$('#chatSetTitle2')?.value?.trim()||'Чат',description=$('#chatSetDesc2')?.value?.trim()||'',styleColor=state.modalChatColor||'#d71920';closeCenterModal();await updateActiveChatMeta({title,description,styleColor}).catch(err=>toast('Не удалось сохранить:\n'+(err.message||err)));renderAll()}})}
function localCascadeClear(){
  const chatId=state.activeChat;
  const nodes=[...document.querySelectorAll('#feed [data-msg-id]')].reverse();
  const ids=nodes.map(n=>n.dataset.msgId).filter(Boolean);
  if(!chatId||!ids.length)return;
  window.__ucmuClearAnimatingChatId=chatId;
  ids.forEach(id=>markMessageLocallyGone(id));
  nodes.forEach((n,i)=>setTimeout(()=>{
    if(!n.isConnected)return;
    const h=n.offsetHeight;
    const cs=getComputedStyle(n);
    n.classList.add('ucmu-clear-delete');
    n.style.height=h+'px';
    n.style.maxHeight=h+'px';
    n.style.marginTop=cs.marginTop;
    n.style.marginBottom=cs.marginBottom;
    n.style.paddingTop=cs.paddingTop;
    n.style.paddingBottom=cs.paddingBottom;
    n.style.overflow='hidden';
    n.style.transition='transform .78s cubic-bezier(.16,.86,.22,1),opacity .72s ease,filter .72s ease,height .78s cubic-bezier(.16,.86,.22,1),max-height .78s cubic-bezier(.16,.86,.22,1),margin .78s ease,padding .78s ease';
    void n.offsetHeight;
    n.style.transform='translateX(-34px) scale(.94)';
    n.style.opacity='0';
    n.style.filter='blur(10px) brightness(1.7)';
    n.style.height='0px';
    n.style.maxHeight='0px';
    n.style.marginTop='0';
    n.style.marginBottom='0';
    n.style.paddingTop='0';
    n.style.paddingBottom='0';
  },i*85));
  const doneAt=Math.min(2200,ids.length*85+1050);
  setTimeout(()=>{if(state.messages[chatId])state.messages[chatId]=state.messages[chatId].filter(m=>!ids.includes(m.id));if(window.__ucmuClearAnimatingChatId===chatId)delete window.__ucmuClearAnimatingChatId;renderFeed()},doneAt);
}

export function initContactsPatch(){
  inject();
  document.addEventListener('click',async e=>{
    if(e.target.closest('#confirmDelete') && state.pendingDelete?.type==='message'){const id=state.pendingDelete.id;window.__ucmuDeleteIndex[id]=activeMessages().findIndex(m=>m.id===id);return}
    if(e.target.closest('#undoDelete') && state.pendingDeleteCommit?.type==='message'){
      e.preventDefault();e.stopImmediatePropagation();clearTimeout(state.undoTimer);state.undoTimer=null;
      const commit=state.pendingDeleteCommit;state.pendingDeleteCommit=null;
      const list=state.messages[commit.chatId] ||= [];
      if(commit.original && !list.some(m=>m.id===commit.id)){
        const idx=Number.isFinite(window.__ucmuDeleteIndex[commit.id])?window.__ucmuDeleteIndex[commit.id]:list.length;
        list.splice(Math.max(0,Math.min(idx,list.length)),0,commit.original);
      }
      unmarkMessageLocallyGone(commit.id);delete window.__ucmuDeleteIndex[commit.id];
      if(state.activeChat!==commit.chatId)state.activeChat=commit.chatId;
      renderFeed();hide($('#undoToast'));return;
    }
    if(e.target.closest('#newChat,#sideNewChatBtn')){e.preventDefault();e.stopImmediatePropagation();openCreateChatForm();return}
    if(e.target.closest('#contactsBtn')){e.preventDefault();e.stopImmediatePropagation();openContacts();return}
    if(e.target.closest('#closeContacts')){hide($('#contactsModal'));return}
    if(e.target.closest('#modalCancel')){closeCenterModal();return}
    if(e.target.closest('#modalConfirm')){if(state.centerModalConfirm)await state.centerModalConfirm();return}
    const modalColor=e.target.closest('[data-modal-color]');if(modalColor){state.modalChatColor=modalColor.dataset.modalColor;document.querySelectorAll('[data-modal-color]').forEach(b=>b.classList.toggle('active',b===modalColor));return}
    const more=e.target.closest('#moreBtn');if(more){e.preventDefault();placeMenu($('#moreChatCtx'),e.clientX||window.innerWidth-170,e.clientY||92);return}
    const uid=e.target.closest('[data-contact-uid]')?.dataset.contactUid;if(uid&&!e.target.closest('[data-profile-uid],[data-start-uid]')){const u=findPerson(uid);if(u){selected.has(uid)?selected.delete(uid):selected.set(uid,u);renderContacts()}return}
    const puid=e.target.closest('[data-profile-uid]')?.dataset.profileUid;if(puid){openProfileFor(findPerson(puid));return}
    const suid=e.target.closest('[data-start-uid]')?.dataset.startUid;if(suid){const u=findPerson(suid);if(u)await startWith([u]);return}
    if(e.target.closest('#startSelectedChat')){await startWith([...selected.values()]);return}
    const act=e.target.closest('.moreChatAction')?.dataset.a;
    if(act==='settings'){hide($('#moreChatCtx'));openChatSettings();return}
    if(act==='clear'){hide($('#moreChatCtx'));openCenterModal({kicker:'CLEAR HISTORY',title:'Очистить историю?',text:'Сообщения исчезнут каскадом снизу вверх.',confirm:'ОЧИСТИТЬ',danger:true,onConfirm:async()=>{closeCenterModal();localCascadeClear();clearActiveChatHistory().catch(err=>toast('Не удалось очистить:\n'+(err.message||err)))}});return}
    if(act==='delete'){hide($('#moreChatCtx'));openCenterModal({kicker:'DELETE CHAT',title:'Удалить чат?',text:'Чат исчезнет из списка участников.',confirm:'УДАЛИТЬ',danger:true,onConfirm:async()=>{closeCenterModal();deleteActiveChat().catch(err=>toast('Не удалось удалить чат:\n'+(err.message||err)))}});return}
  },true);
  let t=null;document.addEventListener('input',e=>{if(e.target?.id==='contactsSearch'){clearTimeout(t);t=setTimeout(doUsernameSearch,260)}},true)
}
