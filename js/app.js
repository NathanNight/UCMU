import {shell} from './templates.js';
import {bindActions} from './actions.js';
import {initFirebaseAuth} from './authFirebase.js';
import {initUiPatch} from './uiPatch.js';
import {initDustParticles} from './dustParticles.js';
import {initContactsPatch} from './contactsPatch.js';
import {initV149Patch} from './v149Patch.js';

document.getElementById('appRoot').innerHTML=shell();
initDustParticles();
bindActions();
initFirebaseAuth();
initUiPatch();
initContactsPatch();
initV149Patch();
window.UCMU={version:'v149-feed-members-profile-frame',note:'stale feed lock reset on chat switch, profile closes on chat switch, real member names loaded from users, visible profile buttons inside card, frame-only sharper sweep; drag untouched'};
