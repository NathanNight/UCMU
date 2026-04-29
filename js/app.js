import {shell} from './templates.js';
import {bindActions} from './actions.js';
import {initAuth} from './auth.js';
import {initUiPatch} from './uiPatch.js';

document.getElementById('appRoot').innerHTML=shell();
bindActions();
initAuth();
initUiPatch();
window.UCMU={version:'v117-ui-reactions',note:'v116 stable drag base plus reactions/profile polish'};
