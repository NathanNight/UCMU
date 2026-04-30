import {$,show,hide} from './dom.js';
import {state,findFolder} from './state.js';
import {renderChats} from './render.js';

function injectFinalStyles(){
  document.getElementById('ucmu-final-ui-fixes')?.remove();
  const style=document.createElement('style');
  style.id='ucmu-final-ui-fixes';
  style.textContent=`
    .main::before,.main::after{display:none!important;content:none!important;background:none!important}

    .collapsed .side{width:72px!important;min-width:72px!important;max-width:72px!important}
    .collapsed .side .profile{margin:16px auto 10px!important;width:54px!important;height:54px!important;padding:0!important;display:grid!important;place-items:center!important;background:transparent!important;border:0!important}
    .collapsed .side .profile .info,.collapsed .side .cap,.collapsed .folder-create-text,.collapsed .folderBtn .folder-create-text{display:none!important}
    .collapsed .side .profile .ava{margin:0!important}
    .collapsed .sideQuickActions{display:flex!important;flex-direction:column!important;align-items:center!important;margin:8px 0!important;gap:8px!important}
    .collapsed .sideQuick{width:44px!important;height:44px!important;margin:0!important;padding:0!important;display:grid!important;place-items:center!important}
    .collapsed .side .search{display:flex!important;flex-direction:column!important;gap:8px!important;margin:8px 0!important;padding:0!important;align-items:center!important}
    .collapsed .side .search input{display:none!important}
    .collapsed .side .search .plus,.collapsed #folderBtn{width:44px!important;height:44px!important;margin:0 auto!important;padding:0!important;display:grid!important;place-items:center!important}
    .collapsed #folders{display:none!important}
    .collapsed .scrollList{padding:0!important;margin:8px 0 0!important;overflow:hidden auto!important}
    .collapsed #chatList{display:flex!important;flex-direction:column!important;align-items:center!important;gap:8px!important}
    .collapsed .chat{width:54px!important;height:54px!important;min-height:54px!important;margin:0!important;padding:0!important;display:grid!important;place-items:center!important}
    .collapsed .chat>div:not(.logo):not(.ava),.collapsed .chat .extra{display:none!important}
    .collapsed .chat .logo,.collapsed .chat .ava{margin:0!important;position:relative!important}
    .collapsed .collapse{left:11px!important;right:auto!important;width:44px!important;height:36px!important}

    .folder-chat-list{display:grid!important;grid-template-rows:1fr!important;opacity:1!important;transform:translateY(0)!important;transition:grid-template-rows .28s cubic-bezier(.16,.86,.22,1),opacity .22s ease,transform .28s ease!important;overflow:hidden!important}
    .folder-chat-list.hidden{display:grid!important;grid-template-rows:0fr!important;opacity:0!important;transform:translateY(-6px)!important;pointer-events:none!important}
    .folder-chat-list>*{min-height:0!important}
    .folder-empty .extra{display:none!important}

    .deleteModal.messageDeleteStrict .deleteAllRow{display:flex!important;align-items:center!important;gap:8px!important;margin:8px 0 12px!important;color:#fff!important;font-size:13px!important}
    .deleteModal.messageDeleteStrict #deleteForAll{display:inline-block!important;appearance:auto!important;width:16px!important;height:16px!important;opacity:1!important;visibility:visible!important;position:static!important}
  `;
  document.head.appendChild(style);
}

function hardContactsHandler(){
  document.addEventListener('click',async e=>{
    const btn=e.target.closest?.('#contactsBtn,.sideQuick[title="Контакты"]');
    if(!btn)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    hide($('#contactsModal'));hide($('#profileModal'));
    const panel=$('#members'),list=$('#memberList'),title=panel?.querySelector('.ph span');
    if(!panel||!list||!title)return;
    panel.classList.add('ucmu-contacts-mode');
    title.textContent='КОНТАКТЫ';
    list.innerHTML='<div class="reactionEmpty">Контактов пока нет</div>';
    show(panel);
  },true);
}

function fixEmptyFolderClick(){
  document.addEventListener('click',e=>{
    const item=e.target.closest?.('.folder-item');
    if(!item)return;
    const wrap=item.closest('[data-folder-id]');
    const f=wrap&&findFolder(wrap.dataset.folderId);
    if(f && (!f.chatIds||!f.chatIds.length)){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      f.open=false;
      renderChats();
    }
  },true);
}

function forceDeleteCheckbox(){
  document.addEventListener('click',e=>{
    if(!e.target.closest?.('[data-a="delete"]'))return;
    setTimeout(()=>{
      const modal=$('#deleteModal');
      if(modal?.classList.contains('messageDeleteStrict')){
        const row=modal.querySelector('.deleteAllRow');
        if(row)row.style.setProperty('display','flex','important');
      }
    },0);
  },true);
}

export function initFinalUiFixes(){
  injectFinalStyles();
  hardContactsHandler();
  fixEmptyFolderClick();
  forceDeleteCheckbox();
}
