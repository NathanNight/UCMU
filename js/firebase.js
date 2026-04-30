import {firebaseConfig, firebaseConfigReady} from './firebaseConfig.js';
import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth,
  browserLocalPersistence,
  setPersistence
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  getFirestore,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {getStorage} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';

let app = null;
let auth = null;
let db = null;
let storage = null;

export function isFirebaseReady(){
  return !!firebaseConfigReady;
}

export async function getFirebase(){
  if(!isFirebaseReady()){
    throw new Error('Firebase не настроен: заполни js/firebaseConfig.js и поставь firebaseConfigReady = true');
  }
  if(!app){
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    await setPersistence(auth, browserLocalPersistence);
    db = getFirestore(app);
    storage = getStorage(app);
  }
  return {app, auth, db, storage, serverTimestamp};
}

export {serverTimestamp};
