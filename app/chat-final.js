(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  let initialized = false;
  let sidebarUnsub = null;
  let confirmAction = null;
  let ctxTarget = null;
  let pending = null;
  let dragging = null;
  let allFolders = [];
  let allChats = [];
  let chatMap = new Map();
  let expandedFolderId = null;
  let activeChatId = null;
  let searchText = '';

  const apiReady = async () => {
    for (let i = 0; i < 120; i++) {
      if (window.UCMUFirebase?.createChatRecord && window.UCMUFirebase?.watchSidebarRecords) return window.UCMUFirebase;
      await wait(100);
    }
    throw new Error('FIREBASE_BRIDGE_NOT_READY');
  };

  function syncModal() {
    const open = Boolean($('.modalWindow.open'));
    $('#modalDimmer')?.classList.toggle('open', open);
    $('#messenger')?.classList.toggle('modalActive', open);
  }

  async function typeTitle(modal, text) {
    const title = $('.modalTitle', modal);
    if (!title) return;
    title.textContent = '';
    for (const ch of text) {
      title.textContent += ch;
      await wait(14);
    }
    title.classList.add('blinkText');
    setTimeout(() => title.classList.remove('blinkText'), 420);
  }

  function openModal(modal, title = '') {
    if (!modal) return;
    $$('.modalWindow.open').forEach((m) => m.classList.remove('open'));
    modal.classList.add('open');
    $$('.modalItem', modal).forEach((el, i) => el.style.setProperty('--delay', `${80 + i * 60}ms`));
    syncModal();
    if (title) typeTitle(modal, title);
  }

  function closeModal() {
    $$('.modalWindow.open').forEach((m) => m.classList.remove('open'));
    confirmAction = null;
    syncModal();
  }

  function ensureConfirmModal() {
    let modal = $('#confirmModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'confirmModal';
    modal.className = 'folderModal modalWindow confirmModal';
    modal.innerHTML = `
      <div class="modalTitle">CONFIRM</div>
      <div class="modalItem confirmText" id="confirmText">Подтвердить действие?</div>
      <div class="modalItem confirmActions">
        <button class="modalSubmit" id="confirmYes" type="button">ПОДТВЕРДИТЬ</button>
        <button class="modalCancel" id="confirmNo" type="button">ОТМЕНА</button>
      </div>`;
    $('#modalLayer')?.appendChild(modal);
    return modal;
  }

  function openConfirm(text, action) {
    const modal = ensureConfirmModal();
    $('#confirmText', modal).textContent = text;
    confirmAction = action;
    openModal(modal, 'CONFIRM');
  }

  function showModalError(modal, text) {
    if (!modal) return;
    let node = $('.modalError', modal);
    if (!node) {
      node = document.createElement('div');
      node.className = 'modalError';
      modal.appendChild(node);
    }
    node.textContent = text;
    node.classList.add('show');
  }

  function selectedColor(target) {
    return $(`.colorSwatches[data-target="${target}"] .swatch.active`)?.dataset.color || '#d71920';
  }

  function folderForChat(chatId) {
    return allFolders.find((folder) => Array.isArray(folder.chatIds) && folder.chatIds.includes(chatId)) || null;
  }

  function matches(item) {
    if (!searchText) return true;
    return String(item.title || item.name || '').toLowerCase().includes(searchText) || String(item.lastMessageText || '').toLowerCase().includes(searchText);
  }

  function iconNode(item) {
    const icon = document.createElement('span');
    icon.className = item.kind === 'folder' ? 'cardIcon realFolderIcon' : 'cardIcon folderIcon';
    icon.style.setProperty('--folder-color', item.color || '#d71920');
    if (item.avatarUrl) {
      const img = document.createElement('img');
      img.src = item.avatarUrl;
      img.alt = '';
      icon.appendChild(img);
    } else {
      icon.textContent = item.kind === 'folder' ? '▰' : String(item.title || 'Ч').slice(0, 1).toUpperCase();
    }
    return icon;
  }

  function makeCard(item) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = item.kind === 'folder' ? 'chatCard folderCard' : 'chatCard';
    card.dataset.kind = item.kind;
    card.dataset.id = item.id || '';
    card.dataset.count = String(item.count || 0);
    if (item.folderChild) card.classList.add('folderChildCard');
    if (item.kind === 'folder' && expandedFolderId === item.id) card.classList.add('folderExpanded');
    if (item.kind === 'chat' && activeChatId === item.id) card.classList.add('active');

    const text = document.createElement('span');
    text.className = 'cardText';
    text.innerHTML = '<b></b><em></em>';
    $('b', text).textContent = item.title || (item.kind === 'folder' ? 'Папка' : 'Чат');
    $('em', text).textContent = item.subtitle || '';

    const time = document.createElement('time');
    time.textContent = item.kind === 'chat' ? 'сейчас' : '';
    card.append(iconNode(item), text, time);
    return card;
  }

  function getCards(list = $('#chatList')) {
    return [...(list?.children || [])].filter((el) => el.classList.contains('chatCard') || el.classList.contains('chatPlaceholder'));
  }

  function snapshot(list = $('#chatList')) {
    return new Map(getCards(list).map((el) => [el, el.getBoundingClientRect()]));
  }

  function flip(before, list = $('#chatList')) {
    getCards(list).forEach((el) => {
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
      clearTimeout(el._flipTimer);
      el._flipTimer = setTimeout(() => {
        el.classList.remove('chatMoving');
        el.style.transform = '';
      }, 360);
    });
  }

  function renderSidebar(data = null, animate = true) {
    if (data) {
      allFolders = data.folders || [];
      allChats = data.chats || [];
      chatMap = new Map(allChats.map((chat) => [chat.id, chat]));
    }

    const list = $('#chatList');
    if (!list) return;
    const before = animate ? snapshot(list) : null;
    list.innerHTML = '';

    allFolders.filter(matches).forEach((folder) => {
      const ids = Array.isArray(folder.chatIds) ? folder.chatIds : [];
      list.appendChild(makeCard({
        id: folder.id,
        kind: 'folder',
        title: folder.title,
        subtitle: `папка · ${ids.length}`,
        color: folder.color,
        count: ids.length
      }));

      if (expandedFolderId === folder.id) {
        allChats.filter((chat) => ids.includes(chat.id)).filter(matches).forEach((chat) => {
          list.appendChild(makeCard({ ...chat, kind: 'chat', subtitle: chat.lastMessageText || 'чат', folderChild: true }));
        });
      }
    });

    allChats.filter((chat) => !folderForChat(chat.id)).filter(matches).forEach((chat) => {
      list.appendChild(makeCard({ ...chat, kind: 'chat', subtitle: chat.lastMessageText || 'чат' }));
    });

    if (before) flip(before, list);
  }

  function setActiveChat(card) {
    if (!card || card.dataset.kind !== 'chat') return;
    activeChatId = card.dataset.id;
    $$('.chatCard.active').forEach((el) => el.classList.remove('active'));
    card.classList.add('active');

    const data = chatMap.get(activeChatId) || {};
    const title = $('.cardText b', card)?.textContent || data.title || 'Чат';
    const sub = $('.cardText em', card)?.textContent || data.lastMessageText || 'чат';
    $('.roomTitle span') && ($('.roomTitle span').textContent = title);
    $('.roomTitle small') && ($('.roomTitle small').textContent = sub.toUpperCase());

    const messages = $('#messageList');
    if (messages) {
      messages.dataset.chatId = activeChatId;
      messages.innerHTML = `<article class="msg msgNew msgShine"><span class="msgAvatar"></span><div class="msgBubble"><b>U.C.M.U <small>system</small></b><p>Открыт чат: ${title}</p></div></article>`;
      setTimeout(() => $('.msgShine', messages)?.classList.remove('msgShine'), 1200);
    }
  }

  function removeChatLocal(chatId) {
    allChats = allChats.filter((chat) => chat.id !== chatId);
    allFolders = allFolders.map((folder) => ({
      ...folder,
      chatIds: Array.isArray(folder.chatIds) ? folder.chatIds.filter((id) => id !== chatId) : []
    }));
    if (activeChatId === chatId) activeChatId = null;
    renderSidebar(null, true);
  }

  async function createFolder() {
    const modal = $('#folderModal');
    const input = $('#folderName');
    const title = input?.value.trim() || 'Новая папка';
    try {
      const api = await apiReady();
      await api.createFolderRecord({ title, color: selectedColor('folder') });
      if (input) input.value = '';
      closeModal();
    } catch (error) {
      console.error('[UCMU] folder create failed:', error);
      showModalError(modal, 'НЕ УДАЛОСЬ СОЗДАТЬ ПАПКУ');
    }
  }

  async function createChat() {
    const modal = $('#chatModal');
    const input = $('#newChatName');
    const title = input?.value.trim() || 'Новый чат';
    try {
      const api = await apiReady();
      const chat = await api.createChatRecord({ title, color: selectedColor('chat'), avatarUrl: '' });
      if (expandedFolderId && api.setChatFolderRecord) await api.setChatFolderRecord(chat.id, expandedFolderId);
      if (input) input.value = '';
      closeModal();
    } catch (error) {
      console.error('[UCMU] chat create failed:', error);
      showModalError(modal, 'НЕ УДАЛОСЬ СОЗДАТЬ ЧАТ');
    }
  }

  function handleClick(e) {
    const target = e.target;

    const modal = target.closest?.('.modalWindow');
    if (modal) {
      e.preventDefault();
      e.stopImmediatePropagation();

      const swatch = target.closest('.swatch');
      if (swatch) {
        $$('.swatch', swatch.parentElement).forEach((s) => s.classList.remove('active'));
        swatch.classList.add('active');
        return;
      }

      if (target.closest('#folderCreate')) return void createFolder();
      if (target.closest('#chatCreate')) return void createChat();
      if (target.closest('#confirmYes')) {
        const action = confirmAction;
        return void (async () => {
          try {
            if (action) await action();
            closeModal();
          } catch (error) {
            console.error('[UCMU] confirm failed:', error);
            showModalError($('#confirmModal'), 'ДЕЙСТВИЕ НЕ ВЫПОЛНЕНО');
          }
        })();
      }
      if (target.closest('#confirmNo')) return closeModal();
      return;
    }

    if (target.id === 'modalDimmer') {
      e.preventDefault();
      e.stopImmediatePropagation();
      closeModal();
      return;
    }

    const folderOpen = target.closest?.('#folderOpen');
    if (folderOpen) {
      e.preventDefault();
      e.stopImmediatePropagation();
      openModal($('#folderModal'), 'CREATE FOLDER');
      return;
    }

    const chatOpen = target.closest?.('#chatOpen');
    if (chatOpen) {
      e.preventDefault();
      e.stopImmediatePropagation();
      openModal($('#chatModal'), 'CREATE CHAT');
      return;
    }

    const card = target.closest?.('.chatCard');
    if (card && $('#chatList')?.contains(card) && !dragging && !pending) {
      if (card.dataset.kind === 'folder') {
        e.preventDefault();
        e.stopImmediatePropagation();
        expandedFolderId = expandedFolderId === card.dataset.id ? null : card.dataset.id;
        renderSidebar(null, true);
        return;
      }
      if (card.dataset.kind === 'chat') setActiveChat(card);
    }
  }

  function handleContext(e) {
    const card = e.target.closest?.('.chatCard');
    if (!card || !$('#chatList')?.contains(card)) return;
    e.preventDefault();
    e.stopImmediatePropagation();

    if (!$('#chatContextMenu')) {
      const menu = document.createElement('div');
      menu.id = 'chatContextMenu';
      menu.className = 'chatContextMenu';
      document.body.appendChild(menu);
    }

    const menu = $('#chatContextMenu');
    ctxTarget = card;
    menu.innerHTML = card.dataset.kind === 'folder'
      ? '<button data-action="delete-folder">Удалить папку</button>'
      : '<button data-action="leave-chat">Выйти из чата</button>';
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
    menu.classList.add('open');
  }

  function handleContextClick(e) {
    const item = e.target.closest?.('#chatContextMenu button');
    if (!item || !ctxTarget) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const action = item.dataset.action;
    const id = ctxTarget.dataset.id;
    const title = $('.cardText b', ctxTarget)?.textContent || 'чат';
    $('#chatContextMenu')?.classList.remove('open');

    if (action === 'leave-chat') {
      openConfirm(`Выйти из чата «${title}»?`, async () => {
        const api = await apiReady();
        removeChatLocal(id);
        await api.leaveChatRecord(id);
      });
    }

    if (action === 'delete-folder') {
      const folder = allFolders.find((f) => f.id === id);
      const ids = Array.isArray(folder?.chatIds) ? [...folder.chatIds] : [];
      openConfirm(`Удалить папку «${title}» и выйти из ${ids.length} чатов?`, async () => {
        const api = await apiReady();
        ids.forEach(removeChatLocal);
        allFolders = allFolders.filter((f) => f.id !== id);
        if (expandedFolderId === id) expandedFolderId = null;
        renderSidebar(null, true);
        for (const chatId of ids) await api.leaveChatRecord(chatId);
        if (api.deleteFolderRecord) await api.deleteFolderRecord(id);
      });
    }
    ctxTarget = null;
  }

  function setupSearchAndSend() {
    $('#chatSearch')?.addEventListener('input', (e) => {
      searchText = e.target.value.trim().toLowerCase();
      renderSidebar(null, true);
    });

    const input = $('#messageInput');
    const sendBtn = $('#voiceSend');
    const send = () => {
      const text = input?.value.trim();
      if (!text || !activeChatId) return;
      const messages = $('#messageList');
      if (!messages) return;
      const msg = document.createElement('article');
      msg.className = 'msg msgNew msgShine';
      msg.innerHTML = '<span class="msgAvatar"></span><div class="msgBubble"><b>Вы <small>сейчас</small></b><p></p></div>';
      $('p', msg).textContent = text;
      messages.appendChild(msg);
      input.value = '';
      input.closest('.composer')?.classList.remove('hasText');
      msg.scrollIntoView({ block: 'end', behavior: 'smooth' });
      setTimeout(() => msg.classList.remove('msgShine'), 1300);
    };

    input?.addEventListener('input', () => input.closest('.composer')?.classList.toggle('hasText', input.value.trim().length > 0));
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    });
    sendBtn?.addEventListener('click', (e) => {
      if (input?.value.trim()) {
        e.preventDefault();
        send();
      }
    });
  }

  function afterForY(list, y) {
    for (const card of $$('.chatCard', list)) {
      const r = card.getBoundingClientRect();
      if (y < r.top + r.height / 2) return card;
    }
    return null;
  }

  function folderUnderPoint(x, y) {
    const el = document.elementFromPoint(x, y)?.closest?.('.folderCard');
    return el && $('#chatList')?.contains(el) ? el : null;
  }

  async function moveChatToFolder(chatId, folderId) {
    const api = await apiReady();
    await api.setChatFolderRecord(chatId, folderId);
  }

  function startDrag(e) {
    if (e.button !== 0) return;
    const list = $('#chatList');
    const card = e.target.closest?.('.chatCard');
    if (!card || !list?.contains(card) || e.target.closest('input,textarea,select,a,.chatContextMenu')) return;
    pending = { card, sx: e.clientX, sy: e.clientY, rect: card.getBoundingClientRect() };
  }

  function moveDrag(e) {
    const list = $('#chatList');
    if (!list) return;

    if (pending && !dragging) {
      if (Math.hypot(e.clientX - pending.sx, e.clientY - pending.sy) < 8) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const { card, rect, sx, sy } = pending;
      const ph = document.createElement('div');
      ph.className = 'chatPlaceholder';
      ph.innerHTML = '<span>+</span>';
      ph.style.height = `${rect.height}px`;
      card.replaceWith(ph);
      const ghost = card.cloneNode(true);
      ghost.className = 'chatCard dragFloat';
      ghost.style.width = `${rect.width}px`;
      ghost.style.height = `${rect.height}px`;
      ghost.style.left = '0px';
      ghost.style.top = '0px';
      ghost.style.transform = `translate3d(${rect.left}px,${rect.top}px,0)`;
      document.body.appendChild(ghost);
      dragging = { card, ph, ghost, ox: sx - rect.left, oy: sy - rect.top, dropFolder: null };
      pending = null;
    }

    if (!dragging) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    dragging.ghost.style.transform = `translate3d(${e.clientX - dragging.ox}px,${e.clientY - dragging.oy}px,0)`;

    $$('.folderHover').forEach((el) => el.classList.remove('folderHover'));
    dragging.dropFolder = null;
    const folder = folderUnderPoint(e.clientX, e.clientY);
    if (folder && dragging.card.dataset.kind === 'chat') {
      dragging.dropFolder = folder;
      folder.classList.add('folderHover');
      return;
    }

    const before = snapshot(list);
    const after = afterForY(list, e.clientY);
    if (after) list.insertBefore(dragging.ph, after);
    else list.appendChild(dragging.ph);
    flip(before, list);
  }

  function finishDrag(cancel = false) {
    pending = null;
    if (!dragging) return;
    const cur = dragging;
    dragging = null;
    $$('.folderHover').forEach((el) => el.classList.remove('folderHover'));

    if (cancel) {
      cur.ph.replaceWith(cur.card);
      cur.ghost.remove();
      return;
    }

    const chatId = cur.card.dataset.id;
    if (cur.dropFolder && cur.card.dataset.kind === 'chat') {
      const folderId = cur.dropFolder.dataset.id;
      allFolders = allFolders.map((folder) => ({
        ...folder,
        chatIds: folder.id === folderId
          ? [...new Set([...(folder.chatIds || []).filter((id) => id !== chatId), chatId])]
          : (folder.chatIds || []).filter((id) => id !== chatId)
      }));
      cur.ph.remove();
      cur.ghost.classList.add('dropSettle');
      const r = cur.dropFolder.getBoundingClientRect();
      cur.ghost.style.transform = `translate3d(${r.left + 8}px,${r.top + 8}px,0) scale(.35)`;
      cur.ghost.style.opacity = '0';
      moveChatToFolder(chatId, folderId).catch((err) => console.error('[UCMU] move to folder failed:', err));
      setTimeout(() => { cur.ghost.remove(); renderSidebar(null, true); }, 270);
      return;
    }

    if (cur.card.classList.contains('folderChildCard') && cur.card.dataset.kind === 'chat') {
      allFolders = allFolders.map((folder) => ({ ...folder, chatIds: (folder.chatIds || []).filter((id) => id !== chatId) }));
      moveChatToFolder(chatId, null).catch((err) => console.error('[UCMU] move out folder failed:', err));
    }

    const r = cur.ph.getBoundingClientRect();
    cur.ghost.classList.add('dropSettle');
    cur.ghost.style.transform = `translate3d(${r.left}px,${r.top}px,0)`;
    setTimeout(() => {
      cur.ph.replaceWith(cur.card);
      cur.ghost.remove();
      renderSidebar(null, true);
    }, 270);
  }

  function init() {
    if (initialized) return;
    if (!$('#chatList') || !$('#folderOpen') || !$('#chatOpen')) return setTimeout(init, 120);
    initialized = true;
    console.info('[UCMU] chat-final clean initialized');

    ensureConfirmModal();
    document.addEventListener('click', handleClick, true);
    document.addEventListener('contextmenu', handleContext, true);
    document.addEventListener('click', handleContextClick, true);
    document.addEventListener('click', (e) => { if (!e.target.closest('#chatContextMenu')) $('#chatContextMenu')?.classList.remove('open'); }, true);
    document.addEventListener('pointerdown', startDrag, true);
    window.addEventListener('pointermove', moveDrag, { passive: false, capture: true });
    window.addEventListener('pointerup', () => finishDrag(false), true);
    window.addEventListener('mouseup', () => finishDrag(false), true);
    window.addEventListener('blur', () => finishDrag(true));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
    setupSearchAndSend();

    apiReady().then((api) => {
      if (sidebarUnsub) sidebarUnsub();
      sidebarUnsub = api.watchSidebarRecords((data) => renderSidebar(data, true));
    }).catch((err) => console.error('[UCMU] sidebar watch failed:', err));
    syncModal();
  }

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', init);
  else init();
})();
