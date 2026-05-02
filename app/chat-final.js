(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  let ctxMenu;
  let dragging = null;
  let pending = null;

  function syncModalState() {
    const hasOpen = Boolean($('.modalWindow.open'));
    $('#modalDimmer')?.classList.toggle('open', hasOpen);
    $('#messenger')?.classList.toggle('modalActive', hasOpen);
  }

  function colorFor(target) {
    return $(`.colorSwatches[data-target="${target}"] .swatch.active`)?.dataset.color || '#d71920';
  }

  async function typeTitle(modal, text) {
    const title = $('.modalTitle', modal);
    if (!title) return;
    title.textContent = '';
    for (const ch of text) {
      title.textContent += ch;
      await wait(18);
    }
    title.classList.add('blinkText');
    await wait(420);
    title.classList.remove('blinkText');
  }

  function openModal(modal, title) {
    if (!modal) return;
    $$('.modalWindow.open').forEach((m) => m.classList.remove('open'));
    modal.classList.add('open');
    $$('.modalItem', modal).forEach((el, i) => el.style.setProperty('--delay', `${90 + i * 70}ms`));
    syncModalState();
    typeTitle(modal, title);
  }

  function closeModal() {
    $$('.modalWindow.open').forEach((m) => m.classList.remove('open'));
    syncModalState();
  }

  function makeCardIcon(color, label, isFolder) {
    const icon = document.createElement('span');
    icon.className = isFolder ? 'cardIcon realFolderIcon' : 'cardIcon folderIcon';
    icon.style.setProperty('--folder-color', color);
    icon.textContent = label;
    return icon;
  }

  function addCard({ title, subtitle, color, kind }) {
    const list = $('#chatList');
    if (!list) return;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = kind === 'folder' ? 'chatCard folderCard' : 'chatCard localChatCard';
    card.dataset.kind = kind;
    card.dataset.local = 'true';
    card.dataset.count = '0';
    const icon = makeCardIcon(color, kind === 'folder' ? '▰' : title.slice(0, 1).toUpperCase(), kind === 'folder');
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
    setTimeout(() => card.classList.remove('newCardPulse'), 650);
  }

  function activateChat(card) {
    if (!card || card.classList.contains('folderCard')) return;
    $$('.chatCard.active').forEach((c) => c.classList.remove('active'));
    card.classList.add('active');
    const title = $('.cardText b', card)?.textContent || 'ЧАТ';
    const sub = $('.cardText em', card)?.textContent || 'онлайн';
    const roomTitle = $('.roomTitle span');
    const roomSub = $('.roomTitle small');
    if (roomTitle) roomTitle.textContent = title;
    if (roomSub) roomSub.textContent = sub.toUpperCase();
  }

  function setupModals() {
    $('#folderOpen')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      openModal($('#folderModal'), 'CREATE FOLDER');
    }, true);

    $('#chatOpen')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      openModal($('#chatModal'), 'CREATE CHAT');
    }, true);

    $('#folderCreate')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      const nameInput = $('#folderName');
      const name = nameInput?.value.trim() || 'Новая папка';
      addCard({ title: name, subtitle: 'папка · 0', color: colorFor('folder'), kind: 'folder' });
      if (nameInput) nameInput.value = '';
      closeModal();
    }, true);

    $('#chatCreate')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      const nameInput = $('#newChatName');
      const name = nameInput?.value.trim() || 'Новый чат';
      addCard({ title: name, subtitle: 'чат создан', color: colorFor('chat'), kind: 'chat' });
      if (nameInput) nameInput.value = '';
      closeModal();
    }, true);

    document.addEventListener('click', (e) => {
      const swatch = e.target.closest('.swatch');
      if (!swatch) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      $$('.swatch', swatch.parentElement).forEach((s) => s.classList.remove('active'));
      swatch.classList.add('active');
    }, true);

    document.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.modalWindow')) {
        e.stopImmediatePropagation();
        return;
      }
      if (e.target.id === 'modalDimmer') {
        e.preventDefault();
        e.stopImmediatePropagation();
        closeModal();
      }
    }, true);

    document.addEventListener('click', (e) => {
      if (e.target.closest('.modalWindow')) {
        e.stopImmediatePropagation();
        syncModalState();
        return;
      }
      if (e.target.closest('.modalClose')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        closeModal();
        return;
      }
      if (e.target.id === 'modalDimmer') {
        e.preventDefault();
        e.stopImmediatePropagation();
        closeModal();
        return;
      }
      setTimeout(syncModalState, 0);
    }, true);

    const observer = new MutationObserver(syncModalState);
    $$('.modalWindow').forEach((m) => observer.observe(m, { attributes: true, attributeFilter: ['class'] }));
  }

  function setupContextMenu() {
    ctxMenu = document.createElement('div');
    ctxMenu.className = 'chatContextMenu';
    document.body.appendChild(ctxMenu);
    let target = null;
    document.addEventListener('contextmenu', (e) => {
      const card = e.target.closest('.chatCard');
      if (!card || !$('#chatList')?.contains(card)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      target = card;
      const isFolder = card.dataset.kind === 'folder' || card.classList.contains('folderCard');
      const isLocal = card.dataset.local === 'true';
      ctxMenu.innerHTML = isFolder
        ? '<button data-action="delete">Удалить папку</button>'
        : `<button data-action="leave">Выйти из чата</button>${isLocal ? '<button data-action="delete">Удалить чат</button>' : ''}`;
      ctxMenu.style.left = `${e.clientX}px`;
      ctxMenu.style.top = `${e.clientY}px`;
      ctxMenu.classList.add('open');
    }, true);
    ctxMenu.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn || !target) return;
      target.classList.add('cardRemoving');
      setTimeout(() => target?.remove(), 220);
      ctxMenu.classList.remove('open');
      target = null;
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.chatContextMenu')) ctxMenu?.classList.remove('open');
    });
  }

  function setupActivation() {
    const list = $('#chatList');
    if (!list) return;
    list.addEventListener('click', (e) => {
      if (dragging || pending) return;
      const card = e.target.closest('.chatCard');
      if (!card || !list.contains(card)) return;
      activateChat(card);
    });
  }

  function getItems(list) {
    return [...list.children].filter((el) => el.classList.contains('chatCard') || el.classList.contains('chatPlaceholder'));
  }
  function snapshot(list) {
    return new Map(getItems(list).map((el) => [el, el.getBoundingClientRect()]));
  }
  function animateSiblings(before, list) {
    getItems(list).forEach((el) => {
      const old = before.get(el);
      if (!old) return;
      const now = el.getBoundingClientRect();
      const dy = old.top - now.top;
      if (Math.abs(dy) < 0.5) return;
      el.style.transition = 'none';
      el.style.transform = `translate3d(0,${dy}px,0)`;
      el.getBoundingClientRect();
      el.classList.add('chatMoving');
      el.style.transition = '';
      el.style.transform = 'translate3d(0,0,0)';
      clearTimeout(el._moveTimer);
      el._moveTimer = setTimeout(() => {
        el.classList.remove('chatMoving');
        el.style.transform = '';
      }, 270);
    });
  }
  function afterForY(list, y) {
    for (const card of $$('.chatCard', list)) {
      const r = card.getBoundingClientRect();
      if (y < r.top + r.height / 2) return card;
    }
    return null;
  }
  function folderUnderPointer(x, y) {
    const el = document.elementFromPoint(x, y)?.closest?.('.folderCard');
    return el && $('#chatList')?.contains(el) ? el : null;
  }
  function addChatToFolder(chatCard, folderCard) {
    if (!chatCard || !folderCard || chatCard === folderCard || chatCard.classList.contains('folderCard')) return false;
    const count = Number(folderCard.dataset.count || 0) + 1;
    folderCard.dataset.count = String(count);
    const em = $('.cardText em', folderCard);
    if (em) em.textContent = `папка · ${count}`;
    folderCard.classList.add('folderAccept');
    setTimeout(() => folderCard.classList.remove('folderAccept'), 520);
    chatCard.remove();
    return true;
  }

  function finishDrag(cancel = false) {
    pending = null;
    if (!dragging) return;
    const current = dragging;
    dragging = null;
    current.locked = true;

    if (cancel) {
      current.placeholder.replaceWith(current.card);
      current.ghost.remove();
      return;
    }

    const folder = current.dropFolder;
    if (folder && addChatToFolder(current.card, folder)) {
      current.placeholder.remove();
      current.ghost.classList.add('dropSettle');
      const r = folder.getBoundingClientRect();
      current.ghost.style.transform = `translate3d(${r.left + 8}px,${r.top + 8}px,0) scale(.35)`;
      current.ghost.style.opacity = '0';
      setTimeout(() => current.ghost.remove(), 270);
      return;
    }

    const target = current.placeholder.getBoundingClientRect();
    current.ghost.classList.add('dropSettle');
    current.ghost.style.transform = `translate3d(${target.left}px,${target.top}px,0)`;
    setTimeout(() => {
      current.placeholder.replaceWith(current.card);
      current.ghost.remove();
    }, 270);
  }

  function setupDrag() {
    const list = $('#chatList');
    if (!list) return;

    document.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const card = e.target.closest('.chatCard');
      if (!card || !list.contains(card) || e.target.closest('input,textarea,select,a,.chatContextMenu')) return;
      pending = { card, sx: e.clientX, sy: e.clientY, rect: card.getBoundingClientRect(), pointerId: e.pointerId };
      try { card.setPointerCapture?.(e.pointerId); } catch {}
    }, true);

    window.addEventListener('pointermove', (e) => {
      if (pending && !dragging) {
        if (Math.hypot(e.clientX - pending.sx, e.clientY - pending.sy) < 8) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        const { card, rect, sx, sy } = pending;
        const placeholder = document.createElement('div');
        placeholder.className = 'chatPlaceholder';
        placeholder.innerHTML = '<span>+</span>';
        placeholder.style.height = `${rect.height}px`;
        card.replaceWith(placeholder);
        const ghost = card.cloneNode(true);
        ghost.className = 'chatCard dragFloat';
        ghost.style.width = `${rect.width}px`;
        ghost.style.height = `${rect.height}px`;
        ghost.style.left = '0px';
        ghost.style.top = '0px';
        ghost.style.transform = `translate3d(${rect.left}px,${rect.top}px,0)`;
        document.body.appendChild(ghost);
        dragging = { card, placeholder, ghost, ox: sx - rect.left, oy: sy - rect.top, after: null, locked: false, dropFolder: null };
        pending = null;
      }
      if (!dragging || dragging.locked) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      dragging.ghost.style.transform = `translate3d(${e.clientX - dragging.ox}px,${e.clientY - dragging.oy}px,0)`;

      $$('.folderCard.folderHover').forEach((f) => f.classList.remove('folderHover'));
      const folder = folderUnderPointer(e.clientX, e.clientY);
      dragging.dropFolder = folder && !dragging.card.classList.contains('folderCard') ? folder : null;
      if (dragging.dropFolder) {
        dragging.dropFolder.classList.add('folderHover');
        return;
      }

      const after = afterForY(list, e.clientY);
      if (after === dragging.after) return;
      const before = snapshot(list);
      if (after) list.insertBefore(dragging.placeholder, after);
      else list.appendChild(dragging.placeholder);
      dragging.after = after;
      animateSiblings(before, list);
    }, { passive: false, capture: true });

    const release = (e) => {
      if (pending) pending = null;
      if (!dragging) return;
      e?.preventDefault?.();
      e?.stopImmediatePropagation?.();
      $$('.folderCard.folderHover').forEach((f) => f.classList.remove('folderHover'));
      finishDrag(false);
    };
    window.addEventListener('pointerup', release, true);
    window.addEventListener('mouseup', release, true);
    window.addEventListener('pointercancel', () => finishDrag(true), true);
    window.addEventListener('blur', () => finishDrag(true));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') finishDrag(true);
    }, true);
  }

  window.addEventListener('DOMContentLoaded', () => {
    setupModals();
    setupContextMenu();
    setupActivation();
    setupDrag();
    syncModalState();
  });
})();
