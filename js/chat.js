import { auth, db } from './firebase-init.js';
import { signOut } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot, doc, setDoc, getDoc, where } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const $ = id => document.getElementById(id);
let currentUser=null,currentProfile=null,activeChat=null;
let unsubChats=null,unsubMessages=null;
let chatCache = new Map();
let renderedIds = new Set();
let initialMessagesLoaded = false;

function clean(s){return String(s||'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));}
function fmt(ts){try{return (ts?.toDate?ts.toDate():new Date()).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});}catch{return 'сейчас';}}
function normalizeUsername(v){return String(v||'').trim().toLowerCase().replace(/^@/,'').replace(/[^a-z0-9_.]/g,'');}
function privateChatId(a,b){return 'private_'+[a,b].sort().join('_');}
async function loadProfile(uid){const s=await getDoc(doc(db,'users',uid));return s.exists()?s.data():null;}

function chatTitleFor(c){
  if(c.type === 'private' && currentUser){
    const other = (c.memberProfiles || []).find(p=>p.uid !== currentUser.uid);
    return other ? other.name : 'Личный чат';
  }
  return c.title || 'Чат';
}
function drawChat(id,c){
  const title = chatTitleFor(c);
  const active = activeChat === id ? 'active' : '';
  const initial = clean(title.slice(0,1).toUpperCase() || '?');
  return `<button class="chat dragItem ${active}" data-kind="chat" data-chat-id="${id}">
    <div class="ava s">${initial}</div>
    <div class="chatInfo"><div class="ct chatName">${clean(title)}</div><div class="cl chatSub">${c.lastMessage ? clean(c.lastMessage) : c.type || 'chat'}</div></div>
    <div class="extra"><div class="time">${c.lastMessageAt ? fmt(c.lastMessageAt) : ''}</div>${c.unread ? `<div class="badge">${c.unread}</div>` : ''}</div>
  </button>`;
}
function renderChatList(){
  const html = [...chatCache.entries()].map(([id,c])=>drawChat(id,c)).join('');
  $('chatList').innerHTML = html || '<div class="empty">Чатов пока нет.</div>';
  document.querySelectorAll('.chat[data-chat-id]').forEach(b=>b.onclick=()=>openChat(b.dataset.chatId));
  window.dispatchEvent(new Event('ucmu:chat-list-rendered'));
}
function watchChats(){
  if(unsubChats) unsubChats();
  const q = query(collection(db,'chats'),where('memberIds','array-contains',currentUser.uid));
  unsubChats = onSnapshot(q,snap=>{
    chatCache.clear();
    snap.forEach(d=>chatCache.set(d.id,d.data()));
    renderChatList();
    if(!activeChat && snap.docs[0]) openChat(snap.docs[0].id);
  });
}
async function openChat(chatId){
  activeChat = chatId;
  renderedIds.clear();
  initialMessagesLoaded = false;
  $('feed').innerHTML = '<div class="empty">Загрузка сообщений...</div>';
  document.querySelectorAll('.chat[data-chat-id]').forEach(b=>b.classList.toggle('active',b.dataset.chatId===chatId));
  const cdoc = await getDoc(doc(db,'chats',chatId));
  const c = cdoc.data() || {};
  renderMembers(c);
  $('messageForm').classList.remove('disabled');
  watchMessages(chatId);
}
function messageHTML(id,data,animate){
  const mine = currentUser && data.uid === currentUser.uid;
  const name = data.name || 'Unknown';
  const initial = clean(name.slice(0,1).toUpperCase() || '?');
  return `<article class="msg ${mine?'mine':''} ${animate?'added':''}" data-mid="${id}">
    <div class="ava s">${initial}</div>
    <div class="bubble">
      <div class="meta"><span class="${mine?'red':'green'}">${clean(name)}</span><span class="time"> ${fmt(data.createdAt)}</span></div>
      <div class="txt text">${clean(data.text)}</div>
    </div>
  </article>`;
}
function watchMessages(chatId){
  if(unsubMessages) unsubMessages();
  const q = query(collection(db,'chats',chatId,'messages'),orderBy('createdAt','asc'),limit(150));
  unsubMessages = onSnapshot(q,snap=>{
    if(snap.empty){$('feed').innerHTML='<div class="empty">Сообщений пока нет.</div>';initialMessagesLoaded=true;return;}
    if(!initialMessagesLoaded){
      $('feed').innerHTML='';
      snap.forEach(d=>{renderedIds.add(d.id);$('feed').insertAdjacentHTML('beforeend',messageHTML(d.id,d.data(),false));});
      initialMessagesLoaded=true;
      $('feed').scrollTop=$('feed').scrollHeight;
      return;
    }
    snap.docChanges().forEach(ch=>{
      if(ch.type==='added' && !renderedIds.has(ch.doc.id)){
        renderedIds.add(ch.doc.id);
        $('feed').querySelector('.empty')?.remove();
        $('feed').insertAdjacentHTML('beforeend',messageHTML(ch.doc.id,ch.doc.data(),true));
        $('feed').scrollTo({top:$('feed').scrollHeight,behavior:'smooth'});
      }
    });
  });
}
async function createEmptyChat(title){
  const ref = await addDoc(collection(db,'chats'),{
    type:'group', title, createdBy:currentUser.uid,
    memberIds:[currentUser.uid],
    memberProfiles:[{uid:currentUser.uid,name:currentProfile.name,username:currentProfile.username}],
    createdAt:serverTimestamp(), updatedAt:serverTimestamp(), lastMessage:''
  });
  await openChat(ref.id);
}
async function seedDemoUsers(){
  const demo=[['demo_alice','Alice','alice'],['demo_leon','Leon','leon'],['demo_jill','Jill','jill'],['demo_hunk','Hunk','hunk']];
  for(const [uid,name,username] of demo){
    await setDoc(doc(db,'users',uid),{uid,name,username,usernameLower:username,online:true,demo:true,updatedAt:serverTimestamp()},{merge:true});
    await setDoc(doc(db,'usernames',username),{uid,username,demo:true,updatedAt:serverTimestamp()});
  }
}
async function findUser(username){
  const uname = normalizeUsername(username);
  if(!uname || uname.length < 2){$('searchResults').innerHTML='';return null;}
  const s = await getDoc(doc(db,'usernames',uname));
  if(!s.exists()){$('searchResults').innerHTML='<div class="empty">Пользователь не найден</div>';return null;}
  const p = await loadProfile(s.data().uid);
  if(!p){$('searchResults').innerHTML='<div class="empty">Профиль не найден</div>';return null;}
  $('searchResults').innerHTML = `<div class="candidate"><div class="ava s">${clean(p.name[0]||'?')}</div><span>${clean(p.name)} @${clean(p.username)}</span><button class="primary" id="writeFound" type="button">Написать</button></div>`;
  $('writeFound').onclick = () => openPrivateChat(p);
  return p;
}
async function openPrivateChat(other){
  const id = privateChatId(currentUser.uid,other.uid);
  const ref = doc(db,'chats',id);
  const existing = await getDoc(ref);
  if(!existing.exists()){
    await setDoc(ref,{type:'private',title:'private',createdBy:currentUser.uid,memberIds:[currentUser.uid,other.uid],memberProfiles:[{uid:currentUser.uid,name:currentProfile.name,username:currentProfile.username},{uid:other.uid,name:other.name,username:other.username}],createdAt:serverTimestamp(),updatedAt:serverTimestamp(),lastMessage:''});
  }
  await openChat(id);
}
function renderMembers(chat){
  const members = chat.memberProfiles || [];
  $('memberList').innerHTML = members.map(p=>`<div class="member"><div class="ava s">${clean((p.name||'?')[0])}</div><span>${clean(p.name||'User')}</span><i class="dot"></i></div>`).join('') || '<div class="empty">Участников пока нет</div>';
}
function toggleOnly(panel){
  ['membersPanel','contactsPanel'].forEach(id=>{ if(id !== panel) $(id).classList.add('hidden'); });
  $(panel).classList.toggle('hidden');
}

export function initChat(){
  window.addEventListener('ucmu:user-ready', async e=>{
    currentUser = e.detail.user;
    currentProfile = e.detail.profile;
    $('profileName').textContent = currentProfile.name;
    $('profileAva').textContent = (currentProfile.name?.[0] || '?').toUpperCase();
    await seedDemoUsers();
    watchChats();
  });

  $('logoutBtn').onclick = () => signOut(auth).then(()=>location.reload());
  $('collapseSide').onclick = () => document.getElementById('chatApp').classList.toggle('collapsed');
  $('sideSearchBtn').onclick = () => document.querySelector('.search').classList.toggle('open');
  $('newChatBtn').onclick = () => $('chatCreateModal').classList.remove('hidden');
  $('closeCreateChat').onclick = () => $('chatCreateModal').classList.add('hidden');
  $('createChatConfirm').onclick = () => {
    const title = $('newChatTitle').value.trim();
    if(!title) return $('newChatTitle').focus();
    createEmptyChat(title);
    $('chatCreateModal').classList.add('hidden');
    $('newChatTitle').value='';
  };
  $('userSearch').addEventListener('input',()=>findUser($('userSearch').value));
  $('membersBtn').onclick = () => toggleOnly('membersPanel');
  $('contactsBtn').onclick = () => toggleOnly('contactsPanel');
  $('closeMembers').onclick = () => $('membersPanel').classList.add('hidden');
  $('closeContacts').onclick = () => $('contactsPanel').classList.add('hidden');
  $('chatSearchBtn').onclick = () => {$('headerSearch').classList.toggle('open'); if($('headerSearch').classList.contains('open')) $('chatSearchInput').focus();};
  $('attachBtn').onclick = () => $('fileInput').click();
  $('stickerBtn').onclick = () => $('stickers').classList.toggle('hidden');

  $('messageForm').onsubmit = async e => {
    e.preventDefault();
    if(!currentUser || !activeChat) return;
    const text = $('msgInput').value.trim();
    if(!text) return;
    $('msgInput').value='';
    await addDoc(collection(db,'chats',activeChat,'messages'),{text,uid:currentUser.uid,name:currentProfile.name,createdAt:serverTimestamp()});
    await setDoc(doc(db,'chats',activeChat),{updatedAt:serverTimestamp(),lastMessage:text,lastMessageAt:serverTimestamp()},{merge:true});
  };

  document.querySelectorAll('#stickers .grid button').forEach(b=>b.onclick=()=>{
    $('msgInput').value = b.textContent;
    $('messageForm').requestSubmit();
    $('stickers').classList.add('hidden');
  });
}
