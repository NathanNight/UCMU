import {state} from './state.js';
import {$} from './dom.js';
import {getFirebase, isFirebaseReady} from './firebase.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const USER_KEY = 'ucmuFirebaseUser';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const val = id => ($('#'+id)?.value || '').trim();
const setText = (id, text) => { const el = $('#'+id); if(el) el.textContent = text; };

let mode = 'login';
let firebaseCache = null;

function normalizeUsername(v){
  return String(v || '').trim().toLowerCase().replace(/^@/,'').replace(/[^a-z0-9_.а-яё-]/gi,'');
}

function showError(text){
  setText('authError', text);
  const form = $('#authForm');
  form?.classList.remove('shake');
  void form?.offsetWidth;
  form?.classList.add('shake');
  setTimeout(()=>form?.classList.remove('shake'),380);
}

function scaleAuth(){
  const inner = $('#authInner');
  if(!inner || !inner.parentElement) return;
  const s = Math.min(inner.parentElement.clientWidth / 430, inner.parentElement.clientHeight / 932);
  inner.style.setProperty('--scale', s);
}

async function typeBlink(el, speed=42){
  if(!el) return;
  const text = el.dataset.final || '';
  el.textContent = '';
  el.classList.add('built','typing');
  for(const ch of text){ el.textContent += ch; await sleep(speed); }
  el.classList.remove('typing');
  el.classList.add('blinkText');
  setTimeout(()=>el.classList.remove('blinkText'),460);
}

function bootAuth(){
  scaleAuth();
  setTimeout(()=>$('#authLogo')?.classList.add('built'),120);
  setTimeout(()=>{$('#authTopbar')?.classList.add('built');$('#authTopLine')?.classList.add('built')},620);
  setTimeout(async()=>{ await typeBlink($('#authTitle'),44); typeBlink($('#authSubtitle'),22); },850);
  setTimeout(()=>$('#authHolo')?.classList.add('built','built-static'),1500);
  setTimeout(()=>$('#authHolo')?.classList.add('built-dynamic'),1740);
  setTimeout(()=>$('#authForm')?.classList.add('built'),1860);
  setTimeout(()=>$('#auth')?.classList.add('red-ready'),2250);
}

function bindPasswordEyes(){
  let visible = false;
  function apply(){
    ['password','password2'].forEach(id=>{ const el=$('#'+id); if(el) el.type = visible ? 'text' : 'password'; });
    document.querySelectorAll('.pass-eye').forEach(btn=>{
      btn.classList.toggle('active', visible);
      btn.setAttribute('aria-pressed', visible ? 'true' : 'false');
      btn.setAttribute('aria-label', visible ? 'Скрыть пароль' : 'Показать пароль');
    });
  }
  document.querySelectorAll('.pass-eye').forEach(btn=>btn.addEventListener('click', e=>{ e.preventDefault(); visible=!visible; apply(); }));
  apply();
}

function setMode(next){
  mode = next;
  $('#authForm')?.classList.remove('remember-mode');
  $('#rememberBox')?.classList.remove('show');
  setText('authError','');
  $('#loginTab')?.classList.toggle('active', mode === 'login');
  $('#registerTab')?.classList.toggle('active', mode === 'register');
  $('#authForm')?.classList.toggle('register', mode === 'register');
  if($('#password')) $('#password').autocomplete = mode === 'login' ? 'current-password' : 'new-password';
  setText('authAction', mode === 'login' ? 'ВОЙТИ' : 'ЗАРЕГИСТРИРОВАТЬСЯ');
  setText('authHint', mode === 'login'
    ? 'Вход через Firebase Auth. Доступ только для зарегистрированных пользователей.'
    : 'Нужен invite code. Пароль минимум 8 символов.');
}

function openApp(profile){
  const name = profile?.displayName || profile?.username || profile?.email || 'Operator';
  state.user = name;
  state.currentUser = profile;
  const profileName = document.querySelector('.profile .name');
  if(profileName) profileName.textContent = state.user;
  localStorage.setItem(USER_KEY, JSON.stringify(profile));
  document.body.classList.add('ucmu-unlocked');
  requestAnimationFrame(() => $('#auth')?.classList.add('hidden'));
}

function showRemember(profile){
  const form = $('#authForm');
  form?.classList.add('remember-mode');
  $('#rememberBox')?.classList.add('show');
  setText('rememberName','Войти как ' + (profile.displayName || profile.email || 'User'));
  setText('rememberUser', profile.username ? '@' + profile.username : profile.email || '');
  setText('authHint','Firebase-сессия найдена. Можно продолжить вход.');
}

async function loadProfile(uid){
  const {db} = firebaseCache || await getFirebase();
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? {uid, ...snap.data()} : null;
}

async function validateInvite(code){
  const clean = String(code || '').trim();
  if(clean.length < 6) throw new Error('Введите invite code.');
  const {db} = firebaseCache || await getFirebase();
  const inviteRef = doc(db, 'invites', clean);
  const inviteSnap = await getDoc(inviteRef);
  if(!inviteSnap.exists()) throw new Error('Invite code не найден.');
  const invite = inviteSnap.data();
  if(invite.disabled) throw new Error('Invite code отключён.');
  if(invite.usedBy) throw new Error('Invite code уже использован.');
  return {inviteRef, invite};
}

async function submitAuth(e){
  e?.preventDefault();
  if(!isFirebaseReady()) return showError('Firebase ещё не настроен. Заполни js/firebaseConfig.js.');

  const email = val('email').toLowerCase();
  const pass = $('#password')?.value || '';
  if(!email || !email.includes('@')) return showError('Введите email.');
  if(!pass) return showError('Введите пароль.');

  try{
    firebaseCache = await getFirebase();
    const {auth, db} = firebaseCache;

    if(mode === 'register'){
      const displayName = val('displayName');
      const username = normalizeUsername(val('username'));
      const inviteCode = val('inviteCode');
      if(!displayName) return showError('Введи позывной.');
      if(!username || username.length < 3) return showError('Username минимум 3 символа.');
      if(pass.length < 8) return showError('Пароль минимум 8 символов.');
      if(pass !== ($('#password2')?.value || '')) return showError('Пароли не совпадают.');
      const {inviteRef} = await validateInvite(inviteCode);
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      const profile = {
        uid: cred.user.uid,
        email,
        displayName,
        username,
        role: 'member',
        createdAt: serverTimestamp(),
        lastSeenAt: serverTimestamp(),
        disabled: false
      };
      await setDoc(doc(db, 'users', cred.user.uid), profile);
      await updateDoc(inviteRef, {usedBy: cred.user.uid, usedAt: serverTimestamp()});
      openApp({...profile, createdAt:null, lastSeenAt:null});
      return;
    }

    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const profile = await loadProfile(cred.user.uid);
    if(!profile || profile.disabled){
      await signOut(auth);
      return showError('Аккаунт отключён или профиль не найден.');
    }
    await updateDoc(doc(db, 'users', cred.user.uid), {lastSeenAt: serverTimestamp()}).catch(()=>{});
    openApp(profile);
  }catch(err){
    console.error(err);
    const code = err?.code || '';
    if(code.includes('auth/invalid-credential') || code.includes('auth/wrong-password')) return showError('Неверный email или пароль.');
    if(code.includes('auth/email-already-in-use')) return showError('Email уже зарегистрирован.');
    if(code.includes('auth/weak-password')) return showError('Слабый пароль. Минимум 8 символов.');
    showError(err?.message || 'Ошибка входа.');
  }
}

export async function initFirebaseAuth(){
  bootAuth();
  window.addEventListener('resize', scaleAuth, {passive:true});
  bindPasswordEyes();
  $('#loginTab')?.addEventListener('click',()=>setMode('login'));
  $('#registerTab')?.addEventListener('click',()=>setMode('register'));
  $('#authForm')?.addEventListener('submit', submitAuth);
  $('#continueBtn')?.addEventListener('click', async()=>{
    try{
      firebaseCache = await getFirebase();
      const user = firebaseCache.auth.currentUser;
      if(!user) return setMode('login');
      const profile = await loadProfile(user.uid);
      if(profile) openApp(profile);
    }catch{ setMode('login'); }
  });
  $('#switchBtn')?.addEventListener('click', async()=>{
    try{ firebaseCache ||= await getFirebase(); await signOut(firebaseCache.auth); }catch{}
    localStorage.removeItem(USER_KEY);
    setMode('login');
    ['email','password','password2','displayName','username','inviteCode'].forEach(id=>{ const el=$('#'+id); if(el) el.value=''; });
  });
  document.addEventListener('keydown', e=>{
    if(e.key !== 'Enter') return;
    const authBox = $('#auth');
    if(authBox && !authBox.classList.contains('hidden')){
      e.preventDefault();
      if($('#authForm')?.classList.contains('remember-mode')) $('#continueBtn')?.click();
      else $('#authForm')?.requestSubmit();
    }
  });
  setMode('login');

  if(!isFirebaseReady()){
    setText('authHint','Firebase ещё не настроен. Вставь config и включи firebaseConfigReady.');
    return;
  }

  try{
    firebaseCache = await getFirebase();
    onAuthStateChanged(firebaseCache.auth, async user => {
      if(!user || $('#auth')?.classList.contains('hidden')) return;
      const profile = await loadProfile(user.uid).catch(()=>null);
      if(profile) showRemember(profile);
    });
  }catch(err){
    console.error(err);
    showError('Firebase не запустился. Проверь config.');
  }
}
