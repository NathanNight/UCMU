import {state,uid,activeMessages,findChat,findFolder} from './state.js';import {$,$$,show,hide,toggle,placeMenu} from './dom.js';import {renderAll,renderChats,renderFeed,appendMessage} from './render.js';import {appear,pending,restore,removeAnimated,DELETE_DELAY} from './animations.js';
let selectedFile=null;
export function bindActions(){
  $('#collapse').onclick=()=>{const app=$('#app');app.classList.toggle('collapsed');$('#collapse').textContent=app.classList.contains('collapsed')?'›':'‹'};
  $('#menu').onclick=()=>$('#app').classList.toggle('mobile');$('#membersBtn').onclick=()=>toggle($('#members'));$('#closeMembers').onclick=()=>hide($('#members'));
  $('#newChat').onclick=()=>{show($('#members'));show($('#private'))};$('#closePrivate').onclick=()=>hide($('#private'));
  $('#searchBtn').onclick=()=>$('#headerSearch').classList.toggle('show');$('#stickerBtn').onclick=()=>toggle($('#stickers'));
  $('#send').onclick=sendText;$('#input').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendText()}};
  $('#attach').onclick=()=>$('#fileInput').click();$('#fileInput').onchange=e=>previewFile(e.target.files?.[0]);$('#closeFile').onclick=()=>hide($('#filePreview'));$('#confirmFile').onclick=sendFile;
  $('#folderBtn').onclick=()=>show($('#folderModal'));$('#closeFolder').onclick=()=>hide($('#folderModal'));$('#createFolder').onclick=createFolder;
  $('#closeFolderStyle').onclick=()=>hide($('#folderStyleModal'));$('#saveFolderStyle').onclick=saveFolderStyle;
  $('#cancelDelete').onclick=()=>hide($('#deleteModal'));$('#confirmDelete').onclick=confirmDelete;$('#undoDelete').onclick=undoDelete;
  $('#startPrivate').onclick=startPrivateChat;
  document.addEventListener('click',globalClick,true);document.addEventListener('contextmenu',globalContext,true);
  bindDrag();bindDrop();renderAll();
}
function sendText(){const input=$('#input');const text=input.value.trim();if(!text)return;if(state.editingId){const m=activeMessages().find(x=>x.id===state.editingId);if(m)m.text=text;state.editingId=null;input.value='';renderFeed();return}appendMessage({id:uid('m'),author:state.user,color:'red',type:'text',text,time:'сейчас',mine:true,reply:state.replyTo});state.replyTo=null;input.value='';updateChatLast(text)}
function previewFile(file){if(!file)return;selectedFile=file;$('#fileName').textContent=file.name;$('#fileSize').textContent=formatSize(file.size);show($('#filePreview'));$('#fileInput').value=''}
function sendFile(){if(!selectedFile)return;appendMessage({id:uid('m'),author:state.user,color:'red',type:'file',text:'',file:selectedFile.name,size:formatSize(selectedFile.size),time:'сейчас',mine:true});updateChatLast('Файл: '+selectedFile.name);selectedFile=null;hide($('#filePreview'))}
function createFolder(){const name=$('#folderName').value.trim()||'Новая папка';const folder={id:uid('f'),name,color:'#d71920',open:false,chatIds:[]};state.folders.push(folder);hide($('#folderModal'));renderChats();requestAnimationFrame(()=>appear($(`[data-folder-id="${folder.id}"]`)))}
function saveFolderStyle(){const f=findFolder(state.selectedFolderId);if(!f)return;f.name=$('#folderStyleName').value.trim()||f.name;hide($('#folderStyleModal'));renderChats()}
function startPrivateChat(){const person=$('#private .candidate.active')?.dataset.person||'Alice';let chat=state.chats.find(c=>c.title===person);let created=false;if(!chat){chat={id:uid('chat'),title:person,last:'Новый личный чат',time:'сейчас',unread:1,muted:false};state.chats.unshift(chat);state.messages[chat.id]=[];created=true}state.activeChat=chat.id;hide($('#private'));renderAll();if(created)requestAnimationFrame(()=>appear($(`[data-chat-id="${chat.id}"]`)))}
function globalClick(e){
  const sticker=e.target.closest('[data-sticker]');if(sticker){appendMessage({id:uid('m'),author:state.user,color:'red',type:'sticker',text:sticker.dataset.sticker,time:'сейчас',mine:true});hide($('#stickers'));return}
  const chat=e.target.closest('[data-chat-id]');if(chat&&!e.target.closest('.ctx')&&!document.body.classList.contains('drag-live')){state.activeChat=chat.dataset.chatId;const c=findChat(state.activeChat);if(c)c.unread=0;renderAll();return}
  const folder=e.target.closest('.folder-item');if(folder&&!document.body.classList.contains('drag-live')){const wrap=folder.closest('[data-folder-id]');const f=findFolder(wrap.dataset.folderId);if(f){f.open=!f.open;renderChats()}return}
  const member=e.target.closest('.member');if(member){show($('#members'));show($('#private'));return}
  const candidate=e.target.closest('.candidate');if(candidate){$$('#private .candidate').forEach(x=>x.classList.remove('active'));candidate.classList.add('active');return}
  const ctxAction=e.target.closest('.ctxAction,.reactBtn');if(ctxAction){handleContextAction(ctxAction);return}
  const color=e.target.closest('[data-folder-color]');if(color){const f=findFolder(state.selectedFolderId);if(f){f.color=color.dataset.folderColor;renderChats()}return}
  if(!e.target.closest('.float,.hbtn,#stickerBtn,#membersBtn,#newChat,#folderBtn'))$$('.ctx').forEach(hide);
}
function globalContext(e){
  const msg=e.target.closest('[data-msg-id]');const chat=e.target.closest('[data-chat-id]');const folder=e.target.closest('[data-folder-id]');
  if(msg){e.preventDefault();state.selectedMessageId=msg.dataset.msgId;placeMenu($('#ctx'),e.clientX,e.clientY)}
  else if(chat){e.preventDefault();state.selectedChatId=chat.dataset.chatId;placeMenu($('#chatCtx'),e.clientX,e.clientY)}
  else if(folder){e.preventDefault();state.selectedFolderId=folder.dataset.folderId;placeMenu($('#folderCtx'),e.clientX,e.clientY)}
}
function handleContextAction(btn){const a=btn.dataset.a;if(btn.dataset.react){const m=activeMessages().find(x=>x.id===state.selectedMessageId);if(m)m.reaction=`${btn.dataset.react} 1`;renderFeed();hide($('#ctx'));return}
 if(btn.classList.contains('chatAction'))return handleChatAction(a);if(btn.classList.contains('folderAction'))return handleFolderAction(a);
 const m=activeMessages().find(x=>x.id===state.selectedMessageId);if(!m)return;if(a==='reply'){state.replyTo=`${m.author}: ${m.text||m.file||'стикер'}`;$('#input').focus()}if(a==='edit'){state.editingId=m.id;$('#input').value=m.text||'';$('#input').focus()}if(a==='forward'){appendMessage({...m,id:uid('m'),time:'сейчас',mine:true,reply:'Переслано'})}if(a==='delete')openDelete('message',m.id);hide($('#ctx'))}
function handleChatAction(a){const c=findChat(state.selectedChatId);if(!c)return;if(a==='pin'){state.chats=state.chats.filter(x=>x.id!==c.id);state.chats.unshift(c)}if(a==='mute'){c.muted=!c.muted}if(a==='folder')addChatToFirstFolder(c.id);if(a==='delete')openDelete('chat',c.id);hide($('#chatCtx'));if(a!=='delete')renderChats()}
function handleFolderAction(a){const f=findFolder(state.selectedFolderId);if(!f)return;if(a==='pin'){state.folders=state.folders.filter(x=>x.id!==f.id);state.folders.unshift(f)}if(a==='mute')f.muted=!f.muted;if(a==='style'){$('#folderStyleName').value=f.name;show($('#folderStyleModal'))}if(a==='delete')openDelete('folder',f.id);hide($('#folderCtx'));if(a!=='delete')renderChats()}
function addChatToFirstFolder(chatId){if(!state.folders.length){const f={id:uid('f'),name:'Оперативные',color:'#d71920',open:false,chatIds:[]};state.folders.push(f);requestAnimationFrame(()=>appear($(`[data-folder-id="${f.id}"]`)))}const f=state.folders[0];if(!f.chatIds.includes(chatId))f.chatIds.push(chatId)}
function openDelete(type,id){state.pendingDelete={type,id};hide($('#deleteModal'));show($('#deleteModal'))}
function selectorFor(p){return p.type==='message'?`[data-msg-id="${p.id}"]`:p.type==='chat'?`[data-chat-id="${p.id}"]`:`[data-folder-id="${p.id}"]`}
function prepRemoveMetrics(el){if(!el)return;const cs=getComputedStyle(el);el.style.setProperty('--ucmu-mt',cs.marginTop||'0px');el.style.setProperty('--ucmu-mb',cs.marginBottom||'14px');el.style.setProperty('--ucmu-pt',cs.paddingTop||'0px');el.style.setProperty('--ucmu-pb',cs.paddingBottom||'0px')}
function confirmDelete(){const p=state.pendingDelete;if(!p)return;const node=$(selectorFor(p));prepRemoveMetrics(node);hide($('#deleteModal'));
  if(p.type==='message'){const m=activeMessages().find(x=>x.id===p.id);if(m&&!m.mine){finalDelete(p,node);return}}
  pending(node);showUndo(p.type);clearTimeout(state.undoTimer);state.undoTimer=setTimeout(()=>finalDelete(p,node),DELETE_DELAY)}
function undoDelete(){clearTimeout(state.undoTimer);state.undoTimer=null;state.pendingDelete=null;$$('.ucmu-delete-pending').forEach(restore);hide($('#undoToast'))}
function finalDelete(p,node){clearTimeout(state.undoTimer);state.undoTimer=null;removeAnimated(node,()=>{if(p.type==='message'){state.messages[state.activeChat]=activeMessages().filter(m=>m.id!==p.id);renderFeed()}if(p.type==='chat'){state.chats=state.chats.filter(c=>c.id!==p.id);state.folders.forEach(f=>f.chatIds=f.chatIds.filter(id=>id!==p.id));delete state.messages[p.id];if(state.activeChat===p.id)state.activeChat=state.chats[0]?.id||null;renderAll()}if(p.type==='folder'){const f=findFolder(p.id);if(f){const ids=new Set(f.chatIds);state.chats=state.chats.filter(c=>!ids.has(c.id));ids.forEach(id=>delete state.messages[id]);if(ids.has(state.activeChat))state.activeChat=state.chats[0]?.id||null}state.folders=state.folders.filter(f=>f.id!==p.id);renderAll()}hide($('#undoToast'));state.pendingDelete=null})}
function showUndo(type){const t=type==='message'?'Сообщение удаляется':type==='chat'?'Чат удаляется':'Папка и её чаты удаляются';$('#undoText').textContent=t;const u=$('#undoToast');u.classList.remove('run');show(u);void u.offsetWidth;u.classList.add('run')}
function updateChatLast(text){const c=findChat(state.activeChat);if(c){c.last=state.user+': '+text;c.time='сейчас';renderChats()}}
function formatSize(size){if(!size)return'0 MB';const mb=size/1024/1024;return mb<1?Math.ceil(size/1024)+' KB':mb.toFixed(1)+' MB'}
function bindDrag(){let dragged=null,slot=null,dropFolderId=null,lastTarget=null,lastAfter=null;
  const selector='[data-chat-id]';
  function makeSlot(from){const el=document.createElement('div');el.className='drag-slot';el.style.height=(from?.offsetHeight||58)+'px';return el}
  function cleanup(){dragged?.classList.remove('dragging','chat-source-hidden');slot?.remove();slot=null;dragged=null;lastTarget=null;lastAfter=null;state.drag=null;document.body.classList.remove('drag-live');$$('.folder-drop-target').forEach(x=>x.classList.remove('folder-drop-target'))}
  function markFolder(folder){if(dropFolderId===folder?.dataset?.folderId)return;$$('.folder-drop-target').forEach(x=>x.classList.remove('folder-drop-target'));dropFolderId=null;if(folder){folder.classList.add('folder-drop-target');dropFolderId=folder.dataset.folderId}}
  function moveSlot(over,e){if(!slot||!over||over===dragged)return;const list=over.parentElement;if(!list)return;const r=over.getBoundingClientRect();const after=(e?.clientY||0)>r.top+r.height/2;if(lastTarget===over&&lastAfter===after)return;lastTarget=over;lastAfter=after;slot.style.transition='transform .24s cubic-bezier(.16,.86,.22,1)';over.style.transition='transform .24s cubic-bezier(.16,.86,.22,1)';list.insertBefore(slot,after?over.nextSibling:over)}
  document.addEventListener('dragstart',e=>{const item=e.target.closest(selector);if(!item)return;dragged=item;state.drag=item.dataset.chatId;slot=makeSlot(item);document.body.classList.add('drag-live');item.classList.add('dragging');item.parentElement.insertBefore(slot,item);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',state.drag);setTimeout(()=>item.classList.add('chat-source-hidden'),0)});
  document.addEventListener('dragend',cleanup);
  document.addEventListener('dragover',e=>{if(!state.drag)return;const overChat=e.target.closest(selector);const overFolder=e.target.closest('[data-folder-id]');if(!overChat&&!overFolder)return;e.preventDefault();if(overFolder&&!overChat)markFolder(overFolder);else markFolder(null);if(overChat)moveSlot(overChat,e)});
  document.addEventListener('drop',e=>{if(!state.drag)return;e.preventDefault();const folder=e.target.closest('[data-folder-id]');const from=state.drag;if(folder&&!e.target.closest(selector)){addChatToFolder(from,folder.dataset.folderId)}else{reorderChatsFromDom(from)}cleanup();renderChats()})}
function reorderChatsFromDom(from){const ids=Array.from(document.querySelectorAll('#chatList>[data-chat-id],#chatList>.drag-slot')).map(el=>el.classList.contains('drag-slot')?from:el.dataset.chatId).filter(Boolean);if(!ids.length)return;const map=new Map(state.chats.map(c=>[c.id,c]));const seen=new Set();const reordered=[];ids.forEach(id=>{if(!seen.has(id)&&map.has(id)){seen.add(id);reordered.push(map.get(id))}});state.chats.forEach(c=>{if(!seen.has(c.id))reordered.push(c)});state.chats=reordered}
function addChatToFolder(chatId,folderId){state.folders.forEach(f=>f.chatIds=f.chatIds.filter(id=>id!==chatId));const f=findFolder(folderId);if(f&&!f.chatIds.includes(chatId)){f.chatIds.push(chatId);f.open=false}}
function bindDrop(){const feed=$('#feed'),drop=$('#drop');['dragenter','dragover'].forEach(ev=>feed.addEventListener(ev,e=>{if(e.dataTransfer?.types?.includes('Files')){e.preventDefault();drop.classList.add('show')}}));['dragleave','drop'].forEach(ev=>feed.addEventListener(ev,e=>{drop.classList.remove('show')}));feed.addEventListener('drop',e=>{const f=e.dataTransfer?.files?.[0];if(f){e.preventDefault();previewFile(f)}})}
