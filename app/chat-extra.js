const sleepExtra = (ms) => new Promise((r) => setTimeout(r, ms));
const $ = (s, r = document) => r.querySelector(s);

async function typeExtra(el, text, delay = 22) {
  if (!el) return;
  el.textContent = '';
  el.classList.add('typing');
  for (const ch of text) {
    el.textContent += ch;
    await sleepExtra(delay);
  }
  el.classList.remove('typing');
  el.classList.add('blinkText');
  await sleepExtra(420);
  el.classList.remove('blinkText');
}

function modalIsOpen() { return Boolean($('.modalWindow.open')); }
function syncModalState() {
  $('#messenger')?.classList.toggle('modalActive', modalIsOpen());
  $('#modalDimmer')?.classList.toggle('open', modalIsOpen());
}
async function openModalExtra(modal, title) {
  if (!modal) return;
  document.querySelectorAll('.modalWindow.open').forEach((m) => m.classList.remove('open'));
  modal.classList.add('open');
  modal.querySelectorAll('.modalItem').forEach((el, i) => el.style.setProperty('--delay', `${120 + i * 80}ms`));
  syncModalState();
  await typeExtra($('.modalTitle', modal), title);
}
function closeModalExtra() {
  document.querySelectorAll('.modalWindow.open').forEach((m) => m.classList.remove('open'));
  syncModalState();
}
function selectedColor(target) {
  return $(`.colorSwatches[data-target="${target}"] .swatch.active`)?.dataset.color || '#d71920';
}
function makeIcon(color, text = '', folder = false) {
  const span = document.createElement('span');
  span.className = folder ? 'cardIcon folderIcon realFolderIcon' : 'cardIcon folderIcon';
  span.style.setProperty('--folder-color', color);
  span.textContent = text;
  return span;
}
function addCard({ title, subtitle, color, folder = false }) {
  const list = $('#chatList');
  if (!list || !title) return;
  const card = document.createElement('button');
  card.className = folder ? 'chatCard folderCard' : 'chatCard localChatCard';
  card.type = 'button';
  card.dataset.kind = folder ? 'folder' : 'chat';
  card.dataset.local = 'true';
  const icon = folder ? makeIcon(color, '▰', true) : makeIcon(color, title.slice(0, 1).toUpperCase());
  const text = document.createElement('span');
  text.className = 'cardText';
  text.innerHTML = '<b></b><em></em>';
  text.querySelector('b').textContent = title;
  text.querySelector('em').textContent = subtitle;
  const time = document.createElement('time');
  time.textContent = 'сейчас';
  card.append(icon, text, time);
  list.prepend(card);
  card.classList.add('newCardPulse');
  setTimeout(() => card.classList.remove('newCardPulse'), 620);
}
function setupModalControls() {
  $('#folderOpen')?.addEventListener('click', (e) => { e.preventDefault(); e.stopImmediatePropagation(); openModalExtra($('#folderModal'), 'CREATE FOLDER'); }, true);
  $('#chatOpen')?.addEventListener('click', (e) => { e.preventDefault(); e.stopImmediatePropagation(); openModalExtra($('#chatModal'), 'CREATE CHAT'); }, true);
  document.addEventListener('click', (e) => {
    if (e.target.closest('.modalClose')) { e.preventDefault(); e.stopImmediatePropagation(); closeModalExtra(); return; }
    if (modalIsOpen() && !e.target.closest('.modalWindow') && !e.target.closest('#folderOpen') && !e.target.closest('#chatOpen') && !e.target.closest('#profileOpen .avatar')) closeModalExtra();
  }, true);
  document.addEventListener('click', (e) => {
    const swatch = e.target.closest('.swatch');
    if (!swatch) return;
    e.preventDefault();
    swatch.parentElement.querySelectorAll('.swatch').forEach((s) => s.classList.remove('active'));
    swatch.classList.add('active');
  });
  $('#folderCreate')?.addEventListener('click', () => {
    const name = $('#folderName')?.value.trim() || 'Новая папка';
    addCard({ title: name, subtitle: 'папка', color: selectedColor('folder'), folder: true });
    $('#folderName').value = '';
    closeModalExtra();
  });
  $('#chatCreate')?.addEventListener('click', () => {
    const name = $('#newChatName')?.value.trim() || 'Новый чат';
    addCard({ title: name, subtitle: 'чат создан', color: selectedColor('chat') });
    $('#newChatName').value = '';
    closeModalExtra();
  });
  const obs = new MutationObserver(syncModalState);
  document.querySelectorAll('.modalWindow').forEach((m) => obs.observe(m, { attributes: true, attributeFilter: ['class'] }));
}

function setupContextMenu() {
  const menu = document.createElement('div');
  menu.className = 'chatContextMenu';
  document.body.appendChild(menu);
  let targetCard = null;

  function hideMenu() {
    menu.classList.remove('open');
    targetCard = null;
  }

  function showMenu(card, x, y) {
    targetCard = card;
    const isFolder = card.classList.contains('folderCard') || card.dataset.kind === 'folder';
    const isLocal = card.dataset.local === 'true';
    menu.innerHTML = isFolder
      ? '<button data-act="delete-folder">Удалить папку</button>'
      : `<button data-act="leave-chat">Выйти из чата</button>${isLocal ? '<button data-act="delete-chat">Удалить чат</button>' : ''}`;
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.classList.add('open');
  }

  document.addEventListener('contextmenu', (e) => {
    const card = e.target.closest('.chatCard');
    if (!card || !$('#chatList')?.contains(card)) return;
    e.preventDefault();
    showMenu(card, e.clientX, e.clientY);
  });

  menu.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn || !targetCard) return;
    const act = btn.dataset.act;
    if (act === 'delete-folder' || act === 'delete-chat' || act === 'leave-chat') {
      targetCard.classList.add('cardRemoving');
      setTimeout(() => targetCard?.remove(), 220);
    }
    hideMenu();
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.chatContextMenu')) hideMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideMenu();
  });
}

function setupDragOverride() {
  let st = null;
  let pending = null;
  const list = $('#chatList');
  if (!list) return;

  function listItems() {
    return [...list.children].filter((el) => el.classList.contains('chatCard') || el.classList.contains('chatPlaceholder'));
  }
  function getRects() {
    return new Map(listItems().map((el) => [el, el.getBoundingClientRect()]));
  }
  function playFlip(before) {
    const items = listItems();
    items.forEach((el) => {
      const old = before.get(el);
      if (!old) return;
      const now = el.getBoundingClientRect();
      const dx = old.left - now.left;
      const dy = old.top - now.top;
      if (Math.abs(dx) < .5 && Math.abs(dy) < .5) return;
      el.classList.remove('chatMoving');
      el.style.transition = 'none';
      el.style.transform = `translate3d(${dx}px,${dy}px,0)`;
      el.getBoundingClientRect();
      el.classList.add('chatMoving');
      el.style.transition = '';
      el.style.transform = 'translate3d(0,0,0)';
      clearTimeout(el._flipTimer);
      el._flipTimer = setTimeout(() => {
        el.classList.remove('chatMoving');
        el.style.transform = '';
      }, 280);
    });
  }
  function findAfter(y) {
    const cards = [...list.querySelectorAll('.chatCard')];
    for (const c of cards) {
      const b = c.getBoundingClientRect();
      if (y < b.top + b.height / 2) return c;
    }
    return null;
  }
  function beginDrag(e, pendingState) {
    const { card, box, startX, startY } = pendingState;
    const ph = document.createElement('div');
    ph.className = 'chatPlaceholder';
    ph.innerHTML = '<span>+</span>';
    ph.style.height = `${box.height}px`;
    card.replaceWith(ph);
    const ghost = card.cloneNode(true);
    ghost.className = 'chatCard dragFloat';
    ghost.style.width = `${box.width}px`;
    ghost.style.height = `${box.height}px`;
    ghost.style.left = '0px';
    ghost.style.top = '0px';
    ghost.style.transform = `translate3d(${box.left}px,${box.top}px,0)`;
    document.body.appendChild(ghost);
    st = { card, ph, ghost, ox: startX - box.left, oy: startY - box.top, after: null };
    pending = null;
  }
  document.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const card = e.target.closest('.chatCard');
    if (!card || !list.contains(card) || e.target.closest('input,textarea,select,a')) return;
    pending = { card, box: card.getBoundingClientRect(), startX: e.clientX, startY: e.clientY };
  }, true);
  document.addEventListener('pointermove', (e) => {
    if (pending && !st) {
      if (Math.hypot(e.clientX - pending.startX, e.clientY - pending.startY) < 7) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      beginDrag(e, pending);
    }
    if (!st) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    st.ghost.style.transform = `translate3d(${e.clientX - st.ox}px,${e.clientY - st.oy}px,0)`;
    const after = findAfter(e.clientY);
    if (after === st.after) return;
    const before = getRects();
    if (after) list.insertBefore(st.ph, after); else list.appendChild(st.ph);
    st.after = after;
    playFlip(before);
  }, { passive: false, capture: true });
  document.addEventListener('pointerup', (e) => {
    pending = null;
    if (!st) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const target = st.ph.getBoundingClientRect();
    st.ghost.classList.add('dropSettle');
    st.ghost.style.transform = `translate3d(${target.left}px,${target.top}px,0)`;
    setTimeout(() => {
      st.ph.replaceWith(st.card);
      st.ghost.remove();
      st = null;
    }, 270);
  }, true);
  document.addEventListener('pointercancel', () => { pending = null; }, true);
}
setTimeout(() => { setupModalControls(); setupContextMenu(); setupDragOverride(); }, 0);
