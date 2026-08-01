'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { checkRedirectResult } from '@/lib/auth-helper';

// Included in root layout — runs on every page to complete Google redirect sign-in
export function AuthRedirectHandler() {
  const router = useRouter();

  useEffect(() => {
    // Process pending Google redirect result (must be called after every signInWithRedirect)
    checkRedirectResult().then((user) => {
      if (user) {
        // User just signed in via redirect — send to dashboard
        router.replace('/dashboard');
      }
    });

    // If already signed in and on home page, redirect to dashboard
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user && window.location.pathname === '/') {
        router.replace('/dashboard');
      }
    });
    return unsub;
  }, []);

  return null;
}
