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
  arrayUnion,
  arrayRemove
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

let db = null;
let chatsUnsub = null;
let messagesUnsub = null;
let ready = false;

function nowLabel(){
  const d = new Date();
  return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
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

function currentUid(){
  return state.currentUser?.uid;
}

function displayName(){
  return state.currentUser?.displayName || state.currentUser?.username || state.user || 'Operator';
}

function mapChat(snap){
  const d = snap.data();
  return {
    id: snap.id,
    title: d.title || 'Чат',
    last: d.lastText || 'Нет сообщений',
    time: chatTime(d),
    unread: 0,
    muted: false,
    members: d.members || [],
    type: d.type || 'group',
    styleColor: d.styleColor || d.color || '#d71920'
  };
}

function mapMessage(snap){
  const d = snap.data();
  const deletedFor = d.deletedFor || [];
  if(currentUid() && deletedFor.includes(currentUid())) return null;
  return {
    id: snap.id,
    author: d.authorName || 'User',
    authorId: d.authorId,
    color: d.authorId === currentUid() ? 'red' : 'green',
    type: d.type || 'text',
    text: d.text || '',
    file: d.file || '',
    size: d.size || '',
    time: messageTime(d),
    mine: d.authorId === currentUid(),
    reactions: d.reactions || {},
    reply: d.replyTo || null
  };
}

async function ensureGeneralChat(){
  const uid = currentUid();
  if(!uid || !db) return;
  const ref = doc(db, 'chats', 'general');
  const snap = await getDoc(ref);
  if(!snap.exists()){
    await setDoc(ref, {
      title: '# Общий чат',
      type: 'group',
      members: [uid],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastText: 'Чат создан',
      styleColor: '#d71920'
    });
    return;
  }
  const members = snap.data().members || [];
  if(!members.includes(uid)) await updateDoc(ref, {members: arrayUnion(uid), updatedAt: serverTimestamp()});
}

export async function initChatStore(){
  const uid = currentUid();
  if(!uid) return;
  const fb = await getFirebase();
  db = fb.db;
  await ensureGeneralChat();
  ready = true;
  subscribeChats();
}

export function isChatStoreReady(){
  return ready && !!db && !!currentUid();
}

export function subscribeChats(){
  if(!isChatStoreReady()) return;
  chatsUnsub?.();
  const q = query(collection(db, 'chats'), where('members', 'array-contains', currentUid()), orderBy('updatedAt', 'desc'), limit(50));
  chatsUnsub = onSnapshot(q, snap => {
    const next = snap.docs.map(mapChat);
    state.chats = next.length ? next : state.chats;
    if(!state.activeChat || !state.chats.some(c => c.id === state.activeChat)) state.activeChat = state.chats[0]?.id || 'general';
    renderChats();
    subscribeMessages(state.activeChat);
  }, err => {
    console.error('subscribeChats failed', err);
  });
}

export function subscribeMessages(chatId){
  if(!isChatStoreReady() || !chatId) return;
  messagesUnsub?.();
  const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'), limit(200));
  messagesUnsub = onSnapshot(q, snap => {
    state.messages[chatId] = snap.docs.map(mapMessage).filter(Boolean);
    renderFeed();
  }, err => {
    console.error('subscribeMessages failed', err);
  });
}

export async function sendStoreMessage({type='text', text='', file='', size='', replyTo=null}={}){
  if(!isChatStoreReady()) return false;
  const chatId = state.activeChat;
  if(!chatId) return false;
  const payload = {
    authorId: currentUid(),
    authorName: displayName(),
    type,
    text: text || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    deletedFor: [],
    deletedForAll: false,
    reactions: {}
  };
  if(file) payload.file = file;
  if(size) payload.size = size;
  if(replyTo) payload.replyTo = replyTo;
  await addDoc(collection(db, 'chats', chatId, 'messages'), payload);
  await updateDoc(doc(db, 'chats', chatId), {
    lastText: type === 'sticker' ? `${displayName()}: ${text}` : `${displayName()}: ${text || file || 'сообщение'}`,
    updatedAt: serverTimestamp()
  });
  return true;
}

export async function updateStoreReaction(messageId, reactions){
  if(!isChatStoreReady() || !state.activeChat || !messageId) return false;
  await updateDoc(doc(db, 'chats', state.activeChat, 'messages', messageId), {
    reactions: reactions || {},
    updatedAt: serverTimestamp()
  });
  return true;
}

export async function deleteStoreMessageForMe(messageId){
  if(!isChatStoreReady() || !state.activeChat || !messageId) return false;
  await updateDoc(doc(db, 'chats', state.activeChat, 'messages', messageId), {
    deletedFor: arrayUnion(currentUid()),
    updatedAt: serverTimestamp()
  });
  return true;
}

export async function deleteStoreMessageForAll(messageId){
  if(!isChatStoreReady() || !state.activeChat || !messageId) return false;
  await updateDoc(doc(db, 'chats', state.activeChat, 'messages', messageId), {
    text: '',
    type: 'text',
    deletedForAll: true,
    updatedAt: serverTimestamp()
  });
  return true;
}

export function stopChatStore(){
  chatsUnsub?.();
  messagesUnsub?.();
  chatsUnsub = null;
  messagesUnsub = null;
  ready = false;
}
