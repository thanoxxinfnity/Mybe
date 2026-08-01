'use client';

import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from './firebase';
import { getUserProfile, createUserProfile } from './firestore-helpers';

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<User | null> {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;

  // Create profile with 100 credits if first time
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
  } catch (error) {
    console.warn('Firestore profile creation failed:', error);
  }

  return user;
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
