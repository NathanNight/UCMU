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
    #folderBtn.ucmu-folder-icon-btn span:first-child{font-size:19px!important}
    .side .folderBtn.ucmu-folder-icon-btn{background:rgba(255,255,255,.045)!important;border:1px solid var(--line)!important;color:#fff!important}
    .chat.ucmu-search-hidden,.folder-wrap.ucmu-search-hidden{display:none!important}
    #members.ucmu-contacts-mode .ph span{color:#fff}
    #members .realMember span{display:flex!important;flex-direction:column!important;align-items:flex-start!important;min-width:0!important}
    #members .realMember b{font-size:13px;color:#fff;max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    #members .realMember small{font-size:11px;color:var(--mut);max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
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
      const txt=el.textContent.toLowerCase();
      el.classList.toggle('ucmu-search-hidden',!!q&&!txt.includes(q));
    });
    document.querySelectorAll('#folders .folder-wrap').forEach(wrap=>{
      const txt=wrap.textContent.toLowerCase();
      wrap.classList.toggle('ucmu-search-hidden',!!q&&!txt.includes(q));
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

export function initLeftPanelUi(){
  injectStyles();
  arrangeButtons();
  liveSearch();
  setTimeout(arrangeButtons,200);
  setTimeout(arrangeButtons,800);
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
  },true);
}
