const $ = id => document.getElementById(id);
let ctxMessage=null,pendingDelete=null,undoTimer=null;

function showFloat(el,x,y,w=260,h=220){
  el.style.left = Math.min(x, window.innerWidth-w-12)+'px';
  el.style.top = Math.min(y, window.innerHeight-h-12)+'px';
  el.classList.remove('hidden');
}
function closeCtx(){ $('messageCtx')?.classList.add('hidden'); $('chatCtx')?.classList.add('hidden'); }
function setReaction(bubble,emoji){
  let r=[...bubble.querySelectorAll('.react')].find(x=>x.dataset.emoji===emoji);
  if(r){
    let c=parseInt(r.dataset.count||'1',10)+1;
    r.dataset.count=c; r.textContent=emoji+' '+c;
  }else{
    bubble.insertAdjacentHTML('beforeend',`<button class="react reaction-burst" data-emoji="${emoji}" data-count="1">${emoji} 1</button>`);
  }
}
export function initUI(){
  document.addEventListener('contextmenu',e=>{
    const msg=e.target.closest('.msg');
    const chat=e.target.closest('.chat');
    if(msg){e.preventDefault();ctxMessage=msg;showFloat($('messageCtx'),e.clientX,e.clientY);return;}
    if(chat){e.preventDefault();showFloat($('chatCtx'),e.clientX,e.clientY);return;}
  });
  document.addEventListener('click',e=>{ if(!e.target.closest('.ctx')) closeCtx(); });
  document.querySelectorAll('.reactBtn').forEach(b=>b.onclick=()=>{ if(ctxMessage) setReaction(ctxMessage.querySelector('.bubble'),b.textContent.trim()); closeCtx(); });
  document.querySelectorAll('#messageCtx .ctxAction').forEach(b=>b.onclick=()=>{
    if(!ctxMessage) return;
    const a=b.dataset.a;
    if(a==='copy') navigator.clipboard?.writeText(ctxMessage.querySelector('.text,.txt')?.textContent||'');
    if(a==='reply') $('msgInput').focus();
    if(a==='delete'){ pendingDelete=ctxMessage; showFloat($('deleteModal'),innerWidth/2-150,innerHeight/2-90,300,200); }
    closeCtx();
  });
  $('cancelDelete').onclick=()=>$('deleteModal').classList.add('hidden');
  $('confirmDelete').onclick=()=>{
    if(!pendingDelete) return;
    pendingDelete.classList.add('removing');
    const target=pendingDelete;
    $('deleteModal').classList.add('hidden');
    if(!$('deleteForAll').checked){
      const toast=$('undoToast');
      toast.classList.remove('hidden','run'); void toast.offsetWidth; toast.classList.add('run');
      clearTimeout(undoTimer);
      undoTimer=setTimeout(()=>{target.remove();toast.classList.add('hidden')},5000);
      $('undoDelete').onclick=()=>{clearTimeout(undoTimer);target.classList.remove('removing');toast.classList.add('hidden')};
    }else setTimeout(()=>target.remove(),360);
  };
}
