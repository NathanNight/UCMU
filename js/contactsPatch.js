import {state,findChat} from './state.js';
import {$,show,hide,placeMenu} from './dom.js';
import {renderAll} from './render.js';
import {listKnownUsers,searchUsersByUsername,createOrOpenChatWithUsers,updateActiveChatMeta,clearActiveChatHistory,deleteActiveChat} from './chatStore.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
let selected = new Map();
let contacts = [];
let searchResults = [];

function toast(text){
  let el=document.getElementById('fireDebugToast');
  if(!el){el=document.createElement('div');el.id='fireDebugToast';el.style.cssText='position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:99999;background:rgba(10,12,12,.96);color:#fff;border:1px solid rgba(255,255,255,.18);padding:10px 14px;box-shadow:0 12px 40px rgba(0,0,0,.55);font:12px system-ui;max-width:min(520px,calc(100vw - 28px));white-space:pre-wrap;pointer-events:none';document.body.appendChild(el)}
  el.textContent=text;clearTimeout(el._t);el._t=setTimeout(()=>el.remove(),4200)
}
function personName(u){return u.displayName||u.username||u.email||'User'}
function personUser(u){return u.username ? '@'+u.username : (u.email||u.uid||'')}

function inject(){
  if($('#contactsModal')) return;
  const profile = document.querySelector('.profile');
  if(profile) profile.insertAdjacentHTML('afterend', '<div class="sideQuickActions"><button class="sideQuick" id="contactsBtn" title="Контакты">♙</button><button class="sideQuick" id="sideNewChatBtn" title="Новый чат">＋</button><button class="sideQuick" id="sideSettingsBtn" title="Настройки чата">⋮</button></div>');
  document.body.insertAdjacentHTML('beforeend', `
    <section class="private float hidden contactsModal" id="contactsModal">
      <div class="ph"><span>Контакты</span><button class="close" id="closeContacts">×</button></div>
      <input id="contactsSearch" placeholder="Поиск контактов или @username">
      <div class="contactHint">Выбери одного или нескольких людей, потом нажми “Начать чат”.</div>
      <div id="contactsSelected" class="contactsSelected"></div>
      <div class="sec">Контакты</div><div id="contactsList"></div>
      <div class="sec">Поиск по @username</div><div id="contactsResults"></div>
      <button class="primary" id="startSelectedChat">НАЧАТЬ ЧАТ</button>
    </section>
    <section class="private float hidden" id="chatSettingsModal">
      <div class="ph"><span>Настройки чата</span><button class="close" id="closeChatSettings">×</button></div>
      <input id="chatSetTitle" placeholder="Название чата">
      <input id="chatSetDesc" placeholder="Описание чата">
      <div class="sec">Цвет</div>
      <div class="folderColorRow chatColorRow" id="chatSetColors">
        ${['#d71920','#2f7dff','#2fc46b','#d6a22c','#8b5cf6','#ff4fb8','#7dd3fc','#777'].map(c=>`<button style="width:32px;height:32px;background:${c};border:1px solid var(--line)" data-chat-color="${c}"></button>`).join('')}
      </div>
      <button class="primary" id="saveChatSettings">СОХРАНИТЬ</button>
    </section>
    <div class="float hidden ctx" id="moreChatCtx">
      <button class="ctxAction moreChatAction" data-a="settings">⚙ Настройки чата</button>
      <button class="ctxAction moreChatAction" data-a="clear">🧹 Очистить историю</button>
      <button class="ctxAction moreChatAction danger" data-a="delete">🗑 Удалить чат</button>
    </div>`);
  const style=document.createElement('style');
  style.textContent=`.sideQuickActions{display:flex;gap:8px;margin:0 14px 10px}.sideQuick{width:42px;height:38px;background:rgba(255,255,255,.045);border:1px solid var(--line);color:#fff;font-weight:900}.sideQuick:hover{background:rgba(255,255,255,.08)}.contactsModal{width:min(420px,calc(100vw - 28px));left:310px;top:96px}.contactsModal input,#chatSettingsModal input{width:100%;height:42px;margin:8px 0 10px;padding:0 12px}.contactHint{font-size:12px;color:var(--mut);margin:0 0 10px}.contactRow{width:100%;display:grid;grid-template-columns:34px 1fr auto auto;gap:10px;align-items:center;padding:8px;background:rgba(255,255,255,.035);border:0;margin-bottom:4px;text-align:left}.contactRow.active{background:rgba(255,255,255,.11)}.contactRow b{display:block;color:#fff}.contactRow small{color:var(--mut)}.contactIconBtn{width:32px;height:30px;background:rgba(255,255,255,.045);border:1px solid var(--line);color:#fff}.contactsSelected{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}.contactChip{padding:4px 8px;background:rgba(255,255,255,.09);font-size:12px;color:#fff}.chatColorRow button.active{outline:2px solid #fff;outline-offset:2px}.collapsed .sideQuickActions{display:flex;flex-direction:column;margin:8px 0;align-items:center}.collapsed .sideQuick{width:44px}.collapsed .scrollList{max-height:calc(100vh - 170px)}.collapsed .folderBtn{display:none!important}.collapsed .chat{width:58px!important;margin:0 auto!important}.collapsed .chat .logo,.collapsed .chat .ava{margin:0!important}.collapsed .chat>div:not(.logo):not(.ava),.collapsed .chat .extra{display:none!important}`;
  document.head.appendChild(style);
}

async function openContacts(){selected.clear();contacts=await listKnownUsers().catch(e=>{toast('Не удалось загрузить контакты:\n'+(e.message||e));return []});searchResults=[];$('#contactsSearch').value='';renderContacts();show($('#contactsModal'))}
function renderSelected(){$('#contactsSelected').innerHTML=[...selected.values()].map(u=>`<span class="contactChip">${esc(personName(u))}</span>`).join('')}
function rowTpl(u){const active=selected.has(u.uid);return `<button class="contactRow ${active?'active':''}" data-contact-uid="${esc(u.uid)}"><div class="ava s"></div><div><b>${esc(personName(u))}</b><small>${esc(personUser(u))}</small></div><button class="contactIconBtn" data-profile-uid="${esc(u.uid)}">👁</button><button class="contactIconBtn" data-start-uid="${esc(u.uid)}">➤</button></button>`}
function renderContacts(){renderSelected();$('#contactsList').innerHTML=contacts.length?contacts.map(rowTpl).join(''):'<div class="reactionEmpty">Пока контактов нет. Найди человека по @username.</div>';$('#contactsResults').innerHTML=searchResults.length?searchResults.map(rowTpl).join(''):'<div class="reactionEmpty">Введите @username для поиска.</div>'}
function findPerson(uid){return [...contacts,...searchResults].find(u=>u.uid===uid)}
async function doUsernameSearch(){const q=$('#contactsSearch').value.trim();if(!q||q.length<2){searchResults=[];renderContacts();return}searchResults=await searchUsersByUsername(q).catch(e=>{toast('Поиск не сработал:\n'+(e.message||e));return []});renderContacts()}
function openProfileFor(u){if(!u)return;$('#profileName').textContent=personName(u)+(u.username?' · @'+u.username:'');show($('#profileModal'))}
async function startWith(users){const id=await createOrOpenChatWithUsers(users).catch(e=>{toast('Не удалось создать чат:\n'+(e.message||e));return null});if(id){hide($('#contactsModal'));selected.clear();renderAll()}}
function openChatSettings(){const c=findChat(state.activeChat);if(!c)return;$('#chatSetTitle').value=c.title||'';$('#chatSetDesc').value=c.description||'';const color=c.styleColor||'#d71920';document.querySelectorAll('[data-chat-color]').forEach(b=>b.classList.toggle('active',b.dataset.chatColor===color));state.chatSettingsColor=color;show($('#chatSettingsModal'))}

export function initContactsPatch(){
  inject();
  document.addEventListener('click',async e=>{
    if(e.target.closest('#contactsBtn,#sideNewChatBtn')){e.preventDefault();openContacts();return}
    if(e.target.closest('#closeContacts')){hide($('#contactsModal'));return}
    if(e.target.closest('#closeChatSettings')){hide($('#chatSettingsModal'));return}
    const more=e.target.closest('#moreBtn,#sideSettingsBtn');if(more){e.preventDefault();placeMenu($('#moreChatCtx'),e.clientX||window.innerWidth-170,e.clientY||92);return}
    const uid=e.target.closest('[data-contact-uid]')?.dataset.contactUid;if(uid&&!e.target.closest('[data-profile-uid],[data-start-uid]')){const u=findPerson(uid);if(u){selected.has(uid)?selected.delete(uid):selected.set(uid,u);renderContacts()}return}
    const puid=e.target.closest('[data-profile-uid]')?.dataset.profileUid;if(puid){openProfileFor(findPerson(puid));return}
    const suid=e.target.closest('[data-start-uid]')?.dataset.startUid;if(suid){const u=findPerson(suid);if(u)await startWith([u]);return}
    if(e.target.closest('#startSelectedChat')){await startWith([...selected.values()]);return}
    const color=e.target.closest('[data-chat-color]');if(color){state.chatSettingsColor=color.dataset.chatColor;document.querySelectorAll('[data-chat-color]').forEach(b=>b.classList.toggle('active',b===color));return}
    if(e.target.closest('#saveChatSettings')){await updateActiveChatMeta({title:$('#chatSetTitle').value.trim(),description:$('#chatSetDesc').value.trim(),styleColor:state.chatSettingsColor||'#d71920'}).catch(err=>toast('Не удалось сохранить:\n'+(err.message||err)));hide($('#chatSettingsModal'));return}
    const act=e.target.closest('.moreChatAction')?.dataset.a;
    if(act==='settings'){hide($('#moreChatCtx'));openChatSettings();return}
    if(act==='clear'){hide($('#moreChatCtx'));if(confirm('Очистить всю историю этого чата?'))await clearActiveChatHistory().catch(err=>toast('Не удалось очистить:\n'+(err.message||err)));return}
    if(act==='delete'){hide($('#moreChatCtx'));if(confirm('Удалить чат?'))await deleteActiveChat().catch(err=>toast('Не удалось удалить чат:\n'+(err.message||err)));return}
  },true);
  let t=null;document.addEventListener('input',e=>{if(e.target?.id==='contactsSearch'){clearTimeout(t);t=setTimeout(doUsernameSearch,260)}},true)
}
