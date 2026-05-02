const Timing = {
  sleep(ms) {
    return new Promise(resolve => window.setTimeout(resolve, ms));
  }
};

const TextFx = {
  async type(element, text, delay = 54) {
    if (!element) return;
    element.textContent = '';
    for (const char of text) {
      element.textContent += char;
      await Timing.sleep(delay);
    }
  },

  async blinkThreeTimes(element) {
    if (!element) return;
    element.classList.add('is-blinking');
    await Timing.sleep(1080);
    element.classList.remove('is-blinking');
  }
};

const AuthScreen = {
  mode: 'login',

  fields: {
    login: [
      { id: 'email', type: 'email', placeholder: 'Email', autocomplete: 'email' },
      { id: 'password', type: 'password', placeholder: 'Пароль', autocomplete: 'current-password', password: true }
    ],
    register: [
      { id: 'username', type: 'text', placeholder: '@username', autocomplete: 'username' },
      { id: 'email', type: 'email', placeholder: 'Email', autocomplete: 'email' },
      { id: 'password', type: 'password', placeholder: 'Пароль', autocomplete: 'new-password', password: true },
      { id: 'passwordRepeat', type: 'password', placeholder: 'Повтор пароля', autocomplete: 'new-password', password: true },
      { id: 'inviteCode', type: 'text', placeholder: 'Invite code', autocomplete: 'off' }
    ]
  },

  init() {
    this.card = document.querySelector('[data-auth]');
    this.form = document.querySelector('[data-auth-form]');
    this.fieldsNode = document.querySelector('[data-auth-fields]');
    this.submitNode = document.querySelector('[data-auth-submit]');
    this.hintNode = document.querySelector('[data-auth-hint]');
    this.errorNode = document.querySelector('[data-auth-error]');
    this.tabs = Array.from(document.querySelectorAll('[data-auth-mode]'));

    this.tabs.forEach(button => {
      button.addEventListener('click', () => this.setMode(button.dataset.authMode));
    });

    this.form?.addEventListener('submit', event => {
      event.preventDefault();
      this.showError('Firebase подключим следующим шагом. Сейчас проверяем экран и форму.');
    });

    this.renderFields();
  },

  setMode(mode) {
    if (!this.fields[mode] || this.mode === mode) return;
    this.mode = mode;
    this.renderFields();
  },

  renderFields() {
    if (!this.fieldsNode) return;

    const isRegister = this.mode === 'register';
    this.card?.classList.toggle('is-register', isRegister);
    this.tabs.forEach(button => button.classList.toggle('is-active', button.dataset.authMode === this.mode));
    this.submitNode.textContent = isRegister ? 'ЗАРЕГИСТРИРОВАТЬСЯ' : 'ВОЙТИ';
    this.hintNode.textContent = isRegister ? '@username будет именем в чате.' : 'Secure communications access point.';
    this.showError('');

    this.fieldsNode.innerHTML = this.fields[this.mode].map(field => this.fieldTemplate(field)).join('');

    this.fieldsNode.querySelectorAll('[data-password-toggle]').forEach(button => {
      button.addEventListener('click', () => {
        const input = button.parentElement.querySelector('input');
        input.type = input.type === 'password' ? 'text' : 'password';
      });
    });
  },

  fieldTemplate(field) {
    const passwordClass = field.password ? ' auth-field--password' : '';
    const toggle = field.password ? '<button class="pass-toggle" type="button" data-password-toggle>◉</button>' : '';
    return `
      <label class="auth-field${passwordClass}">
        <input class="auth-input" id="${field.id}" type="${field.type}" placeholder="${field.placeholder}" autocomplete="${field.autocomplete}">
        ${toggle}
      </label>
    `;
  },

  showError(text) {
    if (this.errorNode) this.errorNode.textContent = text;
  }
};

const StartScreen = {
  async init() {
    const init = document.querySelector('[data-init]');
    const initText = document.querySelector('[data-init-text]');
    const scene = document.querySelector('[data-scene]');

    AuthScreen.init();

    await Timing.sleep(240);
    await TextFx.type(initText, 'INIT SYSTEM', 58);
    await Timing.sleep(180);
    await TextFx.blinkThreeTimes(initText);
    await Timing.sleep(160);

    init?.classList.add('is-hidden');
    scene?.classList.add('is-visible');

    await Timing.sleep(360);
    scene?.classList.add('is-built');
  }
};

window.addEventListener('DOMContentLoaded', () => {
  StartScreen.init();
});
