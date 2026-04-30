import {state} from './state.js';
import {renderChats,renderFeed,renderMembers} from './render.js';

// DEV BACKEND IS ON BY DEFAULT.
// Before real online Firebase tests: replace this file with the Firestore backend or switch this flag off in a future wrapper.
export const UCMU_DEV_LOCAL_BACKEND=true;

const KEY='ucmu_dev_chat_store_v1';
let ready=false;
let localSeq=0;
let storageBound=false;

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const now=()=>Date.now();
const uid=(p='id')=>`${p}_${now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
const currentUid=()=>state.currentUser?.uid||'dev_user';
const displayName=()=>state.currentUser?.displayName||state.currentUser?.username||state.user||'Operator';
const profileForCurrentUser=()=>({uid:currentUid(),displayName:displayName(),username:state.currentUser?.username||'',email:state.currentUser?.email||''});

function toast(text){let el=document.getElementById('fireDebugToast');if(!el){el=document.createElement('div');el.id='fireDebugToast';el.style.cssText='position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:99999;background:rgba(10,12,12,.96);color:#fff;border:1px solid rgba(255,255,255,.18);padding:10px 14px;box-shadow:0 12px 40px rgba(0,0,0,.55);font:12px system-ui;max-width:min(580px,calc(100vw - 28px));white-space:pre-wrap;pointer-events:none';document.body.appendChild(el)}el.textContent=text;clearTimeout(el._t);el._t=setTimeout(()=>el.remove(),4600)}

function defaultStore(){
  const me=profileForCurrentUser();
  return {
    chats:[{
      id:'general',title:'U.C.M.U',description:'ТЕСТ',type:'group',members:[me.uid],memberProfiles:{[me.uid]:me},ownerId:me.uid,createdBy:me.uid,last:'Нет сообщений',lastText:'Нет сообщений',time:'сейчас',styleColor:'#d71920',pinned:true,muted:false,unread:0
    }],
    folders:[],
    messages:{general:[]},
    users:{[me.uid]:me},
    updatedAt:now()
  };
}
function loadStore(){
  try{const raw=localStorage.getItem(KEY);if(raw){const data=JSON.parse(raw);if(data&&Array.isArray(data.chats))return data}}catch(err){console.warn('[UCMU DEV] localStorage read failed',err)}
  return defaultStore();
}
function saveStore(data){
  data.updatedAt=now();
  localStorage.setItem(KEY,JSON.stringify(data));
}
function ensureMe(data){
  const me=profileForCurrentUser();
  data.users||={};data.users[me.uid]={...(data.users[me.uid]||{}),...me};
  data.chats||=[];data.folders||=[];data.messages||={};
  let general=data.chats.find(c=>c.id==='general');
  if(!general){general=defaultStore().chats[0];data.chats.unshift(general)}
  general.members||=[];if(!general.members.includes(me.uid))general.members.push(me.uid);
  general.memberProfiles||={};general.memberProfiles[me.uid]={...(general.memberProfiles[me.uid]||{}),...me};
  general.ownerId||=me.uid;general.createdBy||=general.ownerId;
  data.messages.general||=[];
  return data;
}
function applyStore(data,{keepActive=true}={}){
  ensureMe(data);
  state.chats=data.chats||[];
  state.folders=data.folders||[];
  state.messages=data.messages||{};
  if(!keepActive||!state.activeChat||!state.chats.some(c=>c.id===state.activeChat))state.activeChat=state.chats[0]?.id||'general';
  renderChats();renderMembers();renderFeed();
}
function mutate(fn){
  const data=ensureMe(loadStore());
  const out=fn(data)||data;
  saveStore(out);
  applyStore(out);
  return out;
}
function previewText(m){if(!m)return'Нет сообщений';if(m.type==='sticker')return `${m.author}: ${m.text||'стикер'}`;if(m.file)return `${m.author}: ${m.file}`;return `${m.author}: ${m.text||'сообщение'}`}
function syncPreview(data,chatId){
  const chat=data.chats.find(c=>c.id===chatId);if(!chat)return;
  const list=(data.messages[chatId]||[]).filter(m=>!m.deletedForAll&&!m.deletedFor?.includes?.(currentUid()));
  const last=list[list.length-1];
  chat.last=previewText(last);chat.lastText=chat.last;chat.time=last?.time||'сейчас';
}
function makeLocalMessage({id=uid('m'),type='text',text='',file='',size='',replyTo=null}={}){
  const seq=++localSeq;
  return {id,author:displayName(),authorId:currentUid(),color:'red',type,text:text||'',file:file||'',size:size||'',time:'сейчас',mine:true,reactions:{},reply:replyTo||null,deletingForAll:false,deletedForAll:false,deletedFor:[],localSeq:seq,createdAt:now()};
}
function remapMine(data){
  const me=currentUid();
  Object.values(data.messages||{}).forEach(list=>list.forEach(m=>{m.mine=m.authorId===me;m.color=m.mine?'red':'green'}));
}
function bindStorage(){
  if(storageBound)return;storageBound=true;
  window.addEventListener('storage',e=>{if(e.key!==KEY||!e.newValue)return;try{const data=JSON.parse(e.newValue);remapMine(data);applyStore(data)}catch{}});
}

export async function initChatStore(){
  ready=true;
  bindStorage();
  const data=ensureMe(loadStore());
  remapMine(data);
  saveStore(data);
  applyStore(data,{keepActive:false});
  console.log('[UCMU DEV] localStorage chat backend ON — Firestore chat reads/writes disabled');
  toast('DEV MODE: localStorage backend ON\nПеред реальными тестами выключить dev backend.');
}
export function isChatStoreReady(){return ready}
export function subscribeChats(){applyStore(loadStore())}
export function subscribeMessages(chatId){if(chatId)state.activeChat=chatId;applyStore(loadStore())}

export async function sendStoreMessage({type='text',text='',file='',size='',replyTo=null}={}){
  if(!ready)return false;
  const chatId=state.activeChat||'general';
  const msg=makeLocalMessage({type,text,file,size,replyTo});
  mutate(data=>{
    data.messages[chatId]||=[];
    data.messages[chatId].push(msg);
    const c=data.chats.find(x=>x.id===chatId);
    if(c){c.members||=[];if(!c.members.includes(currentUid()))c.members.push(currentUid());c.memberProfiles||={};c.memberProfiles[currentUid()]=profileForCurrentUser()}
    syncPreview(data,chatId);
  });
  return true;
}
export async function createStandaloneChat({title='Новый чат',description='',styleColor='#d71920'}={}){
  const me=profileForCurrentUser();
  const chatId=uid('chat');
  mutate(data=>{
    data.chats.unshift({id:chatId,title,description,type:'group',members:[me.uid],memberProfiles:{[me.uid]:me},ownerId:me.uid,createdBy:me.uid,last:'Нет сообщений',lastText:'Нет сообщений',time:'сейчас',styleColor,muted:false,unread:0});
    data.messages[chatId]=[];
    state.activeChat=chatId;
  });
  state.activeChat=chatId;renderChats();renderMembers();renderFeed();
  return chatId;
}
export async function searchUsersByUsername(username){
  const q=String(username||'').trim().replace(/^@/,'').toLowerCase();
  if(!q)return[];
  const data=ensureMe(loadStore());
  return Object.values(data.users||{}).filter(u=>u.uid!==currentUid()).filter(u=>String(u.username||u.displayName||u.email||'').toLowerCase().includes(q)).slice(0,8);
}
export async function listKnownUsers(){
  const data=ensureMe(loadStore());
  const map=new Map();
  data.chats.forEach(c=>Object.entries(c.memberProfiles||{}).forEach(([id,p])=>{if(id!==currentUid())map.set(id,{uid:id,...p})}));
  Object.entries(data.users||{}).forEach(([id,p])=>{if(id!==currentUid())map.set(id,{uid:id,...p})});
  return[...map.values()];
}
export async function createOrOpenChatWithUsers(users){
  const clean=(users||[]).filter(Boolean).filter(u=>u.uid&&u.uid!==currentUid());
  if(!clean.length)return createStandaloneChat();
  const me=profileForCurrentUser();
  const ids=[me.uid,...clean.map(u=>u.uid)].sort();
  const privateId=ids.length===2?'private_'+ids.join('_'):uid('group');
  let created=false;
  mutate(data=>{
    data.users||={};clean.forEach(u=>data.users[u.uid]={...u});
    let c=data.chats.find(x=>x.id===privateId);
    if(!c){
      const profiles={[me.uid]:me};clean.forEach(u=>profiles[u.uid]={uid:u.uid,displayName:u.displayName||u.username||u.email||'User',username:u.username||'',email:u.email||''});
      c={id:privateId,title:clean.length===1?(clean[0].displayName||clean[0].username||clean[0].email||'Личный чат'):clean.map(u=>u.displayName||u.username||'User').join(', '),description:'',type:clean.length===1?'private':'group',members:ids,memberProfiles:profiles,ownerId:me.uid,createdBy:me.uid,last:'Нет сообщений',lastText:'Нет сообщений',time:'сейчас',styleColor:'#d71920',muted:false,unread:0};
      data.chats.unshift(c);data.messages[privateId]=[];created=true;
    }
    state.activeChat=privateId;
  });
  state.activeChat=privateId;renderChats();renderMembers();renderFeed();
  return privateId;
}
export async function updateActiveChatMeta({title,description,styleColor}){
  const chatId=state.activeChat;if(!chatId)return;
  mutate(data=>{const c=data.chats.find(x=>x.id===chatId);if(c){c.title=title||c.title;c.description=description||'';c.styleColor=styleColor||c.styleColor}});
}
export async function clearActiveChatHistory(){
  const chatId=state.activeChat;if(!chatId)return{cleared:0,total:0};
  let count=0;
  mutate(data=>{count=(data.messages[chatId]||[]).length;data.messages[chatId]=[];syncPreview(data,chatId)});
  return{cleared:count,total:count};
}
export async function deleteActiveChat(){
  const chatId=state.activeChat;if(!chatId)return;
  mutate(data=>{
    data.chats=data.chats.filter(c=>c.id!==chatId);
    data.folders.forEach(f=>f.chatIds=(f.chatIds||[]).filter(id=>id!==chatId));
    delete data.messages[chatId];
    state.activeChat=data.chats[0]?.id||null;
  });
}
export async function updateStoreReaction(messageId,reactions){
  const chatId=state.activeChat;if(!chatId||!messageId)return false;
  mutate(data=>{const m=(data.messages[chatId]||[]).find(x=>x.id===messageId);if(m)m.reactions=reactions||{}});
  return true;
}
export async function deleteStoreMessageForMe(messageId){
  const chatId=state.activeChat;if(!chatId||!messageId)return false;
  mutate(data=>{const m=(data.messages[chatId]||[]).find(x=>x.id===messageId);if(m){m.deletedFor||=[];if(!m.deletedFor.includes(currentUid()))m.deletedFor.push(currentUid())}syncPreview(data,chatId)});
  return true;
}
export async function deleteStoreMessageForAll(messageId){
  const chatId=state.activeChat;if(!chatId||!messageId)return false;
  mutate(data=>{data.messages[chatId]=(data.messages[chatId]||[]).filter(m=>m.id!==messageId);syncPreview(data,chatId)});
  return true;
}
export function stopChatStore(){ready=false}

window.UCMU_DEV_LOCAL_BACKEND=true;
