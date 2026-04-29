import {state,uid,activeMessages,findChat,findFolder} from './state.js';import {$,$$,show,hide,toggle,placeMenu} from './dom.js';import {renderAll,renderChats,renderFeed,appendMessage} from './render.js';import {pending,restore,removeAnimated} from './animations.js';
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
function createFolder(){const name=$('#folderName').value.trim()||'Новая папка';state.folders.push({id:uid('f'),name,color:'#d71920',open:false,chatIds:[]});hide($('#folderModal'));renderChats()}
function saveFolderStyle(){const f=findFolder(state.selectedFolderId);if(!f)return;f.name=$('#folderStyleName').value.trim()||f.name;hide($('#folderStyleModal'));renderChats()}
function startPrivateChat(){const person=$('#private .candidate.active')?.dataset.person||'Alice';let chat=state.chats.find(c=>c.title===person);if(!chat){chat={id:uid('chat'),title:person,last:'Новый личный чат',time:'сейчас',unread:0,muted:false};state.chats.unshift(chat);state.messages[chat.id]=[]}state.activeChat=chat.id;hide($('#private'));renderAll()}
function globalClick(e){
  const sticker=e.target.closest('[data-sticker]');if(sticker){appendMessage({id:uid('m'),author:state.user,color:'red',type:'sticker',text:sticker.dataset.sticker,time:'сейчас',mine:true});hide($('#stickers'));return}
  const chat=e.target.closest('[data-chat-id]');if(chat&&!e.target.closest('.ctx')){state.activeChat=chat.dataset.chatId;const c=findChat(state.activeChat);if(c)c.unread=0;renderAll();return}
  const folder=e.target.closest('.folder-item');if(folder){const wrap=folder.closest('[data-folder-id]');const f=findFolder(wrap.dataset.folderId);if(f){f.open=!f.open;renderChats()}return}
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
function handleChatAction(a){const c=findChat(state.selectedChatId);if(!c)return;if(a==='pin'){state.chats=state.chats.filter(x=>x.id!==c.id);state.chats.unshift(c)}if(a==='mute'){c.muted=!c.muted}if(a==='folder')addChatToFirstFolder(c.id);if(a==='delete')openDelete('chat',c.id);hide($('#chatCtx'));renderChats()}
function handleFolderAction(a){const f=findFolder(state.selectedFolderId);if(!f)return;if(a==='pin'){state.folders=state.folders.filter(x=>x.id!==f.id);state.folders.unshift(f)}if(a==='mute')f.muted=!f.muted;if(a==='style'){$('#folderStyleName').value=f.name;show($('#folderStyleModal'))}if(a==='delete')openDelete('folder',f.id);hide($('#folderCtx'));renderChats()}
function addChatToFirstFolder(chatId){if(!state.folders.length)state.folders.push({id:uid('f'),name:'Оперативные',color:'#d71920',open:false,chatIds:[]});const f=state.folders[0];if(!f.chatIds.includes(chatId))f.chatIds.push(chatId)}
function openDelete(type,id){state.pendingDelete={type,id};hide($('#deleteModal'));show($('#deleteModal'))}
function confirmDelete(){const p=state.pendingDelete;if(!p)return;const selector=p.type==='message'?`[data-msg-id="${p.id}"]`:p.type==='chat'?`[data-chat-id="${p.id}"]`:`[data-folder-id="${p.id}"]`;const node=$(selector);pending(node);hide($('#deleteModal'));showUndo(p.type);clearTimeout(state.undoTimer);state.undoTimer=setTimeout(()=>finalDelete(p,node),5000)}
function undoDelete(){clearTimeout(state.undoTimer);state.undoTimer=null;state.pendingDelete=null;$$('.ucmu-delete-pending').forEach(restore);hide($('#undoToast'))}
function finalDelete(p,node){removeAnimated(node,()=>{if(p.type==='message'){state.messages[state.activeChat]=activeMessages().filter(m=>m.id!==p.id);renderFeed()}if(p.type==='chat'){state.chats=state.chats.filter(c=>c.id!==p.id);state.folders.forEach(f=>f.chatIds=f.chatIds.filter(id=>id!==p.id));if(state.activeChat===p.id)state.activeChat=state.chats[0]?.id||null;renderAll()}if(p.type==='folder'){state.folders=state.folders.filter(f=>f.id!==p.id);renderChats()}hide($('#undoToast'));state.pendingDelete=null})}
function showUndo(type){const t=type==='message'?'Сообщение удалено для вас':type==='chat'?'Чат удаляется':'Папка удаляется';$('#undoText').textContent=t;const u=$('#undoToast');u.classList.remove('run');show(u);void u.offsetWidth;u.classList.add('run')}
function updateChatLast(text){const c=findChat(state.activeChat);if(c){c.last=state.user+': '+text;c.time='сейчас';renderChats()}}
function formatSize(size){if(!size)return'0 MB';const mb=size/1024/1024;return mb<1?Math.ceil(size/1024)+' KB':mb.toFixed(1)+' MB'}
function bindDrag(){let dragged=null;document.addEventListener('dragstart',e=>{const item=e.target.closest('[data-chat-id]');if(!item)return;dragged=item;state.drag=item.dataset.chatId;item.classList.add('dragging');setTimeout(()=>item.classList.add('chat-source-hidden'),0);e.dataTransfer.effectAllowed='move'});document.addEventListener('dragend',()=>{dragged?.classList.remove('dragging','chat-source-hidden');dragged=null;state.drag=null;$$('.drag-over').forEach(x=>x.classList.remove('drag-over'))});document.addEventListener('dragover',e=>{if(!state.drag)return;const over=e.target.closest('[data-chat-id],.folder-item');if(!over)return;e.preventDefault();if(over.matches('[data-chat-id]'))reorderPreview(over);});document.addEventListener('drop',e=>{if(!state.drag)return;e.preventDefault();const folder=e.target.closest('[data-folder-id]');const chat=e.target.closest('[data-chat-id]');if(folder&&!chat){addChatToFolder(state.drag,folder.dataset.folderId)}else if(chat){reorderChats(state.drag,chat.dataset.chatId)}renderChats()})}
function reorderPreview(over){const list=over.parentElement;const dragging=document.querySelector('.dragging');if(!dragging||dragging===over)return;const r=over.getBoundingClientRect();const after=(event?.clientY||0)>r.top+r.height/2;list.insertBefore(dragging,after?over.nextSibling:over)}
function reorderChats(from,to){if(from===to)return;const arr=state.chats;const a=arr.findIndex(c=>c.id===from),b=arr.findIndex(c=>c.id===to);if(a<0||b<0)return;const [m]=arr.splice(a,1);arr.splice(b,0,m)}
function addChatToFolder(chatId,folderId){state.folders.forEach(f=>f.chatIds=f.chatIds.filter(id=>id!==chatId));const f=findFolder(folderId);if(f&&!f.chatIds.includes(chatId)){f.chatIds.push(chatId);f.open=false}}
function bindDrop(){const feed=$('#feed'),drop=$('#drop');['dragenter','dragover'].forEach(ev=>feed.addEventListener(ev,e=>{if(e.dataTransfer?.types?.includes('Files')){e.preventDefault();drop.classList.add('show')}}));['dragleave','drop'].forEach(ev=>feed.addEventListener(ev,e=>{drop.classList.remove('show')}));feed.addEventListener('drop',e=>{const f=e.dataTransfer?.files?.[0];if(f){e.preventDefault();previewFile(f)}})}
