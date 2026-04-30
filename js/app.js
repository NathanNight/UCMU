import {shell} from './templates.js';
import {bindActions} from './actions.js';
import {initFirebaseAuth} from './authFirebase.js';
import {initUiPatch} from './uiPatch.js';
import {initDustParticles} from './dustParticles.js';
import {initContactsPatch} from './contactsPatch.js';
import {initMemberProfile} from './memberProfile.js';
import {initLeftPanelUi} from './leftPanelUi.js';

window.UCMU={version:'v161-restored-visual-bootstrap',note:'DEV MODE ON: visual bootstrap restored. localStorage backend ON. Clean rewrite should be done on separate branch.'};

try{
  document.getElementById('appRoot').innerHTML=shell();
  initDustParticles();
  bindActions();
  initFirebaseAuth();
  initUiPatch();
  initLeftPanelUi();
  initContactsPatch();
  initMemberProfile();
}catch(err){
  console.error('[UCMU BOOT ERROR]',err);
  window.UCMU.bootError=String(err?.stack||err?.message||err);
}
