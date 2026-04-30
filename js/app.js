import {shell} from './templates.js';
import {bindActions} from './actions.js';
import {initFirebaseAuth} from './authFirebase.js';
import {initUiPatch} from './uiPatch.js';
import {initDustParticles} from './dustParticles.js';
import {initContactsPatch} from './contactsPatch.js';
import {initV150Patch} from './v150Patch.js';

document.getElementById('appRoot').innerHTML=shell();
initDustParticles();
bindActions();
initFirebaseAuth();
initUiPatch();
initContactsPatch();
initV150Patch();
window.UCMU={version:'v150-real-members-profile-svg-sweep',note:'render.js now renders real members; v150 fixes stale feed lock, visible profile buttons, SVG frame sweep; drag untouched'};
