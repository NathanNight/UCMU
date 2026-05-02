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
  arrayUnion
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.local.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const persistenceReady = setPersistence(auth, browserLocalPersistence);

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function cleanUsername(username) {
  return String(username || '').trim().replace(/^@+/, '').toLowerCase();
}

function cleanInviteCode(inviteCode) {
  return String(inviteCode || '').trim();
}

function cleanTitle(title, fallback) {
  const value = String(title || '').trim();
  return value || fallback;
}

function inviteIsUsable(invite) {
  if (!invite) return false;
  if (invite.disabled === true) return false;
  if (invite.usedBy) return false;
  if (invite.used === true) return false;
  return true;
}

async function touchUser(user) {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      username: cleanUsername(user.displayName || ''),
      displayName: user.displayName || '',
      role: 'member',
      disabled: false,
      folders: [],
      createdAt: serverTimestamp(),
      lastSeenAt: serverTimestamp()
    }, { merge: true });
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
  if (inviteCodeSnap.exists()) {
    return { ref: inviteCodeRef, data: inviteCodeSnap.data(), collection: 'inviteCodes' };
  }

  const inviteRef = doc(db, 'invites', code);
  const inviteSnap = await getDoc(inviteRef);
  if (inviteSnap.exists()) {
    return { ref: inviteRef, data: inviteSnap.data(), collection: 'invites' };
  }

  return null;
}

function requireUser() {
  const user = auth.currentUser;
  if (!user) throw new Error('AUTH_REQUIRED');
  return user;
}

export async function createChatRecord({ title, color = '#d71920', avatarUrl = '' }) {
  await persistenceReady;
  const user = requireUser();
  const chatRef = await addDoc(collection(db, 'chats'), {
    title: cleanTitle(title, 'Новый чат'),
    color,
    avatarUrl,
    type: 'chat',
    createdBy: user.uid,
    members: [user.uid],
    memberRoles: { [user.uid]: 'owner' },
    memberCount: 1,
    lastMessageText: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return {
    id: chatRef.id,
    title: cleanTitle(title, 'Новый чат'),
    color,
    avatarUrl,
    kind: 'chat'
  };
}

export async function createFolderRecord({ title, color = '#d71920' }) {
  await persistenceReady;
  const user = requireUser();
  const folder = {
    id: crypto.randomUUID ? crypto.randomUUID() : `folder_${Date.now()}`,
    title: cleanTitle(title, 'Новая папка'),
    color,
    chatIds: [],
    createdAtMs: Date.now()
  };
  await setDoc(doc(db, 'users', user.uid), {
    folders: arrayUnion(folder),
    lastSeenAt: serverTimestamp()
  }, { merge: true });
  return { ...folder, kind: 'folder' };
}

export async function loginWithEmail({ email, password }) {
  await persistenceReady;
  const credential = await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
  return touchUser(credential.user);
}

export async function registerWithEmail({ username, email, password, passwordRepeat, inviteCode }) {
  await persistenceReady;

  const cleanName = cleanUsername(username);
  const cleanEmail = normalizeEmail(email);
  const code = cleanInviteCode(inviteCode);

  if (!cleanName) throw new Error('USERNAME_REQUIRED');
  if (!cleanEmail) throw new Error('EMAIL_REQUIRED');
  if (!password || password.length < 6) throw new Error('WEAK_PASSWORD');
  if (password !== passwordRepeat) throw new Error('PASSWORD_MISMATCH');
  if (!code) throw new Error('INVITE_REQUIRED');

  const usernameRef = doc(db, 'usernames', cleanName);
  const usernameSnap = await getDoc(usernameRef);
  if (usernameSnap.exists()) throw new Error('USERNAME_TAKEN');

  const invite = await findInvite(code);
  if (!invite || !inviteIsUsable(invite.data)) throw new Error('INVITE_INVALID');

  const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
  await updateProfile(credential.user, { displayName: cleanName });

  await setDoc(doc(db, 'users', credential.user.uid), {
    uid: credential.user.uid,
    username: cleanName,
    displayName: cleanName,
    email: cleanEmail,
    role: 'member',
    disabled: false,
    folders: [],
    inviteCode: code,
    createdAt: serverTimestamp(),
    lastSeenAt: serverTimestamp()
  }, { merge: true });

  await setDoc(usernameRef, {
    uid: credential.user.uid,
    username: cleanName,
    createdAt: serverTimestamp()
  }, { merge: true });

  await updateDoc(invite.ref, {
    used: true,
    usedBy: credential.user.uid,
    usedByUsername: cleanName,
    usedAt: serverTimestamp()
  });

  return credential.user;
}

export function watchAuthState(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null);
      return;
    }

    try {
      await persistenceReady;
      callback(await touchUser(user));
    } catch (error) {
      console.warn('[UCMU] auth state rejected:', error);
      callback(null);
    }
  });
}

export function authReady() {
  return true;
}

window.UCMUFirebase = {
  createChatRecord,
  createFolderRecord,
  getCurrentUser: () => auth.currentUser
};
