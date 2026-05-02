import { authReady, loginWithEmail, registerWithEmail, watchAuthState } from './firebase.js';

const sleep = (m) => new Promise((resolve) => setTimeout(resolve, m));
let bootDone = false;
let authOpened = false;
let chatBooted = false;
let draggedCard = null;
let dragPlaceholder = null;

function byId(id) {
  return document.getElementById(id);
}

function fitApp() {
  const baseW = 1180;
  const baseH = 820;
  const scale = Math.min(innerWidth / baseW, innerHeight / baseH);
  document.documentElement.style.setProperty('--app-scale', Math.max(0.62, scale).toFixed(4));
}

addEventListener('resize', fitApp, { passive: true });
fitApp();

async function type(element, text, delay) {
  if (!element) return;
  element.textContent = '';
  element.classList.add('typing');
  for (const char of text) {
    element.textContent += char;
    await sleep(delay);
  }
  element.classList.remove('typing');
}

async function blink(element) {
  if (!element) return;
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
  byId('world')?.classList.add('ringsOn');
  const sequence = ['.r3', '.n2', '.r4', '.n1', '.r2', '.n3'];
  for (const selector of sequence) {
    const element = document.querySelector(selector);
    if (element) element.classList.add('show');
    await sleep(85 + Math.random() * 95);
  }
}

function getDragAfterElement(container, y) {
  const cards = [...container.querySelectorAll('.chatCard:not(.dragging)')];
  return cards.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, element: child };
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
}

function animateCardIntoPlaceholder(card, placeholder) {
  const from = card.getBoundingClientRect();
  placeholder.replaceWith(card);
  card.classList.remove('dragHidden');
  const to = card.getBoundingClientRect();
  card.style.transform = `translate(${from.left - to.left}px, ${from.top - to.top}px)`;
  card.style.opacity = '0.45';
  requestAnimationFrame(() => {
    card.classList.add('settling');
    card.style.transform = 'translate(0, 0)';
    card.style.opacity = '1';
  });
  window.setTimeout(() => {
    card.classList.remove('dragging', 'settling');
    card.style.transform = '';
    card.style.opacity = '';
  }, 260);
}

function wireChatDrag() {
  const list = byId('chatList');
  if (!list) return;

  list.querySelectorAll('.chatCard').forEach((card) => {
    card.addEventListener('dragstart', (event) => {
      draggedCard = card;
      dragPlaceholder = document.createElement('div');
      dragPlaceholder.className = 'chatPlaceholder';
      dragPlaceholder.innerHTML = '<span>+</span>';
      card.after(dragPlaceholder);
      card.classList.add('dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', 'chat-card');
      const ghost = card.cloneNode(true);
      ghost.className = 'dragGhost';
      ghost.style.width = `${card.offsetWidth}px`;
      ghost.style.height = `${card.offsetHeight}px`;
      document.body.appendChild(ghost);
      event.dataTransfer.setDragImage(ghost, 24, 24);
      requestAnimationFrame(() => {
        card.classList.add('dragHidden');
        ghost.remove();
      });
    });

    card.addEventListener('dragend', () => {
      if (dragPlaceholder && draggedCard) {
        animateCardIntoPlaceholder(draggedCard, dragPlaceholder);
      } else {
        draggedCard?.classList.remove('dragging', 'dragHidden');
      }
      draggedCard = null;
      dragPlaceholder = null;
    });
  });

  list.addEventListener('dragover', (event) => {
    event.preventDefault();
    if (!dragPlaceholder || !draggedCard) return;
    const after = getDragAfterElement(list, event.clientY);
    if (!after) list.appendChild(dragPlaceholder);
    else list.insertBefore(dragPlaceholder, after);
  });
}

function wireChatShell() {
  const screen = document.querySelector('.screen');
  const profileCard = byId('profileCard');
  const input = byId('messageInput');

  byId('railToggle')?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    screen?.classList.toggle('railCollapsed');
  });

  document.addEventListener('click', (event) => {
    const avatarHit = event.target.closest?.('#profileOpen .avatar');
    const closeHit = event.target.closest?.('#profileClose');

    if (avatarHit) {
      event.preventDefault();
      event.stopPropagation();
      profileCard?.classList.toggle('open');
      return;
    }

    if (closeHit) {
      event.preventDefault();
      event.stopPropagation();
      profileCard?.classList.remove('open');
    }
  });

  input?.addEventListener('input', () => {
    input.closest('.composer')?.classList.toggle('hasText', input.value.trim().length > 0);
  });

  wireChatDrag();
}

async function bootChatInterface(user, fast = false) {
  if (chatBooted) return;
  chatBooted = true;

  const worldNode = byId('world');
  const roomTitle = document.querySelector('.roomTitle span');
  const roomSub = document.querySelector('.roomTitle small');
  const railTitle = document.querySelector('.railLabel');
  const search = byId('chatSearch');

  worldNode?.classList.add('authorized');
  await sleep(fast ? 120 : 260);
  worldNode?.classList.add('chatBoot');

  await sleep(fast ? 80 : 220);
  await type(roomTitle, 'U.C.M.U', fast ? 14 : 28);
  await sleep(fast ? 40 : 120);
  await type(roomSub, 'ТЕСТ', fast ? 18 : 38);
  await sleep(fast ? 40 : 120);
  await type(railTitle, 'ЧАТЫ', fast ? 16 : 34);
  await sleep(fast ? 60 : 160);
  if (search) search.setAttribute('placeholder', 'Поиск чатов');
  worldNode?.classList.add('chatReady');
}

async function authorizedSequence(user, fast = false) {
  if (authOpened) return;
  authOpened = true;

  while (!bootDone) await sleep(60);

  const worldNode = byId('world');
  const authNode = byId('authPass');
  const name = user.displayName || user.email || 'user';

  worldNode?.classList.add('authStage');
  await sleep(fast ? 160 : 420);
  if (authNode) authNode.textContent = '';
  await type(authNode, 'AUTHORIZED', fast ? 16 : 34);
  await sleep(70);
  await blink(authNode);
  await sleep(140);

  byId('chatUser') && (byId('chatUser').textContent = name.toUpperCase());
  byId('sideUser') && (byId('sideUser').textContent = name);
  byId('profileName') && (byId('profileName').textContent = name);

  await bootChatInterface(user, fast);
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

const panelHeights = { login: 244, register: 362 };

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
    this.p = byId('panel');
    this.f = byId('fields');
    this.s = byId('submit');
    this.e = byId('error');

    document.querySelectorAll('[data-mode]').forEach((button) => {
      button.onclick = () => this.set(button.dataset.mode);
    });

    byId('form').onsubmit = (event) => this.submit(event);
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
  await type(byId('initText'), 'INIT SYSTEM', 30);
  await sleep(80);
  await blink(byId('initText'));
  await sleep(80);
  byId('init')?.classList.add('done');
  byId('world')?.classList.add('show');
  await sleep(220);
  byId('world')?.classList.add('logoOn');
  await sleep(360);
  byId('world')?.classList.add('logoGlowOn');
  byId('world')?.classList.add('active');
  await sleep(140);
  byId('world')?.classList.add('gridOn');
  byId('world')?.classList.add('hudOn');
  await sleep(180);
  await ringsSeq();
  await sleep(120);
  byId('world')?.classList.add('titleOn');
  typeBlink(byId('titleMain'), 'CHAT', 28);
  await sleep(70);
  typeBlink(byId('titleSub'), 'SECURE COMMUNICATIONS', 10);
  await sleep(220);
  byId('world')?.classList.add('formOn');
  bootDone = true;
}

boot();
