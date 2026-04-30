import {state} from './state.js';
import {getFirebase} from './firebase.js';
import {renderChats, renderFeed} from './render.js';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  arrayUnion
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

let db = null;
let chatsUnsub = null;
let messagesUnsub = null;
let ready = false;

function toast(text){
  let el = document.getElementById('fireDebugToast');
  if(!el){
    el = document.createElement('div');
    el.id = 'fireDebugToast';
    el.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:99999;background:rgba(10,12,12,.96);color:#fff;border:1px solid rgba(255,255,255,.18);padding:10px 14px;box-shadow:0 12px 40px rgba(0,0,0,.55);font:12px system-ui;max-width:min(520px,calc(100vw - 28px));white-space:pre-wrap;pointer-events:none';
    document.body.appendChild(el);
  }
  el.textContent = text;
  clearTimeout(el._t);
  el._t = setTimeout(()=>el.remove(), 5200);
}

function messageTime(data){
  const d = data.createdAt?.toDate?.();
  if(!d) return 'сейчас';
  return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}

function chatTime(data){
  const d = data.updatedAt?.toDate?.() || data.createdAt?.toDate?.();
  if(!d) return 'сейчас';
  const today = new Date();
  if(d.toDateString() !== today.toDateString()) return 'Вчера';
  return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}

function currentUid(){ return state.currentUser?.uid; }
function displayName(){ return state.currentUser?.displayName || state.currentUser?.username || state.user || 'Operator'; }

function mapChat(snap){
  const d = snap.data();
  return {id:snap.id,title:d.title||'Чат',last:d.lastText||'Нет сообщений',time:chatTime(d),unread:0,muted:false,members:d.members||[],type:d.type||'group',styleColor:d.styleColor||d.color||'#d71920'};
}

function mapMessage(snap){
  const d = snap.data();
  const deletedFor = d.deletedFor || [];
  if(currentUid() && deletedFor.includes(currentUid())) return null;
  return {id:snap.id,author:d.authorName||'User',authorId:d.authorId,color:d.authorId===currentUid()?'red':'green',type:d.type||'text',text:d.text||'',file:d.file||'',size:d.size||'',time:messageTime(d),mine:d.authorId===currentUid(),reactions:d.reactions||{},reply:d.replyTo||null};
}

async function ensureGeneralChat(){
  const uid = currentUid();
  if(!uid || !db) return;
  const ref = doc(db, 'chats', 'general');
  const snap = await getDoc(ref);
  if(!snap.exists()){
    console.log('[UCMU] create chats/general for', uid);
    await setDoc(ref, {title:'# Общий чат',type:'group',members:[uid],createdAt:serverTimestamp(),updatedAt:serverTimestamp(),lastText:'Чат создан',styleColor:'#d71920'});
    return;
  }
  const members = snap.data().members || [];
  console.log('[UCMU] chats/general members', members, 'current uid', uid);
  if(!members.includes(uid)){
    console.log('[UCMU] joining chats/general', uid);
    await updateDoc(ref, {members: arrayUnion(uid), updatedAt: serverTimestamp()});
  }
}

export async function initChatStore(){
  const uid = currentUid();
  if(!uid) return;
  const fb = await getFirebase();
  db = fb.db;
  try{
    await ensureGeneralChat();
  }catch(err){
    console.error('[UCMU] ensureGeneralChat failed', err);
    toast('Firestore: не удалось подключить общий чат.\n' + (err.message || err.code || err));
  }
  ready = true;
  subscribeChats();
}

export function isChatStoreReady(){ return ready && !!db && !!currentUid(); }

export function subscribeChats(){
  if(!isChatStoreReady()) return;
  chatsUnsub?.();
  const q = query(collection(db, 'chats'), where('members', 'array-contains', currentUid()), orderBy('updatedAt', 'desc'), limit(50));
  chatsUnsub = onSnapshot(q, snap => {
    const next = snap.docs.map(mapChat);
    console.log('[UCMU] chats snapshot', next.map(c=>({id:c.id,title:c.title,members:c.members})));
    state.chats = next.length ? next : state.chats;
    if(!state.activeChat || !state.chats.some(c => c.id === state.activeChat)) state.activeChat = state.chats[0]?.id || 'general';
    renderChats();
    subscribeMessages(state.activeChat);
  }, err => {
    console.error('[UCMU] subscribeChats failed', err);
    toast('Firestore chats error:\n' + (err.message || err.code || err));
  });
}

export function subscribeMessages(chatId){
  if(!isChatStoreReady() || !chatId) return;
  messagesUnsub?.();
  console.log('[UCMU] subscribe messages for chatId:', chatId);
  const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'), limit(200));
  messagesUnsub = onSnapshot(q, snap => {
    console.log('[UCMU] messages snapshot', chatId, snap.size);
    state.messages[chatId] = snap.docs.map(mapMessage).filter(Boolean);
    renderFeed();
  }, err => {
    console.error('[UCMU] subscribeMessages failed', err);
    toast('Firestore messages error for '+chatId+':\n' + (err.message || err.code || err));
  });
}

export async function sendStoreMessage({type='text', text='', file='', size='', replyTo=null}={}){
  if(!isChatStoreReady()){
    toast('Firestore не готов: сообщение ушло только в локальный UI.');
    return false;
  }
  const chatId = state.activeChat;
  if(!chatId){
    toast('Нет activeChat — некуда отправлять.');
    return false;
  }
  const payload = {authorId:currentUid(),authorName:displayName(),type,text:text||'',createdAt:serverTimestamp(),updatedAt:serverTimestamp(),deletedFor:[],deletedForAll:false,reactions:{}};
  if(file) payload.file = file;
  if(size) payload.size = size;
  if(replyTo) payload.replyTo = replyTo;
  console.log('[UCMU] sending message', {chatId, payload});
  try{
    const ref = await addDoc(collection(db, 'chats', chatId, 'messages'), payload);
    console.log('[UCMU] message written', ref.path);
    await updateDoc(doc(db, 'chats', chatId), {lastText:type==='sticker'?`${displayName()}: ${text}`:`${displayName()}: ${text||file||'сообщение'}`,updatedAt:serverTimestamp()});
    toast('Firestore OK: ' + ref.path);
    return true;
  }catch(err){
    console.error('[UCMU] send message failed', err);
    toast('Firestore send error:\nchatId: '+chatId+'\n'+(err.message || err.code || err));
    throw err;
  }
}

export async function updateStoreReaction(messageId, reactions){
  if(!isChatStoreReady() || !state.activeChat || !messageId) return false;
  await updateDoc(doc(db, 'chats', state.activeChat, 'messages', messageId), {reactions:reactions||{},updatedAt:serverTimestamp()});
  return true;
}

export async function deleteStoreMessageForMe(messageId){
  if(!isChatStoreReady() || !state.activeChat || !messageId) return false;
  await updateDoc(doc(db, 'chats', state.activeChat, 'messages', messageId), {deletedFor:arrayUnion(currentUid()),updatedAt:serverTimestamp()});
  return true;
}

export async function deleteStoreMessageForAll(messageId){
  if(!isChatStoreReady() || !state.activeChat || !messageId) return false;
  await updateDoc(doc(db, 'chats', state.activeChat, 'messages', messageId), {text:'',type:'text',deletedForAll:true,updatedAt:serverTimestamp()});
  return true;
}

export function stopChatStore(){
  chatsUnsub?.(); messagesUnsub?.();
  chatsUnsub = null; messagesUnsub = null; ready = false;
}
