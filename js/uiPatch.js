import {state,activeMessages} from './state.js';
import {renderFeed} from './render.js';
import {isChatStoreReady,updateStoreReaction} from './chatStore.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));

function myReactionName(){
  return state.currentUser?.uid || state.user || 'me';
}

function reactionDisplayName(){
  return state.currentUser?.displayName || state.user || 'Operator';
}

function normalizeReactions(m){
  if(!m.reactions) m.reactions = {};
  if(m.reaction && typeof m.reaction === 'string'){
    const [emoji, countRaw] = m.reaction.trim().split(/\s+/);
    const n = Math.max(1, parseInt(countRaw || '1', 10) || 1);
    m.reactions[emoji] ||= [];
    while(m.reactions[emoji].length < n) m.reactions[emoji].push(['Leon','Jill','Chris','Alice'][m.reactions[emoji].length % 4]);
    delete m.reaction;
  }
  return m.reactions;
}

function openProfile(name='Профиль'){
  const modal = $('#profileModal');
  if(!modal) return;
  $('#profileName').textContent = name;
  modal.classList.remove('hidden');
}

function closeProfile(){ $('#profileModal')?.classList.add('hidden'); }
function hideReactionUsers(){ $('#reactionUsers')?.classList.add('hidden'); }

function reactionLabel(userKey){
  if(userKey === myReactionName()) return reactionDisplayName();
  return userKey;
}

function openReactionUsers(m, emoji, x, y){
  const pop = $('#reactionUsers');
  if(!pop) return;
  const users = normalizeReactions(m)[emoji] || [];
  $('#reactionUsersTitle').textContent = `${emoji} ${users.length || ''}`.trim();
  $('#reactionUsersList').innerHTML = users.map(u => `<button class="reactionUser" data-profile="${esc(reactionLabel(u))}"><div class="ava s"></div><span>${esc(reactionLabel(u))}</span></button>`).join('') || '<div class="reactionEmpty">Нет реакций</div>';
  pop.style.left = Math.min(x, window.innerWidth - 250) + 'px';
  pop.style.top = Math.min(y, window.innerHeight - 220) + 'px';
  pop.classList.remove('hidden');
}

function setOnlyMyReaction(m, emoji){
  const reactions = normalizeReactions(m);
  const me = myReactionName();
  const already = (reactions[emoji] || []).includes(me);
  Object.keys(reactions).forEach(key => {
    reactions[key] = reactions[key].filter(u => u !== me);
    if(!reactions[key].length) delete reactions[key];
  });
  if(!already){
    reactions[emoji] ||= [];
    reactions[emoji].push(me);
    m.lastReactEmoji = emoji;
    window.__ucmuLastReact = {msgId:m.id, emoji, t:Date.now()};
  } else {
    delete m.lastReactEmoji;
    window.__ucmuLastReact = {msgId:m.id, emoji:null, t:Date.now()};
  }
  return reactions;
}

async function saveReaction(m, reactions){
  if(isChatStoreReady()){
    try{ await updateStoreReaction(m.id, reactions); }
    catch(err){ console.error('update reaction failed', err); }
  }
}

async function reactionFromPicker(emoji){
  const m = activeMessages().find(x => x.id === state.selectedMessageId);
  if(!m) return;
  const reactions = setOnlyMyReaction(m, emoji);
  renderFeed();
  await saveReaction(m, reactions);
}

async function reactionFromChip(chip){
  const msg = chip.closest('[data-msg-id]');
  const m = activeMessages().find(x => x.id === msg?.dataset.msgId);
  if(!m) return;
  const reactions = setOnlyMyReaction(m, chip.dataset.emoji);
  renderFeed();
  await saveReaction(m, reactions);
}

export function initUiPatch(){
  document.addEventListener('click', e => {
    const reactBtn = e.target.closest('.reactBtn');
    if(reactBtn){
      e.preventDefault(); e.stopImmediatePropagation();
      reactionFromPicker(reactBtn.dataset.react);
      $('#ctx')?.classList.add('hidden');
      return;
    }

    const reaction = e.target.closest('.reactChip');
    if(reaction){
      e.preventDefault(); e.stopImmediatePropagation();
      $('#ctx')?.classList.add('hidden');
      reactionFromChip(reaction);
      return;
    }

    const member = e.target.closest('.member');
    if(member){
      e.preventDefault(); e.stopImmediatePropagation();
      openProfile(member.dataset.person || member.textContent.trim() || 'Профиль');
      return;
    }

    const profileUser = e.target.closest('[data-profile]');
    if(profileUser){
      e.preventDefault(); e.stopImmediatePropagation();
      openProfile(profileUser.dataset.profile);
      hideReactionUsers();
      return;
    }

    if(e.target.closest('#closeProfile')){ closeProfile(); return; }
    if(e.target.closest('#closeReactionUsers')){ hideReactionUsers(); return; }
    if(!e.target.closest('#reactionUsers')) hideReactionUsers();
  }, true);

  document.addEventListener('contextmenu', e => {
    const reaction = e.target.closest('.reactChip');
    if(reaction){
      e.preventDefault(); e.stopImmediatePropagation();
      $('#ctx')?.classList.add('hidden');
      const msg = reaction.closest('[data-msg-id]');
      const m = activeMessages().find(x => x.id === msg?.dataset.msgId);
      if(m) openReactionUsers(m, reaction.dataset.emoji, e.clientX, e.clientY);
    }
  }, true);
}
