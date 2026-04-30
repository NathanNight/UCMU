import {state,findChat} from './state.js';
import {$,show,hide} from './dom.js';
import {renderFeed} from './render.js';
import {getFirebase} from './firebase.js';
import {createOrOpenChatWithUsers} from './chatStore.js';
import {doc,getDoc,updateDoc,arrayRemove,deleteField,serverTimestamp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const profileCache=new Map();
const esc=s=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
const currentUid=()=>state.currentUser?.uid;
const activeChat=()=>findChat(state.activeChat);
const ownerId=c=>c?.ownerId||c?.createdBy||c?.members?.[0]||null;
const displayName=(p,uid)=>p?.displayName||p?.username||p?.email||(uid===currentUid()?state.user:'User');
const displaySub=p=>p?.username?('@'+p.username):(p?.email||'');
async function db(){return (await getFirebase()).db}
function toast(text){let el=document.getElementById('fireDebugToast');if(!el){el=document.createElement('div');el.id='fireDebugToast';el.style.cssText='position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:99999;background:rgba(10,12,12,.96);color:#fff;border:1px solid rgba(255,255,255,.18);padding:10px 14px;box-shadow:0 12px 40px rgba(0,0,0,.55);font:12px system-ui;max-width:min(520px,calc(100vw - 28px));white-space:pre-wrap;pointer-events:none';document.body.appendChild(el)}el.textContent=text;clearTimeout(el._t);el._t=setTimeout(()=>el.remove(),4200)}
async function getUserProfile(uid){
  if(!uid)return null;
  if(profileCache.has(uid))return profileCache.get(uid);
  const local=(activeChat()?.memberProfiles||{})[uid];
  if(local&&(local.displayName||local.username||local.email)){const p={uid,...local};profileCache.set(uid,p);return p}
  try{const snap=await getDoc(doc(await db(),'users',uid));if(snap.exists()){const p={uid,...snap.data()};profileCache.set(uid,p);return p}}catch{}
  const p={uid,displayName:uid===currentUid()?state.user:'User'};profileCache.set(uid,p);return p;
}
function closeTransient(){hide($('#profileModal'));hide($('#moreChatCtx'));hide($('#chatCtx'));hide($('#ctx'))}
function unlockFeed(){delete window.__ucmuClearAnimatingChatId;renderFeed()}
async function openMemberProfile(uid){
  const c=activeChat();if(!c)return;
  const base=(c.memberProfiles||{})[uid]||{};
  const p={...base,...(await getUserProfile(uid)||{})};
  const canKick=currentUid()===ownerId(c)&&uid!==currentUid();
  const box=$('#profileModal');if(!box)return;
  box.innerHTML=`<div class="ph"><span>Профиль</span><button class="close" id="closeProfile">×</button></div><div class="profileStub ucmuProfileCard"><div class="ava"></div><div class="profileInfo"><b>${esc(displayName(p,uid))}${p.username?' · @'+esc(p.username):''}</b><p>${esc(displaySub(p)||'Профиль пока пустой')}</p></div><div class="ucmuMemberActions"><button type="button" class="modalCancel" data-member-more="${esc(uid)}">☰ ПОДРОБНЕЕ</button><button type="button" class="modalConfirm" data-member-write="${esc(uid)}">✉ НАПИСАТЬ</button>${canKick?`<button type="button" class="modalConfirm dangerMemberKick" data-member-kick="${esc(uid)}">⛔ УДАЛИТЬ ИЗ ЧАТА</button>`:''}</div></div>`;
  show(box);
}
async function kickMember(uid){
  const c=activeChat();if(!c||!uid)return;
  const p=(c.memberProfiles||{})[uid]||await getUserProfile(uid)||{uid};
  if(!confirm(`Удалить ${displayName(p,uid)} из чата?`))return;
  try{
    await updateDoc(doc(await db(),'chats',c.id),{members:arrayRemove(uid),[`memberProfiles.${uid}`]:deleteField(),updatedAt:serverTimestamp()});
    c.members=(c.members||[]).filter(id=>id!==uid);
    if(c.memberProfiles)delete c.memberProfiles[uid];
    hide($('#profileModal'));
    toast('Участник удалён из чата.');
  }catch(err){toast('Не удалось удалить участника:\n'+(err.message||err.code||err))}
}
function renderRealMembersLite(){
  const c=activeChat(),list=$('#memberList'),panel=$('#members');if(!c||!list||!panel)return;
  const ids=(c.members||[]).filter(Boolean),profiles=c.memberProfiles||{},owner=ownerId(c);
  const title=panel.querySelector('.ph span');if(title)title.textContent=`УЧАСТНИКИ · ${ids.length}`;
  list.innerHTML=ids.map(uid=>{const p=profiles[uid]||{};const sub=[displaySub(p),uid===owner?'владелец':''].filter(Boolean).join(' · ');return `<button class="member realMember" data-real-member-id="${esc(uid)}"><div class="ava s"></div><span><b>${esc(displayName(p,uid))}</b><small>${esc(sub)}</small></span><i class="dot"></i></button>`}).join('')||'<div class="reactionEmpty">В чате нет участников</div>';
}
function installSweepFallback(){
  document.getElementById('ucmu-v151-style')?.remove();
  const style=document.createElement('style');
  style.id='ucmu-v151-style';
  style.textContent=`
    .realMember span{display:flex!important;flex-direction:column!important;align-items:flex-start!important;min-width:0}.realMember b{font-size:13px;color:#fff;max-width:190px;overflow:hidden;text-overflow:ellipsis}.realMember small{font-size:11px;color:var(--mut);max-width:190px;overflow:hidden;text-overflow:ellipsis}
    .ucmuProfileCard{align-items:flex-start!important;flex-wrap:wrap!important}.profileInfo{min-width:0;flex:1}.profileInfo b{display:block;max-width:230px;overflow:hidden;text-overflow:ellipsis}.ucmuMemberActions{width:100%;display:grid!important;grid-template-columns:1fr!important;gap:8px!important;margin-top:10px!important}.ucmuMemberActions button{min-height:38px!important;width:100%!important}.dangerMemberKick{background:linear-gradient(135deg,#d71920,#6f0b10)!important}
    .centerModalCard::before,.centerModalCard::after{content:none!important;display:none!important}
    .centerModalCard{border:1px solid rgba(255,255,255,.18)!important;box-shadow:0 28px 90px rgba(0,0,0,.68),inset 0 1px 0 rgba(255,255,255,.08)!important}
    .centerModal.seq-ready .centerModalCard{animation:ucmuSimpleFramePulse151 .7s ease-out 1!important}@keyframes ucmuSimpleFramePulse151{0%{box-shadow:0 28px 90px rgba(0,0,0,.68),0 0 0 1px rgba(215,25,32,0)}35%{box-shadow:0 28px 90px rgba(0,0,0,.68),0 0 0 1px rgba(255,25,35,1),0 0 18px rgba(255,25,35,.6)}100%{box-shadow:0 28px 90px rgba(0,0,0,.68),0 0 0 1px rgba(215,25,32,0)}}
  `;
  document.head.appendChild(style);
}
function bind(){
  installSweepFallback();
  document.addEventListener('click',async e=>{
    const chatEl=e.target.closest?.('[data-chat-id]');
    if(chatEl){closeTransient();setTimeout(unlockFeed,120)}
    if(e.target.closest?.('#membersBtn'))setTimeout(renderRealMembersLite,80);
    const mid=e.target.closest?.('[data-real-member-id]')?.dataset.realMemberId;if(mid){e.preventDefault();await openMemberProfile(mid);return}
    const write=e.target.closest?.('[data-member-write]')?.dataset.memberWrite;if(write){hide($('#profileModal'));const p=await getUserProfile(write)||{uid:write};await createOrOpenChatWithUsers([{uid:write,...p}]);return}
    const kick=e.target.closest?.('[data-member-kick]')?.dataset.memberKick;if(kick){await kickMember(kick);return}
    if(e.target.closest?.('[data-member-more]')){toast('Полный профиль будет отдельным экраном.');return}
    if(e.target.closest?.('#closeProfile')){hide($('#profileModal'));return}
  },true);
  setInterval(()=>{if(window.__ucmuClearAnimatingChatId){delete window.__ucmuClearAnimatingChatId;renderFeed()}},1500);
}
export function initV151Patch(){
  delete window.__ucmuClearAnimatingChatId;
  bind();
  window.UCMU={version:'v151-emergency-stable-chat',note:'emergency stable load: v150 removed, chat input restored, real member profile buttons, simple non-broken frame pulse'};
}
