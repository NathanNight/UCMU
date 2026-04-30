import {shell} from './templates.js';
import {bindActions} from './actionsClean.js';
import {initFirebaseAuth} from './authFirebase.js';
import {initUiPatch} from './uiPatch.js';
import {initDustParticles} from './dustParticles.js';

document.getElementById('appRoot').innerHTML=shell();
initDustParticles();
bindActions();
initFirebaseAuth();
initUiPatch();

// DEV MODE ON BY DEFAULT.
// Reminder before real tests: switch chatStore.js back to Firestore backend.
window.UCMU={version:'v157-clean-actions-css-base',note:'CLEAN DEV BASE: localStorage backend ON. UI moved into templates/actionsClean/components.css. Temporary patch modules disabled.'};
