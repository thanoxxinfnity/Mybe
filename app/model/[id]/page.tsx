'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, use, useRef } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Header } from '@/components/header';
import { ModelViewer } from '@/components/model-viewer';
import { Button } from '@/components/ui/button';
import { getUserCredits } from '@/lib/firestore-helpers';
import {
  Download, Eye, Calendar, User as UserIcon, ArrowLeft,
  Sparkles, AlertCircle, Clock, ChevronDown,
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

type ExportFormat = 'glb' | 'gltf' | 'obj' | 'stl';

export default function ModelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState<number | undefined>();
  const [model, setModel] = useState<ModelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [showFormats, setShowFormats] = useState(false);
  const sceneRef = useRef<any>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) setCredits(await getUserCredits(u.uid));
    });
    return unsub;
  }, []);

  useEffect(() => {
    fetch(`/api/model/${id}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setModel(d.model); })
      .catch(() => setError('Failed to load model'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleExport = async (format: ExportFormat) => {
    if (!model?.modelUrl) return;
    setExporting(format);
    setShowFormats(false);

    try {
      if (format === 'glb') {
        // Direct download from Vercel Blob
        const res = await fetch(model.modelUrl);
        const blob = await res.blob();
        triggerDownload(blob, `${safeName(model.name)}.glb`, 'model/gltf-binary');
      } else {
        // Client-side conversion using Three.js
        const THREE = await import('three');
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');

        const loader = new GLTFLoader();
        const gltf = await new Promise<any>((resolve, reject) => {
          loader.load(model.modelUrl, resolve, undefined, reject);
        });
        const scene = gltf.scene;

        if (format === 'gltf') {
          const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
          const exporter = new GLTFExporter();
          const result = await new Promise<ArrayBuffer>((resolve, reject) => {
            exporter.parse(scene, (out) => resolve(out as ArrayBuffer), reject, { binary: false });
          });
          const json = typeof result === 'string' ? result : new TextDecoder().decode(result as ArrayBuffer);
          triggerDownload(
            new Blob([json], { type: 'model/gltf+json' }),
            `${safeName(model.name)}.gltf`,
            'model/gltf+json'
          );
        } else if (format === 'obj') {
          const { OBJExporter } = await import('three/examples/jsm/exporters/OBJExporter.js');
          const exporter = new OBJExporter();
          const objStr = exporter.parse(scene);
          triggerDownload(
            new Blob([objStr], { type: 'text/plain' }),
            `${safeName(model.name)}.obj`,
            'text/plain'
          );
        } else if (format === 'stl') {
          const { STLExporter } = await import('three/examples/jsm/exporters/STLExporter.js');
          const exporter = new STLExporter();
          const stlStr = exporter.parse(scene);
          triggerDownload(
            new Blob([stlStr], { type: 'model/stl' }),
            `${safeName(model.name)}.stl`,
            'model/stl'
          );
        }
      }
    } catch (err) {
      console.error('Export error:', err);
      alert(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setExporting(null);
    }
  };

  function safeName(name: string) {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 40);
  }

  function triggerDownload(blob: Blob, filename: string, type: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

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
        <main className="max-w-lg mx-auto px-4 py-20 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Model not found</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Link href="/gallery"><Button variant="outline">Back to Gallery</Button></Link>
        </main>
      </div>
    );
  }

  if (model.status === 'processing') {
    return (
      <div className="min-h-screen bg-background">
        <Header user={user} credits={credits} />
        <main className="max-w-lg mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 rounded-full border-2 border-violet-500 border-t-transparent animate-spin mx-auto mb-6" />
          <h1 className="text-xl font-bold mb-2">Still generating...</h1>
          <p className="text-muted-foreground text-sm mb-6">NVIDIA TRELLIS is building your model. Refresh in a minute.</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            <Clock className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </main>
      </div>
    );
  }

  if (model.status === 'failed') {
    return (
      <div className="min-h-screen bg-background">
        <Header user={user} credits={credits} />
        <main className="max-w-lg mx-auto px-4 py-20 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Generation Failed</h1>
          <p className="text-muted-foreground mb-6">Your credit was refunded automatically.</p>
          <Link href="/generate">
            <Button className="gap-2 bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 border-0 text-white">
              <Sparkles className="w-4 h-4" /> Try Again
            </Button>
          </Link>
        </main>
      </div>
    );
  }

  const formats: { format: ExportFormat; label: string; desc: string }[] = [
    { format: 'glb', label: 'GLB', desc: 'Best for web, game engines' },
    { format: 'gltf', label: 'GLTF', desc: 'JSON format, easy to edit' },
    { format: 'obj', label: 'OBJ', desc: 'Universal 3D format' },
    { format: 'stl', label: 'STL', desc: '3D printing ready' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} credits={credits} onUserChange={setUser} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Link href="/gallery"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Gallery
        </Link>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* 3D Viewer */}
          <div className="lg:col-span-3">
            <div className="h-[480px] lg:h-[580px] rounded-2xl overflow-hidden shadow-2xl shadow-black/30">
              <ModelViewer modelUrl={model.modelUrl} autoRotate />
            </div>
          </div>

          {/* Info Panel */}
          <div className="lg:col-span-2 space-y-5">
            <div>
              <div className="flex items-start gap-3 mb-2">
                <h1 className="text-2xl font-extrabold leading-tight flex-1">{model.name}</h1>
                <span className="px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-bold uppercase">
                  GLB
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {model.userAvatar
                  ? <img src={model.userAvatar} alt={model.userName} className="w-6 h-6 rounded-full" />
                  : <UserIcon className="w-4 h-4" />}
                <span>{model.userName}</span>
                <span>·</span>
                <Calendar className="w-3.5 h-3.5" />
                <span>{timeAgo(model.createdAt)}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
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

            {/* Download section */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Download Format</p>
              <div className="grid grid-cols-2 gap-2">
                {formats.map(({ format, label, desc }) => (
                  <button
                    key={format}
                    onClick={() => handleExport(format)}
                    disabled={!!exporting}
                    className="flex flex-col items-start p-3 rounded-xl border border-border/40 hover:border-violet-500/40 hover:bg-violet-500/5 transition-all disabled:opacity-60 text-left"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {exporting === format ? (
                        <div className="w-4 h-4 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 text-violet-500" />
                      )}
                      <span className="font-bold text-sm">{label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{desc}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                OBJ, GLTF, STL are converted client-side from GLB using Three.js.
              </p>
            </div>

            <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border/30">
              Generated by NVIDIA TRELLIS AI · Stored on Vercel Blob · Powered by Mybe
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
