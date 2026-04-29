
import {state} from './state.js';
import {$} from './dom.js';

const ACCESS_PASSWORD = 'umbrella';
const USER_KEY = 'ucmuLocalUser';
let mode = 'login';

const sleep = ms => new Promise(r => setTimeout(r, ms));

function setText(id, value){ const el = $('#'+id); if(el) el.textContent = value; }
function value(id){ return ($('#'+id)?.value || '').trim(); }

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
  for(const ch of text){
    el.textContent += ch;
    await sleep(speed);
  }
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

function normalizeUsername(v){
  return String(v || '').trim().toLowerCase().replace(/^@/,'').replace(/[^a-z0-9_.а-яё-]/gi,'');
}

function currentSavedUser(){
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
  catch { return null; }
}

function saveLocalUser(user){
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function openApp(user){
  state.user = user?.name || user?.username || value('email') || 'Director';
  const profileName = document.querySelector('.profile .name');
  if(profileName) profileName.textContent = state.user;
  $('#auth')?.classList.add('hidden');
}

function showError(text){
  setText('authError', text);
  const form = $('#authForm');
  form?.classList.remove('shake');
  void form?.offsetWidth;
  form?.classList.add('shake');
  setTimeout(()=>form?.classList.remove('shake'),380);
}

function showRemember(user){
  const form = $('#authForm');
  form?.classList.add('remember-mode');
  $('#rememberBox')?.classList.add('show');
  setText('rememberName','Войти как ' + (user.name || 'User'));
  setText('rememberUser','@' + (user.username || 'user'));
  setText('authHint','Система узнала аккаунт. Подтверди вход или выбери другую учётную запись.');
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
    ? 'Тестовый пароль доступа: umbrella. Регистрация сохраняется локально в браузере.'
    : 'Добавь позывной, @username и повтор пароля. Код доступа тот же: umbrella.');
}

function submitAuth(e){
  e?.preventDefault();
  const pass = $('#password')?.value || '';

  if(mode === 'register'){
    const name = value('displayName');
    const username = normalizeUsername(value('username'));
    if(!name) return showError('Введи позывной.');
    if(!username || username.length < 3) return showError('Username минимум 3 символа.');
    if(!pass) return showError('Введи пароль доступа.');
    if(pass !== ($('#password2')?.value || '')) return showError('Пароли не совпадают.');
    if(pass !== ACCESS_PASSWORD) return showError('Неверный пароль доступа.');
    const user = {name, username, email:value('email') || username};
    saveLocalUser(user);
    openApp(user);
    return;
  }

  if(pass !== ACCESS_PASSWORD) return showError('Неверный пароль доступа.');
  const saved = currentSavedUser();
  openApp(saved || {name:value('email') || 'Director', username:'director'});
}

function bindPasswordEyes(){
  document.querySelectorAll('.pass-eye').forEach(btn=>{
    const show = e => { e.preventDefault(); ['password','password2'].forEach(id=>{ const el=$('#'+id); if(el) el.type='text'; }); };
    const hide = e => { e.preventDefault(); ['password','password2'].forEach(id=>{ const el=$('#'+id); if(el) el.type='password'; }); };
    btn.addEventListener('mousedown', show);
    btn.addEventListener('mouseup', hide);
    btn.addEventListener('mouseleave', hide);
    btn.addEventListener('touchstart', show, {passive:false});
    btn.addEventListener('touchend', hide, {passive:false});
    btn.addEventListener('touchcancel', hide, {passive:false});
  });
}

export function initAuth(){
  bootAuth();
  window.addEventListener('resize', scaleAuth, {passive:true});
  $('#loginTab')?.addEventListener('click',()=>setMode('login'));
  $('#registerTab')?.addEventListener('click',()=>setMode('register'));
  $('#authForm')?.addEventListener('submit', submitAuth);
  $('#continueBtn')?.addEventListener('click',()=>openApp(currentSavedUser() || {name:'Director', username:'director'}));
  $('#switchBtn')?.addEventListener('click',()=>{
    localStorage.removeItem(USER_KEY);
    setMode('login');
    ['email','password','password2','displayName','username'].forEach(id=>{ const el=$('#'+id); if(el) el.value=''; });
  });
  document.addEventListener('keydown', e=>{
    if(e.key !== 'Enter') return;
    const auth = $('#auth');
    if(auth && !auth.classList.contains('hidden')){
      e.preventDefault();
      if($('#authForm')?.classList.contains('remember-mode')) $('#continueBtn')?.click();
      else $('#authForm')?.requestSubmit();
    }
  });
  bindPasswordEyes();
  setMode('login');
  const saved = currentSavedUser();
  if(saved) setTimeout(()=>showRemember(saved),2100);
}
