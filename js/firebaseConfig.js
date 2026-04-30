// ВАЖНО: сюда вставляется web config из Firebase Console.
// Сам по себе firebaseConfig не является секретом. Защита держится на Firestore/Storage Rules.
// Но без настроенных rules проект нельзя считать защищённым.

export const firebaseConfig = {
  apiKey: "PASTE_API_KEY_HERE",
  authDomain: "PASTE_PROJECT_ID.firebaseapp.com",
  projectId: "PASTE_PROJECT_ID",
  storageBucket: "PASTE_PROJECT_ID.appspot.com",
  messagingSenderId: "PASTE_SENDER_ID",
  appId: "PASTE_APP_ID"
};

// true только после того, как заменишь все PASTE_* значения на реальные.
export const firebaseConfigReady = false;
