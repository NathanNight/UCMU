import {shell} from './templates.js';
import {bindActions} from './actions.js';
import {initFirebaseAuth} from './authFirebase.js';
import {initUiPatch} from './uiPatch.js';
import {initDustParticles} from './dustParticles.js';
import {initContactsPatch} from './contactsPatch.js';
import {initV151Patch} from './v151Patch.js';

document.getElementById('appRoot').innerHTML=shell();
initDustParticles();
bindActions();
initFirebaseAuth();
initUiPatch();
initContactsPatch();
initV151Patch();
window.UCMU={version:'v151-emergency-stable-chat',note:'emergency stable load: v150 removed, chat input restored, real member profile buttons, simple non-broken frame pulse; drag untouched'};
