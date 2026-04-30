import {shell} from './templates.js';
import {bindActions} from './actions.js';
import {initFirebaseAuth} from './authFirebase.js';
import {initUiPatch} from './uiPatch.js';
import {initDustParticles} from './dustParticles.js';
import {initContactsPatch} from './contactsPatch.js';
import {initMemberProfile} from './memberProfile.js';

document.getElementById('appRoot').innerHTML=shell();
initDustParticles();
bindActions();
initFirebaseAuth();
initUiPatch();
initContactsPatch();
initMemberProfile();

// Clean base: no layered v145-v152 runtime patches.
// Keep feature work inside the main modules only: actions/render/chatStore/contactsPatch/memberProfile.
window.UCMU={version:'v153-clean-base-member-profile-actions',note:'stable base; member profile actions module loaded; message spawn untouched'};
