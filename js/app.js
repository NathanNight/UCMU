import {shell} from './templates.js';
import {bindActions} from './actions.js';
import {initAuth} from './auth.js';

document.getElementById('appRoot').innerHTML=shell();
bindActions();
initAuth();
window.UCMU={version:'v99-modular-auth',note:'auth/splash extracted from v63 into separate module'};
