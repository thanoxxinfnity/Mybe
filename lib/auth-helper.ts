'use client';

import {
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from './firebase';
import { getUserProfile, createUserProfile } from './firestore-helpers';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initiates redirect flow — works on all browsers including mobile
export async function signInWithGoogle(): Promise<void> {
  await signInWithRedirect(auth, googleProvider);
}

// Call on page load to complete the redirect sign-in
export async function checkRedirectResult(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    if (!result?.user) return null;

    const user = result.user;
    try {
      const existing = await getUserProfile(user.uid);
      if (!existing) {
        await createUserProfile({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        });
      }
    } catch (err) {
      console.warn('Profile creation failed:', err);
    }
    return user;
  } catch (err: any) {
    console.error('Redirect result error:', err?.code, err?.message);
    return null;
  }
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export function getCurrentUser(): Promise<User | null> {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user);
    });
  });
}
