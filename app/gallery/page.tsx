'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Header } from '@/components/header';
import { ModelCard } from '@/components/model-card';
import { Button } from '@/components/ui/button';
import { fetchCreditsFromAPI } from '@/lib/firestore-helpers';
import { Globe, Search, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface GalleryModel {
  id: string;
  name: string;
  prompt: string;
  format: string;
  thumbnailUrl?: string | null;
  userName?: string;
  userAvatar?: string | null;
  views: number;
  downloads: number;
  createdAt: string;
}

export default function GalleryPage() {
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState<number | undefined>();
  const [models, setModels] = useState<GalleryModel[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const c = await fetchCreditsFromAPI(() => u.getIdToken());
        setCredits(c);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/models?limit=48');
      const data = await res.json();
      setModels(data.models || []);
    } catch {
      setModels([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = search.trim()
    ? models.filter(
        (m) =>
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          m.prompt.toLowerCase().includes(search.toLowerCase())
      )
    : models;

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} credits={credits} onUserChange={setUser} />

      <main className="max-w-7xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-3">
              <Globe className="w-7 h-7 text-violet-500" />
              Community Gallery
            </h1>
            <p className="text-muted-foreground mt-1">
              All AI-generated 3D models from the community
            </p>
          </div>
          <Link href="/generate">
            <Button className="gap-2 bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 border-0 text-white">
              <Sparkles className="w-4 h-4" />
              Generate Yours
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative mb-8 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search models..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-violet-500/40 text-sm"
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-card border border-border/40 overflow-hidden animate-pulse">
                <div className="aspect-square bg-muted" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <Globe className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {search ? 'No models found' : 'Gallery is empty'}
            </h3>
            <p className="text-muted-foreground mb-6 text-sm">
              {search ? 'Try a different search term.' : 'Be the first to generate a 3D model!'}
            </p>
            <Link href="/generate">
              <Button className="gap-2 bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 border-0 text-white">
                <Sparkles className="w-4 h-4" />
                Generate First Model
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {filtered.length} model{filtered.length !== 1 ? 's' : ''}
              {search && ` matching "${search}"`}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filtered.map((model) => (
                <ModelCard key={model.id} {...model} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
