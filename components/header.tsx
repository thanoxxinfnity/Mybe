'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { User } from 'firebase/auth';
import { signInWithGoogle, signOutUser } from '@/lib/auth-helper';
import { Button } from '@/components/ui/button';
import { Sparkles, Coins, LogOut, Menu, X, LayoutDashboard } from 'lucide-react';

interface HeaderProps {
  user: User | null;
  credits?: number;
  onUserChange?: (user: User | null) => void;
}

export function Header({ user, credits, onUserChange }: HeaderProps) {
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignIn = async () => {
    try {
      setLoading(true);
      const u = await signInWithGoogle();
      onUserChange?.(u);
    } catch (e) {
      console.error('Sign in failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await signOutUser();
      onUserChange?.(null);
      setMenuOpen(false);
    } catch (e) {
      console.error('Sign out failed:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-white font-bold text-lg group-hover:scale-110 transition-transform">
              M
            </div>
            <span className="font-bold text-xl hidden sm:inline bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-transparent">
              Mybe
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/gallery" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Gallery
            </Link>
            <Link href="/generate" className="flex items-center gap-1.5 text-sm font-medium hover:text-violet-600 transition-colors">
              <Sparkles className="w-4 h-4" />
              Generate
            </Link>
            {user && (
              <Link href="/dashboard" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* Credits badge */}
                {credits !== undefined && (
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20">
                    <Coins className="w-4 h-4 text-violet-500" />
                    <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">
                      {credits} credits
                    </span>
                  </div>
                )}

                <Link href="/generate" className="hidden sm:block">
                  <Button size="sm" className="gap-1.5 bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 border-0">
                    <Sparkles className="w-4 h-4" />
                    Generate
                  </Button>
                </Link>

                {/* Avatar + sign out */}
                <div className="flex items-center gap-2 pl-3 border-l border-border">
                  <img
                    src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.displayName}`}
                    alt={user.displayName || 'User'}
                    className="w-8 h-8 rounded-full ring-2 ring-border"
                  />
                  <button
                    onClick={handleSignOut}
                    disabled={loading}
                    className="hidden sm:inline p-1 text-muted-foreground hover:text-destructive transition-colors"
                    title="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <Button onClick={handleSignIn} disabled={loading} size="sm" className="bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 border-0">
                {loading ? 'Signing in...' : 'Sign in with Google'}
              </Button>
            )}

            {/* Mobile menu */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 hover:bg-accent rounded-lg transition-colors"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <div className="md:hidden border-t border-border pb-4 pt-2">
            <nav className="flex flex-col gap-1">
              <Link href="/gallery" onClick={() => setMenuOpen(false)}
                className="px-3 py-2 text-sm font-medium hover:bg-accent rounded-lg transition-colors">
                Gallery
              </Link>
              <Link href="/generate" onClick={() => setMenuOpen(false)}
                className="px-3 py-2 text-sm font-medium hover:bg-accent rounded-lg transition-colors flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Generate
              </Link>
              {user && (
                <>
                  <Link href="/dashboard" onClick={() => setMenuOpen(false)}
                    className="px-3 py-2 text-sm font-medium hover:bg-accent rounded-lg transition-colors">
                    Dashboard
                  </Link>
                  {credits !== undefined && (
                    <div className="px-3 py-2 flex items-center gap-2 text-sm font-medium text-violet-600">
                      <Coins className="w-4 h-4" />
                      {credits} credits remaining
                    </div>
                  )}
                  <button onClick={handleSignOut} disabled={loading}
                    className="px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg text-left transition-colors">
                    Sign Out
                  </button>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
