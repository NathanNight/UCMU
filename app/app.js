const Timing = {
  sleep(ms) {
    return new Promise(resolve => window.setTimeout(resolve, ms));
  }
};

const TextFx = {
  async type(element, text, delay = 22) {
    if (!element) return;
    element.textContent = '';
    element.classList.add('typing');

    for (const char of text) {
      element.textContent += char;
      await Timing.sleep(delay);
    }

    element.classList.remove('typing');
  },

  async blink(element) {
    if (!element) return;
    element.classList.add('is-blinking', 'blink-text');
    await Timing.sleep(620);
    element.classList.remove('is-blinking', 'blink-text');
  },

  async typeAndBlink(element, text, delay = 14) {
    await this.type(element, text, delay);
    await Timing.sleep(20);
    await this.blink(element);
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
    this.panel = document.querySelector('[data-auth]');
    this.form = document.querySelector('[data-auth-form]');
    this.fieldsNode = document.querySelector('[data-auth-fields]');
    this.submitNode = document.querySelector('[data-auth-submit]');
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
    this.panel?.classList.toggle('is-register', isRegister);
    this.tabs.forEach(button => button.classList.toggle('is-active', button.dataset.authMode === this.mode));
    this.submitNode.textContent = isRegister ? 'ЗАРЕГИСТРИРОВАТЬСЯ' : 'ВОЙТИ';
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

const ClassifiedIntro = {
  async start() {
    const init = document.querySelector('[data-init]');
    const initText = document.querySelector('[data-init-text]');
    const world = document.querySelector('[data-world]');

    AuthScreen.init();

    await Timing.sleep(100);
    await TextFx.type(initText, 'INIT SYSTEM', 28);
    await Timing.sleep(55);
    await TextFx.blink(initText);
    await Timing.sleep(30);

    init?.classList.add('is-hidden');
    world?.classList.add('is-visible');

    await Timing.sleep(60);
    world?.classList.add('is-logo');

    await Timing.sleep(120);
    world?.classList.add('is-armed', 'is-hud', 'is-rings');

    TextFx.typeAndBlink(document.querySelector('[data-title-main]'), 'CHAT', 26);
    TextFx.typeAndBlink(document.querySelector('[data-title-sub]'), 'SECURE COMMUNICATIONS', 8);

    await Timing.sleep(180);
    world?.classList.add('is-title');

    await Timing.sleep(260);
    world?.classList.add('is-form');
  }
};

window.addEventListener('DOMContentLoaded', () => {
  ClassifiedIntro.start();
});
