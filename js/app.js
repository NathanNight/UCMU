import {shell} from './templates.js';
import {bindActions} from './actions.js';
import {initFirebaseAuth} from './authFirebase.js';
import {initUiPatch} from './uiPatch.js';
import {initDustParticles} from './dustParticles.js';
import {initContactsPatch} from './contactsPatch.js';
import {initMemberProfile} from './memberProfile.js';
import {initLeftPanelUi} from './leftPanelUi.js';
import {initUi162Refine} from './ui162Refine.js';

window.UCMU={version:'v162-ui-refine-pass',note:'DEV MODE ON: visual bootstrap restored. v162 UI refinements loaded. localStorage backend ON.'};

try{
  document.getElementById('appRoot').innerHTML=shell();
  initDustParticles();
  bindActions();
  initFirebaseAuth();
  initUiPatch();
  initLeftPanelUi();
  initContactsPatch();
  initMemberProfile();
  initUi162Refine();
}catch(err){
  console.error('[UCMU BOOT ERROR]',err);
  window.UCMU.bootError=String(err?.stack||err?.message||err);
}
