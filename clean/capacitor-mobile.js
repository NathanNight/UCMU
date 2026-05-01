async function bootCapacitorMobile(){
  const cap = window.Capacitor;
  if(!cap?.isNativePlatform?.()){
    window.UCMU_CAPACITOR_READY = 'web-mode';
    return;
  }
  document.body.classList.add('capacitor-native');
  try{
    const { StatusBar, Style } = await import('https://cdn.jsdelivr.net/npm/@capacitor/status-bar@latest/dist/esm/index.js');
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#020303' });
    await StatusBar.setOverlaysWebView({ overlay: true });
  }catch(err){ console.warn('[UCMU Capacitor] StatusBar unavailable', err); }
  try{
    const { Keyboard } = await import('https://cdn.jsdelivr.net/npm/@capacitor/keyboard@latest/dist/esm/index.js');
    Keyboard.setStyle({ style: 'DARK' }).catch(()=>{});
    Keyboard.setResizeMode({ mode: 'body' }).catch(()=>{});
    Keyboard.addListener('keyboardWillShow', info => {
      document.body.classList.add('keyboard-open','native-keyboard-open');
      document.documentElement.style.setProperty('--keyboard-bottom', (info.keyboardHeight || 0) + 'px');
    });
    Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-open','native-keyboard-open');
      document.documentElement.style.setProperty('--keyboard-bottom', '0px');
    });
  }catch(err){ console.warn('[UCMU Capacitor] Keyboard unavailable', err); }
  window.UCMU_CAPACITOR_READY = 'native-mode-v1';
}
bootCapacitorMobile();
