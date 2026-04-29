import {state,activeMessages} from './state.js';
import {renderFeed} from './render.js';

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));

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

function openReactionUsers(m, emoji, x, y){
  const pop = $('#reactionUsers');
  if(!pop) return;
  const users = normalizeReactions(m)[emoji] || [];
  $('#reactionUsersTitle').textContent = `${emoji} ${users.length || ''}`.trim();
  $('#reactionUsersList').innerHTML = users.map(u => `<button class="reactionUser" data-profile="${esc(u)}"><div class="ava s"></div><span>${esc(u)}</span></button>`).join('') || '<div class="reactionEmpty">Нет реакций</div>';
  pop.style.left = Math.min(x, window.innerWidth - 250) + 'px';
  pop.style.top = Math.min(y, window.innerHeight - 220) + 'px';
  pop.classList.remove('hidden');
}

function hideReactionUsers(){ $('#reactionUsers')?.classList.add('hidden'); }

function toggleReaction(emoji){
  const m = activeMessages().find(x => x.id === state.selectedMessageId);
  if(!m) return;
  const reactions = normalizeReactions(m);
  reactions[emoji] ||= [];
  const i = reactions[emoji].indexOf(state.user);
  if(i >= 0) reactions[emoji].splice(i, 1);
  else reactions[emoji].push(state.user);
  if(!reactions[emoji].length) delete reactions[emoji];
  renderFeed();
}

export function initUiPatch(){
  document.addEventListener('click', e => {
    const reactBtn = e.target.closest('.reactBtn');
    if(reactBtn){
      e.preventDefault(); e.stopImmediatePropagation();
      toggleReaction(reactBtn.dataset.react);
      $('#ctx')?.classList.add('hidden');
      return;
    }

    const reaction = e.target.closest('.reactChip');
    if(reaction){
      const msg = reaction.closest('[data-msg-id]');
      const m = activeMessages().find(x => x.id === msg?.dataset.msgId);
      if(!m) return;
      const emoji = reaction.dataset.emoji;
      const reactions = normalizeReactions(m);
      const arr = reactions[emoji] || [];
      const i = arr.indexOf(state.user);
      if(i >= 0) arr.splice(i, 1); else arr.push(state.user);
      if(!arr.length) delete reactions[emoji];
      renderFeed();
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
      const msg = reaction.closest('[data-msg-id]');
      const m = activeMessages().find(x => x.id === msg?.dataset.msgId);
      if(m) openReactionUsers(m, reaction.dataset.emoji, e.clientX, e.clientY);
    }
  }, true);
}
