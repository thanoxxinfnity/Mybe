'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, use } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Header } from '@/components/header';
import { ModelViewer } from '@/components/model-viewer';
import { Button } from '@/components/ui/button';
import { getUserCredits } from '@/lib/firestore-helpers';
import {
  Download, Eye, Calendar, User as UserIcon, ArrowLeft,
  Sparkles, AlertCircle, Clock,
} from 'lucide-react';
import Link from 'next/link';
import { timeAgo } from '@/lib/utils';

interface ModelData {
  id: string;
  name: string;
  prompt: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  format: string;
  modelUrl: string;
  thumbnailUrl?: string;
  status: string;
  views: number;
  downloads: number;
  createdAt: string;
}

export default function ModelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState<number | undefined>();
  const [model, setModel] = useState<ModelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const c = await getUserCredits(u.uid);
        setCredits(c);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    fetch(`/api/model/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setModel(data.model);
      })
      .catch(() => setError('Failed to load model'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDownload = async () => {
    if (!model?.modelUrl) return;
    setDownloading(true);
    try {
      const res = await fetch(model.modelUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${model.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${model.format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Download failed');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header user={user} credits={credits} />
        <div className="flex items-center justify-center h-96">
          <div className="w-10 h-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !model) {
    return (
      <div className="min-h-screen bg-background">
        <Header user={user} credits={credits} />
        <main className="max-w-2xl mx-auto px-4 py-20 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Model not found</h1>
          <p className="text-muted-foreground mb-6">{error || 'This model does not exist.'}</p>
          <Link href="/gallery"><Button variant="outline">Back to Gallery</Button></Link>
        </main>
      </div>
    );
  }

  if (model.status === 'processing') {
    return (
      <div className="min-h-screen bg-background">
        <Header user={user} credits={credits} />
        <main className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 rounded-full border-2 border-violet-500 border-t-transparent animate-spin mx-auto mb-6" />
          <h1 className="text-xl font-bold mb-2">Model is being generated</h1>
          <p className="text-muted-foreground mb-2 text-sm">NVIDIA TRELLIS is processing your request...</p>
          <p className="text-xs text-muted-foreground mb-6">This takes 2–5 minutes. Refresh to check.</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => window.location.reload()} variant="outline">
              <Clock className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <Link href="/gallery"><Button variant="ghost">Back to Gallery</Button></Link>
          </div>
        </main>
      </div>
    );
  }

  if (model.status === 'failed') {
    return (
      <div className="min-h-screen bg-background">
        <Header user={user} credits={credits} />
        <main className="max-w-2xl mx-auto px-4 py-20 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Generation Failed</h1>
          <p className="text-muted-foreground mb-6">Your credit was refunded.</p>
          <Link href="/generate"><Button className="gap-2 bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 border-0 text-white">
            <Sparkles className="w-4 h-4" /> Try Again
          </Button></Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} credits={credits} onUserChange={setUser} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Back */}
        <Link href="/gallery" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Gallery
        </Link>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* 3D Viewer */}
          <div className="lg:col-span-3">
            <div className="h-[500px] lg:h-[600px] rounded-2xl overflow-hidden shadow-2xl">
              <ModelViewer modelUrl={model.modelUrl} autoRotate />
            </div>
          </div>

          {/* Info Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title & Format */}
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <h1 className="text-2xl font-extrabold leading-tight">{model.name}</h1>
                <span className="px-3 py-1 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-bold uppercase flex-shrink-0">
                  {model.format}
                </span>
              </div>

              {/* Author */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {model.userAvatar ? (
                  <img src={model.userAvatar} alt={model.userName} className="w-6 h-6 rounded-full" />
                ) : (
                  <UserIcon className="w-4 h-4" />
                )}
                <span>{model.userName}</span>
                <span>·</span>
                <Calendar className="w-3.5 h-3.5" />
                <span>{timeAgo(model.createdAt)}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-card border border-border/40">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Eye className="w-4 h-4" />
                  <span className="text-xs font-medium">Views</span>
                </div>
                <p className="text-2xl font-bold">{model.views.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-xl bg-card border border-border/40">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Download className="w-4 h-4" />
                  <span className="text-xs font-medium">Downloads</span>
                </div>
                <p className="text-2xl font-bold">{model.downloads.toLocaleString()}</p>
              </div>
            </div>

            {/* Prompt */}
            <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/20">
              <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Generation Prompt
              </p>
              <p className="text-sm text-foreground/80 leading-relaxed">{model.prompt}</p>
            </div>

            {/* Download */}
            <Button
              onClick={handleDownload}
              disabled={downloading || !model.modelUrl}
              size="lg"
              className="w-full gap-2 bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 border-0 text-white"
            >
              {downloading ? (
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              {downloading ? 'Downloading...' : `Download ${model.format.toUpperCase()}`}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Generated by NVIDIA TRELLIS AI · Powered by Mybe
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
