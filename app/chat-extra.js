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
function makeIcon(color, text = '') {
  const span = document.createElement('span');
  span.className = 'cardIcon folderIcon';
  span.style.setProperty('--folder-color', color);
  span.textContent = text;
  return span;
}
function addCard({ title, subtitle, color, folder = false }) {
  const list = $('#chatList');
  if (!list || !title) return;
  const card = document.createElement('button');
  card.className = folder ? 'chatCard folderCard' : 'chatCard';
  card.type = 'button';
  const icon = folder ? makeIcon(color, '▣') : makeIcon(color, title.slice(0, 1).toUpperCase());
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
    closeModalExtra();
  });
  $('#chatCreate')?.addEventListener('click', () => {
    const name = $('#newChatName')?.value.trim() || 'Новый чат';
    addCard({ title: name, subtitle: 'чат создан', color: selectedColor('chat') });
    closeModalExtra();
  });
  const obs = new MutationObserver(syncModalState);
  document.querySelectorAll('.modalWindow').forEach((m) => obs.observe(m, { attributes: true, attributeFilter: ['class'] }));
}
function rects(list) { return new Map([...list.children].map((el) => [el, el.getBoundingClientRect()])); }
function flip(before, list) {
  [...list.children].forEach((el) => {
    const old = before.get(el);
    if (!old) return;
    const now = el.getBoundingClientRect();
    const dx = old.left - now.left;
    const dy = old.top - now.top;
    if (!dx && !dy) return;
    el.style.transition = 'none';
    el.style.transform = `translate(${dx}px,${dy}px)`;
    el.offsetHeight;
    el.style.transition = 'transform .24s cubic-bezier(.22,1,.36,1)';
    el.style.transform = '';
    setTimeout(() => { el.style.transition = ''; el.style.transform = ''; }, 260);
  });
}
function setupDragOverride() {
  let st = null;
  const list = $('#chatList');
  if (!list) return;
  document.addEventListener('pointerdown', (e) => {
    const card = e.target.closest('.chatCard');
    if (!card || !list.contains(card) || e.target.closest('input,textarea,select,a')) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const box = card.getBoundingClientRect();
    const ph = document.createElement('div');
    ph.className = 'chatPlaceholder';
    ph.innerHTML = '<span>+</span>';
    ph.style.height = `${box.height}px`;
    card.replaceWith(ph);
    const ghost = card.cloneNode(true);
    ghost.className = 'chatCard dragFloat';
    ghost.style.width = `${box.width}px`;
    ghost.style.height = `${box.height}px`;
    ghost.style.left = `${box.left}px`;
    ghost.style.top = `${box.top}px`;
    document.body.appendChild(ghost);
    st = { card, ph, ghost, ox: e.clientX - box.left, oy: e.clientY - box.top, after: null };
  }, true);
  document.addEventListener('pointermove', (e) => {
    if (!st) return;
    e.preventDefault();
    st.ghost.style.left = `${e.clientX - st.ox}px`;
    st.ghost.style.top = `${e.clientY - st.oy}px`;
    const cards = [...list.querySelectorAll('.chatCard')];
    let after = null;
    for (const c of cards) {
      const b = c.getBoundingClientRect();
      if (e.clientY < b.top + b.height / 2) { after = c; break; }
    }
    if (after === st.after) return;
    const before = rects(list);
    if (after) list.insertBefore(st.ph, after); else list.appendChild(st.ph);
    st.after = after;
    flip(before, list);
  }, { passive: false, capture: true });
  document.addEventListener('pointerup', () => {
    if (!st) return;
    const target = st.ph.getBoundingClientRect();
    st.ghost.style.transition = 'left .26s cubic-bezier(.22,1,.36,1), top .26s cubic-bezier(.22,1,.36,1)';
    st.ghost.style.left = `${target.left}px`;
    st.ghost.style.top = `${target.top}px`;
    setTimeout(() => { st.ph.replaceWith(st.card); st.ghost.remove(); st = null; }, 260);
  }, true);
}
setTimeout(() => { setupModalControls(); setupDragOverride(); }, 0);
