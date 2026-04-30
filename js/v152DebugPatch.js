import {state} from './state.js';
import {$} from './dom.js';
import {isChatStoreReady,sendStoreMessage,subscribeMessages} from './chatStore.js';
import {renderFeed} from './render.js';

function toast(text){
  let el=document.getElementById('fireDebugToast');
  if(!el){
    el=document.createElement('div');
    el.id='fireDebugToast';
    el.style.cssText='position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:99999;background:rgba(10,12,12,.96);color:#fff;border:1px solid rgba(255,255,255,.18);padding:10px 14px;box-shadow:0 12px 40px rgba(0,0,0,.55);font:12px system-ui;max-width:min(620px,calc(100vw - 28px));white-space:pre-wrap;pointer-events:none';
    document.body.appendChild(el);
  }
  el.textContent=text;
  clearTimeout(el._t);
  el._t=setTimeout(()=>el.remove(),7000);
}

function snapshot(){
  return {
    activeChat: state.activeChat,
    currentUser: state.currentUser?.uid || null,
    user: state.user,
    storeReady: isChatStoreReady(),
    clearLock: window.__ucmuClearAnimatingChatId || null,
    messageCount: state.messages?.[state.activeChat]?.length ?? null,
    chatCount: state.chats?.length ?? null,
    inputValue: $('#input')?.value || ''
  };
}

async function forceSendFromDebug(){
  const input=$('#input');
  const text=(input?.value||'').trim();
  const info=snapshot();
  console.log('[UCMU v152 send debug] before send', info);
  if(window.__ucmuClearAnimatingChatId){
    console.warn('[UCMU v152] clearing stale feed lock', window.__ucmuClearAnimatingChatId);
    delete window.__ucmuClearAnimatingChatId;
  }
  if(!state.activeChat){
    toast('SEND DEBUG: нет activeChat. Выбери чат слева.\n'+JSON.stringify(info,null,2));
    return false;
  }
  if(!text){
    toast('SEND DEBUG: поле ввода пустое.\n'+JSON.stringify(info,null,2));
    return false;
  }
  if(!isChatStoreReady()){
    toast('SEND DEBUG: Firestore store не готов.\n'+JSON.stringify(info,null,2));
    return false;
  }
  try{
    await sendStoreMessage({type:'text',text});
    if(input)input.value='';
    subscribeMessages(state.activeChat);
    renderFeed();
    toast('SEND DEBUG: сообщение отправлено.');
    return true;
  }catch(err){
    console.error('[UCMU v152 send debug] send failed', err, snapshot());
    toast('SEND DEBUG ERROR:\n'+(err.message||err.code||err)+'\n\n'+JSON.stringify(snapshot(),null,2));
    return false;
  }
}

function bindSendDiagnostics(){
  const send=$('#send');
  const input=$('#input');
  if(send&&!send.__ucmuV152Debug){
    send.__ucmuV152Debug=true;
    send.addEventListener('click',e=>{
      setTimeout(()=>{
        const info=snapshot();
        console.log('[UCMU v152 send debug] after normal click', info);
        if(info.inputValue.trim())forceSendFromDebug();
      },180);
    },false);
  }
  if(input&&!input.__ucmuV152Debug){
    input.__ucmuV152Debug=true;
    input.addEventListener('keydown',e=>{
      if(e.key==='Enter'&&!e.shiftKey){
        setTimeout(()=>{
          const info=snapshot();
          console.log('[UCMU v152 send debug] after Enter', info);
          if(info.inputValue.trim())forceSendFromDebug();
        },180);
      }
    },false);
  }
}

function bindProfileCloseSafe(){
  document.addEventListener('click',e=>{
    if(e.target.closest?.('#closeProfile')){
      e.preventDefault();
      $('#profileModal')?.classList.add('hidden');
    }
  },true);
}

export function initV152DebugPatch(){
  bindSendDiagnostics();
  bindProfileCloseSafe();
  setInterval(bindSendDiagnostics,1000);
  window.UCMU={version:'v152-send-diagnostics',note:'diagnostic send patch: logs activeChat/store/user/error and attempts forced send when normal send fails'};
  console.log('[UCMU] v152 diagnostics loaded', snapshot());
}
