import {state,activeMessages,findChat} from './state.js';
import {$,show,hide} from './dom.js';
import {renderAll,renderFeed,unmarkMessageLocallyGone} from './render.js';
import {getFirebase} from './firebase.js';
import {createOrOpenChatWithUsers,clearActiveChatHistory} from './chatStore.js';
import {doc,getDoc,updateDoc,deleteDoc,arrayRemove,deleteField,serverTimestamp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

let searchState={chatId:null,q:'',ids:[],idx:-1};
window.__ucmuDeleteIndex ||= Object.create(null);

const wait=ms=>new Promise(r=>setTimeout(r,ms));
const currentUid=()=>state.currentUser?.uid;
const activeChat=()=>findChat(state.activeChat);
const esc=s=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
const personName=(p,uid)=>p?.displayName||p?.username||p?.email||uid||'User';
const personUser=p=>p?.username?('@'+p.username):(p?.email||'');
function toast(text){let el=document.getElementById('fireDebugToast');if(!el){el=document.createElement('div');el.id='fireDebugToast';el.style.cssText='position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:99999;background:rgba(10,12,12,.96);color:#fff;border:1px solid rgba(255,255,255,.18);padding:10px 14px;box-shadow:0 12px 40px rgba(0,0,0,.55);font:12px system-ui;max-width:min(520px,calc(100vw - 28px));white-space:pre-wrap;pointer-events:none';document.body.appendChild(el)}el.textContent=text;clearTimeout(el._t);el._t=setTimeout(()=>el.remove(),4200)}
async function db(){return (await getFirebase()).db}

function rememberDeleteIndex(){
  const p=state.pendingDelete;
  if(!p||p.type!=='message')return;
  const idx=activeMessages().findIndex(m=>m.id===p.id);
  if(idx>=0)window.__ucmuDeleteIndex[p.id]=idx;
}
function restoreDeletedMessageToOldPlace(e){
  const commit=state.pendingDeleteCommit;
  if(!commit||commit.type!=='message')return false;
  e?.preventDefault?.();e?.stopPropagation?.();e?.stopImmediatePropagation?.();
  clearTimeout(state.undoTimer);state.undoTimer=null;state.pendingDeleteCommit=null;
  const list=state.messages[commit.chatId]||=[];
  if(commit.original&&!list.some(m=>m.id===commit.id)){
    const saved=window.__ucmuDeleteIndex[commit.id];
    const idx=Number.isFinite(saved)?saved:list.length;
    list.splice(Math.max(0,Math.min(idx,list.length)),0,commit.original);
  }
  delete window.__ucmuDeleteIndex[commit.id];
  unmarkMessageLocallyGone(commit.id);
  if(state.activeChat!==commit.chatId)state.activeChat=commit.chatId;
  renderFeed();hide($('#undoToast'));
  return true;
}

function setDeleteModalForType(){
  const row=$('.deleteAllRow');
  const hint=$('.deleteHint');
  const btn=$('#confirmDelete');
  if(!row||!btn)return;
  if(state.pendingDelete?.type==='chat'){
    row.style.display='none';
    if(hint)hint.textContent='Вы выйдете из чата. Если участников больше не останется, чат удалится.';
    btn.textContent='ВЫЙТИ ИЗ ЧАТА';
  }else{
    row.style.display='flex';
    if(hint)hint.textContent='Если удалить только для себя, сообщение можно вернуть в течение 5 секунд.';
    btn.textContent='УДАЛИТЬ';
  }
}

function animateChatTileThenLeave(chatId){
  const node=document.querySelector(`[data-chat-id="${CSS.escape(chatId)}"]`);
  if(node){
    const h=node.offsetHeight;
    node.style.height=h+'px';
    node.style.overflow='hidden';
    node.style.transition='opacity .34s ease,filter .34s ease,transform .38s cubic-bezier(.16,.86,.22,1),height .42s ease,margin .42s ease,padding .42s ease';
    node.classList.add('ucmuChatLeaving');
    void node.offsetHeight;
    node.style.opacity='0';
    node.style.filter='blur(8px) brightness(1.5)';
    node.style.transform='translateX(-26px) scale(.96)';
    node.style.height='0px';
    node.style.marginTop='0px';
    node.style.marginBottom='0px';
    node.style.paddingTop='0px';
    node.style.paddingBottom='0px';
  }
}
async function leaveChatById(chatId){
  const uid=currentUid();if(!chatId||!uid)return;
  animateChatTileThenLeave(chatId);
  await wait(420);
  try{
    const ref=doc(await db(),'chats',chatId);
    const snap=await getDoc(ref);
    if(!snap.exists())return;
    const data=snap.data()||{};
    const members=data.members||[];
    if(members.length<=1){
      await deleteDoc(ref).catch(()=>updateDoc(ref,{members:[],deleted:true,updatedAt:serverTimestamp()}));
      toast('Чат удалён: участников больше нет.');
    }else{
      await updateDoc(ref,{members:arrayRemove(uid),[`memberProfiles.${uid}`]:deleteField(),updatedAt:serverTimestamp()});
      toast('Вы вышли из чата.');
    }
    state.chats=state.chats.filter(c=>c.id!==chatId);
    delete state.messages[chatId];
    if(state.activeChat===chatId)state.activeChat=state.chats[0]?.id||null;
    renderAll();
  }catch(err){toast('Не удалось выйти из чата:\n'+(err.message||err.code||err));renderAll()}
}

function glowAndCollapseMessage(n,i){
  setTimeout(()=>{
    if(!n.isConnected)return;
    const h=n.offsetHeight;
    const cs=getComputedStyle(n);
    n.style.height=h+'px';n.style.maxHeight=h+'px';n.style.marginTop=cs.marginTop;n.style.marginBottom=cs.marginBottom;n.style.paddingTop=cs.paddingTop;n.style.paddingBottom=cs.paddingBottom;
    n.style.overflow='hidden';n.classList.add('ucmuClearDeleting');
    n.style.transition='opacity .48s ease,filter .48s ease,transform .52s cubic-bezier(.16,.86,.22,1),height .52s cubic-bezier(.16,.86,.22,1),max-height .52s cubic-bezier(.16,.86,.22,1),margin .52s ease,padding .52s ease';
    void n.offsetHeight;
    n.style.opacity='0';n.style.filter='blur(10px) brightness(1.45)';n.style.transform='translateX(-34px) scale(.94)';n.style.height='0px';n.style.maxHeight='0px';n.style.marginTop='0px';n.style.marginBottom='0px';n.style.paddingTop='0px';n.style.paddingBottom='0px';
  },i*55);
}
async function clearWithReliableAnimation(){
  const chatId=state.activeChat;
  const nodes=[...document.querySelectorAll('#feed [data-msg-id]')].reverse();
  const ids=nodes.map(n=>n.dataset.msgId).filter(Boolean);
  if(!chatId||!ids.length){await clearActiveChatHistory().catch(err=>toast('Не удалось очистить:\n'+(err.message||err.code||err)));return}
  window.__ucmuClearAnimatingChatId=chatId;
  nodes.forEach(glowAndCollapseMessage);
  const localDoneAt=Math.min(1450,ids.length*55+720);
  const unlock=()=>{if(window.__ucmuClearAnimatingChatId===chatId)delete window.__ucmuClearAnimatingChatId};
  setTimeout(()=>{if(state.messages[chatId])state.messages[chatId]=state.messages[chatId].filter(m=>!ids.includes(m.id));unlock();renderFeed()},localDoneAt);
  setTimeout(unlock,2200);
  clearActiveChatHistory().catch(err=>{unlock();renderFeed();toast('Не удалось очистить:\n'+(err.message||err.code||err))});
}

function ownerId(c){return c?.ownerId||c?.createdBy||c?.members?.[0]||null}
function renderRealMembers(){
  const c=activeChat();const list=$('#memberList'),panel=$('#members');if(!c||!list||!panel)return;
  const ids=(c.members||[]).filter(Boolean);const profiles=c.memberProfiles||{};const owner=ownerId(c);const canKick=currentUid()===owner;
  const title=panel.querySelector('.ph span');if(title)title.textContent=`УЧАСТНИКИ · ${ids.length}`;
  list.innerHTML=ids.map(uid=>{const p=profiles[uid]||{uid};return `<button class="member realMember" data-real-member-id="${esc(uid)}"><div class="ava s"></div><span><b>${esc(personName(p,uid))}</b><small>${esc(personUser(p))}${uid===owner?' · владелец':''}</small></span><i class="dot"></i>${canKick&&uid!==currentUid()?'<em>⋯</em>':''}</button>`}).join('')||'<div class="reactionEmpty">В чате нет участников</div>';
}
function openMemberProfile(uid){
  const c=activeChat();if(!c)return;const p=(c.memberProfiles||{})[uid]||{uid};const canKick=currentUid()===ownerId(c)&&uid!==currentUid();const box=$('#profileModal');
  $('#profileName').textContent=personName(p,uid)+(p?.username?' · @'+p.username:'');
  let actions=box.querySelector('.ucmuMemberActions');if(!actions){actions=document.createElement('div');actions.className='ucmuMemberActions';box.appendChild(actions)}
  actions.innerHTML=`<button class="modalCancel" data-member-more="${esc(uid)}">ПОДРОБНО</button><button class="modalConfirm" data-member-write="${esc(uid)}">НАПИСАТЬ</button>${canKick?`<button class="modalConfirm dangerMemberKick" data-member-kick="${esc(uid)}">ВЫГНАТЬ</button>`:''}`;
  show(box);
}
async function kickMember(uid){
  const chatId=state.activeChat;if(!chatId||!uid)return;
  try{await updateDoc(doc(await db(),'chats',chatId),{members:arrayRemove(uid),[`memberProfiles.${uid}`]:deleteField(),updatedAt:serverTimestamp()});const c=activeChat();if(c){c.members=(c.members||[]).filter(id=>id!==uid);if(c.memberProfiles)delete c.memberProfiles[uid]}renderRealMembers();toast('Участник удалён из чата.')}catch(err){toast('Не удалось выгнать участника:\n'+(err.message||err.code||err))}
}

function runChatSearch(){
  const input=$('#chatSearchInput');const q=input?.value?.trim().toLowerCase();const chatId=state.activeChat;if(!q||!chatId)return;
  if(searchState.chatId!==chatId||searchState.q!==q)searchState={chatId,q,ids:activeMessages().filter(m=>String(m.text||m.file||'').toLowerCase().includes(q)).map(m=>m.id),idx:-1};
  if(!searchState.ids.length){toast('Совпадений нет');return}
  searchState.idx=(searchState.idx+1)%searchState.ids.length;const id=searchState.ids[searchState.idx];const node=document.querySelector(`#feed [data-msg-id="${CSS.escape(id)}"]`);
  if(!node){renderFeed();setTimeout(runChatSearch,80);return}
  node.scrollIntoView({block:'center',behavior:'smooth'});node.classList.remove('ucmuSearchHit');void node.offsetWidth;node.classList.add('ucmuSearchHit');
}

function injectStyles(){
  document.getElementById('ucmu-v147-style')?.remove();
  const style=document.createElement('style');style.id='ucmu-v147-style';style.textContent=`
    #chatCtx .chatAction[data-a="delete"],#moreChatCtx .moreChatAction[data-a="delete"]{font-size:0!important}#chatCtx .chatAction[data-a="delete"]::before,#moreChatCtx .moreChatAction[data-a="delete"]::before{content:'↪ Выйти из чата';font-size:13px!important}
    .ucmuClearDeleting .bubble{position:relative!important;box-shadow:0 0 0 1px rgba(255,45,55,.82),0 0 34px rgba(215,25,32,.85),0 0 80px rgba(215,25,32,.38)!important}.ucmuClearDeleting .bubble::after{content:''!important;position:absolute!important;inset:-18px!important;background:radial-gradient(circle,rgba(215,25,32,.42),rgba(215,25,32,.12) 36%,transparent 70%)!important;z-index:-1!important;pointer-events:none!important;animation:ucmuDeleteRedPulse .72s ease-out 1!important}@keyframes ucmuDeleteRedPulse{0%{opacity:0;transform:scale(.75)}25%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.24)}}
    .ucmuChatLeaving{box-shadow:0 0 0 1px rgba(255,45,55,.75),0 0 34px rgba(215,25,32,.75)!important;background:linear-gradient(90deg,rgba(215,25,32,.32),rgba(255,255,255,.04))!important}
    .centerModalCard{border:1px solid rgba(255,255,255,.14)!important;position:relative!important}.centerModalCard::before{content:''!important;position:absolute!important;inset:0!important;padding:1px!important;border-radius:inherit!important;background:linear-gradient(135deg,transparent 0%,transparent 22%,rgba(255,25,35,.08) 38%,rgba(255,25,35,1) 50%,rgba(255,25,35,.08) 62%,transparent 78%,transparent 100%)!important;background-size:320% 320%!important;background-position:120% 120%!important;-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0)!important;-webkit-mask-composite:xor!important;mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0)!important;mask-composite:exclude!important;opacity:0!important;pointer-events:none!important}.centerModal.seq-ready .centerModalCard::before{animation:ucmuFrameSweep147 1.05s ease-out 1!important}@keyframes ucmuFrameSweep147{0%{opacity:0;background-position:120% 120%}12%{opacity:1}78%{opacity:1}100%{opacity:0;background-position:-20% -20%}}
    .realMember{grid-template-columns:34px 1fr auto auto!important}.realMember span{display:flex!important;flex-direction:column!important;align-items:flex-start!important}.realMember b{font-size:13px;color:#fff}.realMember small{font-size:11px;color:var(--mut)}.realMember em{font-style:normal;color:rgba(255,255,255,.5)}.ucmuMemberActions{display:flex;gap:8px;padding:0 12px 12px;flex-wrap:wrap}.dangerMemberKick{background:linear-gradient(135deg,#d71920,#6f0b10)!important}.ucmuSearchHit .bubble{animation:ucmuSearchPulse 1.1s ease-out 1!important;box-shadow:0 0 0 1px rgba(255,255,255,.22),0 0 34px rgba(215,25,32,.48)!important}@keyframes ucmuSearchPulse{0%{filter:brightness(1);transform:scale(1)}18%{filter:brightness(1.8);transform:scale(1.018)}38%{filter:brightness(1.05);transform:scale(1)}58%{filter:brightness(1.65)}100%{filter:brightness(1)}}
  `;document.head.appendChild(style);
}

function bind(){
  injectStyles();
  $('#confirmDelete')?.addEventListener('pointerdown',rememberDeleteIndex,true);
  $('#confirmDelete')?.addEventListener('click',rememberDeleteIndex,true);
  $('#undoDelete')?.addEventListener('click',restoreDeletedMessageToOldPlace,true);
  document.addEventListener('click',async e=>{
    if(e.target.closest('#confirmDelete')&&state.pendingDelete?.type==='chat'){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();const id=state.pendingDelete.id;state.pendingDelete=null;hide($('#deleteModal'));await leaveChatById(id);return;
    }
    if(e.target.closest('.chatAction[data-a="delete"]'))setTimeout(setDeleteModalForType,0);
    if(e.target.closest('.moreChatAction[data-a="clear"]'))setTimeout(()=>{state.centerModalConfirm=async()=>{hide($('#modalShade'));hide($('#centerModal'));await wait(60);clearWithReliableAnimation()}},0);
    if(e.target.closest('.moreChatAction[data-a="delete"]'))setTimeout(()=>{const c=activeChat();const count=c?.members?.length||0;$('#modalTitle')&&( $('#modalTitle').textContent='Выйти из чата?' );$('#modalText')&&( $('#modalText').textContent=count<=1?'В чате нет других участников. Если выйти, чат будет удалён.':'Чат исчезнет из вашего списка. У остальных участников он останется.' );$('#modalConfirm')&&( $('#modalConfirm').textContent=count<=1?'ВЫЙТИ И УДАЛИТЬ':'ВЫЙТИ' );state.centerModalConfirm=async()=>{hide($('#modalShade'));hide($('#centerModal'));await leaveChatById(state.activeChat)}},0);
    if(e.target.closest('#membersBtn'))setTimeout(renderRealMembers,60);
    const mid=e.target.closest('[data-real-member-id]')?.dataset.realMemberId;if(mid){e.preventDefault();openMemberProfile(mid);return}
    const write=e.target.closest('[data-member-write]')?.dataset.memberWrite;if(write){hide($('#profileModal'));const c=activeChat();const p=(c?.memberProfiles||{})[write]||{uid:write};await createOrOpenChatWithUsers([{uid:write,...p}]);return}
    const kick=e.target.closest('[data-member-kick]')?.dataset.memberKick;if(kick){hide($('#profileModal'));await kickMember(kick);return}
    if(e.target.closest('[data-member-more]')){toast('Подробный профиль добавим отдельным экраном.');return}
    if(e.target.closest('#searchBtn')&&$('#headerSearch')?.classList.contains('show')&&$('#chatSearchInput')?.value?.trim()){e.preventDefault();setTimeout(runChatSearch,20);return}
  },true);
  document.addEventListener('keydown',e=>{if(e.key==='Enter'&&document.activeElement?.id==='chatSearchInput'){e.preventDefault();runChatSearch()}},true);
  setInterval(()=>{if(window.__ucmuClearAnimatingChatId&&document.visibilityState==='visible'){/* safety only */}},3000);
}

export function initV147Patch(){
  delete window.__ucmuClearAnimatingChatId;
  bind();
  window.UCMU={version:'v147-stability-delete-clear-members',note:'single stable patch: no v145/v146 stacked handlers, reliable red clear animation, chat leave animation, safe members render, search'};
}
