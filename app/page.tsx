'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Sparkles, Zap, Globe, Coins, ArrowRight } from 'lucide-react';
import { getUserCredits } from '@/lib/firestore-helpers';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} credits={credits} onUserChange={setUser} />

      {/* Hero */}
      <section className="relative px-4 py-20 sm:py-32 overflow-hidden">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-violet-500/8 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-cyan-500/8 rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-8">
            <Sparkles className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-medium text-violet-600 dark:text-violet-400">
              Powered by NVIDIA TRELLIS AI
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight">
            Turn words into{' '}
            <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 bg-clip-text text-transparent">
              3D models
            </span>
          </h1>

          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Describe anything. Mybe generates a high-quality 3D model in minutes using NVIDIA&apos;s TRELLIS technology.
            Every new account gets{' '}
            <span className="font-bold text-foreground">100 free credits</span>.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/generate">
              <Button size="lg" className="gap-2 px-8 bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 border-0 text-white">
                <Sparkles className="w-5 h-5" />
                Start Generating — Free
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/gallery">
              <Button size="lg" variant="outline" className="gap-2 px-8">
                <Globe className="w-5 h-5" />
                Browse Gallery
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-20 pt-12 border-t border-border/40">
            <div>
              <p className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-transparent">
                100
              </p>
              <p className="text-sm text-muted-foreground mt-1">Free credits on signup</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-transparent">
                GLB
              </p>
              <p className="text-sm text-muted-foreground mt-1">Industry-standard format</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-transparent">
                4K
              </p>
              <p className="text-sm text-muted-foreground mt-1">Texture quality, always</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-20 bg-card/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">How it works</h2>
          <p className="text-center text-muted-foreground mb-16">From text to 3D in three steps</p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: <Sparkles className="w-6 h-6 text-violet-500" />,
                title: 'Write your prompt',
                desc: 'Describe your 3D model in detail. The more specific, the better the result.',
              },
              {
                step: '02',
                icon: <Zap className="w-6 h-6 text-fuchsia-500" />,
                title: 'NVIDIA TRELLIS processes it',
                desc: 'Our AI pipeline converts your text to a high-quality image, then into a full 3D model.',
              },
              {
                step: '03',
                icon: <Globe className="w-6 h-6 text-cyan-500" />,
                title: 'Download & share',
                desc: 'Your GLB model is saved and published to the gallery. Download anytime.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative p-6 rounded-2xl border border-border/40 bg-background hover:border-violet-500/30 transition-colors"
              >
                <div className="text-5xl font-black text-border/60 absolute top-4 right-5">
                  {item.step}
                </div>
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4">
                  {item.icon}
                </div>
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 mb-6">
            <Coins className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-green-600 dark:text-green-400">
              100 free credits — no credit card required
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to create?</h2>
          <p className="text-muted-foreground mb-8">
            Sign in with Google, get your 100 credits, and start generating 3D models instantly.
          </p>
          <Link href="/generate">
            <Button size="lg" className="gap-2 px-10 bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 border-0 text-white">
              <Sparkles className="w-5 h-5" />
              Generate your first 3D model
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/40 px-4 py-8 text-center text-sm text-muted-foreground">
        <p>Mybe &copy; 2026 · Powered by NVIDIA TRELLIS AI · Vercel Blob Storage</p>
      </footer>
    </div>
  );
}
