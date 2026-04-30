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
initContactsPatch();
initMemberProfile();
initLeftPanelUi();

// Clean base: no layered v145-v152 runtime patches.
// Keep feature work inside the main modules only: actions/render/chatStore/contactsPatch/memberProfile/leftPanelUi.
window.UCMU={version:'v153-clean-base-left-panel-contacts',note:'stable base; left panel search/buttons/contacts module loaded; message spawn untouched'};
