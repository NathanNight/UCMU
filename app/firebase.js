import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  addDoc,
  arrayUnion,
  arrayRemove,
  runTransaction,
  onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.local.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const persistenceReady = setPersistence(auth, browserLocalPersistence);

function normalizeEmail(email) { return String(email || '').trim().toLowerCase(); }
function cleanUsername(username) { return String(username || '').trim().replace(/^@+/, '').toLowerCase(); }
function cleanInviteCode(inviteCode) { return String(inviteCode || '').trim(); }
function cleanTitle(title, fallback) { const value = String(title || '').trim(); return value || fallback; }
function inviteIsUsable(invite) { if (!invite) return false; if (invite.disabled === true) return false; if (invite.usedBy) return false; if (invite.used === true) return false; return true; }
function requireUser() { const user = auth.currentUser; if (!user) throw new Error('AUTH_REQUIRED'); return user; }

async function touchUser(user) {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    await setDoc(userRef, { uid: user.uid, email: user.email, username: cleanUsername(user.displayName || ''), displayName: user.displayName || '', role: 'member', disabled: false, folders: [], createdAt: serverTimestamp(), lastSeenAt: serverTimestamp() }, { merge: true });
  } else {
    const data = userSnap.data();
    if (data.disabled === true) throw new Error('USER_DISABLED');
    await setDoc(userRef, { lastSeenAt: serverTimestamp() }, { merge: true });
  }
  return user;
}

async function findInvite(code) {
  if (!code) return null;
  const inviteCodeRef = doc(db, 'inviteCodes', code);
  const inviteCodeSnap = await getDoc(inviteCodeRef);
  if (inviteCodeSnap.exists()) return { ref: inviteCodeRef, data: inviteCodeSnap.data(), collection: 'inviteCodes' };
  const inviteRef = doc(db, 'invites', code);
  const inviteSnap = await getDoc(inviteRef);
  if (inviteSnap.exists()) return { ref: inviteRef, data: inviteSnap.data(), collection: 'invites' };
  return null;
}

export async function createChatRecord({ title, color = '#d71920', avatarUrl = '' }) {
  await persistenceReady;
  const user = requireUser();
  const clean = cleanTitle(title, 'Новый чат');
  const chatRef = await addDoc(collection(db, 'chats'), { title: clean, color, avatarUrl, type: 'chat', createdBy: user.uid, members: [user.uid], memberRoles: { [user.uid]: 'owner' }, memberCount: 1, lastMessageText: '', deleted: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return { id: chatRef.id, title: clean, color, avatarUrl, kind: 'chat' };
}

export async function createFolderRecord({ title, color = '#d71920' }) {
  await persistenceReady;
  const user = requireUser();
  const folder = { id: crypto.randomUUID ? crypto.randomUUID() : `folder_${Date.now()}`, title: cleanTitle(title, 'Новая папка'), color, chatIds: [], createdAtMs: Date.now() };
  await setDoc(doc(db, 'users', user.uid), { folders: arrayUnion(folder), lastSeenAt: serverTimestamp() }, { merge: true });
  return { ...folder, kind: 'folder' };
}

export async function setChatFolderRecord(chatId, folderId) {
  await persistenceReady;
  const user = requireUser();
  if (!chatId) throw new Error('CHAT_ID_REQUIRED');
  const userRef = doc(db, 'users', user.uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    const data = snap.data() || {};
    const folders = Array.isArray(data.folders) ? data.folders : [];
    const nextFolders = folders.map((folder) => {
      const ids = Array.isArray(folder.chatIds) ? folder.chatIds.filter((id) => id !== chatId) : [];
      if (folderId && folder.id === folderId && !ids.includes(chatId)) ids.push(chatId);
      return { ...folder, chatIds: ids };
    });
    tx.set(userRef, { folders: nextFolders, lastSeenAt: serverTimestamp() }, { merge: true });
  });
}

export async function deleteFolderRecord(folderId) {
  await persistenceReady;
  const user = requireUser();
  if (!folderId) throw new Error('FOLDER_ID_REQUIRED');
  const userRef = doc(db, 'users', user.uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    const data = snap.data() || {};
    const folders = Array.isArray(data.folders) ? data.folders : [];
    tx.set(userRef, {
      folders: folders.filter((folder) => folder.id !== folderId),
      lastSeenAt: serverTimestamp()
    }, { merge: true });
  });
}

async function removeChatFromAllUserFolders(user, chatId) {
  const userRef = doc(db, 'users', user.uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    const data = snap.data() || {};
    const folders = Array.isArray(data.folders) ? data.folders : [];
    const nextFolders = folders.map((folder) => ({
      ...folder,
      chatIds: Array.isArray(folder.chatIds) ? folder.chatIds.filter((id) => id !== chatId) : []
    }));
    tx.set(userRef, { folders: nextFolders, lastSeenAt: serverTimestamp() }, { merge: true });
  });
}

export async function leaveChatRecord(chatId) {
  await persistenceReady;
  const user = requireUser();
  if (!chatId) throw new Error('CHAT_ID_REQUIRED');
  const chatRef = doc(db, 'chats', chatId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(chatRef);
    if (!snap.exists()) throw new Error('CHAT_NOT_FOUND');
    const data = snap.data() || {};
    const members = Array.isArray(data.members) ? data.members : [];
    const nextMembers = members.filter((uid) => uid !== user.uid);
    const nextRoles = { ...(data.memberRoles || {}) };
    delete nextRoles[user.uid];
    if (nextMembers.length <= 0) tx.update(chatRef, { members: [], memberRoles: {}, memberCount: 0, deleted: true, deletedAt: serverTimestamp(), updatedAt: serverTimestamp() });
    else tx.update(chatRef, { members: arrayRemove(user.uid), memberRoles: nextRoles, memberCount: nextMembers.length, updatedAt: serverTimestamp() });
  });
  await removeChatFromAllUserFolders(user, chatId);
}

export function watchSidebarRecords(callback) {
  let unsubUser = null, unsubChats = null, folders = [], chats = [];
  const emit = () => callback({ folders, chats });
  function cleanupLive() { if (unsubUser) unsubUser(); if (unsubChats) unsubChats(); unsubUser = null; unsubChats = null; folders = []; chats = []; }
  const unsubAuth = onAuthStateChanged(auth, async (user) => {
    cleanupLive();
    if (!user) { emit(); return; }
    await persistenceReady;
    unsubUser = onSnapshot(doc(db, 'users', user.uid), (snap) => { const data = snap.data() || {}; folders = Array.isArray(data.folders) ? data.folders.map((folder) => ({ ...folder, kind: 'folder' })) : []; emit(); }, (error) => console.error('[UCMU] folders watch failed:', error));
    unsubChats = onSnapshot(collection(db, 'chats'), (snap) => {
      chats = snap.docs.map((chatDoc) => { const data = chatDoc.data() || {}; return { id: chatDoc.id, title: data.title || data.name || 'Чат', color: data.color || '#d71920', avatarUrl: data.avatarUrl || '', lastMessageText: data.lastMessageText || data.lastMessage || '', memberCount: data.memberCount || (Array.isArray(data.members) ? data.members.length : 0), members: Array.isArray(data.members) ? data.members : [], deleted: data.deleted === true, kind: 'chat' }; }).filter((chat) => !chat.deleted).filter((chat) => chat.members.length === 0 || chat.members.includes(user.uid) || chat.memberCount === 0);
      emit();
    }, (error) => console.error('[UCMU] chats watch failed:', error));
  });
  return () => { cleanupLive(); unsubAuth(); };
}

export async function loginWithEmail({ email, password }) { await persistenceReady; const credential = await signInWithEmailAndPassword(auth, normalizeEmail(email), password); return touchUser(credential.user); }

export async function registerWithEmail({ username, email, password, passwordRepeat, inviteCode }) {
  await persistenceReady;
  const cleanName = cleanUsername(username), cleanEmail = normalizeEmail(email), code = cleanInviteCode(inviteCode);
  if (!cleanName) throw new Error('USERNAME_REQUIRED'); if (!cleanEmail) throw new Error('EMAIL_REQUIRED'); if (!password || password.length < 6) throw new Error('WEAK_PASSWORD'); if (password !== passwordRepeat) throw new Error('PASSWORD_MISMATCH'); if (!code) throw new Error('INVITE_REQUIRED');
  const usernameRef = doc(db, 'usernames', cleanName); const usernameSnap = await getDoc(usernameRef); if (usernameSnap.exists()) throw new Error('USERNAME_TAKEN');
  const invite = await findInvite(code); if (!invite || !inviteIsUsable(invite.data)) throw new Error('INVITE_INVALID');
  const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password); await updateProfile(credential.user, { displayName: cleanName });
  await setDoc(doc(db, 'users', credential.user.uid), { uid: credential.user.uid, username: cleanName, displayName: cleanName, email: cleanEmail, role: 'member', disabled: false, folders: [], inviteCode: code, createdAt: serverTimestamp(), lastSeenAt: serverTimestamp() }, { merge: true });
  await setDoc(usernameRef, { uid: credential.user.uid, username: cleanName, createdAt: serverTimestamp() }, { merge: true });
  await updateDoc(invite.ref, { used: true, usedBy: credential.user.uid, usedByUsername: cleanName, usedAt: serverTimestamp() });
  return credential.user;
}

export function watchAuthState(callback) { return onAuthStateChanged(auth, async (user) => { if (!user) { callback(null); return; } try { await persistenceReady; callback(await touchUser(user)); } catch (error) { console.warn('[UCMU] auth state rejected:', error); callback(null); } }); }
export function authReady() { return true; }

window.UCMUFirebase = { createChatRecord, createFolderRecord, setChatFolderRecord, deleteFolderRecord, leaveChatRecord, watchSidebarRecords, getCurrentUser: () => auth.currentUser };
