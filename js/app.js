import {shell} from './templates.js';
import {bindActions} from './actions.js';
import {initFirebaseAuth} from './authFirebase.js';
import {initUiPatch} from './uiPatch.js';
import {initDustParticles} from './dustParticles.js';
import {initContactsPatch} from './contactsPatch.js';
import {initV151Patch} from './v151Patch.js';
import {initV152DebugPatch} from './v152DebugPatch.js';

document.getElementById('appRoot').innerHTML=shell();
initDustParticles();
bindActions();
initFirebaseAuth();
initUiPatch();
initContactsPatch();
initV151Patch();
initV152DebugPatch();
window.UCMU={version:'v152-send-diagnostics',note:'diagnostic send patch loaded: logs activeChat/store/user/error and attempts forced send when normal send fails; drag untouched'};
