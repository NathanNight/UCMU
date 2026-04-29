const $ = id => document.getElementById(id);
let drag=null;

function startDrag(e,el){
  if(e.button!==0) return;
  e.preventDefault();
  const r=el.getBoundingClientRect();
  const ghost=document.createElement('div');
  ghost.className='dragGhost';
  ghost.style.width=r.width+'px';
  ghost.innerHTML=el.outerHTML;
  document.body.appendChild(ghost);
  drag={el,ghost,dx:e.clientX-r.left,dy:e.clientY-r.top};
  el.classList.add('dragging');
  move(e);
  window.addEventListener('pointermove',move);
  window.addEventListener('pointerup',end,{once:true});
}
function move(e){
  if(!drag) return;
  drag.ghost.style.transform=`translate(${e.clientX-drag.dx}px,${e.clientY-drag.dy}px)`;
}
function end(e){
  if(!drag) return;
  window.removeEventListener('pointermove',move);
  drag.el.classList.remove('dragging');
  drag.ghost.remove();
  drag=null;
}
function bind(){
  document.querySelectorAll('.chat.dragItem').forEach(el=>el.onpointerdown=e=>startDrag(e,el));
}
export function initDragFolders(){
  window.addEventListener('ucmu:chat-list-rendered',bind);
}
