import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

export const firebaseConfig = {
  apiKey:'AIzaSyD4d15nd3HJDJCMoi99yjxsBrGWNQ999Y8',
  authDomain:'ucmu-63f74.firebaseapp.com',
  projectId:'ucmu-63f74',
  storageBucket:'ucmu-63f74.firebasestorage.app',
  messagingSenderId:'475838060478',
  appId:'1:475838060478:web:af492a673cbffb9e304bef',
  measurementId:'G-3M5EFPS2RE'
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
