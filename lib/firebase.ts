import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  // Fallback is a valid-format placeholder — real key must be set in .env.local
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'AIzaSyAcigqUwrIetm-h-0B2AURJlAq_UEDT6Yg',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'void-builder-14923.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'void-builder-14923',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'void-builder-14923.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '1092986292860',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '1:1092986292860:web:4e4937eae4a102856717f9',
};

// Lazy singletons — safe to call on both server and client
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

function getFirebaseApp(): FirebaseApp {
  if (!_app) _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return _app;
}

export function getFirebaseAuth(): Auth {
  if (!_auth) _auth = getAuth(getFirebaseApp());
  return _auth;
}

export function getFirebaseDb(): Firestore {
  if (!_db) _db = getFirestore(getFirebaseApp());
  return _db;
}

// Proxies so existing code using `auth` and `db` directly still works
export const auth = new Proxy({} as Auth, {
  get(_, prop: string) {
    return (getFirebaseAuth() as any)[prop];
  },
});

export const db = new Proxy({} as Firestore, {
  get(_, prop: string) {
    return (getFirebaseDb() as any)[prop];
  },
});
