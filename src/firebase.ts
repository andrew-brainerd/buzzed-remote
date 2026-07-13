import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  indexedDBLocalPersistence,
  inMemoryPersistence,
  initializeAuth
} from 'firebase/auth';

// Public Firebase web config (project: brainerd-fam) — shared with next-portfolio. Values come from
// .env (see .env.example); these client keys are safe to ship in the app bundle.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const firebaseApp = initializeApp(firebaseConfig);

// Use initializeAuth (not getAuth) with explicit persistence and no popup/redirect resolver. Inside a
// WKWebView (Tauri iOS), getAuth's default init can hang on persistence/resolver setup; this tries
// IndexedDB → localStorage → memory and skips the auth-domain iframe entirely.
export const firebaseAuth = initializeAuth(firebaseApp, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence]
});
