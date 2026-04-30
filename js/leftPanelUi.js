import {state} from './state.js';
import {$,show,hide} from './dom.js';
import {listKnownUsers} from './chatStore.js';

const esc=s=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
const nameOf=u=>u?.displayName||u?.username||u?.email||'User';
const subOf=u=>u?.username?('@'+u.username):(u?.email||'');
window.__ucmuContactProfiles ||= new Map();

function injectStyles(){
  if(document.getElementById('ucmu-left-panel-ui-style'))return;
  const style=document.createElement('style');
  style.id='ucmu-left-panel-ui-style';
  style.textContent=`
    .sideQuickActions #sideNewChatBtn{display:none!important}
    .side .search{display:grid!important;grid-template-columns:1fr 44px 44px!important;gap:8px!important;align-items:center!important}
    .side .search input{min-width:0!important;width:100%!important}
    .side .search .plus,#folderBtn.ucmu-folder-icon-btn{width:44px!important;height:44px!important;margin:0!important;display:grid!important;place-items:center!important;padding:0!important;font-size:20px!important;line-height:1!important}
    #folderBtn.ucmu-folder-icon-btn .folder-create-text{display:none!important}
    #folderBtn.ucmu-folder-icon-btn span:first-child{font-size:18px!important;position:relative!important}
    .side .folderBtn.ucmu-folder-icon-btn{background:rgba(255,255,255,.045)!important;border:1px solid var(--line)!important;color:#fff!important;position:relative!important}
    .side .folderBtn.ucmu-folder-icon-btn::after{content:'+';position:absolute;right:8px;top:6px;width:14px;height:14px;display:grid;place-items:center;border-radius:50%;background:#d71920;color:#fff;font-size:12px;font-weight:900;line-height:1}
    .chat.ucmu-search-hidden,.folder-wrap.ucmu-search-hidden{display:none!important}
    #chatCtx .chatAction[data-a="folder"]{display:none!important}
    .chat.pinned{cursor:default!important}.chat.pinned::after{content:'';position:absolute;right:10px;top:8px;width:9px;height:9px;border-radius:50%;background:#d71920;box-shadow:0 0 12px rgba(215,25,32,.9);z-index:3}
    #members.ucmu-contacts-mode .ph span{color:#fff}
    #members .realMember span{display:flex!important;flex-direction:column!important;align-items:flex-start!important;min-width:0!important}
    #members .realMember b{font-size:13px;color:#fff;max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    #members .realMember small{font-size:11px;color:var(--mut);max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .main.ucmu-chat-blink::before{content:'';position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 50% 45%,rgba(215,25,32,.16),transparent 42%);z-index:1;animation:ucmuChatBlink .42s ease-out 1}.main{position:relative}.main>*{position:relative;z-index:2}@keyframes ucmuChatBlink{0%{opacity:0}30%{opacity:1}100%{opacity:0}}
    .ucmuDustLayer{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:1}.ucmuDustLayer i{position:absolute;width:2px;height:2px;border-radius:50%;background:rgba(255,255,255,.28);box-shadow:0 0 8px rgba(255,255,255,.28);opacity:.22;animation:ucmuDustFloat linear infinite,ucmuDustBlink ease-in-out infinite}.ucmuDustLayer i:nth-child(3n){width:1px;height:1px;opacity:.16}.ucmuDustLayer i:nth-child(4n){background:rgba(215,25,32,.22);box-shadow:0 0 10px rgba(215,25,32,.22)}@keyframes ucmuDustFloat{from{transform:translate3d(0,20px,0)}to{transform:translate3d(38px,-90px,0)}}@keyframes ucmuDustBlink{0%,100%{opacity:.08}45%{opacity:.32}60%{opacity:.14}}
  `;
  document.head.appendChild(style);
}

function arrangeButtons(){
  const search=$('.side .search');
  const folder=$('#folderBtn');
  const newChat=$('#newChat');
  const sideNew=$('#sideNewChatBtn');
  if(sideNew)sideNew.remove();
  if(folder&&search&&newChat&&folder.parentElement!==search){
    folder.classList.add('ucmu-folder-icon-btn');
    folder.title='Создать папку';
    folder.innerHTML='<span>📁</span><span class="folder-create-text">Создать папку</span>';
    newChat.insertAdjacentElement('afterend',folder);
  }
}

function liveSearch(){
  const input=$('#sidebarSearch');
  if(!input||input.__ucmuLiveSearch)return;
  input.__ucmuLiveSearch=true;
  input.addEventListener('input',()=>{
    const q=input.value.trim().toLowerCase();
    document.querySelectorAll('#chatList .chat,.folder-chat-list .chat').forEach(el=>{
      const title=(el.querySelector('.ct')?.textContent||'').toLowerCase();
      el.classList.toggle('ucmu-search-hidden',!!q&&!title.includes(q));
    });
    document.querySelectorAll('#folders .folder-wrap').forEach(wrap=>{
      const title=(wrap.querySelector('.folder-name')?.textContent||'').toLowerCase();
      const childVisible=[...wrap.querySelectorAll('.chat')].some(c=>!c.classList.contains('ucmu-search-hidden'));
      wrap.classList.toggle('ucmu-search-hidden',!!q&&!title.includes(q)&&!childVisible);
    });
  });
}

async function openContactsPanel(){
  const panel=$('#members');
  const list=$('#memberList');
  const title=panel?.querySelector('.ph span');
  if(!panel||!list||!title)return;
  panel.classList.add('ucmu-contacts-mode');
  title.textContent='КОНТАКТЫ';
  list.innerHTML='<div class="reactionEmpty">Загрузка контактов...</div>';
  show(panel);
  const users=await listKnownUsers().catch(()=>[]);
  window.__ucmuContactProfiles.clear();
  users.forEach(u=>window.__ucmuContactProfiles.set(u.uid,u));
  list.innerHTML=users.length?users.map(u=>`
    <button class="member realMember" data-contact-member-id="${esc(u.uid)}">
      <div class="ava s"></div>
      <span><b>${esc(nameOf(u))}</b><small>${esc(subOf(u))}</small></span>
      <i class="dot"></i>
    </button>`).join(''):'<div class="reactionEmpty">Контактов пока нет</div>';
}

function restoreMembersMode(){
  const panel=$('#members');
  const title=panel?.querySelector('.ph span');
  if(panel?.classList.contains('ucmu-contacts-mode')){
    panel.classList.remove('ucmu-contacts-mode');
    if(title)title.textContent='УЧАСТНИКИ';
  }
}

function blinkChatSwitch(){
  const main=$('.main');
  if(!main)return;
  main.classList.remove('ucmu-chat-blink');
  void main.offsetWidth;
  main.classList.add('ucmu-chat-blink');
}

function ensureDust(){
  const main=$('.main');
  if(!main||main.querySelector('.ucmuDustLayer'))return;
  const layer=document.createElement('div');
  layer.className='ucmuDustLayer';
  for(let i=0;i<46;i++){
    const p=document.createElement('i');
    p.style.left=(Math.random()*100).toFixed(2)+'%';
    p.style.top=(Math.random()*100).toFixed(2)+'%';
    p.style.animationDuration=(9+Math.random()*18).toFixed(2)+'s,'+(2+Math.random()*4).toFixed(2)+'s';
    p.style.animationDelay=(-Math.random()*18).toFixed(2)+'s,'+(-Math.random()*4).toFixed(2)+'s';
    layer.appendChild(p);
  }
  main.prepend(layer);
}

export function initLeftPanelUi(){
  injectStyles();
  arrangeButtons();
  liveSearch();
  ensureDust();
  setTimeout(arrangeButtons,200);
  setTimeout(arrangeButtons,800);
  setTimeout(ensureDust,300);
  document.addEventListener('click',e=>{
    if(e.target.closest?.('#contactsBtn')){
      e.preventDefault();
      e.stopPropagation();
      openContactsPanel();
      return;
    }
    if(e.target.closest?.('#membersBtn')){
      restoreMembersMode();
    }
    if(e.target.closest?.('#closeMembers')){
      hide($('#profileModal'));
    }
    if(e.target.closest?.('[data-chat-id]')){
      blinkChatSwitch();
    }
  },true);
}
