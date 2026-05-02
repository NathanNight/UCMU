const BootText = {
  defaultTypeDelay: 58,
  blinkClass: 'is-blinking',

  sleep(ms) {
    return new Promise(resolve => window.setTimeout(resolve, ms));
  },

  async typeByLetters(element, text, delay = this.defaultTypeDelay) {
    element.textContent = '';

    for (const char of text) {
      element.textContent += char;
      await this.sleep(delay);
    }
  },

  async blinkThreeTimes(element) {
    element.classList.add(this.blinkClass);
    await this.sleep(1080);
    element.classList.remove(this.blinkClass);
  }
};

const BootSequence = {
  bootSelector: '[data-boot]',
  lineSelector: '[data-boot-line]',
  activeClass: 'is-active',

  async start() {
    const boot = document.querySelector(this.bootSelector);
    const line = document.querySelector(this.lineSelector);

    if (!boot || !line) return;

    await BootText.sleep(260);
    await BootText.typeByLetters(line, 'INIT SYSTEM');
    await BootText.sleep(180);
    await BootText.blinkThreeTimes(line);
    await BootText.sleep(180);

    boot.classList.add(this.activeClass);
  }
};

window.addEventListener('DOMContentLoaded', () => {
  BootSequence.start();
});
