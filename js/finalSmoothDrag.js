import {state,findChat,findFolder} from './state.js';
import {renderChats} from './render.js';

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
  el._t=setTimeout(()=>el.remove(),2600);
}

function injectStyle(){
  document.getElementById('ucmu-final-smooth-drag')?.remove();
  const style=document.createElement('style');
  style.id='ucmu-final-smooth-drag';
  style.textContent=`
    .drag-slot{height:58px!important;margin:2px 10px!important;border:1px dashed rgba(255,255,255,.34)!important;background:rgba(255,255,255,.03)!important;display:block!important;pointer-events:none!important;box-shadow:inset 0 0 18px rgba(255,255,255,.035)!important;transition:height .22s cubic-bezier(.16,.86,.22,1),margin .22s ease,background .18s ease!important}
    .drag-slot::before{content:''!important}
    .drag-ghost{opacity:1!important;filter:none!important;transition:none!important;box-shadow:0 18px 44px rgba(0,0,0,.52)!important}
    body.drag-live{user-select:none!important;cursor:grabbing!important}
  `;
  document.head.appendChild(style);
}

function makeSlot(from){
  const el=document.createElement('div');
  el.className='drag-slot';
  el.style.height=from.getBoundingClientRect().height+'px';
  return el;
}

function makeGhost(from,r){
  const g=from.cloneNode(true);
  g.classList.add('drag-ghost');
  g.style.cssText=`position:fixed!important;z-index:9999!important;pointer-events:none!important;margin:0!important;width:${r.width}px!important;height:${r.height}px!important;left:${r.left}px!important;top:${r.top}px!important;max-width:${r.width}px!important;min-width:${r.width}px!important;opacity:1!important;`;
  document.body.appendChild(g);
  return g;
}

function listFromPoint(x,y,ghost){
  if(ghost)ghost.style.display='none';
  const el=document.elementFromPoint(x,y);
  if(ghost)ghost.style.display='';
  const exact=el?.closest?.('.folder-chat-list,#chatList');
  if(exact)return exact;
  if(el?.closest?.('.side'))return document.querySelector('#chatList');
  return null;
}

function movableItems(list){
  return Array.from(list.querySelectorAll('[data-chat-id],.drag-slot'));
}

function rectMap(list){
  const m=new Map();
  movableItems(list).forEach(el=>m.set(el,el.getBoundingClientRect()));
  return m;
}

function animateFlip(before,list){
  movableItems(list).forEach(el=>{
    const b=before.get(el); if(!b)return;
    const a=el.getBoundingClientRect();
    const dx=b.left-a.left,dy=b.top-a.top;
    if(!dx&&!dy)return;
    el.getAnimations?.().forEach(anim=>anim.cancel());
    el.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:'translate(0,0)'}],{duration:240,easing:'cubic-bezier(.16,.86,.22,1)'});
  });
}

function placeSlot(drag,x,y){
  const list=listFromPoint(x,y,drag.ghost)||drag.slot.parentElement||document.querySelector('#chatList');
  if(!list)return;
  const before=rectMap(list);
  const items=Array.from(list.querySelectorAll('[data-chat-id]')).filter(el=>el.dataset.chatId!==drag.chatId);
  let target=null,after=false;
  for(const item of items){
    const r=item.getBoundingClientRect();
    if(y<r.top+r.height/2){target=item;after=false;break}
    target=item;after=true;
  }
  if(target)list.insertBefore(drag.slot,after?target.nextSibling:target);
  else list.appendChild(drag.slot);
  animateFlip(before,list);
}

function reorderFromSlot(chatId,slot){
  const list=slot.parentElement;
  if(!list)return;
  const ids=Array.from(list.querySelectorAll('[data-chat-id],.drag-slot')).map(el=>el.classList.contains('drag-slot')?chatId:el.dataset.chatId).filter(Boolean);
  const folderWrap=list.closest('[data-folder-id]');
  if(folderWrap){
    const f=findFolder(folderWrap.dataset.folderId);
    if(f){
      f.chatIds=[...new Set(ids)];
      state.folders.forEach(other=>{if(other.id!==f.id)other.chatIds=(other.chatIds||[]).filter(id=>id!==chatId)});
    }
    return;
  }
  const map=new Map(state.chats.map(c=>[c.id,c]));
  const seen=new Set();
  const next=[];
  ids.forEach(id=>{if(!seen.has(id)&&map.has(id)){seen.add(id);next.push(map.get(id))}});
  state.chats.filter(c=>c.pinned&&!seen.has(c.id)).forEach(c=>next.unshift(c));
  state.chats.forEach(c=>{if(!seen.has(c.id)&&!c.pinned)next.push(c)});
  state.chats=next;
  state.folders.forEach(f=>{f.chatIds=(f.chatIds||[]).filter(id=>id!==chatId)});
}

function flyGhostToSlot(drag,done){
  const from=drag.ghost.getBoundingClientRect();
  const to=drag.slot.getBoundingClientRect();
  const start=performance.now();
  const dur=220;
  function step(t){
    const p=Math.min(1,(t-start)/dur);
    const e=1-Math.pow(1-p,3);
    const x=from.left+(to.left-from.left)*e;
    const y=from.top+(to.top-from.top)*e;
    drag.ghost.style.setProperty('left',x+'px','important');
    drag.ghost.style.setProperty('top',y+'px','important');
    drag.ghost.style.setProperty('width',(from.width+(to.width-from.width)*e)+'px','important');
    drag.ghost.style.setProperty('height',(from.height+(to.height-from.height)*e)+'px','important');
    if(p<1)requestAnimationFrame(step);
    else done();
  }
  requestAnimationFrame(step);
}

export function initFinalSmoothDrag(){
  injectStyle();
  let drag=null;
  let suppressClick=false;

  document.addEventListener('pointerdown',e=>{
    const item=e.target.closest?.('[data-chat-id]');
    if(!item||e.button!==0||e.target.closest('.ctx'))return;
    const c=findChat(item.dataset.chatId);
    if(c?.pinned){toast('Закреплённый чат нельзя таскать. Сначала открепи его.');e.stopImmediatePropagation();return}

    e.stopImmediatePropagation();
    const startX=e.clientX,startY=e.clientY;
    let started=false;

    const onMove=ev=>{
      const dx=ev.clientX-startX,dy=ev.clientY-startY;
      if(!started&&Math.hypot(dx,dy)>5){
        started=true;
        suppressClick=true;
        const r=item.getBoundingClientRect();
        const slot=makeSlot(item);
        const ghost=makeGhost(item,r);
        item.parentElement.insertBefore(slot,item);
        item.remove();
        drag={chatId:item.dataset.chatId,slot,ghost,offsetX:startX-r.left,offsetY:startY-r.top};
        document.body.classList.add('drag-live');
      }
      if(drag){
        drag.ghost.style.setProperty('left',(ev.clientX-drag.offsetX)+'px','important');
        drag.ghost.style.setProperty('top',(ev.clientY-drag.offsetY)+'px','important');
        placeSlot(drag,ev.clientX,ev.clientY);
        ev.preventDefault();
      }
    };

    const onUp=ev=>{
      document.removeEventListener('pointermove',onMove,true);
      document.removeEventListener('pointerup',onUp,true);
      if(!drag)return;
      ev.preventDefault();
      placeSlot(drag,ev.clientX,ev.clientY);
      const d=drag;
      flyGhostToSlot(d,()=>{
        reorderFromSlot(d.chatId,d.slot);
        d.slot.remove();
        d.ghost.remove();
        document.body.classList.remove('drag-live');
        drag=null;
        renderChats();
        setTimeout(()=>{suppressClick=false},30);
      });
    };

    document.addEventListener('pointermove',onMove,true);
    document.addEventListener('pointerup',onUp,true);
  },true);

  document.addEventListener('click',e=>{
    if(!suppressClick)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    suppressClick=false;
  },true);
}
