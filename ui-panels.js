import { auth, db } from './firebase-init.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { doc, setDoc, getDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r=>setTimeout(r,ms));
let mode = 'login';
let allowEnter = false;

function normalizeUsername(v){return String(v||'').trim().toLowerCase().replace(/^@/,'').replace(/[^a-z0-9_.]/g,'');}

function scaleAuth(){
  const inner = $('authInner');
  if(!inner) return;
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
  setTimeout(()=>$('authLogo')?.classList.add('built'),120);
  setTimeout(()=>{$('authTopbar')?.classList.add('built');$('authTopLine')?.classList.add('built')},620);
  setTimeout(async()=>{ await typeBlink($('authTitle'),44); typeBlink($('authSubtitle'),22); },850);
  setTimeout(()=>$('authForm')?.classList.add('built'),1500);
  setTimeout(()=>$('authScreen')?.classList.add('red-ready'),1900);
}

function setPasswordVisibility(visible){
  ['password','password2'].forEach(id=>{ const el=$(id); if(el) el.type = visible ? 'text' : 'password'; });
}

function setMode(m){
  mode = m;
  $('authForm').classList.remove('remember-mode');
  $('rememberBox').classList.remove('show');
  $('authError').textContent = '';
  $('loginTab').classList.toggle('active',m==='login');
  $('registerTab').classList.toggle('active',m==='register');
  $('authForm').classList.toggle('register',m==='register');
  $('password').autocomplete = m==='login' ? 'current-password' : 'new-password';
  $('password2').autocomplete = 'off';
  $('authAction').textContent = m==='login' ? 'ВОЙТИ' : 'ЗАРЕГИСТРИРОВАТЬСЯ';
  $('authHint').textContent = m==='login'
    ? 'Если аккаунт уже есть — просто войди. Регистрация нужна только один раз.'
    : 'Форма расширяется: добавлены позывной, @username и повтор пароля.';
}

async function saveUser(user,name,username){
  await setDoc(doc(db,'users',user.uid),{uid:user.uid,name,email:user.email||'',username,usernameLower:username,online:true,updatedAt:serverTimestamp()},{merge:true});
  await setDoc(doc(db,'usernames',username),{uid:user.uid,username,updatedAt:serverTimestamp()});
}
async function loadProfile(uid){
  const s = await getDoc(doc(db,'users',uid));
  return s.exists() ? s.data() : null;
}

function enterApp(profile,user){
  allowEnter = true;
  $('authScreen').classList.add('hidden');
  $('chatApp').classList.remove('hidden');
  window.dispatchEvent(new CustomEvent('ucmu:user-ready',{detail:{user,profile}}));
}
function showRemember(profile,user){
  $('authForm').classList.add('remember-mode');
  $('rememberBox').classList.add('show');
  $('rememberName').textContent = 'Войти как ' + (profile.name || 'User');
  $('rememberUser').textContent = '@' + (profile.username || 'user');
  $('authHint').textContent = 'Система узнала аккаунт. Подтверди вход или выбери другую учётную запись.';
  $('continueBtn').onclick = () => enterApp(profile,user);
}

export function initAuth(){
  window.addEventListener('resize',scaleAuth,{passive:true});
  bootAuth();

  $('loginTab').onclick = () => setMode('login');
  $('registerTab').onclick = () => setMode('register');
  $('switchBtn').onclick = async () => {
    await signOut(auth);
    $('authForm').classList.remove('remember-mode');
    $('rememberBox').classList.remove('show');
    setMode('login');
  };

  document.querySelectorAll('.pass-eye').forEach(btn=>{
    const show = e => { e.preventDefault(); setPasswordVisibility(true); };
    const hide = e => { e.preventDefault(); setPasswordVisibility(false); };
    btn.addEventListener('mousedown', show);
    btn.addEventListener('mouseup', hide);
    btn.addEventListener('mouseleave', hide);
    btn.addEventListener('touchstart', show, {passive:false});
    btn.addEventListener('touchend', hide, {passive:false});
    btn.addEventListener('touchcancel', hide, {passive:false});
  });

  $('authForm').onsubmit = async e => {
    e.preventDefault();
    try{
      $('authError').textContent = '';
      const email = $('email').value.trim();
      const pass = $('password').value;

      if(mode === 'register'){
        const name = $('displayName').value.trim();
        const username = normalizeUsername($('username').value);
        if(!name) return $('authError').textContent = 'Введи имя.';
        if(!username || username.length < 3) return $('authError').textContent = 'Username минимум 3 символа.';
        if(pass !== $('password2').value) return $('authError').textContent = 'Пароли не совпадают.';
        if((await getDoc(doc(db,'usernames',username))).exists()) return $('authError').textContent = 'Такой @username уже занят.';
        const cred = await createUserWithEmailAndPassword(auth,email,pass);
        await updateProfile(cred.user,{displayName:name});
        await saveUser(cred.user,name,username);
        allowEnter = true;
      }else{
        await signInWithEmailAndPassword(auth,email,pass);
        allowEnter = true;
      }
    }catch(err){
      $('authError').textContent = err.message;
    }
  };

  document.addEventListener('keydown',e=>{
    if(e.key !== 'Enter') return;
    if(!$('authScreen').classList.contains('hidden')){
      e.preventDefault();
      if($('authForm').classList.contains('remember-mode')) $('continueBtn').click();
      else $('authForm').requestSubmit();
    }
  });

  onAuthStateChanged(auth, async user => {
    if(!user) return;
    let profile = await loadProfile(user.uid);
    if(!profile || !profile.username){
      const fallback = normalizeUsername((user.displayName || user.email || 'user').split('@')[0]) || ('user' + user.uid.slice(0,5));
      profile = {uid:user.uid,name:user.displayName || fallback,username:fallback};
      await saveUser(user,profile.name,profile.username);
    }
    if(allowEnter) enterApp(profile,user);
    else showRemember(profile,user);
  });

  setMode('login');
}
