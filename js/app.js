import {shell} from './templates.js';
import {bindActions} from './actions.js';
import {initFirebaseAuth} from './authFirebase.js';
import {initUiPatch} from './uiPatch.js';
import {initDustParticles} from './dustParticles.js';
import {initContactsPatch} from './contactsPatch.js';
import {initV147Patch} from './v147Patch.js';

document.getElementById('appRoot').innerHTML=shell();
initDustParticles();
bindActions();
initFirebaseAuth();
initUiPatch();
initContactsPatch();
initV147Patch();
window.UCMU={version:'v147-stability-delete-clear-members',note:'single stable patch: v145/v146 stacked handlers disabled, reliable red clear animation, chat leave animation, safe members render, search; drag untouched'};
