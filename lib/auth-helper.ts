'use client';

import {
  signInWithPopup,
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

async function ensureUserProfile(user: User): Promise<void> {
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
}

// Popup-based sign-in — stays on the same page, works on all browsers
export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await ensureUserProfile(result.user);
    return result.user;
  } catch (err: any) {
    // If popup is blocked, fall back to redirect
    if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
      await signInWithRedirect(auth, googleProvider);
      // Will complete via checkRedirectResult on next page load
      return null as any;
    }
    throw err;
  }
}

// Fallback: call on page load to complete any pending redirect sign-in
export async function checkRedirectResult(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    if (!result?.user) return null;
    await ensureUserProfile(result.user);
    return result.user;
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
