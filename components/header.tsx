'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User } from 'firebase/auth';
import { signInWithEmail, signUpWithEmail, resetPassword, signOutUser } from '@/lib/auth-helper';
import { Button } from '@/components/ui/button';
import { Sparkles, Coins, LogOut, Menu, X, LayoutDashboard, Mail, Lock, User as UserIcon, Eye, EyeOff } from 'lucide-react';

interface HeaderProps {
  user: User | null;
  credits?: number;
  onUserChange?: (user: User | null) => void;
}

type AuthMode = 'signin' | 'signup' | 'reset';

export function Header({ user, credits, onUserChange }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const router = useRouter();

  const openAuth = (mode: AuthMode = 'signin') => {
    setAuthMode(mode);
    setError('');
    setResetSent(false);
    setAuthOpen(true);
  };

  const closeAuth = () => {
    setAuthOpen(false);
    setEmail('');
    setPassword('');
    setName('');
    setError('');
    setResetSent(false);
  };

  const friendlyError = (code: string) => {
    if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential')
      return 'Invalid email or password.';
    if (code === 'auth/email-already-in-use') return 'Email already registered. Sign in instead.';
    if (code === 'auth/weak-password') return 'Password must be at least 6 characters.';
    if (code === 'auth/invalid-email') return 'Please enter a valid email.';
    if (code === 'auth/too-many-requests') return 'Too many attempts. Try again later.';
    return 'Something went wrong. Try again.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (authMode === 'reset') {
        await resetPassword(email);
        setResetSent(true);
        setLoading(false);
        return;
      }
      const u = authMode === 'signup'
        ? await signUpWithEmail(email, password, name || email.split('@')[0])
        : await signInWithEmail(email, password);
      onUserChange?.(u);
      closeAuth();
      router.push('/dashboard');
    } catch (e: any) {
      setError(friendlyError(e?.code || ''));
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      onUserChange?.(null);
      setMenuOpen(false);
      router.push('/');
    } catch (e) {
      console.error('Sign out failed:', e);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-white font-bold text-lg group-hover:scale-110 transition-transform">
                X
              </div>
              <span className="font-bold text-xl hidden sm:inline bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-transparent">
                X Protocol
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
                  <div className="flex items-center gap-2 pl-3 border-l border-border">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-white text-sm font-bold">
                      {(user.displayName || user.email || 'U')[0].toUpperCase()}
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="hidden sm:inline p-1 text-muted-foreground hover:text-destructive transition-colors"
                      title="Sign out"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Button onClick={() => openAuth('signin')} size="sm" variant="outline">
                    Sign In
                  </Button>
                  <Button onClick={() => openAuth('signup')} size="sm" className="bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 border-0 text-white">
                    Sign Up Free
                  </Button>
                </div>
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
                {user ? (
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
                    <button onClick={handleSignOut}
                      className="px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg text-left transition-colors">
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setMenuOpen(false); openAuth('signin'); }}
                      className="px-3 py-2 text-sm font-medium hover:bg-accent rounded-lg text-left transition-colors">
                      Sign In
                    </button>
                    <button onClick={() => { setMenuOpen(false); openAuth('signup'); }}
                      className="px-3 py-2 text-sm font-medium text-violet-600 hover:bg-violet-500/10 rounded-lg text-left transition-colors">
                      Sign Up Free
                    </button>
                  </>
                )}
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Auth Modal */}
      {authOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeAuth} />
          <div className="relative w-full max-w-sm bg-background border border-border rounded-2xl shadow-2xl p-6">
            <button onClick={closeAuth} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-white font-bold text-lg mb-3">X</div>
              <h2 className="text-xl font-bold">
                {authMode === 'signin' ? 'Welcome back' : authMode === 'signup' ? 'Create account' : 'Reset password'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {authMode === 'signup' ? 'Get 100 free credits instantly' : authMode === 'reset' ? 'We\'ll email you a reset link' : 'Sign in to continue'}
              </p>
            </div>

            {resetSent ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                  <Mail className="w-6 h-6 text-green-500" />
                </div>
                <p className="font-semibold">Check your email</p>
                <p className="text-sm text-muted-foreground mt-1">Password reset link sent to {email}</p>
                <Button className="mt-4 w-full" variant="outline" onClick={() => { setAuthMode('signin'); setResetSent(false); }}>
                  Back to Sign In
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {authMode === 'signup' && (
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-violet-500/50 text-sm"
                    />
                  </div>
                )}

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-violet-500/50 text-sm"
                  />
                </div>

                {authMode !== 'reset' && (
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      placeholder="Password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-violet-500/50 text-sm"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                )}

                {error && <p className="text-sm text-red-500">{error}</p>}

                <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 border-0 text-white">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Please wait...
                    </span>
                  ) : authMode === 'signin' ? 'Sign In' : authMode === 'signup' ? 'Create Account' : 'Send Reset Link'}
                </Button>

                <div className="text-center text-sm text-muted-foreground space-y-1">
                  {authMode === 'signin' && (
                    <>
                      <p>
                        No account?{' '}
                        <button type="button" onClick={() => { setAuthMode('signup'); setError(''); }} className="text-violet-600 hover:underline font-medium">
                          Sign up free
                        </button>
                      </p>
                      <p>
                        <button type="button" onClick={() => { setAuthMode('reset'); setError(''); }} className="text-muted-foreground hover:text-foreground hover:underline text-xs">
                          Forgot password?
                        </button>
                      </p>
                    </>
                  )}
                  {authMode === 'signup' && (
                    <p>
                      Already have an account?{' '}
                      <button type="button" onClick={() => { setAuthMode('signin'); setError(''); }} className="text-violet-600 hover:underline font-medium">
                        Sign in
                      </button>
                    </p>
                  )}
                  {authMode === 'reset' && (
                    <button type="button" onClick={() => { setAuthMode('signin'); setError(''); }} className="text-violet-600 hover:underline font-medium">
                      Back to Sign In
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
