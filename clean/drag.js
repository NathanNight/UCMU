const LS_DATA = 'ucmu.clean.data.v1';
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

let installed = false;
let drag = null;
let holdTimer = null;
let startX = 0;
let startY = 0;
let startTarget = null;

function readData(){try{return JSON.parse(localStorage.getItem(LS_DATA)||'{}')||{}}catch{return {}}}
function writeData(data){localStorage.setItem(LS_DATA,JSON.stringify(data))}
function saveOrder(ids){
  const data=readData();
  if(!Array.isArray(data.chats)) return;
  const map=new Map(data.chats.map(c=>[c.id,c]));
  const pinned=data.chats.filter(c=>c.pinned || c.id==='general');
  const pinnedIds=new Set(pinned.map(c=>c.id));
  const ordered=[...pinned];
  ids.forEach(id=>{if(pinnedIds.has(id))return;const c=map.get(id);if(c&&!ordered.includes(c))ordered.push(c)});
  data.chats.forEach(c=>{if(!ordered.includes(c))ordered.push(c)});
  data.chats=ordered;
  writeData(data);
}
function chatIdsFromDom(){return $$('.chatList [data-chat]').map(el=>el.dataset.chat).filter(Boolean)}
function isPinned(id){const data=readData();return !!data.chats?.find(c=>c.id===id)?.pinned || id==='general'}
function makeGhost(src,r){const g=src.cloneNode(true);g.classList.add('drag-ghost');g.style.left=r.left+'px';g.style.top=r.top+'px';g.style.width=r.width+'px';g.style.height=r.height+'px';document.body.appendChild(g);return g}
function makeSlot(src){const s=document.createElement('div');s.className='drag-slot-clean';s.style.height=src.getBoundingClientRect().height+'px';return s}
function getInsertBefore(y){
  const items=$$('.chatList [data-chat]').filter(el=>!el.classList.contains('drag-source') && !isPinned(el.dataset.chat));
  for(const item of items){const r=item.getBoundingClientRect();if(y<r.top+r.height/2)return item}
  return null;
}
function beginDrag(item,x,y){
  const id=item.dataset.chat;
  if(isPinned(id)){item.classList.remove('drag-locked');void item.offsetWidth;item.classList.add('drag-locked');return}
  const r=item.getBoundingClientRect();
  const slot=makeSlot(item), ghost=makeGhost(item,r);
  item.parentElement.insertBefore(slot,item);
  item.classList.add('drag-source');
  $('.chatList')?.classList.add('dragging-list');
  document.body.classList.add('ucmu-dragging');
  drag={id,item,slot,ghost,offsetX:x-r.left,offsetY:y-r.top,moved:false};
}
function finishDrag(commit=true){
  if(holdTimer){clearTimeout(holdTimer);holdTimer=null}
  if(!drag)return;
  const {item,slot,ghost,moved}=drag;
  item.classList.remove('drag-source');
  slot.replaceWith(item);
  ghost.remove();
  $('.chatList')?.classList.remove('dragging-list');
  document.body.classList.remove('ucmu-dragging');
  if(commit && moved){saveOrder(chatIdsFromDom());setTimeout(()=>location.reload(),70)}
  drag=null;
}
function installDrag(){
  if(installed) return;
  installed = true;
  document.addEventListener('pointerdown',e=>{
    const item=e.target.closest('.chatItem[data-chat]');
    if(!item || e.button!==0) return;
    startTarget=item;startX=e.clientX;startY=e.clientY;
    const delay=e.pointerType==='touch'?260:90;
    holdTimer=setTimeout(()=>beginDrag(item,startX,startY),delay);
  },true);
  document.addEventListener('pointermove',e=>{
    if(holdTimer && !drag && Math.hypot(e.clientX-startX,e.clientY-startY)>14){clearTimeout(holdTimer);holdTimer=null}
    if(!drag)return;
    e.preventDefault();
    drag.moved=true;
    drag.ghost.style.left=(e.clientX-drag.offsetX)+'px';
    drag.ghost.style.top=(e.clientY-drag.offsetY)+'px';
    const list=$('.chatList'); if(!list)return;
    const before=getInsertBefore(e.clientY);
    list.insertBefore(drag.slot,before);
  },{capture:true,passive:false});
  document.addEventListener('pointerup',e=>{
    if(holdTimer){clearTimeout(holdTimer);holdTimer=null}
    if(drag){e.preventDefault();finishDrag(true)}
    startTarget=null;
  },true);
  document.addEventListener('pointercancel',()=>finishDrag(false),true);
}
function markReady(){
  const list=$('.chatList');
  if(list) list.dataset.dragReady='1';
}
installDrag();
new MutationObserver(markReady).observe(document.documentElement,{childList:true,subtree:true});
setInterval(markReady,700);
window.UCMU_DRAG_READY='clean-drag-v2';
