import {shell} from './templates.js';
import {bindActions} from './actions.js';
import {initFirebaseAuth} from './authFirebase.js';
import {initUiPatch} from './uiPatch.js';
import {initDustParticles} from './dustParticles.js';
import {initContactsPatch} from './contactsPatch.js';
import {initV145Patch} from './v145Patch.js';
import {initV146Patch} from './v146Patch.js';

document.getElementById('appRoot').innerHTML=shell();
initDustParticles();
bindActions();
initFirebaseAuth();
initUiPatch();
initContactsPatch();
initV145Patch();
initV146Patch();
window.UCMU={version:'v146-clear-leave-members-search',note:'visible clear cascade, border sweep, leave chat behavior, real members panel, member card actions, message search navigation; drag untouched'};
