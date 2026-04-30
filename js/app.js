import {shell} from './templates.js';
import {bindActions} from './actions.js';
import {initFirebaseAuth} from './authFirebase.js';
import {initUiPatch} from './uiPatch.js';
import {initDustParticles} from './dustParticles.js';
import {initContactsPatch} from './contactsPatch.js';
import {initV145Patch} from './v145Patch.js';

document.getElementById('appRoot').innerHTML=shell();
initDustParticles();
bindActions();
initFirebaseAuth();
initUiPatch();
initContactsPatch();
initV145Patch();
window.UCMU={version:'v145-safe-undo-clear-modal-patch',note:'safe patch: undo restores original message index, clear cascade stays visible without return, modal intro softened; drag untouched'};
