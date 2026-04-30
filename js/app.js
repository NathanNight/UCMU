import {shell} from './templates.js';
import {bindActions} from './actions.js';
import {initFirebaseAuth} from './authFirebase.js';
import {initUiPatch} from './uiPatch.js';
import {initDustParticles} from './dustParticles.js';

// DEV MODE ON BY DEFAULT.
// Put diagnostics first so window.UCMU exists even if boot fails later.
window.UCMU={version:'v159-hotfix-boot-diagnostics',note:'HOTFIX: app loads with known actions.js. localStorage backend ON. actionsClean disabled until debugged.'};

try{
  document.getElementById('appRoot').innerHTML=shell();
  initDustParticles();
  bindActions();
  initFirebaseAuth();
  initUiPatch();
}catch(err){
  console.error('[UCMU BOOT ERROR]',err);
  window.UCMU.bootError=String(err?.stack||err?.message||err);
}
