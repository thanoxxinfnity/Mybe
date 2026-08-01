'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { fetchCreditsFromAPI } from '@/lib/firestore-helpers';
import {
  Sparkles, Coins, AlertCircle, CheckCircle2, Clock, Zap, Info,
} from 'lucide-react';
import Link from 'next/link';

type GenStatus = 'idle' | 'generating' | 'completed' | 'failed';

const EXAMPLES = [
  'A sleek futuristic sports car with glowing neon blue underglow, chrome details, studio lighting',
  'A medieval stone castle with tall towers, a drawbridge, moat, and dramatic stormy sky',
  'A cute robot companion with round glowing eyes, metallic blue body, and antenna',
  'An ancient dragon perched on a rocky cliff, wings spread, iridescent scales',
  'A Japanese pagoda surrounded by cherry blossom trees, golden hour light',
  'A sci-fi space station with solar panels and docking bays, orbiting Earth',
];

const STAGES = [
  { label: 'Starting generation...', pct: 5 },
  { label: 'Creating image from your prompt...', pct: 20 },
  { label: 'Enhancing image quality...', pct: 35 },
  { label: 'Converting to 3D...', pct: 50 },
  { label: 'Building 3D structure...', pct: 62 },
  { label: 'Generating high-res textures...', pct: 74 },
  { label: 'Finalizing 3D mesh...', pct: 84 },
  { label: 'Saving your model...', pct: 93 },
  { label: 'Almost done...', pct: 97 },
];

export default function GeneratePage() {
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);

  const [prompt, setPrompt] = useState('');
  const [genStatus, setGenStatus] = useState<GenStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [completedModelId, setCompletedModelId] = useState('');
  const [progress, setProgress] = useState(0);
  const [stageLabel, setStageLabel] = useState('');

  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const stageRef = useRef(0);
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      if (u) setCredits(await fetchCreditsFromAPI(() => u.getIdToken()));
    });
    return unsub;
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, []);

  const startProgressAnimation = () => {
    stageRef.current = 0;
    setProgress(STAGES[0].pct);
    setStageLabel(STAGES[0].label);
    progressRef.current = setInterval(() => {
      stageRef.current = Math.min(stageRef.current + 1, STAGES.length - 1);
      setProgress(STAGES[stageRef.current].pct);
      setStageLabel(STAGES[stageRef.current].label);
    }, 18000); // advance stage every 18s
  };

  const stopProgress = (final = 100) => {
    if (progressRef.current) clearInterval(progressRef.current);
    setProgress(final);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !prompt.trim() || genStatus === 'generating') return;

    setGenStatus('generating');
    setErrorMsg('');
    setCompletedModelId('');
    startProgressAnimation();

    try {
      const token = await user.getIdToken();

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start generation');

      const modelId: string = data.modelId;

      // Poll for status every 6 seconds
      pollRef.current = setInterval(async () => {
        try {
          const freshToken = await user.getIdToken();
          const statusRes = await fetch(`/api/generate?id=${modelId}`, {
            headers: { Authorization: `Bearer ${freshToken}` },
          });
          const statusData = await statusRes.json();

          if (statusData.status === 'completed') {
            if (pollRef.current) clearInterval(pollRef.current);
            stopProgress(100);
            setStageLabel('Done!');
            setGenStatus('completed');
            setCompletedModelId(modelId);
            const newCredits = await fetchCreditsFromAPI(() => user.getIdToken());
            setCredits(newCredits);
          } else if (statusData.status === 'failed') {
            if (pollRef.current) clearInterval(pollRef.current);
            stopProgress(0);
            setGenStatus('failed');
            setErrorMsg(statusData.error || 'Generation failed. Credit refunded.');
            const newCredits = await fetchCreditsFromAPI(() => user.getIdToken());
            setCredits(newCredits);
          }
        } catch {
          // network blip, keep polling
        }
      }, 6000);
    } catch (err) {
      stopProgress(0);
      setGenStatus('failed');
      setErrorMsg(err instanceof Error ? err.message : 'Failed to start generation');
      const newCredits = await fetchCreditsFromAPI(() => user.getIdToken());
      setCredits(newCredits);
    }
  };

  const resetForm = () => {
    setGenStatus('idle');
    setPrompt('');
    setCompletedModelId('');
    setErrorMsg('');
    setProgress(0);
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
            Sign in with Google and get <strong>100 free credits</strong> instantly.
          </p>
          <Link href="/">
            <Button size="lg" className="bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 border-0 text-white">
              Sign Up Free — 100 Credits
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
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">Generate 3D Model</h1>
          <p className="text-muted-foreground">
            Describe your model — X Protocol AI generates it at max quality and saves it to the cloud.
          </p>
        </div>

        {/* Credits */}
        <div className={`flex items-center gap-3 p-4 rounded-xl mb-8 border ${
          credits === 0 ? 'bg-red-500/10 border-red-500/20' :
          credits <= 10 ? 'bg-yellow-500/10 border-yellow-500/20' :
          'bg-violet-500/10 border-violet-500/20'
        }`}>
          <Coins className={`w-5 h-5 ${credits === 0 ? 'text-red-500' : credits <= 10 ? 'text-yellow-500' : 'text-violet-500'}`} />
          <div className="flex-1">
            <p className={`font-semibold ${credits === 0 ? 'text-red-600 dark:text-red-400' : credits <= 10 ? 'text-yellow-600 dark:text-yellow-400' : 'text-violet-600 dark:text-violet-400'}`}>
              {credits} credits remaining
            </p>
            <p className="text-xs text-muted-foreground">1 credit = 1 high-quality 3D model · Failed generations get refunded</p>
          </div>
        </div>

        <form onSubmit={handleGenerate} className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold">Describe your 3D model</label>
              <span className="text-xs text-muted-foreground">{prompt.length}/1000</span>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, 1000))}
              placeholder="E.g. A futuristic motorcycle with glowing blue neon lights, chrome finish, floating above the ground..."
              rows={5}
              disabled={genStatus === 'generating'}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none placeholder:text-muted-foreground/50 disabled:opacity-60"
            />
          </div>

          {/* Example prompts */}
          {genStatus === 'idle' && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Info className="w-3 h-3" /> Try an example:
              </p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.slice(0, 3).map((ex) => (
                  <button key={ex} type="button" onClick={() => setPrompt(ex)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-border/60 hover:border-violet-500/40 hover:bg-violet-500/5 transition-all text-left max-w-[280px] truncate">
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Progress */}
          {genStatus === 'generating' && (
            <div className="space-y-3 p-4 rounded-xl bg-violet-500/5 border border-violet-500/20">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-violet-600 dark:text-violet-400 font-medium">
                  <Clock className="w-4 h-4 animate-pulse" />
                  {stageLabel}
                </span>
                <span className="text-muted-foreground font-mono">{progress}%</span>
              </div>
              <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-600 to-cyan-500 rounded-full transition-all duration-[2000ms]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                ⏱ Takes 2–5 minutes · AI is processing your model · Keep this tab open
              </p>
            </div>
          )}

          {/* Success */}
          {genStatus === 'completed' && completedModelId && (
            <div className="p-5 rounded-xl bg-green-500/10 border border-green-500/20 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-green-600 dark:text-green-400">3D model generated!</p>
                <p className="text-xs text-muted-foreground mt-1">Saved to Vercel Blob · Published to gallery · Download in GLB, OBJ, GLTF, STL</p>
                <div className="flex gap-3 mt-4">
                  <Link href={`/model/${completedModelId}`}>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white border-0 gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> View & Download Model
                    </Button>
                  </Link>
                  <Button size="sm" variant="outline" onClick={resetForm}>Generate Another</Button>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {genStatus === 'failed' && (
            <div className="p-5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-red-600 dark:text-red-400">Generation failed</p>
                <p className="text-xs text-muted-foreground mt-1">{errorMsg}</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">✓ Credit has been refunded automatically.</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={resetForm}>Try Again</Button>
              </div>
            </div>
          )}

          {/* Submit */}
          {genStatus !== 'completed' && (
            <Button type="submit" size="lg"
              disabled={!prompt.trim() || genStatus === 'generating' || credits === 0}
              className="w-full gap-2 bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 border-0 text-white disabled:opacity-50">
              {genStatus === 'generating' ? (
                <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Generating...</>
              ) : credits === 0 ? (
                <><Coins className="w-5 h-5" /> No Credits Left</>
              ) : (
                <><Sparkles className="w-5 h-5" /> Generate 3D Model <span className="text-xs opacity-75">(uses 1 credit)</span></>
              )}
            </Button>
          )}
        </form>

        {/* Tips */}
        <div className="mt-10 p-5 rounded-xl border border-border/40 bg-card/50">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-violet-500" /> Tips for best quality
          </h3>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li>• Mention materials: <em>&quot;brushed steel&quot;</em>, <em>&quot;worn leather&quot;</em>, <em>&quot;polished marble&quot;</em></li>
            <li>• Add lighting: <em>&quot;studio lighting&quot;</em>, <em>&quot;neon lit&quot;</em>, <em>&quot;golden hour&quot;</em></li>
            <li>• Describe shape: <em>&quot;rounded edges&quot;</em>, <em>&quot;sharp angular&quot;</em>, <em>&quot;organic form&quot;</em></li>
            <li>• Output is GLB · Download as GLB, GLTF, OBJ, or STL from the model page</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
