import {state,findChat} from './state.js';
import {$,show,hide} from './dom.js';
import {renderAll} from './render.js';
import {createOrOpenChatWithUsers} from './chatStore.js';
import {getFirebase} from './firebase.js';
import {doc,updateDoc,arrayRemove,deleteField,serverTimestamp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const esc=s=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
const currentUid=()=>state.currentUser?.uid;
const activeChat=()=>findChat(state.activeChat);
const ownerId=c=>c?.ownerId||c?.createdBy||c?.members?.[0]||null;
const displayName=(p,uid)=>p?.displayName||p?.username||p?.email||(uid===currentUid()?state.user:'User');
const displaySub=p=>p?.username?('@'+p.username):(p?.email||'');

function toast(text){let el=document.getElementById('fireDebugToast');if(!el){el=document.createElement('div');el.id='fireDebugToast';el.style.cssText='position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:99999;background:rgba(10,12,12,.96);color:#fff;border:1px solid rgba(255,255,255,.18);padding:10px 14px;box-shadow:0 12px 40px rgba(0,0,0,.55);font:12px system-ui;max-width:min(520px,calc(100vw - 28px));white-space:pre-wrap;pointer-events:none';document.body.appendChild(el)}el.textContent=text;clearTimeout(el._t);el._t=setTimeout(()=>el.remove(),4200)}
async function db(){return (await getFirebase()).db}
function profileFor(uid,source='chat'){
  if(source==='contact'&&window.__ucmuContactProfiles?.has?.(uid))return {uid,...window.__ucmuContactProfiles.get(uid)};
  const c=activeChat();
  const p={uid,...((c?.memberProfiles||{})[uid]||{})};
  if(uid===currentUid()){
    p.displayName=p.displayName||state.currentUser?.displayName||state.user;
    p.username=p.username||state.currentUser?.username||'';
    p.email=p.email||state.currentUser?.email||'';
  }
  return p;
}
function injectStyles(){
  if(document.getElementById('ucmu-member-profile-style'))return;
  const style=document.createElement('style');style.id='ucmu-member-profile-style';style.textContent=`
    #profileModal .profileStub.ucmuProfileCard{display:flex!important;gap:14px!important;align-items:flex-start!important;flex-wrap:wrap!important;padding:14px!important}
    #profileModal .ucmuProfileInfo{min-width:0;flex:1}
    #profileModal .ucmuProfileInfo b{display:block;color:#fff;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    #profileModal .ucmuProfileInfo p{margin:5px 0 0;color:var(--mut);font-size:12px;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    #profileModal .ucmuMemberActions{width:100%;display:grid!important;grid-template-columns:1fr!important;gap:8px!important;margin-top:8px!important}
    #profileModal .ucmuMemberActions button{width:100%!important;min-height:38px!important;display:block!important;opacity:1!important;visibility:visible!important}
    #profileModal .dangerMemberKick,#profileModal .dangerContactRemove{background:linear-gradient(135deg,#d71920,#6f0b10)!important;color:#fff!important}
  `;document.head.appendChild(style)
}
function openMemberProfile(uid,source='chat'){
  const c=activeChat();if(!uid)return;
  const p=profileFor(uid,source);
  const canKick=source==='chat'&&c&&currentUid()===ownerId(c)&&uid!==currentUid();
  const box=$('#profileModal');if(!box)return;
  box.innerHTML=`
    <div class="ph"><span>Профиль</span><button class="close" id="closeProfile">×</button></div>
    <div class="profileStub ucmuProfileCard">
      <div class="ava"></div>
      <div class="ucmuProfileInfo"><b id="profileName">${esc(displayName(p,uid))}</b><p>${esc(displaySub(p)||'Профиль пока пустой')}</p></div>
      <div class="ucmuMemberActions">
        <button type="button" class="modalCancel" data-member-more="${esc(uid)}">☰ ПОДРОБНЕЕ</button>
        <button type="button" class="modalConfirm" data-member-write="${esc(uid)}">✉ НАПИСАТЬ</button>
        ${canKick?`<button type="button" class="modalConfirm dangerMemberKick" data-member-kick="${esc(uid)}">⛔ УДАЛИТЬ ИЗ ЧАТА</button>`:''}
        ${source==='contact'?`<button type="button" class="modalConfirm dangerContactRemove" data-contact-remove="${esc(uid)}">✕ УДАЛИТЬ ИЗ КОНТАКТОВ</button>`:''}
      </div>
    </div>`;
  show(box);
}
async function writeToMember(uid){const p=profileFor(uid,window.__ucmuContactProfiles?.has?.(uid)?'contact':'chat');hide($('#profileModal'));await createOrOpenChatWithUsers([{uid,...p}])}
async function kickMember(uid){
  const c=activeChat();if(!c||!uid)return;
  if(currentUid()!==ownerId(c))return toast('Удалять участников может только владелец чата.');
  if(uid===currentUid())return toast('Нельзя удалить себя через эту кнопку.');
  const p=profileFor(uid,'chat');if(!confirm(`Удалить ${displayName(p,uid)} из чата?`))return;
  try{await updateDoc(doc(await db(),'chats',c.id),{members:arrayRemove(uid),[`memberProfiles.${uid}`]:deleteField(),updatedAt:serverTimestamp()});c.members=(c.members||[]).filter(id=>id!==uid);if(c.memberProfiles)delete c.memberProfiles[uid];hide($('#profileModal'));renderAll();toast('Участник удалён из чата.')}catch(err){toast('Не удалось удалить участника:\n'+(err.message||err.code||err))}
}
function removeContact(uid){window.__ucmuContactProfiles?.delete?.(uid);hide($('#profileModal'));document.querySelector(`[data-contact-member-id="${CSS.escape(uid)}"]`)?.remove();toast('Контакт удалён из локального списка.')}
export function initMemberProfile(){
  injectStyles();
  const closeMembers=$('#closeMembers');if(closeMembers){closeMembers.onclick=()=>{hide($('#members'));hide($('#profileModal'))}}
  document.addEventListener('click',async e=>{
    const chat=e.target.closest?.('[data-chat-id]');if(chat)hide($('#profileModal'));
    if(e.target.closest?.('#closeProfile')){hide($('#profileModal'));return}
    const uid=e.target.closest?.('[data-real-member-id]')?.dataset.realMemberId;if(uid){e.preventDefault();e.stopPropagation();openMemberProfile(uid,'chat');return}
    const cuid=e.target.closest?.('[data-contact-member-id]')?.dataset.contactMemberId;if(cuid){e.preventDefault();e.stopPropagation();openMemberProfile(cuid,'contact');return}
    const more=e.target.closest?.('[data-member-more]')?.dataset.memberMore;if(more){toast('Полный профиль будет отдельным экраном.');return}
    const write=e.target.closest?.('[data-member-write]')?.dataset.memberWrite;if(write){await writeToMember(write);return}
    const kick=e.target.closest?.('[data-member-kick]')?.dataset.memberKick;if(kick){await kickMember(kick);return}
    const rem=e.target.closest?.('[data-contact-remove]')?.dataset.contactRemove;if(rem){removeContact(rem);return}
  },true)
}
