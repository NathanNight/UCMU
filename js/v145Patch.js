import {state,activeMessages} from './state.js';
import {$,hide} from './dom.js';
import {renderFeed,markMessageLocallyGone,unmarkMessageLocallyGone} from './render.js';

const wait=ms=>new Promise(r=>setTimeout(r,ms));
window.__ucmuDeleteIndex ||= Object.create(null);

function toast(text){
  let el=document.getElementById('fireDebugToast');
  if(!el){
    el=document.createElement('div');
    el.id='fireDebugToast';
    el.style.cssText='position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:99999;background:rgba(10,12,12,.96);color:#fff;border:1px solid rgba(255,255,255,.18);padding:10px 14px;box-shadow:0 12px 40px rgba(0,0,0,.55);font:12px system-ui;max-width:min(520px,calc(100vw - 28px));white-space:pre-wrap;pointer-events:none';
    document.body.appendChild(el);
  }
  el.textContent=text;
  clearTimeout(el._t);
  el._t=setTimeout(()=>el.remove(),4200);
}

function rememberDeleteIndex(){
  const p=state.pendingDelete;
  if(!p || p.type!=='message')return;
  const idx=activeMessages().findIndex(m=>m.id===p.id);
  if(idx>=0)window.__ucmuDeleteIndex[p.id]=idx;
}

function restoreDeletedMessageToOldPlace(e){
  const commit=state.pendingDeleteCommit;
  if(!commit || commit.type!=='message')return false;
  e?.preventDefault?.();
  e?.stopPropagation?.();
  e?.stopImmediatePropagation?.();
  clearTimeout(state.undoTimer);
  state.undoTimer=null;
  state.pendingDeleteCommit=null;
  const list=state.messages[commit.chatId] ||= [];
  if(commit.original && !list.some(m=>m.id===commit.id)){
    const saved=window.__ucmuDeleteIndex[commit.id];
    const idx=Number.isFinite(saved)?saved:list.length;
    list.splice(Math.max(0,Math.min(idx,list.length)),0,commit.original);
  }
  delete window.__ucmuDeleteIndex[commit.id];
  unmarkMessageLocallyGone(commit.id);
  if(state.activeChat!==commit.chatId)state.activeChat=commit.chatId;
  renderFeed();
  hide($('#undoToast'));
  return true;
}

function patchUndoButtons(){
  const confirm=$('#confirmDelete');
  const undo=$('#undoDelete');
  if(confirm && !confirm.__ucmuV145IndexPatch){
    confirm.__ucmuV145IndexPatch=true;
    confirm.addEventListener('pointerdown',rememberDeleteIndex,true);
    confirm.addEventListener('click',rememberDeleteIndex,true);
  }
  if(undo && !undo.__ucmuV145UndoPatch){
    undo.__ucmuV145UndoPatch=true;
    undo.addEventListener('click',restoreDeletedMessageToOldPlace,true);
    undo.onclick=restoreDeletedMessageToOldPlace;
  }
}

function animateNodeGone(n,i){
  setTimeout(()=>{
    if(!n.isConnected)return;
    const cs=getComputedStyle(n);
    n.style.maxHeight=n.offsetHeight+'px';
    n.style.marginTop=cs.marginTop;
    n.style.marginBottom=cs.marginBottom;
    n.style.paddingTop=cs.paddingTop;
    n.style.paddingBottom=cs.paddingBottom;
    n.style.overflow='hidden';
    n.style.willChange='transform,opacity,filter,max-height,margin,padding';
    void n.offsetHeight;
    n.style.transition='transform .42s cubic-bezier(.16,.86,.22,1),opacity .32s ease,filter .32s ease,max-height .42s ease,margin .42s ease,padding .42s ease';
    n.style.transform='translateX(-28px) scale(.955)';
    n.style.opacity='0';
    n.style.filter='blur(9px)';
    n.style.maxHeight='0px';
    n.style.marginTop='0px';
    n.style.marginBottom='0px';
    n.style.paddingTop='0px';
    n.style.paddingBottom='0px';
  },i*38);
}

function startVisibleCascadeClear(){
  const chatId=state.activeChat;
  const nodes=[...document.querySelectorAll('#feed [data-msg-id]')].reverse();
  const ids=nodes.map(n=>n.dataset.msgId).filter(Boolean);
  if(!chatId || !ids.length)return;
  window.__ucmuClearAnimatingChatId=chatId;
  ids.forEach(id=>markMessageLocallyGone(id));
  nodes.forEach(animateNodeGone);
  setTimeout(()=>{
    if(state.messages[chatId])state.messages[chatId]=state.messages[chatId].filter(m=>!ids.includes(m.id));
    if(window.__ucmuClearAnimatingChatId===chatId)delete window.__ucmuClearAnimatingChatId;
    renderFeed();
  },Math.min(1150,ids.length*38+520));
}

function patchClearConfirm(){
  document.addEventListener('click',e=>{
    const act=e.target.closest?.('.moreChatAction')?.dataset?.a;
    if(act==='clear')window.__ucmuV145ClearArmed=true;
    if(e.target.closest?.('#modalConfirm') && window.__ucmuV145ClearArmed){
      window.__ucmuV145ClearArmed=false;
      setTimeout(startVisibleCascadeClear,40);
    }
    if(e.target.closest?.('#modalCancel'))window.__ucmuV145ClearArmed=false;
  },true);
}

function patchModalTiming(){
  const old=document.getElementById('ucmu-v145-modal-timing');
  old?.remove();
  const style=document.createElement('style');
  style.id='ucmu-v145-modal-timing';
  style.textContent=`
    .modalShade{transition:opacity .22s ease!important}
    .centerModalCard{transition:transform .26s cubic-bezier(.16,.86,.22,1),opacity .22s ease,filter .22s ease!important}
    #modalDynamic{transition:opacity .22s ease,filter .22s ease,transform .22s ease!important}
    .modalActions{transition:opacity .22s ease,transform .22s ease!important}
    .centerModal.seq-ready .centerModalCard::after{animation:modalRedSweep .72s ease-out 1!important}
  `;
  document.head.appendChild(style);
}

export function initV145Patch(){
  patchUndoButtons();
  patchClearConfirm();
  patchModalTiming();
  const mo=new MutationObserver(patchUndoButtons);
  mo.observe(document.body,{childList:true,subtree:true});
  window.UCMU ||= {};
  window.UCMU.version='v145-safe-undo-clear-modal-patch';
  window.UCMU.note='safe patch: undo restores original DOM index, clear keeps visible cascade, modal timing softened; drag untouched';
  toast('U.C.M.U v145 patch loaded');
}