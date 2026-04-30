import {state,activeMessages,findChat} from './state.js';
import {$,show,hide} from './dom.js';
import {renderAll,renderChats,renderFeed,markMessageLocallyGone,unmarkMessageLocallyGone} from './render.js';
import {getFirebase} from './firebase.js';
import {createOrOpenChatWithUsers,clearActiveChatHistory} from './chatStore.js';
import {doc,getDoc,updateDoc,deleteDoc,arrayRemove,deleteField,serverTimestamp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

let searchState={chatId:null,q:'',ids:[],idx:-1};
let clearBusy=false;
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

function captureChatRects(){
  const map=new Map();
  document.querySelectorAll('[data-chat-id]').forEach(el=>map.set(el.dataset.chatId,el.getBoundingClientRect()));
  return map;
}
function animateChatReflow(before){
  document.querySelectorAll('[data-chat-id]').forEach(el=>{
    const b=before.get(el.dataset.chatId);if(!b)return;
    const a=el.getBoundingClientRect();
    const dx=b.left-a.left,dy=b.top-a.top;
    if(!dx&&!dy)return;
    el.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:'translate(0,0)'}],{duration:330,easing:'cubic-bezier(.16,.86,.22,1)'});
  });
}
function animateChatTileThenLeave(chatId){
  const node=document.querySelector(`[data-chat-id="${CSS.escape(chatId)}"]`);
  if(!node)return;
  const h=node.offsetHeight;
  node.style.height=h+'px';
  node.style.overflow='hidden';
  node.style.transition='opacity .36s ease,filter .36s ease,transform .4s cubic-bezier(.16,.86,.22,1),height .42s ease,margin .42s ease,padding .42s ease';
  node.classList.add('ucmuChatLeaving');
  void node.offsetHeight;
  node.style.opacity='0';
  node.style.filter='blur(8px) brightness(1.6)';
  node.style.transform='translateX(-26px) scale(.96)';
  node.style.height='0px';
  node.style.marginTop='0px';node.style.marginBottom='0px';node.style.paddingTop='0px';node.style.paddingBottom='0px';
}
async function leaveChatById(chatId){
  const uid=currentUid();if(!chatId||!uid)return;
  animateChatTileThenLeave(chatId);
  await wait(420);
  const before=captureChatRects();
  try{
    const ref=doc(await db(),'chats',chatId);
    const snap=await getDoc(ref);
    if(snap.exists()){
      const data=snap.data()||{};
      const members=data.members||[];
      if(members.length<=1){
        await deleteDoc(ref).catch(()=>updateDoc(ref,{members:[],deleted:true,updatedAt:serverTimestamp()}));
        toast('Чат удалён: участников больше нет.');
      }else{
        await updateDoc(ref,{members:arrayRemove(uid),[`memberProfiles.${uid}`]:deleteField(),updatedAt:serverTimestamp()});
        toast('Вы вышли из чата.');
      }
    }
    state.chats=state.chats.filter(c=>c.id!==chatId);
    delete state.messages[chatId];
    if(state.activeChat===chatId)state.activeChat=state.chats[0]?.id||null;
    renderAll();
    requestAnimationFrame(()=>animateChatReflow(before));
  }catch(err){toast('Не удалось выйти из чата:\n'+(err.message||err.code||err));renderAll()}
}

function glowAndCollapseMessage(n,i){
  setTimeout(()=>{
    if(!n.isConnected)return;
    const h=n.offsetHeight;
    const cs=getComputedStyle(n);
    n.style.height=h+'px';n.style.maxHeight=h+'px';n.style.marginTop=cs.marginTop;n.style.marginBottom=cs.marginBottom;n.style.paddingTop=cs.paddingTop;n.style.paddingBottom=cs.paddingBottom;
    n.style.overflow='hidden';n.classList.add('ucmuClearDeleting');
    n.style.transition='opacity .68s ease,filter .68s ease,transform .72s cubic-bezier(.16,.86,.22,1),height .72s cubic-bezier(.16,.86,.22,1),max-height .72s cubic-bezier(.16,.86,.22,1),margin .72s ease,padding .72s ease';
    void n.offsetHeight;
    n.style.opacity='0';n.style.filter='blur(10px) brightness(1.75)';n.style.transform='translateX(-34px) scale(.94)';n.style.height='0px';n.style.maxHeight='0px';n.style.marginTop='0px';n.style.marginBottom='0px';n.style.paddingTop='0px';n.style.paddingBottom='0px';
  },i*70);
}
async function clearWithReliableAnimation(){
  if(clearBusy)return;
  clearBusy=true;
  const chatId=state.activeChat;
  const nodes=[...document.querySelectorAll('#feed [data-msg-id]')].reverse();
  const ids=nodes.map(n=>n.dataset.msgId).filter(Boolean);
  if(!chatId||!ids.length){clearBusy=false;await clearActiveChatHistory().catch(err=>toast('Не удалось очистить:\n'+(err.message||err.code||err)));return}
  window.__ucmuClearAnimatingChatId=chatId;
  ids.forEach(markMessageLocallyGone);
  nodes.forEach(glowAndCollapseMessage);
  const animDoneAt=Math.min(1800,ids.length*70+920);
  setTimeout(()=>{if(state.messages[chatId])state.messages[chatId]=state.messages[chatId].filter(m=>!ids.includes(m.id))},animDoneAt);
  try{
    await Promise.all([wait(animDoneAt+120),clearActiveChatHistory()]);
    if(state.messages[chatId])state.messages[chatId]=state.messages[chatId].filter(m=>!ids.includes(m.id));
  }catch(err){toast('Не удалось очистить:\n'+(err.message||err.code||err))}
  finally{
    if(window.__ucmuClearAnimatingChatId===chatId)delete window.__ucmuClearAnimatingChatId;
    clearBusy=false;
    renderFeed();
  }
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
  actions.innerHTML=`<button class="modalCancel" data-member-more="${esc(uid)}">☰ ПОДРОБНЕЕ</button><button class="modalConfirm" data-member-write="${esc(uid)}">✉ НАПИСАТЬ</button>${canKick?`<button class="modalConfirm dangerMemberKick" data-member-kick="${esc(uid)}">⛔ УДАЛИТЬ ИЗ ЧАТА</button>`:''}`;
  show(box);
}
async function kickMember(uid){
  const chatId=state.activeChat;if(!chatId||!uid)return;
  const c=activeChat();const p=(c?.memberProfiles||{})[uid]||{uid};
  if(!confirm(`Удалить ${personName(p,uid)} из чата?`))return;
  try{await updateDoc(doc(await db(),'chats',chatId),{members:arrayRemove(uid),[`memberProfiles.${uid}`]:deleteField(),updatedAt:serverTimestamp()});const c2=activeChat();if(c2){c2.members=(c2.members||[]).filter(id=>id!==uid);if(c2.memberProfiles)delete c2.memberProfiles[uid]}renderRealMembers();toast('Участник удалён из чата.')}catch(err){toast('Не удалось удалить участника:\n'+(err.message||err.code||err))}
}

function runChatSearch(){
  const input=$('#chatSearchInput');const q=input?.value?.trim().toLowerCase();const chatId=state.activeChat;if(!q||!chatId)return;
  if(searchState.chatId!==chatId||searchState.q!==q)searchState={chatId,q,ids:activeMessages().filter(m=>String(m.text||m.file||'').toLowerCase().includes(q)).map(m=>m.id),idx:-1};
  if(!searchState.ids.length){toast('Совпадений нет');return}
  searchState.idx=(searchState.idx+1)%searchState.ids.length;const id=searchState.ids[searchState.idx];const node=document.querySelector(`#feed [data-msg-id="${CSS.escape(id)}"]`);
  if(!node){renderFeed();setTimeout(runChatSearch,80);return}
  node.scrollIntoView({block:'center',behavior:'smooth'});node.classList.remove('ucmuSearchHit');void node.offsetWidth;node.classList.add('ucmuSearchHit');
}

function ensureFrameSweepLayer(){
  const card=document.querySelector('.centerModalCard');if(!card||card.querySelector('.ucmuFrameSweepLayer'))return;
  const layer=document.createElement('div');layer.className='ucmuFrameSweepLayer';layer.innerHTML='<i class="top"></i><i class="right"></i><i class="bottom"></i><i class="left"></i>';card.appendChild(layer);
}
function triggerFrameSweep(){
  ensureFrameSweepLayer();
  const layer=document.querySelector('.ucmuFrameSweepLayer');if(!layer)return;
  layer.classList.remove('run');void layer.offsetWidth;layer.classList.add('run');
}

function isTypingTarget(el){return !!el?.closest?.('input,textarea,[contenteditable="true"]')}
function blockModalSpace(e){
  if(e.code!=='Space'&&e.key!==' ')return;
  const modal=$('#centerModal');
  if(!modal||modal.classList.contains('hidden'))return;
  if(isTypingTarget(e.target))return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
}

function injectStyles(){
  document.getElementById('ucmu-v148-style')?.remove();
  const style=document.createElement('style');style.id='ucmu-v148-style';style.textContent=`
    #chatCtx .chatAction[data-a="delete"],#moreChatCtx .moreChatAction[data-a="delete"]{font-size:0!important}#chatCtx .chatAction[data-a="delete"]::before,#moreChatCtx .moreChatAction[data-a="delete"]::before{content:'↪ Выйти из чата';font-size:13px!important}
    .ucmuClearDeleting .bubble{position:relative!important;box-shadow:0 0 0 1px rgba(255,45,55,.95),0 0 46px rgba(215,25,32,.95),0 0 110px rgba(215,25,32,.55)!important}.ucmuClearDeleting .bubble::after{content:''!important;position:absolute!important;inset:-34px!important;background:radial-gradient(circle,rgba(255,35,45,.78),rgba(215,25,32,.28) 38%,transparent 72%)!important;z-index:-1!important;pointer-events:none!important;animation:ucmuDeleteRedPulse148 1.05s ease-out 1!important}@keyframes ucmuDeleteRedPulse148{0%{opacity:0;transform:scale(.68)}18%{opacity:1;transform:scale(1)}70%{opacity:.85;transform:scale(1.13)}100%{opacity:0;transform:scale(1.28)}}
    .ucmuChatLeaving{box-shadow:0 0 0 1px rgba(255,45,55,.82),0 0 38px rgba(215,25,32,.82)!important;background:linear-gradient(90deg,rgba(215,25,32,.34),rgba(255,255,255,.04))!important}
    .centerModalCard{position:relative!important;overflow:hidden!important;border:1px solid rgba(255,255,255,.14)!important}.centerModalCard::before,.centerModalCard::after{content:none!important;display:none!important}.ucmuFrameSweepLayer{position:absolute!important;inset:0!important;pointer-events:none!important;z-index:5!important;opacity:0!important}.ucmuFrameSweepLayer i{position:absolute!important;display:block!important;background:linear-gradient(135deg,transparent 0%,transparent 28%,rgba(255,25,35,.18) 40%,rgba(255,25,35,1) 50%,rgba(255,25,35,.18) 60%,transparent 72%,transparent 100%)!important;background-size:340% 340%!important;background-position:125% 125%!important;box-shadow:0 0 14px rgba(255,20,30,.55)!important}.ucmuFrameSweepLayer .top{left:0;right:0;top:0;height:2px}.ucmuFrameSweepLayer .bottom{left:0;right:0;bottom:0;height:2px}.ucmuFrameSweepLayer .left{top:0;bottom:0;left:0;width:2px}.ucmuFrameSweepLayer .right{top:0;bottom:0;right:0;width:2px}.ucmuFrameSweepLayer.run{opacity:1!important}.ucmuFrameSweepLayer.run i{animation:ucmuFrameLineSweep148 1.05s ease-out 1 forwards!important}@keyframes ucmuFrameLineSweep148{0%{background-position:125% 125%;opacity:0}12%{opacity:1}78%{opacity:1}100%{background-position:-25% -25%;opacity:0}}
    .realMember{grid-template-columns:34px 1fr auto auto!important}.realMember span{display:flex!important;flex-direction:column!important;align-items:flex-start!important}.realMember b{font-size:13px;color:#fff}.realMember small{font-size:11px;color:var(--mut)}.realMember em{font-style:normal;color:rgba(255,255,255,.5)}.ucmuMemberActions{display:flex;gap:8px;padding:0 12px 12px;flex-wrap:wrap}.ucmuMemberActions button{min-height:38px}.dangerMemberKick{background:linear-gradient(135deg,#d71920,#6f0b10)!important}.ucmuSearchHit .bubble{animation:ucmuSearchPulse 1.1s ease-out 1!important;box-shadow:0 0 0 1px rgba(255,255,255,.22),0 0 34px rgba(215,25,32,.48)!important}@keyframes ucmuSearchPulse{0%{filter:brightness(1);transform:scale(1)}18%{filter:brightness(1.8);transform:scale(1.018)}38%{filter:brightness(1.05);transform:scale(1)}58%{filter:brightness(1.65)}100%{filter:brightness(1)}}
  `;document.head.appendChild(style);
}

function bind(){
  injectStyles();ensureFrameSweepLayer();
  $('#confirmDelete')?.addEventListener('pointerdown',rememberDeleteIndex,true);
  $('#confirmDelete')?.addEventListener('click',rememberDeleteIndex,true);
  $('#undoDelete')?.addEventListener('click',restoreDeletedMessageToOldPlace,true);
  document.addEventListener('keydown',blockModalSpace,true);
  document.addEventListener('keyup',blockModalSpace,true);
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
    if(e.target.closest('[data-member-more]')){toast('Полный профиль будет отдельным экраном.');return}
    if(e.target.closest('#searchBtn')&&$('#headerSearch')?.classList.contains('show')&&$('#chatSearchInput')?.value?.trim()){e.preventDefault();setTimeout(runChatSearch,20);return}
    setTimeout(()=>{ensureFrameSweepLayer();if($('#centerModal')?.classList.contains('seq-ready'))triggerFrameSweep()},1200);
  },true);
  document.addEventListener('keydown',e=>{if(e.key==='Enter'&&document.activeElement?.id==='chatSearchInput'){e.preventDefault();runChatSearch()}},true);
  const mo=new MutationObserver(()=>{ensureFrameSweepLayer();if($('#centerModal')?.classList.contains('seq-ready'))triggerFrameSweep()});
  const modal=$('#centerModal');if(modal)mo.observe(modal,{attributes:true,attributeFilter:['class'],subtree:false});
}

export function initV148Patch(){
  delete window.__ucmuClearAnimatingChatId;
  bind();
  window.UCMU={version:'v148-modal-clear-frame-members',note:'space no longer replays modal, true frame-only sweep layer, stronger non-repeating clear delete animation, smooth chat reflow, member profile actions with kick confirmation'};
}
