import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { firebaseConfig, firebaseConfigReady } from '../js/firebaseConfig.js';

const DEV_LOCAL_MESSAGES = true;
const DEV_AUTH_FALLBACK = true;
const LS_USER = 'ucmu.clean.user';
const LS_DATA = 'ucmu.clean.data.v1';
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const uid = p => p + '_' + Math.random().toString(36).slice(2,9);

let fb = null;
let state = {
  mode:'login',
  user:null,
  activeChat:'general',
  chats:[
    {id:'general',title:'UCMU',desc:'Общий чат',pinned:true,last:'Локальный dev-режим',color:'#d71920'},
    {id:'ops',title:'Оперативный',desc:'Рабочие сообщения',last:'Нет сообщений',color:'#d71920'}
  ],
  messages:{
    general:[{id:'m1',uid:'system',name:'UCMU',text:'Clean rebuild: простая стабильная база без бутерброда.',time:Date.now()-60000}],
    ops:[]
  },
  contacts:[],
  deleteTarget:null
};

function save(){localStorage.setItem(LS_DATA, JSON.stringify({chats:state.chats,messages:state.messages,contacts:state.contacts,activeChat:state.activeChat}));}
function load(){try{const d=JSON.parse(localStorage.getItem(LS_DATA)||'null');if(d){state={...state,...d};}}catch{}}
function normalizeUsername(v){return String(v||'').trim().toLowerCase().replace(/^@/,'').replace(/[^a-z0-9_.а-яё-]/gi,'');}
function currentChat(){return state.chats.find(c=>c.id===state.activeChat)||state.chats[0];}
function now(){return new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});}

async function getFb(){
  if(fb) return fb;
  if(!firebaseConfigReady) throw new Error('Firebase config не настроен');
  const app = initializeApp(firebaseConfig);
  fb = {app, auth:getAuth(app), db:getFirestore(app)};
  return fb;
}

function renderAuth(){
  app.innerHTML = `
    <section class="auth">
      <div class="authCard">
        <div class="logoBlock"><div class="logoMark"></div><div class="title">CHAT</div><div class="sub">SECURE COMMUNICATIONS</div></div>
        <div class="tabs"><button class="tab ${state.mode==='login'?'active':''}" data-mode="login">Вход</button><button class="tab ${state.mode==='register'?'active':''}" data-mode="register">Регистрация</button></div>
        <form class="form" id="authForm">
          ${state.mode==='register'?`<input class="field" id="username" autocomplete="username" placeholder="@username">`:''}
          <input class="field" id="email" autocomplete="email" placeholder="Email">
          <div class="passWrap"><input class="field" id="password" type="password" autocomplete="${state.mode==='login'?'current-password':'new-password'}" placeholder="Пароль"><button class="eye" type="button">◉</button></div>
          ${state.mode==='register'?`<input class="field" id="password2" type="password" autocomplete="new-password" placeholder="Повтор пароля"><input class="field" id="inviteCode" autocomplete="off" placeholder="Invite code">`:''}
          <div class="error" id="authError"></div>
          <button class="authAction" type="submit">${state.mode==='login'?'ВОЙТИ':'ЗАРЕГИСТРИРОВАТЬСЯ'}</button>
          <div class="hint">${state.mode==='login'?'Firebase Auth + clean UI.':'@username будет именем в чате.'}</div>
        </form>
      </div>
    </section>`;
  $$('.tab').forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;renderAuth();});
  $('.eye').onclick=()=>{const p=$('#password');p.type=p.type==='password'?'text':'password'};
  $('#authForm').onsubmit=submitAuth;
}
function authError(t){const el=$('#authError');if(el)el.textContent=t;}

async function submitAuth(e){
  e.preventDefault();
  await new Promise(r=>setTimeout(r,80));
  const email=$('#email')?.value.trim().toLowerCase();
  const pass=$('#password')?.value||'';
  if(!email || !email.includes('@')) return authError('Введите email');
  if(!pass) return authError('Введите пароль');
  try{
    const {auth,db}=await getFb();
    if(state.mode==='register'){
      const username=normalizeUsername($('#username')?.value);
      if(username.length<3) return authError('Username минимум 3 символа');
      if(pass.length<8) return authError('Пароль минимум 8 символов');
      if(pass !== ($('#password2')?.value||'')) return authError('Пароли не совпадают');
      const code=$('#inviteCode')?.value.trim();
      if(!code || code.length<6) return authError('Введите invite code');
      await validateInvite(db, code);
      const cred=await createUserWithEmailAndPassword(auth,email,pass);
      const profile={uid:cred.user.uid,email,username,displayName:username,role:'member',disabled:false,createdAt:serverTimestamp(),lastSeenAt:serverTimestamp()};
      await setDoc(doc(db,'users',cred.user.uid),profile).catch(err=>{if(!DEV_AUTH_FALLBACK)throw err;console.warn('profile write fallback',err)});
      await openApp({...profile,createdAt:null,lastSeenAt:null});
      return;
    }
    const cred=await signInWithEmailAndPassword(auth,email,pass);
    const profile=await loadProfile(db,cred.user);
    await updateDoc(doc(db,'users',cred.user.uid),{lastSeenAt:serverTimestamp()}).catch(()=>{});
    await openApp(profile);
  }catch(err){
    console.error(err);
    const code=err?.code||'';
    if(code.includes('invalid-credential')||code.includes('wrong-password')) return authError('Неверный email или пароль');
    if(code.includes('email-already-in-use')) return authError('Email уже зарегистрирован');
    if(code.includes('weak-password')) return authError('Слабый пароль');
    authError(err?.message || 'Ошибка входа');
  }
}

async function validateInvite(db, code){
  try{
    const ref=doc(db,'invites',code);
    const snap=await getDoc(ref);
    if(!snap.exists()) throw new Error('Invite code не найден');
    const inv=snap.data();
    if(inv.disabled) throw new Error('Invite code отключён');
    if(inv.usedBy) throw new Error('Invite code уже использован');
  }catch(err){
    if(DEV_AUTH_FALLBACK && String(err?.message||'').toLowerCase().includes('permission')){console.warn('invite permission fallback');return;}
    throw err;
  }
}
async function loadProfile(db,user){
  try{
    const snap=await getDoc(doc(db,'users',user.uid));
    if(snap.exists()) return {uid:user.uid,...snap.data()};
  }catch(err){if(!DEV_AUTH_FALLBACK) throw err;}
  const saved=JSON.parse(localStorage.getItem(LS_USER)||'null');
  if(saved?.uid===user.uid)return saved;
  return {uid:user.uid,email:user.email,username:user.email.split('@')[0],displayName:user.email.split('@')[0],role:'member',disabled:false,devProfileFallback:true};
}
async function openApp(profile){state.user=profile;localStorage.setItem(LS_USER,JSON.stringify(profile));load();renderApp();}

function renderApp(){
  app.innerHTML=`
    <main class="shell" id="shell">
      <aside class="side">
        <div class="profile"><div class="avatar">${esc((state.user?.displayName||'U')[0]).toUpperCase()}</div><div><div class="profileName">${esc(state.user?.displayName||'Operator')}</div><div class="status">Online · DEV local</div></div><div class="topActions"><button class="iconBtn" id="contactsBtn">♙</button><button class="iconBtn" id="logoutBtn">⏻</button></div></div>
        <div class="searchRow"><input class="search" id="chatSearch" placeholder="Поиск чатов"><button class="iconBtn" id="newChatBtn">＋</button></div>
        <div class="chatList" id="chatList"></div>
      </aside>
      <section class="main">
        <header class="head"><button class="iconBtn backBtn" id="backBtn">‹</button><div><div class="headTitle" id="headTitle"></div><div class="headSub" id="headSub"></div></div><div><button class="iconBtn" id="searchBtn">⌕</button><button class="iconBtn" id="membersBtn">♙</button></div></header>
        <div class="feed" id="feed"></div>
        <footer class="compose"><button class="round" id="attachBtn">📎</button><textarea class="msgInput" id="msgInput" rows="1" placeholder="Напишите сообщение..."></textarea><button class="round" id="stickerBtn">☻</button><button class="send" id="sendBtn">🎙</button></footer>
      </section>
      <div class="panel contacts hidden" id="contactsPanel"><b>КОНТАКТЫ</b><div class="hint" style="text-align:left;margin-top:10px">Контакты подключим следующим шагом.</div></div>
      <div class="panel stickers hidden" id="stickersPanel"><div class="stickerGrid">${['☂️','🧪','🔥','✅','⚠️','🧟','🛡️','📡'].map(s=>`<button data-sticker="${s}">${s}</button>`).join('')}</div></div>
      <div class="modalShade hidden" id="deleteModal"><div class="modal"><div class="modalTitle">УДАЛИТЬ</div><div class="dangerRow"><button class="neutral" data-del="me">У МЕНЯ</button><button class="danger" data-del="all">У ВСЕХ</button></div></div></div>
    </main>`;
  bindApp();renderChats();renderFeed();
}

function bindApp(){
  $('#logoutBtn').onclick=async()=>{try{const {auth}=await getFb();await signOut(auth);}catch{}localStorage.removeItem(LS_USER);state.user=null;renderAuth();};
  $('#contactsBtn').onclick=()=>$('#contactsPanel').classList.toggle('hidden');
  $('#stickerBtn').onclick=()=>$('#stickersPanel').classList.toggle('hidden');
  $('#newChatBtn').onclick=()=>{const title=prompt('Название чата');if(!title)return;const id=uid('chat');state.chats.unshift({id,title,desc:'Локальный чат',last:'Нет сообщений',color:'#d71920'});state.messages[id]=[];state.activeChat=id;save();renderChats();renderFeed();};
  $('#msgInput').oninput=()=>{const has=$('#msgInput').value.trim();$('#sendBtn').textContent=has?'➤':'🎙';$('#sendBtn').classList.toggle('ready',!!has);};
  $('#msgInput').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}};
  $('#sendBtn').onclick=sendMessage;
  $('#backBtn').onclick=()=>$('#shell').classList.remove('mobile-chat');
  $('#chatSearch').oninput=renderChats;
  document.addEventListener('click',e=>{const s=e.target.closest('[data-sticker]');if(s){sendMessage(s.dataset.sticker);$('#stickersPanel').classList.add('hidden');}});
}
function renderChats(){
  const q=$('#chatSearch')?.value.trim().toLowerCase()||'';
  const list=$('#chatList');
  list.innerHTML=state.chats.filter(c=>!q||c.title.toLowerCase().includes(q)).map(c=>`
    <button class="chatItem ${c.id===state.activeChat?'active':''}" data-chat="${c.id}"><div class="avatar">${esc(c.title[0]||'#')}</div><div><div class="chatTitle">${esc(c.title)}</div><div class="chatLast">${esc(c.last||'')}</div></div>${c.pinned?'<div class="pinDot"></div>':''}</button>`).join('');
  $$('[data-chat]').forEach(b=>b.onclick=()=>{state.activeChat=b.dataset.chat;save();renderChats();renderFeed();$('#shell').classList.add('mobile-chat');});
}
function renderFeed(){
  const c=currentChat(); if(!c)return;
  $('#headTitle').textContent=c.title;$('#headSub').textContent=c.desc||'SECURE COMMUNICATIONS';
  const msgs=state.messages[c.id]||[];
  $('#feed').innerHTML=msgs.map(m=>`<div class="msg ${m.uid===state.user?.uid?'mine':''}" data-msg="${m.id}"><div class="bubble"><div class="meta">${esc(m.name||'user')} · ${esc(m.timeText||'')}</div><div class="txt">${esc(m.text)}</div></div></div>`).join('')||'<div class="hint">Сообщений пока нет</div>';
  $('#feed').scrollTop=$('#feed').scrollHeight;
  $$('[data-msg]').forEach(el=>el.oncontextmenu=e=>{e.preventDefault();state.deleteTarget=el.dataset.msg;$('#deleteModal').classList.remove('hidden');});
  $$('#deleteModal [data-del]').forEach(b=>b.onclick=()=>deleteMessage(b.dataset.del));
}
function sendMessage(forceText){
  const input=$('#msgInput');const text=(forceText||input.value).trim();if(!text)return;
  const c=currentChat();const msg={id:uid('m'),uid:state.user.uid,name:state.user.displayName||state.user.username||'user',text,time:Date.now(),timeText:now()};
  state.messages[c.id] ||= [];state.messages[c.id].push(msg);c.last=(msg.name+': '+text).slice(0,80);input.value='';$('#sendBtn').textContent='🎙';$('#sendBtn').classList.remove('ready');save();renderChats();renderFeed();
}
function deleteMessage(scope){
  const id=state.deleteTarget,c=currentChat();
  state.messages[c.id]=(state.messages[c.id]||[]).filter(m=>m.id!==id);
  state.deleteTarget=null;$('#deleteModal').classList.add('hidden');save();renderFeed();
}

async function boot(){
  window.UCMU_CLEAN={version:'clean-v1',devLocalMessages:DEV_LOCAL_MESSAGES};
  load();
  try{
    const saved=JSON.parse(localStorage.getItem(LS_USER)||'null');
    if(saved){state.user=saved;renderApp();return;}
    if(firebaseConfigReady){const {auth,db}=await getFb();onAuthStateChanged(auth,async user=>{if(user&&!state.user){state.user=await loadProfile(db,user);localStorage.setItem(LS_USER,JSON.stringify(state.user));renderApp();}});}
  }catch(err){console.warn('auth boot fallback',err)}
  if(!state.user) renderAuth();
}
boot();
