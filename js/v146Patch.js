import {state,activeMessages,findChat} from './state.js';
import {$,show,hide} from './dom.js';
import {renderAll,renderFeed} from './render.js';
import {getFirebase} from './firebase.js';
import {createOrOpenChatWithUsers} from './chatStore.js';
import {doc,getDoc,updateDoc,deleteDoc,arrayRemove,deleteField,serverTimestamp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const wait=ms=>new Promise(r=>setTimeout(r,ms));
let searchState={chatId:null,q:'',ids:[],idx:-1};

function currentUid(){return state.currentUser?.uid}
function activeChat(){return findChat(state.activeChat)}
function esc(s){return String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]))}
function personName(p,uid){return p?.displayName||p?.username||p?.email||uid||'User'}
function username(p){return p?.username?('@'+p.username):(p?.email||'')}
function toast(text){let el=document.getElementById('fireDebugToast');if(!el){el=document.createElement('div');el.id='fireDebugToast';el.style.cssText='position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:99999;background:rgba(10,12,12,.96);color:#fff;border:1px solid rgba(255,255,255,.18);padding:10px 14px;box-shadow:0 12px 40px rgba(0,0,0,.55);font:12px system-ui;max-width:min(520px,calc(100vw - 28px));white-space:pre-wrap;pointer-events:none';document.body.appendChild(el)}el.textContent=text;clearTimeout(el._t);el._t=setTimeout(()=>el.remove(),4200)}

async function db(){return (await getFirebase()).db}
async function leaveCurrentChat(){
  const chatId=state.activeChat,uid=currentUid();
  if(!chatId||!uid)return;
  const ref=doc(await db(),'chats',chatId);
  const snap=await getDoc(ref);
  if(!snap.exists())return;
  const data=snap.data()||{};
  const members=data.members||[];
  const isLast=members.length<=1;
  try{
    if(isLast){
      await deleteDoc(ref).catch(async()=>updateDoc(ref,{members:[],deleted:true,updatedAt:serverTimestamp()}));
      toast('Чат удалён: участников больше нет.');
    }else{
      await updateDoc(ref,{members:arrayRemove(uid),[`memberProfiles.${uid}`]:deleteField(),updatedAt:serverTimestamp()});
      toast('Вы вышли из чата.');
    }
    state.chats=state.chats.filter(c=>c.id!==chatId);
    delete state.messages[chatId];
    state.activeChat=state.chats[0]?.id||null;
    renderAll();
  }catch(err){toast('Не удалось выйти из чата:\n'+(err.message||err.code||err))}
}

async function kickMember(uid){
  const chatId=state.activeChat;
  if(!chatId||!uid)return;
  try{
    const ref=doc(await db(),'chats',chatId);
    await updateDoc(ref,{members:arrayRemove(uid),[`memberProfiles.${uid}`]:deleteField(),updatedAt:serverTimestamp()});
    toast('Участник удалён из чата.');
    const c=activeChat();
    if(c){c.members=(c.members||[]).filter(id=>id!==uid);if(c.memberProfiles)delete c.memberProfiles[uid]}
    renderRealMembers();
  }catch(err){toast('Не удалось выгнать участника:\n'+(err.message||err.code||err))}
}

function ownerId(c){return c?.ownerId||c?.createdBy||c?.members?.[0]||null}
function renderRealMembers(){
  const c=activeChat();
  const list=$('#memberList'),panel=$('#members');
  if(!list||!panel||!c)return;
  const ids=(c.members||[]).filter(Boolean);
  const profiles=c.memberProfiles||{};
  const owner=ownerId(c);
  const canKick=currentUid()&&currentUid()===owner;
  const title=panel.querySelector('.ph span');
  if(title)title.textContent=`УЧАСТНИКИ · ${ids.length}`;
  list.innerHTML=ids.map(uid=>{
    const p=profiles[uid]||{uid};
    const isOwner=uid===owner;
    return `<button class="member realMember" data-real-member-id="${esc(uid)}"><div class="ava s"></div><span><b>${esc(personName(p,uid))}</b><small>${esc(username(p))}${isOwner?' · владелец':''}</small></span><i class="dot"></i>${canKick&&uid!==currentUid()?'<em>⋯</em>':''}</button>`;
  }).join('')||'<div class="reactionEmpty">В чате нет участников</div>';
}

function openMemberProfile(uid){
  const c=activeChat();if(!c)return;
  const p=(c.memberProfiles||{})[uid]||{uid};
  const owner=ownerId(c);
  const canKick=currentUid()===owner&&uid!==currentUid();
  const box=$('#profileModal');
  $('#profileName').textContent=personName(p,uid)+(p.username?' · @'+p.username:'');
  let actions=box.querySelector('.ucmuMemberActions');
  if(!actions){actions=document.createElement('div');actions.className='ucmuMemberActions';box.appendChild(actions)}
  actions.innerHTML=`<button class="modalCancel" data-member-more="${esc(uid)}">ПОДРОБНО</button><button class="modalConfirm" data-member-write="${esc(uid)}">НАПИСАТЬ</button>${canKick?`<button class="modalConfirm dangerMemberKick" data-member-kick="${esc(uid)}">ВЫГНАТЬ</button>`:''}`;
  show(box);
}

function startClearAnimationNow(){
  const chatId=state.activeChat;
  const nodes=[...document.querySelectorAll('#feed [data-msg-id]')].reverse();
  const ids=nodes.map(n=>n.dataset.msgId).filter(Boolean);
  if(!chatId||!ids.length){renderFeed();return}
  window.__ucmuClearAnimatingChatId=chatId;
  nodes.forEach((n,i)=>setTimeout(()=>{
    if(!n.isConnected)return;
    const h=n.offsetHeight;
    const cs=getComputedStyle(n);
    n.style.height=h+'px';
    n.style.maxHeight=h+'px';
    n.style.marginTop=cs.marginTop;
    n.style.marginBottom=cs.marginBottom;
    n.style.paddingTop=cs.paddingTop;
    n.style.paddingBottom=cs.paddingBottom;
    n.style.overflow='hidden';
    n.style.transition='opacity .42s ease,filter .42s ease,transform .48s cubic-bezier(.16,.86,.22,1),height .48s cubic-bezier(.16,.86,.22,1),max-height .48s cubic-bezier(.16,.86,.22,1),margin .48s ease,padding .48s ease';
    void n.offsetHeight;
    n.style.opacity='0';
    n.style.filter='blur(10px)';
    n.style.transform='translateX(-34px) scale(.94)';
    n.style.height='0px';
    n.style.maxHeight='0px';
    n.style.marginTop='0px';
    n.style.marginBottom='0px';
    n.style.paddingTop='0px';
    n.style.paddingBottom='0px';
  },i*45));
  setTimeout(()=>{
    if(state.messages[chatId])state.messages[chatId]=state.messages[chatId].filter(m=>!ids.includes(m.id));
    if(window.__ucmuClearAnimatingChatId===chatId)delete window.__ucmuClearAnimatingChatId;
    renderFeed();
  },Math.min(1300,ids.length*45+650));
}

async function clearHistoryWithVisibleAnimation(){
  const chatId=state.activeChat;
  startClearAnimationNow();
  try{
    const mod=await import('./chatStore.js');
    await mod.clearActiveChatHistory();
  }catch(err){toast('Не удалось очистить:\n'+(err.message||err.code||err))}
}

function patchCenterModalLogic(){
  const modal=$('#centerModal');
  if(!modal)return;
  const title=$('#modalTitle')?.textContent||'';
  const text=$('#modalText');
  const confirm=$('#modalConfirm');
  if(/Очистить историю/.test(title)&&!modal.__ucmuV146Clear){
    modal.__ucmuV146Clear=true;
    state.centerModalConfirm=async()=>{hide($('#modalShade'));hide($('#centerModal'));await wait(60);clearHistoryWithVisibleAnimation()};
  }
  if(/Удалить чат/.test(title)&&!modal.__ucmuV146Leave){
    modal.__ucmuV146Leave=true;
    const c=activeChat();const count=c?.members?.length||0;
    $('#modalTitle').textContent=count<=1?'Выйти из чата?':'Выйти из чата?';
    if(text)text.textContent=count<=1?'В чате нет других участников. Если выйти, чат будет удалён.':'Чат исчезнет из вашего списка. У остальных участников он останется.';
    if(confirm)confirm.textContent=count<=1?'ВЫЙТИ И УДАЛИТЬ':'ВЫЙТИ';
    state.centerModalConfirm=async()=>{hide($('#modalShade'));hide($('#centerModal'));await leaveCurrentChat()};
  }
}

function patchDeleteConfirmButton(){
  const btn=$('#confirmDelete');
  if(!btn||btn.__ucmuV146LeavePatch)return;
  btn.__ucmuV146LeavePatch=true;
  const old=btn.onclick;
  btn.onclick=async e=>{
    if(state.pendingDelete?.type==='chat'){
      e?.preventDefault?.();
      const c=findChat(state.pendingDelete.id);
      if(c)state.activeChat=c.id;
      state.pendingDelete=null;
      hide($('#deleteModal'));
      await leaveCurrentChat();
      return;
    }
    return old?.call(btn,e);
  };
}

function runChatSearch(){
  const input=$('#chatSearchInput');
  const q=input?.value?.trim().toLowerCase();
  const chatId=state.activeChat;
  if(!q||!chatId)return;
  if(searchState.chatId!==chatId||searchState.q!==q){
    searchState={chatId,q,ids:activeMessages().filter(m=>String(m.text||m.file||'').toLowerCase().includes(q)).map(m=>m.id),idx:-1};
  }
  if(!searchState.ids.length){toast('Совпадений нет');return}
  searchState.idx=(searchState.idx+1)%searchState.ids.length;
  const id=searchState.ids[searchState.idx];
  const node=document.querySelector(`#feed [data-msg-id="${CSS.escape(id)}"]`);
  if(!node){renderFeed();setTimeout(runChatSearch,80);return}
  node.scrollIntoView({block:'center',behavior:'smooth'});
  node.classList.remove('ucmuSearchHit');
  void node.offsetWidth;
  node.classList.add('ucmuSearchHit');
}

function injectStyles(){
  document.getElementById('ucmu-v146-style')?.remove();
  const style=document.createElement('style');
  style.id='ucmu-v146-style';
  style.textContent=`
    #chatCtx .chatAction[data-a="delete"]{font-size:0!important}#chatCtx .chatAction[data-a="delete"]::before{content:'↪ Выйти из чата';font-size:13px!important}
    #moreChatCtx .moreChatAction[data-a="delete"]{font-size:0!important}#moreChatCtx .moreChatAction[data-a="delete"]::before{content:'↪ Выйти из чата';font-size:13px!important}
    .centerModalCard{border:1px solid rgba(255,255,255,.14)!important}.centerModalCard::after{content:''!important;position:absolute!important;inset:0!important;padding:1px!important;border:0!important;border-radius:inherit!important;background:linear-gradient(135deg,transparent 0%,transparent 32%,rgba(255,25,35,.05) 39%,rgba(255,25,35,1) 50%,rgba(255,25,35,.05) 61%,transparent 68%,transparent 100%)!important;background-size:260% 260%!important;background-position:120% 120%!important;-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0)!important;-webkit-mask-composite:xor!important;mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0)!important;mask-composite:exclude!important;opacity:0!important;pointer-events:none!important}.centerModal.seq-ready .centerModalCard::after{animation:ucmuBorderSweepV146 1s ease-out 1!important}@keyframes ucmuBorderSweepV146{0%{opacity:0;background-position:120% 120%}16%{opacity:1}70%{opacity:1}100%{opacity:0;background-position:-20% -20%}}
    .realMember{grid-template-columns:34px 1fr auto auto!important}.realMember span{display:flex!important;flex-direction:column!important;align-items:flex-start!important}.realMember b{font-size:13px;color:#fff}.realMember small{font-size:11px;color:var(--mut)}.realMember em{font-style:normal;color:rgba(255,255,255,.5)}.ucmuMemberActions{display:flex;gap:8px;padding:0 12px 12px;flex-wrap:wrap}.dangerMemberKick{background:linear-gradient(135deg,#d71920,#6f0b10)!important}.ucmuSearchHit .bubble{animation:ucmuSearchPulse 1.15s ease-out 1!important;box-shadow:0 0 0 1px rgba(255,255,255,.22),0 0 34px rgba(215,25,32,.48)!important}@keyframes ucmuSearchPulse{0%{filter:brightness(1);transform:scale(1)}18%{filter:brightness(1.8);transform:scale(1.018)}38%{filter:brightness(1.05);transform:scale(1)}58%{filter:brightness(1.65)}100%{filter:brightness(1)}}
  `;
  document.head.appendChild(style);
}

function bindV146(){
  injectStyles();
  patchDeleteConfirmButton();
  new MutationObserver(()=>{patchCenterModalLogic();patchDeleteConfirmButton();if(!$('#members')?.classList.contains('hidden'))renderRealMembers()}).observe(document.body,{childList:true,subtree:true,characterData:true});
  document.addEventListener('click',async e=>{
    if(e.target.closest('#membersBtn'))setTimeout(renderRealMembers,40);
    const mid=e.target.closest('[data-real-member-id]')?.dataset.realMemberId;if(mid){e.preventDefault();openMemberProfile(mid);return}
    const write=e.target.closest('[data-member-write]')?.dataset.memberWrite;if(write){hide($('#profileModal'));const c=activeChat();const p=(c?.memberProfiles||{})[write]||{uid:write};await createOrOpenChatWithUsers([{uid:write,...p}]);return}
    const kick=e.target.closest('[data-member-kick]')?.dataset.memberKick;if(kick){hide($('#profileModal'));await kickMember(kick);return}
    if(e.target.closest('[data-member-more]')){toast('Подробный профиль добавим отдельным экраном.');return}
    if(e.target.closest('#searchBtn')&&$('#headerSearch')?.classList.contains('show')&&$('#chatSearchInput')?.value?.trim()){e.preventDefault();setTimeout(runChatSearch,20);return}
  },true);
  document.addEventListener('keydown',e=>{if(e.key==='Enter'&&document.activeElement?.id==='chatSearchInput'){e.preventDefault();runChatSearch()}},true);
}

export function initV146Patch(){
  bindV146();
  window.UCMU ||= {};
  window.UCMU.version='v146-clear-leave-members-search';
  window.UCMU.note='visible clear cascade, border sweep, leave chat behavior, real members panel, member card actions, message search navigation';
}
