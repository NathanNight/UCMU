import {shell} from './templates.js';
import {bindActions} from './actions.js';
import {initAuth} from './auth.js';

document.getElementById('appRoot').innerHTML=shell();
bindActions();
initAuth();
window.UCMU={version:'v100-auth-polish',note:'auth/splash extracted from v63 into separate module'};
