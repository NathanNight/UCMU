import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyD4d15nd3HJDJCMoi99yjxsBrGWNQ999Y8',
  authDomain: 'ucmu-63f74.firebaseapp.com',
  projectId: 'ucmu-63f74',
  storageBucket: 'ucmu-63f74.firebasestorage.app',
  messagingSenderId: '475838060478',
  appId: '1:475838060478:web:af492a673cbffb9e304bef',
  measurementId: 'G-3M5EFPS2RE'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function cleanUsername(username) {
  return String(username || '').trim().replace(/^@+/, '').toLowerCase();
}

function cleanInviteCode(inviteCode) {
  return String(inviteCode || '').trim();
}

function inviteIsUsable(invite) {
  if (!invite) return false;
  if (invite.disabled === true) return false;
  if (invite.usedBy) return false;
  if (invite.used === true) return false;
  return true;
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

export async function loginWithEmail({ email, password }) {
  const credential = await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
  const userRef = doc(db, 'users', credential.user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid: credential.user.uid,
      email: credential.user.email,
      username: cleanUsername(credential.user.displayName || ''),
      displayName: credential.user.displayName || '',
      role: 'member',
      disabled: false,
      createdAt: serverTimestamp(),
      lastSeenAt: serverTimestamp()
    }, { merge: true });
  } else {
    const data = userSnap.data();
    if (data.disabled === true) throw new Error('USER_DISABLED');
    await setDoc(userRef, { lastSeenAt: serverTimestamp() }, { merge: true });
  }

  return credential.user;
}

export async function registerWithEmail({ username, email, password, passwordRepeat, inviteCode }) {
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

export function authReady() {
  return true;
}
