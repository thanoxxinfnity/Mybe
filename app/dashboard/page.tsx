'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Header } from '@/components/header';
import { ModelCard } from '@/components/model-card';
import { Button } from '@/components/ui/button';
import { fetchCreditsFromAPI, getUserModels } from '@/lib/firestore-helpers';
import { ModelMetadata } from '@/lib/schemas';
import {
  Coins, Sparkles, LayoutDashboard, Box, AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState(0);
  const [models, setModels] = useState<ModelMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const [c, m] = await Promise.all([fetchCreditsFromAPI(() => u.getIdToken()), getUserModels(u.uid)]);
        setCredits(c);
        setModels(m);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header user={null} />
        <div className="flex items-center justify-center h-96">
          <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header user={null} />
        <main className="max-w-lg mx-auto px-4 py-20 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Sign in to view dashboard</h1>
          <Link href="/"><Button>Sign in with Google</Button></Link>
        </main>
      </div>
    );
  }

  const completed = models.filter((m) => m.status === 'completed');
  const processing = models.filter((m) => m.status === 'processing');
  const failed = models.filter((m) => m.status === 'failed');

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} credits={credits} onUserChange={setUser} />

      <main className="max-w-7xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-3">
              <LayoutDashboard className="w-7 h-7 text-violet-500" />
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, {user.displayName?.split(' ')[0] || 'there'}!
            </p>
          </div>
          <Link href="/generate">
            <Button className="gap-2 bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 border-0 text-white">
              <Sparkles className="w-4 h-4" />
              New Model
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          <div className="p-5 rounded-2xl bg-card border border-border/40">
            <div className="flex items-center gap-2 text-violet-500 mb-2">
              <Coins className="w-5 h-5" />
              <span className="text-xs font-semibold uppercase tracking-wide">Credits</span>
            </div>
            <p className="text-3xl font-black">{credits}</p>
            <p className="text-xs text-muted-foreground mt-1">remaining</p>
          </div>
          <div className="p-5 rounded-2xl bg-card border border-border/40">
            <div className="flex items-center gap-2 text-cyan-500 mb-2">
              <Box className="w-5 h-5" />
              <span className="text-xs font-semibold uppercase tracking-wide">Total</span>
            </div>
            <p className="text-3xl font-black">{models.length}</p>
            <p className="text-xs text-muted-foreground mt-1">models generated</p>
          </div>
          <div className="p-5 rounded-2xl bg-card border border-border/40">
            <div className="flex items-center gap-2 text-green-500 mb-2">
              <Sparkles className="w-5 h-5" />
              <span className="text-xs font-semibold uppercase tracking-wide">Completed</span>
            </div>
            <p className="text-3xl font-black">{completed.length}</p>
            <p className="text-xs text-muted-foreground mt-1">ready to view</p>
          </div>
          <div className="p-5 rounded-2xl bg-card border border-border/40">
            <div className="flex items-center gap-2 text-yellow-500 mb-2">
              <div className="w-4 h-4 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin" />
              <span className="text-xs font-semibold uppercase tracking-wide">Processing</span>
            </div>
            <p className="text-3xl font-black">{processing.length}</p>
            <p className="text-xs text-muted-foreground mt-1">in progress</p>
          </div>
        </div>

        {/* Models grid */}
        {models.length === 0 ? (
          <div className="text-center py-20">
            <Sparkles className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No models yet</h3>
            <p className="text-muted-foreground mb-6 text-sm">
              Generate your first 3D model — you have {credits} credits!
            </p>
            <Link href="/generate">
              <Button className="gap-2 bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 border-0 text-white">
                <Sparkles className="w-4 h-4" /> Generate First Model
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-4">Your Models</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {models.map((model) => (
                <ModelCard
                  key={model.id}
                  id={model.id}
                  name={model.name}
                  prompt={model.prompt}
                  format={model.format}
                  thumbnailUrl={model.thumbnailUrl}
                  views={model.views}
                  downloads={model.downloads}
                  createdAt={model.createdAt.toISOString()}
                  status={model.status}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
