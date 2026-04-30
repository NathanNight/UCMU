import {state,uid} from './state.js';
import {$,show,hide} from './dom.js';
import {listKnownUsers} from './chatStore.js';
import {renderChats} from './render.js';

const esc=s=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
const nameOf=u=>u?.displayName||u?.username||u?.email||'User';
const subOf=u=>u?.username?('@'+u.username):(u?.email||'');
window.__ucmuContactProfiles ||= new Map();

function chatColor(){return state.chats.find(c=>c.id===state.activeChat)?.styleColor||state.chats.find(c=>c.id===state.activeChat)?.color||'#d71920'}

function injectStyles(){
  if(document.getElementById('ucmu-left-panel-ui-style'))return;
  const style=document.createElement('style');
  style.id='ucmu-left-panel-ui-style';
  style.textContent=`
    .sideQuickActions #sideNewChatBtn{display:none!important}
    #contactsModal{display:none!important}
    .side .search{display:grid!important;grid-template-columns:1fr 44px 44px!important;gap:8px!important;align-items:center!important}
    .side .search input{min-width:0!important;width:100%!important}
    .side .search .plus,#folderBtn.ucmu-folder-icon-btn{width:44px!important;height:44px!important;margin:0!important;display:grid!important;place-items:center!important;padding:0!important;font-size:20px!important;line-height:1!important}
    #folderBtn.ucmu-folder-icon-btn .folder-create-text{display:none!important}
    #folderBtn.ucmu-folder-icon-btn span:first-child{font-size:18px!important;position:relative!important}
    .side .folderBtn.ucmu-folder-icon-btn{background:rgba(255,255,255,.045)!important;border:1px solid var(--line)!important;color:#fff!important;position:relative!important}
    .side .folderBtn.ucmu-folder-icon-btn::after{content:'+';position:absolute;right:8px;top:6px;width:14px;height:14px;display:grid;place-items:center;border-radius:50%;background:#d71920;color:#fff;font-size:12px;font-weight:900;line-height:1}
    .chat.ucmu-search-hidden,.folder-wrap.ucmu-search-hidden{display:none!important}
    #chatCtx .chatAction[data-a="folder"],#contactsModal [data-profile-uid],#contactsModal [data-start-uid]{display:none!important}
    .chat.pinned{cursor:default!important}.chat.pinned::after{content:'';position:absolute;right:10px;top:8px;width:9px;height:9px;border-radius:50%;background:#d71920;box-shadow:0 0 12px rgba(215,25,32,.9);z-index:3}

    .collapsed .side{width:72px!important}.collapsed .side .profile{margin:16px auto 10px!important;width:54px!important;height:54px!important;padding:0!important;display:grid!important;place-items:center!important}.collapsed .side .profile .info{display:none!important}.collapsed .side .profile .ava{margin:0!important}.collapsed .sideQuickActions{display:flex!important;flex-direction:column!important;align-items:center!important;margin:8px 0!important;gap:8px!important}.collapsed .sideQuick{width:44px!important;height:44px!important;margin:0!important;padding:0!important}.collapsed .side .search{display:flex!important;flex-direction:column!important;gap:8px!important;margin:8px 0!important}.collapsed .side .search input{display:none!important}.collapsed .side .search .plus,.collapsed #folderBtn.ucmu-folder-icon-btn{width:44px!important;height:44px!important;margin:0 auto!important}.collapsed .side .cap,.collapsed .folder-create-text{display:none!important}.collapsed .scrollList{padding:0!important;margin-top:8px!important}.collapsed #folders{display:none!important}.collapsed #chatList{display:flex!important;flex-direction:column!important;align-items:center!important;gap:8px!important}.collapsed .chat{width:54px!important;height:54px!important;min-height:54px!important;margin:0!important;padding:0!important;display:grid!important;place-items:center!important}.collapsed .chat>div:not(.logo):not(.ava),.collapsed .chat .extra{display:none!important}.collapsed .chat .logo,.collapsed .chat .ava{margin:0!important}

    #members.ucmu-contacts-mode .ph span{color:#fff}
    #members .realMember span{display:flex!important;flex-direction:column!important;align-items:flex-start!important;min-width:0!important}
    #members .realMember b{font-size:13px;color:#fff;max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    #members .realMember small{font-size:11px;color:var(--mut);max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

    .main{position:relative!important;overflow:hidden!important}.main::before{display:none!important}.main::after{content:''!important;position:absolute!important;right:9%!important;left:auto!important;top:-18%!important;width:330px!important;height:145%!important;pointer-events:none!important;background:linear-gradient(90deg,transparent,rgba(205,230,225,.018),rgba(205,230,225,.075),rgba(205,230,225,.04),transparent)!important;transform:skewX(8deg)!important;filter:blur(.2px)!important;z-index:1!important}.main>*{position:relative;z-index:2}
    .main.ucmu-chat-blink .head::after{content:'';position:absolute;left:0;right:0;bottom:-1px;height:2px;background:linear-gradient(90deg,transparent,var(--ucmu-active-chat-color,#d71920),transparent);filter:blur(.5px);animation:ucmuGlassLine .48s ease-out 1}.head{position:relative!important;overflow:hidden}@keyframes ucmuGlassLine{0%{opacity:0;transform:translateX(-25%)}35%{opacity:.95}100%{opacity:0;transform:translateX(25%)}}

    .ucmuDustLayer{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:1}.ucmuDustLayer i{position:absolute;width:2px;height:2px;border-radius:50%;background:rgba(255,255,255,.28);box-shadow:0 0 8px rgba(255,255,255,.28);opacity:.22;animation:ucmuDustFloat linear infinite,ucmuDustBlink ease-in-out infinite}.ucmuDustLayer i:nth-child(3n){width:1px;height:1px;opacity:.16}.ucmuDustLayer i:nth-child(4n){background:rgba(215,25,32,.22);box-shadow:0 0 10px rgba(215,25,32,.22)}@keyframes ucmuDustFloat{from{transform:translate3d(0,20px,0)}to{transform:translate3d(38px,-90px,0)}}@keyframes ucmuDustBlink{0%,100%{opacity:.08}45%{opacity:.32}60%{opacity:.14}}

    .deleteModal.rowDelete{position:fixed!important;inset:auto!important;width:270px!important;min-width:270px!important;z-index:120!important;background:linear-gradient(135deg,rgba(22,28,28,.97),rgba(7,10,10,.98))!important;border:1px solid rgba(255,255,255,.14)!important;box-shadow:0 18px 58px rgba(0,0,0,.58),0 0 34px rgba(215,25,32,.16)!important;padding:14px!important;backdrop-filter:blur(14px)!important}.deleteModal.rowDelete .deleteAllRow{display:none!important}.deleteModal.rowDelete h3{font-size:15px!important;margin:0 0 8px!important;letter-spacing:.02em!important}.deleteModal.rowDelete p,.deleteModal.rowDelete .deleteHint{font-size:12px!important;margin:0 0 12px!important;color:var(--mut)!important}.deleteModal.rowDelete .modalActions,.deleteModal.rowDelete .deleteActions{display:flex!important;gap:8px!important;justify-content:flex-end!important}.deleteModal.rowDelete button{height:34px!important;padding:0 10px!important}
    .deleteModal.messageDeleteStrict{position:fixed!important;left:50%!important;top:50%!important;transform:translate(-50%,-50%)!important;width:360px!important;max-width:calc(100vw - 28px)!important;background:linear-gradient(135deg,rgba(22,28,28,.97),rgba(7,10,10,.98))!important;border:1px solid rgba(255,255,255,.14)!important;box-shadow:0 28px 90px rgba(0,0,0,.68),0 0 42px rgba(215,25,32,.15)!important;padding:18px!important;backdrop-filter:blur(14px)!important}.deleteModal.messageDeleteStrict .deleteAllRow{display:flex!important;align-items:center!important;gap:8px!important;margin:8px 0 12px!important;color:#fff!important;font-size:13px!important}.deleteModal.messageDeleteStrict h3{font-size:18px!important;margin:0 0 10px!important}.deleteModal.messageDeleteStrict p,.deleteModal.messageDeleteStrict .deleteHint{font-size:13px!important;color:var(--mut)!important;margin:0 0 14px!important}.deleteModal.messageDeleteStrict button{height:38px!important;padding:0 14px!important}
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
  hide($('#contactsModal'));
  hide($('#profileModal'));
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
function closeTransientPanels(){hide($('#profileModal'));hide($('#deleteModal'));hide($('#chatCtx'));hide($('#ctx'));hide($('#moreChatCtx'));$('#deleteModal')?.classList.remove('rowDelete','messageDeleteStrict')}
function blinkChatSwitch(){const main=$('.main');if(!main)return;main.style.setProperty('--ucmu-active-chat-color',chatColor());main.classList.remove('ucmu-chat-blink');void main.offsetWidth;main.classList.add('ucmu-chat-blink')}
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
function openFolderModal(){
  const shade=$('#modalShade'),modal=$('#centerModal'),dyn=$('#modalDynamic');
  if(!shade||!modal||!dyn){const name=prompt('Название папки','Новая папка');if(name===null)return;state.folders.push({id:uid('f'),name:name.trim()||'Новая папка',color:'#d71920',open:false,chatIds:[]});renderChats();return}
  $('#modalKicker').textContent='CREATE FOLDER';$('#modalTitle').textContent='Создать папку';$('#modalText').textContent='Название новой папки.';
  dyn.innerHTML='<input id="newFolderTitleCenter" placeholder="Название папки" value="Новая папка">';dyn.classList.add('show');$('#modalConfirm').textContent='СОЗДАТЬ';
  state.centerModalConfirm=()=>{const name=$('#newFolderTitleCenter')?.value?.trim()||'Новая папка';state.folders.push({id:uid('f'),name,color:'#d71920',open:false,chatIds:[]});hide(modal);hide(shade);renderChats()};
  show(shade);show(modal);shade.classList.add('show');modal.classList.add('show','seq-ready')
}
export function initLeftPanelUi(){
  injectStyles();arrangeButtons();liveSearch();ensureDust();setTimeout(arrangeButtons,200);setTimeout(arrangeButtons,800);setTimeout(ensureDust,300);
  document.addEventListener('click',e=>{
    if(e.target.closest?.('#folderBtn')){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openFolderModal();return}
    if(e.target.closest?.('#contactsBtn,.sideQuick[title="Контакты"]')){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openContactsPanel();return}
    if(e.target.closest?.('#membersBtn')){restoreMembersMode()}
    if(e.target.closest?.('#closeMembers')){hide($('#profileModal'))}
    if(e.target.closest?.('[data-chat-id]')){closeTransientPanels();blinkChatSwitch()}
  },true);
}
