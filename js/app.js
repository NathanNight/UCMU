import {shell} from './templates.js';
import {bindActions} from './actions.js';
import {initFirebaseAuth} from './authFirebase.js';
import {initUiPatch} from './uiPatch.js';
import {initDustParticles} from './dustParticles.js';
import {initContactsPatch} from './contactsPatch.js';

document.getElementById('appRoot').innerHTML=shell();
initDustParticles();
bindActions();
initFirebaseAuth();
initUiPatch();
initContactsPatch();

// Clean base: no layered v145-v152 runtime patches.
// Keep feature work inside the main modules only: actions/render/chatStore/contactsPatch.
window.UCMU={version:'v153-clean-base-no-runtime-patches',note:'clean startup without stacked runtime patches; drag baseline preserved; fixes should now be made in core files only'};
