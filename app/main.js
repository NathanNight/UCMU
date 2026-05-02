import { authReady, loginWithEmail, registerWithEmail, watchAuthState } from './firebase.js';

const sleep = (m) => new Promise((resolve) => setTimeout(resolve, m));
let bootDone = false;
let authOpened = false;

function fitApp() {
  const baseW = 1180;
  const baseH = 820;
  const scale = Math.min(innerWidth / baseW, innerHeight / baseH);
  document.documentElement.style.setProperty('--app-scale', Math.max(0.62, scale).toFixed(4));
}

addEventListener('resize', fitApp, { passive: true });
fitApp();

async function type(element, text, delay) {
  element.textContent = '';
  element.classList.add('typing');
  for (const char of text) {
    element.textContent += char;
    await sleep(delay);
  }
  element.classList.remove('typing');
}

async function blink(element) {
  element.classList.add('blink', 'blinkText');
  await sleep(620);
  element.classList.remove('blink', 'blinkText');
}

async function typeBlink(element, text, delay) {
  await type(element, text, delay);
  await sleep(20);
  await blink(element);
}

async function ringsSeq() {
  world.classList.add('ringsOn');
  const sequence = ['.r3', '.n2', '.r4', '.n1', '.r2', '.n3'];
  for (const selector of sequence) {
    const element = document.querySelector(selector);
    if (element) element.classList.add('show');
    await sleep(85 + Math.random() * 95);
  }
}

function wireChatShell() {
  railToggle?.addEventListener('click', () => document.querySelector('.screen')?.classList.toggle('railCollapsed'));
  profileOpen?.addEventListener('click', () => profileCard?.classList.add('open'));
  profileClose?.addEventListener('click', () => profileCard?.classList.remove('open'));
  messageInput?.addEventListener('input', () => {
    messageInput.closest('.composer')?.classList.toggle('hasText', messageInput.value.trim().length > 0);
  });
}

async function authorizedSequence(user, fast = false) {
  if (authOpened) return;
  authOpened = true;

  while (!bootDone) await sleep(60);

  world.classList.add('authStage');
  await sleep(fast ? 160 : 420);
  authPass.textContent = '';
  await type(authPass, 'AUTHORIZED', fast ? 16 : 34);
  await sleep(70);
  await blink(authPass);
  await sleep(140);
  chatUser.textContent = (user.displayName || user.email || 'AUTHORIZED').toUpperCase();
  sideUser.textContent = user.displayName || user.email || 'user';
  profileName.textContent = user.displayName || user.email || 'user';
  world.classList.add('authorized');
}

function authErrorText(error) {
  const code = error?.code || error?.message || '';
  if (code.includes('FIREBASE_NOT_CONFIGURED')) return 'FIREBASE НЕ НАСТРОЕН.';
  if (code.includes('auth/invalid-email')) return 'НЕВЕРНЫЙ EMAIL.';
  if (code.includes('auth/user-not-found') || code.includes('auth/wrong-password') || code.includes('auth/invalid-credential')) return 'НЕВЕРНЫЙ EMAIL ИЛИ ПАРОЛЬ.';
  if (code.includes('auth/email-already-in-use')) return 'EMAIL УЖЕ ЗАНЯТ.';
  if (code.includes('auth/weak-password') || code.includes('WEAK_PASSWORD')) return 'СЛАБЫЙ ПАРОЛЬ. МИНИМУМ 6 СИМВОЛОВ.';
  if (code.includes('PASSWORD_MISMATCH')) return 'ПАРОЛИ НЕ СОВПАДАЮТ.';
  if (code.includes('USERNAME_REQUIRED')) return 'НУЖЕН USERNAME.';
  if (code.includes('USERNAME_TAKEN')) return 'USERNAME УЖЕ ЗАНЯТ.';
  if (code.includes('EMAIL_REQUIRED')) return 'НУЖЕН EMAIL.';
  if (code.includes('INVITE_REQUIRED')) return 'НУЖЕН INVITE CODE.';
  if (code.includes('INVITE_INVALID')) return 'НЕВЕРНЫЙ INVITE CODE.';
  if (code.includes('INVITE_USED')) return 'INVITE CODE УЖЕ ИСПОЛЬЗОВАН.';
  if (code.includes('USER_DISABLED')) return 'ПОЛЬЗОВАТЕЛЬ ОТКЛЮЧЁН.';
  return 'ОШИБКА ДОСТУПА.';
}

const panelHeights = {
  login: 244,
  register: 362
};

const AuthScreen = {
  mode: 'login',
  busy: false,
  sets: {
    login: [
      ['email', 'email', 'Email', 'email', 0, 0],
      ['password', 'password', 'Пароль', 'current-password', 1, 1]
    ],
    register: [
      ['username', 'text', '@username', 'username', 0, 0],
      ['email', 'email', 'Email', 'email', 0, 0],
      ['password', 'password', 'Пароль', 'new-password', 1, 1],
      ['passwordRepeat', 'password', 'Повтор пароля', 'new-password', 1, 0],
      ['inviteCode', 'text', 'Invite code', 'off', 0, 0]
    ]
  },

  init() {
    this.p = panel;
    this.f = fields;
    this.s = submit;
    this.e = error;

    document.querySelectorAll('[data-mode]').forEach((button) => {
      button.onclick = () => this.set(button.dataset.mode);
    });

    form.onsubmit = (event) => this.submit(event);
    this.render();
    this.p.style.setProperty('--panel-h', panelHeights[this.mode] + 'px');
    this.setStatus(authReady() ? 'ОЖИДАНИЕ ВВОДА.' : 'FIREBASE НЕ НАСТРОЕН.', !authReady());
  },

  values() {
    const data = {};
    this.f.querySelectorAll('input').forEach((input) => {
      const key = input.placeholder === '@username'
        ? 'username'
        : input.autocomplete === 'off'
          ? 'inviteCode'
          : input.type === 'email'
            ? 'email'
            : input.placeholder === 'Повтор пароля'
              ? 'passwordRepeat'
              : 'password';
      data[key] = input.value;
    });
    return data;
  },

  async submit(event) {
    event.preventDefault();
    if (this.busy) return;

    this.busy = true;
    this.setStatus(this.mode === 'register' ? 'РЕГИСТРАЦИЯ...' : 'АВТОРИЗАЦИЯ...');

    try {
      const data = this.values();
      const user = this.mode === 'register'
        ? await registerWithEmail(data)
        : await loginWithEmail(data);

      this.setStatus('ДОСТУП РАЗРЕШЁН: ' + (user.displayName || user.email || user.uid));
      await authorizedSequence(user);
    } catch (error) {
      this.setStatus(authErrorText(error), true);
    } finally {
      this.busy = false;
    }
  },

  setStatus(text, bad = false) {
    this.e.textContent = text;
    this.p.classList.toggle('bad', bad);
    if (bad) {
      clearTimeout(this.errTimer);
      this.errTimer = setTimeout(() => this.p.classList.remove('bad'), 760);
    }
  },

  async set(mode) {
    if (this.busy || this.mode === mode) return;

    this.busy = true;
    this.p.classList.add('switching');
    await sleep(120);
    this.mode = mode;
    this.render();
    this.setStatus(authReady() ? 'ОЖИДАНИЕ ВВОДА.' : 'FIREBASE НЕ НАСТРОЕН.', !authReady());
    this.p.style.setProperty('--panel-h', panelHeights[this.mode] + 'px');
    requestAnimationFrame(() => this.p.classList.remove('switching'));
    await sleep(520);
    this.busy = false;
  },

  render() {
    this.s.textContent = this.mode === 'register' ? 'ЗАРЕГИСТРИРОВАТЬСЯ' : 'ВОЙТИ';

    document.querySelectorAll('[data-mode]').forEach((button) => {
      button.classList.toggle('active', button.dataset.mode === this.mode);
    });

    let html = '';
    this.sets[this.mode].forEach((item) => {
      html += '<label class="field ' + (item[4] ? 'password' : '') + '"><input class="input" data-pass="' + item[4] + '" type="' + item[1] + '" placeholder="' + item[2] + '" autocomplete="' + item[3] + '">' + (item[5] ? '<button class="eye" type="button">◉</button>' : '') + '</label>';
    });
    this.f.innerHTML = html;

    this.f.querySelectorAll('.eye').forEach((button) => {
      button.onclick = () => {
        const passwordInputs = [...this.f.querySelectorAll('[data-pass="1"]')];
        const show = passwordInputs.some((input) => input.type === 'password');
        passwordInputs.forEach((input) => {
          input.type = show ? 'text' : 'password';
        });
      };
    });
  }
};

watchAuthState((user) => {
  if (user) authorizedSequence(user, true);
});

async function boot() {
  wireChatShell();
  AuthScreen.init();
  await sleep(120);
  await type(initText, 'INIT SYSTEM', 30);
  await sleep(80);
  await blink(initText);
  await sleep(80);
  init.classList.add('done');
  world.classList.add('show');
  await sleep(220);
  world.classList.add('logoOn');
  await sleep(360);
  world.classList.add('logoGlowOn');
  world.classList.add('active');
  await sleep(140);
  world.classList.add('gridOn');
  world.classList.add('hudOn');
  await sleep(180);
  await ringsSeq();
  await sleep(120);
  world.classList.add('titleOn');
  typeBlink(titleMain, 'CHAT', 28);
  await sleep(70);
  typeBlink(titleSub, 'SECURE COMMUNICATIONS', 10);
  await sleep(220);
  world.classList.add('formOn');
  bootDone = true;
}

boot();
