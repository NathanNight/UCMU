import {shell} from './templates.js';
import {bindActions} from './actions.js';
import {initFirebaseAuth} from './authFirebase.js';
import {initUiPatch} from './uiPatch.js';
import {initDustParticles} from './dustParticles.js';
import {initContactsPatch} from './contactsPatch.js';
import {initV148Patch} from './v148Patch.js';

document.getElementById('appRoot').innerHTML=shell();
initDustParticles();
bindActions();
initFirebaseAuth();
initUiPatch();
initContactsPatch();
initV148Patch();
window.UCMU={version:'v148-modal-clear-frame-members',note:'space no longer replays modal, true frame-only sweep layer, stronger non-repeating clear delete animation, smooth chat reflow, member profile actions with kick confirmation; drag untouched'};
