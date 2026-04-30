import {shell} from './templates.js';
import {bindActions} from './actions.js';
import {initFirebaseAuth} from './authFirebase.js';
import {initUiPatch} from './uiPatch.js';
import {initDustParticles} from './dustParticles.js';
import {initContactsPatch} from './contactsPatch.js';
import {initMemberProfile} from './memberProfile.js';
import {initLeftPanelUi} from './leftPanelUi.js';
import {initFinalUiFixes} from './finalUiFixes.js';

document.getElementById('appRoot').innerHTML=shell();
initDustParticles();
bindActions();
initFirebaseAuth();
initUiPatch();
initLeftPanelUi();
initContactsPatch();
initMemberProfile();
initFinalUiFixes();

// DEV MODE ON BY DEFAULT.
// Reminder before real tests: switch chatStore.js back to Firestore backend.
window.UCMU={version:'v154-dev-localstorage-default-final-ui-fixes',note:'DEV MODE ON: chat/messages use localStorage, Firestore chat reads/writes disabled. Before real tests, switch back to Firebase/Firestore backend.'};
