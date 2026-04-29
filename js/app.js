import {shell} from './templates.js';import {bindActions} from './actions.js';
document.getElementById('appRoot').innerHTML=shell();
bindActions();
window.UCMU={version:'v98-modular',note:'single-file patch chain rebuilt as modules'};
