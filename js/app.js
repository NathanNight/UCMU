import {shell} from './templates.js';
import {bindActions} from './actions.js';
import {initFirebaseAuth} from './authFirebase.js';
import {initUiPatch} from './uiPatch.js';

document.getElementById('appRoot').innerHTML=shell();
bindActions();
initFirebaseAuth();
initUiPatch();
window.UCMU={version:'v120-firebase-auth-secure-base',note:'v119 stable UI plus Firebase Auth secure registration base'};
