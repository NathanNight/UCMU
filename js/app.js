import {shell} from './templates.js';
import {bindActions} from './actions.js';
import {initFirebaseAuth} from './authFirebase.js';
import {initUiPatch} from './uiPatch.js';
import {initDustParticles} from './dustParticles.js';

// HOTFIX: use known loading actions.js while actionsClean is debugged.
document.getElementById('appRoot').innerHTML=shell();
initDustParticles();
bindActions();
initFirebaseAuth();
initUiPatch();

// DEV MODE ON BY DEFAULT.
// Reminder before real tests: switch chatStore.js back to Firestore backend.
window.UCMU={version:'v158-hotfix-working-actions-dev-local',note:'HOTFIX: app loads with known actions.js. localStorage backend ON. actionsClean disabled until debugged.'};
