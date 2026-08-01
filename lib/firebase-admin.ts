import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';

let _adminApp: App | null = null;
let _adminDb: Firestore | null = null;
let _adminAuth: Auth | null = null;

function getAdminApp(): App {
  if (_adminApp) return _adminApp;
  if (getApps().length > 0) {
    _adminApp = getApps()[0];
    return _adminApp;
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId) throw new Error('NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set');

  if (clientEmail && privateKey) {
    _adminApp = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  } else {
    _adminApp = initializeApp({ projectId });
  }

  return _adminApp;
}

function getAdminDb(): Firestore {
  if (!_adminDb) _adminDb = getFirestore(getAdminApp());
  return _adminDb;
}

function getAdminAuth(): Auth {
  if (!_adminAuth) _adminAuth = getAuth(getAdminApp());
  return _adminAuth;
}

// Lazy proxies — Firebase Admin initializes only on first real API call, not at build time
export const adminDb = new Proxy({} as Firestore, {
  get(_, prop: string) {
    return (getAdminDb() as any)[prop];
  },
});

export const adminAuth = new Proxy({} as Auth, {
  get(_, prop: string) {
    return (getAdminAuth() as any)[prop];
  },
});
