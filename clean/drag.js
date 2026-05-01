const LS_DATA = 'ucmu.clean.data.v1';
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

function readData(){
  try{return JSON.parse(localStorage.getItem(LS_DATA)||'{}')||{}}catch{return {}}
}
function writeData(data){localStorage.setItem(LS_DATA,JSON.stringify(data))}
function saveOrder(ids){
  const data=readData();
  if(!Array.isArray(data.chats))return;
  const map=new Map(data.chats.map(c=>[c.id,c]));
  const ordered=[];
  ids.forEach(id=>{const c=map.get(id);if(c){ordered.push(c);map.delete(id)}});
  data.chats.forEach(c=>{if(map.has(c.id))ordered.push(c)});
  data.chats=ordered;
  writeData(data);
}
function chatIdsFromDom(){return $$('.chatList [data-chat]').map(el=>el.dataset.chat).filter(Boolean)}
function isPinned(id){
  const data=readData();
  return !!data.chats?.find(c=>c.id===id)?.pinned || id==='general';
}
function makeGhost(src,r){
  const g=src.cloneNode(true);
  g.classList.add('drag-ghost');
  g.style.left=r.left+'px';g.style.top=r.top+'px';g.style.width=r.width+'px';g.style.height=r.height+'px';
  document.body.appendChild(g);return g;
}
function makeSlot(src){
  const s=document.createElement('div');s.className='drag-slot-clean';s.style.height=src.getBoundingClientRect().height+'px';return s;
}
function getInsertBefore(list,y,slot){
  const items=$$('.chatList [data-chat]').filter(el=>el!==slot && !el.classList.contains('drag-source'));
  for(const item of items){const r=item.getBoundingClientRect();if(y<r.top+r.height/2)return item}
  return null;
}
function enableDrag(){
  let drag=null,holdTimer=null,startX=0,startY=0;
  document.addEventListener('pointerdown',e=>{
    const item=e.target.closest('.chatItem[data-chat]');
    if(!item || e.button!==0)return;
    const id=item.dataset.chat;
    startX=e.clientX;startY=e.clientY;
    const begin=()=>{
      if(isPinned(id)){
        item.classList.remove('drag-locked');void item.offsetWidth;item.classList.add('drag-locked');
        return;
      }
      const r=item.getBoundingClientRect();
      const slot=makeSlot(item),ghost=makeGhost(item,r);
      item.parentElement.insertBefore(slot,item);
      item.classList.add('drag-source');
      drag={id,item,slot,ghost,offsetX:startX-r.left,offsetY:startY-r.top,moved:false};
      $('.chatList')?.classList.add('dragging-list');
    };
    if(e.pointerType==='touch') holdTimer=setTimeout(begin,230);
    else holdTimer=setTimeout(begin,80);
  },true);
  document.addEventListener('pointermove',e=>{
    if(holdTimer && Math.hypot(e.clientX-startX,e.clientY-startY)>9 && !drag){clearTimeout(holdTimer);holdTimer=null}
    if(!drag)return;
    e.preventDefault();
    drag.moved=true;
    drag.ghost.style.left=(e.clientX-drag.offsetX)+'px';
    drag.ghost.style.top=(e.clientY-drag.offsetY)+'px';
    const list=$('.chatList'); if(!list)return;
    const before=getInsertBefore(list,e.clientY,drag.slot);
    list.insertBefore(drag.slot,before);
  },true);
  document.addEventListener('pointerup',e=>{
    if(holdTimer){clearTimeout(holdTimer);holdTimer=null}
    if(!drag)return;
    e.preventDefault();
    const {item,slot,ghost,moved}=drag;
    item.classList.remove('drag-source');
    slot.replaceWith(item);
    ghost.remove();
    $('.chatList')?.classList.remove('dragging-list');
    if(moved){saveOrder(chatIdsFromDom());setTimeout(()=>location.reload(),90)}
    drag=null;
  },true);
  document.addEventListener('pointercancel',()=>{
    if(holdTimer){clearTimeout(holdTimer);holdTimer=null}
    if(!drag)return;
    drag.item.classList.remove('drag-source');drag.slot.replaceWith(drag.item);drag.ghost.remove();$('.chatList')?.classList.remove('dragging-list');drag=null;
  },true);
}

document.addEventListener('DOMContentLoaded',enableDrag);
setTimeout(enableDrag,500);
