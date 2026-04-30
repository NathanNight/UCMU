import {state} from './state.js';
import {getFirebase} from './firebase.js';
import {renderChats, renderFeed} from './render.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
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
let subscribedChatId = null;
let ready = false;

function toast(text){let el=document.getElementById('fireDebugToast');if(!el){el=document.createElement('div');el.id='fireDebugToast';el.style.cssText='position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:99999;background:rgba(10,12,12,.96);color:#fff;border:1px solid rgba(255,255,255,.18);padding:10px 14px;box-shadow:0 12px 40px rgba(0,0,0,.55);font:12px system-ui;max-width:min(520px,calc(100vw - 28px));white-space:pre-wrap;pointer-events:none';document.body.appendChild(el)}el.textContent=text;clearTimeout(el._t);el._t=setTimeout(()=>el.remove(),5200)}

const sleep = ms => new Promise(r => setTimeout(r, ms));
function currentUid(){ return state.currentUser?.uid; }
function displayName(){ return state.currentUser?.displayName || state.currentUser?.username || state.user || 'Operator'; }
function normalizeUsername(v){ return String(v || '').trim().toLowerCase().replace(/^@/,''); }
function messageTime(data){const d=data.createdAt?.toDate?.();if(!d)return'сейчас';return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}
function chatTime(data){const d=data.updatedAt?.toDate?.()||data.createdAt?.toDate?.();if(!d)return'сейчас';const today=new Date();if(d.toDateString()!==today.toDateString())return'Вчера';return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}
function mapChat(snap){const d=snap.data();return{id:snap.id,title:d.title||'Чат',description:d.description||d.desc||'',last:d.lastText||'Нет сообщений',time:chatTime(d),unread:0,muted:false,members:d.members||[],memberProfiles:d.memberProfiles||{},type:d.type||'group',styleColor:d.styleColor||d.color||'#d71920'}}
function mapMessage(snap){const d=snap.data();if(d.deletedForAll===true)return null;const deletedFor=d.deletedFor||[];if(currentUid()&&deletedFor.includes(currentUid()))return null;return{id:snap.id,author:d.authorName||'User',authorId:d.authorId,color:d.authorId===currentUid()?'red':'green',type:d.type||'text',text:d.text||'',file:d.file||'',size:d.size||'',time:messageTime(d),mine:d.authorId===currentUid(),reactions:d.reactions||{},reply:d.replyTo||null,deletingForAll:d.deletingForAll===true}}

async function ensureGeneralChat(){const uid=currentUid();if(!uid||!db)return;const ref=doc(db,'chats','general');const snap=await getDoc(ref);if(!snap.exists()){await setDoc(ref,{title:'# Общий чат',description:'',type:'group',members:[uid],memberProfiles:{[uid]:{uid,displayName:displayName(),username:state.currentUser?.username||''}},createdAt:serverTimestamp(),updatedAt:serverTimestamp(),lastText:'Чат создан',styleColor:'#d71920'});return}const members=snap.data().members||[];if(!members.includes(uid))await updateDoc(ref,{members:arrayUnion(uid),updatedAt:serverTimestamp()})}
export async function initChatStore(){const uid=currentUid();if(!uid)return;const fb=await getFirebase();db=fb.db;state.chats=[];state.folders=[];state.messages={};state.activeChat=null;subscribedChatId=null;renderChats();renderFeed();try{await ensureGeneralChat()}catch(err){console.error('[UCMU] ensureGeneralChat failed',err);toast('Firestore: не удалось подключить общий чат.\n'+(err.message||err.code||err))}ready=true;subscribeChats()}
export function isChatStoreReady(){return ready&&!!db&&!!currentUid()}
export function subscribeChats(){if(!isChatStoreReady())return;chatsUnsub?.();const q=query(collection(db,'chats'),where('members','array-contains',currentUid()),orderBy('updatedAt','desc'),limit(50));chatsUnsub=onSnapshot(q,snap=>{const next=snap.docs.map(mapChat);state.chats=next;state.folders=state.folders.filter(f=>f.chatIds.some(id=>state.chats.some(c=>c.id===id)));if(!state.activeChat||!state.chats.some(c=>c.id===state.activeChat))state.activeChat=state.chats[0]?.id||null;renderChats();if(state.activeChat)subscribeMessages(state.activeChat);else{messagesUnsub?.();messagesUnsub=null;subscribedChatId=null;state.messages={};renderFeed()}},err=>{console.error('[UCMU] subscribeChats failed',err);toast('Firestore chats error:\n'+(err.message||err.code||err))})}
export function subscribeMessages(chatId){if(!isChatStoreReady()||!chatId)return;if(subscribedChatId===chatId&&messagesUnsub)return;messagesUnsub?.();subscribedChatId=chatId;const q=query(collection(db,'chats',chatId,'messages'),orderBy('createdAt','asc'),limit(200));messagesUnsub=onSnapshot(q,snap=>{state.messages[chatId]=snap.docs.map(mapMessage).filter(Boolean);if(state.activeChat===chatId)renderFeed()},err=>{console.error('[UCMU] subscribeMessages failed',err);toast('Firestore messages error for '+chatId+':\n'+(err.message||err.code||err))})}
export async function sendStoreMessage({type='text',text='',file='',size='',replyTo=null}={}){if(!isChatStoreReady()){toast('Firestore не готов: сообщение ушло только в локальный UI.');return false}const chatId=state.activeChat;if(!chatId){toast('Нет activeChat — некуда отправлять.');return false}const payload={authorId:currentUid(),authorName:displayName(),type,text:text||'',createdAt:serverTimestamp(),updatedAt:serverTimestamp(),deletedFor:[],deletedForAll:false,deletingForAll:false,reactions:{}};if(file)payload.file=file;if(size)payload.size=size;if(replyTo)payload.replyTo=replyTo;try{await addDoc(collection(db,'chats',chatId,'messages'),payload);await updateDoc(doc(db,'chats',chatId),{lastText:type==='sticker'?`${displayName()}: ${text}`:`${displayName()}: ${text||file||'сообщение'}`,updatedAt:serverTimestamp()});return true}catch(err){console.error('[UCMU] send message failed',err);toast('Firestore send error:\nchatId: '+chatId+'\n'+(err.message||err.code||err));throw err}}
export async function searchUsersByUsername(username){if(!isChatStoreReady())return[];const u=normalizeUsername(username);if(!u||u.length<2)return[];const direct=await getDoc(doc(db,'usernames',u)).catch(()=>null);let found=[];if(direct?.exists?.()){const uid=direct.data().uid||direct.data().userId;if(uid){const us=await getDoc(doc(db,'users',uid));if(us.exists())found.push({uid,...us.data()})}}if(!found.length){const snap=await getDocs(query(collection(db,'users'),where('username','==',u),limit(8)));found=snap.docs.map(d=>({uid:d.id,...d.data()}))}return found.filter(x=>x.uid!==currentUid())}
export async function listKnownUsers(){if(!isChatStoreReady())return[];const known=new Map();state.chats.forEach(c=>Object.entries(c.memberProfiles||{}).forEach(([uid,p])=>{if(uid!==currentUid())known.set(uid,{uid,...p})}));if(known.size)return[...known.values()];const snap=await getDocs(query(collection(db,'users'),limit(30)));return snap.docs.map(d=>({uid:d.id,...d.data()})).filter(x=>x.uid!==currentUid())}
export async function createOrOpenChatWithUsers(users){if(!isChatStoreReady())return null;const clean=(users||[]).filter(Boolean).filter(u=>u.uid&&u.uid!==currentUid());if(!clean.length){toast('Выберите хотя бы одного контакта.');return null}const memberIds=[currentUid(),...clean.map(u=>u.uid)].sort();const chatId=memberIds.length===2?'private_'+memberIds.join('_'):('group_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7));const exists=await getDoc(doc(db,'chats',chatId));if(!exists.exists()){const profiles={[currentUid()]:{uid:currentUid(),displayName:displayName(),username:state.currentUser?.username||''}};clean.forEach(u=>profiles[u.uid]={uid:u.uid,displayName:u.displayName||u.username||u.email||'User',username:u.username||''});const title=clean.length===1?(clean[0].displayName||clean[0].username||clean[0].email||'Личный чат'):clean.map(u=>u.displayName||u.username||'User').join(', ');await setDoc(doc(db,'chats',chatId),{title,description:'',type:clean.length===1?'private':'group',members:memberIds,memberProfiles:profiles,createdAt:serverTimestamp(),updatedAt:serverTimestamp(),lastText:'Чат создан',styleColor:'#d71920'})}state.activeChat=chatId;subscribeMessages(chatId);renderChats();renderFeed();return chatId}
export async function updateActiveChatMeta({title,description,styleColor}){if(!isChatStoreReady()||!state.activeChat)return;await updateDoc(doc(db,'chats',state.activeChat),{title:title||'Чат',description:description||'',styleColor:styleColor||'#d71920',updatedAt:serverTimestamp()})}
export async function clearActiveChatHistory(){if(!isChatStoreReady()||!state.activeChat)return;const chatId=state.activeChat;const snap=await getDocs(query(collection(db,'chats',chatId,'messages'),limit(300)));const own=snap.docs.filter(d=>d.data().authorId===currentUid()&&!d.data().deletedForAll);await Promise.all(own.map(d=>updateDoc(doc(db,'chats',chatId,'messages',d.id),{deletingForAll:true,updatedAt:serverTimestamp()})));await sleep(940);await Promise.all(own.map(d=>updateDoc(doc(db,'chats',chatId,'messages',d.id),{text:'',type:'text',deletingForAll:false,deletedForAll:true,updatedAt:serverTimestamp()})));return {cleared:own.length,total:snap.size}}
export async function deleteActiveChat(){if(!isChatStoreReady()||!state.activeChat)return;await updateDoc(doc(db,'chats',state.activeChat),{members:[],updatedAt:serverTimestamp(),deleted:true})}
export async function updateStoreReaction(messageId,reactions){if(!isChatStoreReady()||!state.activeChat||!messageId)return false;await updateDoc(doc(db,'chats',state.activeChat,'messages',messageId),{reactions:reactions||{},updatedAt:serverTimestamp()});return true}
export async function deleteStoreMessageForMe(messageId){if(!isChatStoreReady()||!state.activeChat||!messageId)return false;await updateDoc(doc(db,'chats',state.activeChat,'messages',messageId),{deletedFor:arrayUnion(currentUid()),updatedAt:serverTimestamp()});return true}
export async function deleteStoreMessageForAll(messageId){if(!isChatStoreReady()||!state.activeChat||!messageId)return false;const ref=doc(db,'chats',state.activeChat,'messages',messageId);await updateDoc(ref,{deletingForAll:true,updatedAt:serverTimestamp()});await sleep(940);await updateDoc(ref,{text:'',type:'text',deletingForAll:false,deletedForAll:true,updatedAt:serverTimestamp()});return true}
export function stopChatStore(){chatsUnsub?.();messagesUnsub?.();chatsUnsub=null;messagesUnsub=null;subscribedChatId=null;ready=false}
