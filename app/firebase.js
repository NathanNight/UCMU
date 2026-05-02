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
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'PASTE_FIREBASE_API_KEY_HERE',
  authDomain: 'PASTE_FIREBASE_AUTH_DOMAIN_HERE',
  projectId: 'PASTE_FIREBASE_PROJECT_ID_HERE',
  storageBucket: 'PASTE_FIREBASE_STORAGE_BUCKET_HERE',
  messagingSenderId: 'PASTE_FIREBASE_MESSAGING_SENDER_ID_HERE',
  appId: 'PASTE_FIREBASE_APP_ID_HERE'
};

function isFirebaseConfigured() {
  return !Object.values(firebaseConfig).some((value) => String(value).startsWith('PASTE_'));
}

const app = isFirebaseConfigured() ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function cleanUsername(username) {
  return String(username || '').trim().replace(/^@+/, '').toLowerCase();
}

function requireConfigured() {
  if (!app || !auth || !db) {
    throw new Error('FIREBASE_NOT_CONFIGURED');
  }
}

export async function loginWithEmail({ email, password }) {
  requireConfigured();
  const credential = await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
  const userRef = doc(db, 'users', credential.user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid: credential.user.uid,
      email: credential.user.email,
      username: credential.user.displayName || '',
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    }, { merge: true });
  }

  return credential.user;
}

export async function registerWithEmail({ username, email, password, passwordRepeat, inviteCode }) {
  requireConfigured();

  const cleanName = cleanUsername(username);
  const cleanEmail = normalizeEmail(email);

  if (!cleanName) throw new Error('USERNAME_REQUIRED');
  if (!cleanEmail) throw new Error('EMAIL_REQUIRED');
  if (!password || password.length < 6) throw new Error('WEAK_PASSWORD');
  if (password !== passwordRepeat) throw new Error('PASSWORD_MISMATCH');

  const code = String(inviteCode || '').trim();
  if (code) {
    const inviteRef = doc(db, 'invites', code);
    const inviteSnap = await getDoc(inviteRef);
    if (!inviteSnap.exists()) throw new Error('INVITE_INVALID');
    const invite = inviteSnap.data();
    if (invite.usedBy) throw new Error('INVITE_USED');
  }

  const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
  await updateProfile(credential.user, { displayName: cleanName });

  await setDoc(doc(db, 'users', credential.user.uid), {
    uid: credential.user.uid,
    username: cleanName,
    email: cleanEmail,
    inviteCode: code || null,
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });

  if (code) {
    await setDoc(doc(db, 'invites', code), {
      usedBy: credential.user.uid,
      usedAt: serverTimestamp()
    }, { merge: true });
  }

  return credential.user;
}

export function authReady() {
  return isFirebaseConfigured();
}
