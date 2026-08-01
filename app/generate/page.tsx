'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { getUserCredits } from '@/lib/firestore-helpers';
import {
  Sparkles, Coins, AlertCircle, CheckCircle2, Clock, Zap, Info,
} from 'lucide-react';
import Link from 'next/link';

type GenStatus = 'idle' | 'generating' | 'completed' | 'failed';

const EXAMPLE_PROMPTS = [
  'A sleek futuristic sports car with glowing neon blue underglow, carbon fiber details',
  'A medieval castle with tall stone towers, a moat, and dramatic lighting',
  'A cute robot companion with round eyes, metallic blue body, and friendly expression',
  'An ancient dragon perched on a cliff, wings spread, scales with iridescent sheen',
  'A Japanese pagoda surrounded by cherry blossom trees at golden hour',
  'A sci-fi space station with solar panels and docking ports, orbiting Earth',
];

export default function GeneratePage() {
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const [prompt, setPrompt] = useState('');
  const [genStatus, setGenStatus] = useState<GenStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [completedModelId, setCompletedModelId] = useState('');
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        const c = await getUserCredits(u.uid);
        setCredits(c);
      }
    });
    return unsub;
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !prompt.trim() || genStatus === 'generating') return;

    setGenStatus('generating');
    setErrorMsg('');
    setCompletedModelId('');
    setProgress(5);
    setProgressLabel('Getting your token...');

    try {
      const token = await user.getIdToken();

      setProgress(10);
      setProgressLabel('Submitting to NVIDIA AI...');

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      setProgress(20);
      setProgressLabel('Generating image from your prompt...');

      // Simulate progress while server processes
      const progressInterval = setInterval(() => {
        setProgress((p) => {
          if (p >= 90) return p;
          const increment = p < 50 ? 3 : p < 75 ? 1.5 : 0.5;
          return Math.min(p + increment, 90);
        });
        setProgressLabel((prev) => {
          const stages = [
            'Generating image from your prompt...',
            'Enhancing image quality...',
            'Submitting to NVIDIA TRELLIS...',
            'Processing 3D structure...',
            'Generating textures...',
            'Finalizing 3D model...',
            'Uploading to storage...',
          ];
          const idx = stages.indexOf(prev);
          return stages[Math.min(idx + 1, stages.length - 1)];
        });
      }, 15000);

      const data = await res.json();
      clearInterval(progressInterval);

      if (!res.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      setProgress(100);
      setProgressLabel('Done!');
      setGenStatus('completed');
      setCompletedModelId(data.modelId);

      // Refresh credits
      const newCredits = await getUserCredits(user.uid);
      setCredits(newCredits);
    } catch (err) {
      setGenStatus('failed');
      setErrorMsg(err instanceof Error ? err.message : 'Generation failed');
      // Refresh credits (credit may have been refunded)
      if (user) {
        const c = await getUserCredits(user.uid);
        setCredits(c);
      }
    }
  };

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
          <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-violet-500" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Sign in to Generate</h1>
          <p className="text-muted-foreground mb-8">
            Create a free account and get 100 credits instantly — no credit card needed.
          </p>
          <Link href="/">
            <Button size="lg" className="bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 border-0 text-white">
              Sign in with Google
            </Button>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} credits={credits} onUserChange={setUser} />

      <main className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">
            Generate 3D Model
          </h1>
          <p className="text-muted-foreground">
            Describe your model in detail — NVIDIA TRELLIS will create it at maximum quality.
          </p>
        </div>

        {/* Credits display */}
        <div className={`flex items-center gap-3 p-4 rounded-xl mb-8 border ${
          credits === 0
            ? 'bg-red-500/10 border-red-500/20'
            : credits <= 10
            ? 'bg-yellow-500/10 border-yellow-500/20'
            : 'bg-violet-500/10 border-violet-500/20'
        }`}>
          <Coins className={`w-5 h-5 ${credits === 0 ? 'text-red-500' : credits <= 10 ? 'text-yellow-500' : 'text-violet-500'}`} />
          <div className="flex-1">
            <p className={`font-semibold ${credits === 0 ? 'text-red-600 dark:text-red-400' : credits <= 10 ? 'text-yellow-600 dark:text-yellow-400' : 'text-violet-600 dark:text-violet-400'}`}>
              {credits} credits remaining
            </p>
            <p className="text-xs text-muted-foreground">1 credit = 1 high-quality 3D model</p>
          </div>
          {credits === 0 && (
            <span className="text-xs text-red-500 font-medium">No credits left</span>
          )}
        </div>

        {/* Generation form */}
        <form onSubmit={handleGenerate} className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold">Describe your 3D model</label>
              <span className="text-xs text-muted-foreground">{prompt.length} / 1000</span>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, 1000))}
              placeholder="E.g. A futuristic motorcycle with glowing blue neon lights, chrome finish, floating above the ground..."
              rows={5}
              disabled={genStatus === 'generating'}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none transition-all placeholder:text-muted-foreground/50"
            />
          </div>

          {/* Example prompts */}
          {genStatus === 'idle' && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Info className="w-3 h-3" /> Try an example:
              </p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_PROMPTS.slice(0, 3).map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setPrompt(ex)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-border/60 hover:border-violet-500/40 hover:bg-violet-500/5 transition-all text-left truncate max-w-[280px]"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Progress */}
          {genStatus === 'generating' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-violet-600 dark:text-violet-400 font-medium">
                  <Clock className="w-4 h-4 animate-pulse" />
                  {progressLabel}
                </span>
                <span className="text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-600 to-cyan-500 rounded-full transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                This takes 2–5 minutes. Please keep this tab open.
              </p>
            </div>
          )}

          {/* Success */}
          {genStatus === 'completed' && completedModelId && (
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-green-600 dark:text-green-400">3D model generated!</p>
                <p className="text-xs text-muted-foreground mt-0.5">Your model is now live in the gallery.</p>
                <div className="flex gap-2 mt-3">
                  <Link href={`/model/${completedModelId}`}>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white border-0 gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> View Model
                    </Button>
                  </Link>
                  <Button size="sm" variant="outline" onClick={() => {
                    setGenStatus('idle');
                    setPrompt('');
                    setCompletedModelId('');
                  }}>
                    Generate Another
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {genStatus === 'failed' && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-red-600 dark:text-red-400">Generation failed</p>
                <p className="text-xs text-muted-foreground mt-0.5">{errorMsg}</p>
                <p className="text-xs text-muted-foreground mt-1">Your credit has been refunded.</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => setGenStatus('idle')}>
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* Submit */}
          {genStatus !== 'completed' && (
            <Button
              type="submit"
              size="lg"
              disabled={!prompt.trim() || genStatus === 'generating' || credits === 0}
              className="w-full gap-2 bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 border-0 text-white disabled:opacity-50"
            >
              {genStatus === 'generating' ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Generating...
                </>
              ) : credits === 0 ? (
                <>
                  <Coins className="w-5 h-5" />
                  No Credits Remaining
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate 3D Model
                  <span className="text-xs opacity-75">(1 credit)</span>
                </>
              )}
            </Button>
          )}
        </form>

        {/* Info box */}
        <div className="mt-10 p-5 rounded-xl border border-border/40 bg-card/50">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-violet-500" />
            Tips for best results
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Be specific about materials: &quot;brushed steel&quot;, &quot;worn leather&quot;, &quot;polished marble&quot;</li>
            <li>• Mention lighting: &quot;studio lighting&quot;, &quot;golden hour glow&quot;, &quot;neon lit&quot;</li>
            <li>• Describe the shape clearly: &quot;rounded edges&quot;, &quot;sharp angles&quot;, &quot;organic form&quot;</li>
            <li>• Include context: &quot;on a white pedestal&quot;, &quot;floating in space&quot;</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
