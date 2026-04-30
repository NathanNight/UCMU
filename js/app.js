import {shell} from './templates.js';
import {bindActions} from './actions.js';
import {initFirebaseAuth} from './authFirebase.js';
import {initUiPatch} from './uiPatch.js';
import {initDustParticles} from './dustParticles.js';
import {initContactsPatch} from './contactsPatch.js';
import {initMemberProfile} from './memberProfile.js';
import {initLeftPanelUi} from './leftPanelUi.js';

document.getElementById('appRoot').innerHTML=shell();
initDustParticles();
bindActions();
initFirebaseAuth();
initUiPatch();
initLeftPanelUi();
initContactsPatch();
initMemberProfile();

// DEV MODE ON BY DEFAULT.
// Reminder before real tests: switch chatStore.js back to Firestore backend.
window.UCMU={version:'v156-clean-dev-base',note:'CLEAN DEV BASE: localStorage backend ON. Temporary finalUiFixes/finalSmoothDrag patches disabled. Before real tests, switch back to Firebase/Firestore backend.'};
