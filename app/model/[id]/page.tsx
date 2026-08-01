'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, use } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Header } from '@/components/header';
import { ModelViewer } from '@/components/model-viewer';
import { Button } from '@/components/ui/button';
import { fetchCreditsFromAPI } from '@/lib/firestore-helpers';
import {
  Download, Eye, Calendar, User as UserIcon, ArrowLeft,
  Sparkles, AlertCircle, Clock, X, CheckCircle2, FileBox,
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
type Quality = 'draft' | 'standard' | 'original';

const QUALITY_OPTIONS: {
  id: Quality;
  label: string;
  sub: string;
  ratio: number;
  badge: string;
}[] = [
  { id: 'draft', label: 'Draft', sub: 'Optimized · Small file · Web-ready', ratio: 0.25, badge: '~25% polys' },
  { id: 'standard', label: 'Standard', sub: 'Balanced quality & size', ratio: 0.6, badge: '~60% polys' },
  { id: 'original', label: 'Original', sub: 'Full quality · Best for printing', ratio: 1, badge: '100% polys' },
];

const FORMAT_OPTIONS: { id: ExportFormat; label: string; desc: string }[] = [
  { id: 'glb', label: 'GLB', desc: 'Best for web & game engines' },
  { id: 'gltf', label: 'GLTF', desc: 'Editable JSON format' },
  { id: 'obj', label: 'OBJ', desc: 'Universal 3D format' },
  { id: 'stl', label: 'STL', desc: 'For 3D printing' },
];

export default function ModelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState<number | undefined>();
  const [model, setModel] = useState<ModelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Export modal state
  const [exportOpen, setExportOpen] = useState(false);
  const [quality, setQuality] = useState<Quality>('original');
  const [format, setFormat] = useState<ExportFormat>('glb');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) setCredits(await fetchCreditsFromAPI(() => u.getIdToken()));
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

  const handleExport = async () => {
    if (!model?.modelUrl) return;
    setExporting(true);

    try {
      const THREE = await import('three');
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');

      const loader = new GLTFLoader();
      const gltf = await new Promise<any>((resolve, reject) => {
        loader.load(model.modelUrl, resolve, undefined, reject);
      });
      const scene = gltf.scene;

      // Apply mesh simplification for Draft / Standard
      if (quality !== 'original') {
        const ratio = QUALITY_OPTIONS.find((q) => q.id === quality)!.ratio;
        try {
          const { SimplifyModifier } = await import(
            'three/examples/jsm/modifiers/SimplifyModifier.js'
          );
          const modifier = new SimplifyModifier();
          scene.traverse((child: any) => {
            if (child.isMesh && child.geometry) {
              const count = child.geometry.attributes.position.count;
              const removeCount = Math.floor(count * (1 - ratio));
              if (removeCount > 0 && count - removeCount >= 3) {
                try {
                  child.geometry = modifier.modify(child.geometry, removeCount);
                } catch {
                  // keep original if simplification fails for this mesh
                }
              }
            }
          });
        } catch {
          // SimplifyModifier not available, skip simplification
        }
      }

      const fname = safeName(model.name);
      const q = quality === 'original' ? '' : `_${quality}`;

      if (format === 'glb') {
        if (quality === 'original') {
          // Direct blob download — fastest path
          const res = await fetch(model.modelUrl);
          const blob = await res.blob();
          triggerDownload(blob, `${fname}.glb`, 'model/gltf-binary');
        } else {
          const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
          const exporter = new GLTFExporter();
          const buf = await new Promise<ArrayBuffer>((resolve, reject) => {
            exporter.parse(scene, (out) => resolve(out as ArrayBuffer), reject, { binary: true });
          });
          triggerDownload(new Blob([buf], { type: 'model/gltf-binary' }), `${fname}${q}.glb`, 'model/gltf-binary');
        }
      } else if (format === 'gltf') {
        const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
        const exporter = new GLTFExporter();
        const result = await new Promise<any>((resolve, reject) => {
          exporter.parse(scene, resolve, reject, { binary: false });
        });
        const json = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
        triggerDownload(new Blob([json], { type: 'model/gltf+json' }), `${fname}${q}.gltf`, 'model/gltf+json');
      } else if (format === 'obj') {
        const { OBJExporter } = await import('three/examples/jsm/exporters/OBJExporter.js');
        const exporter = new OBJExporter();
        const objStr = exporter.parse(scene);
        triggerDownload(new Blob([objStr], { type: 'text/plain' }), `${fname}${q}.obj`, 'text/plain');
      } else if (format === 'stl') {
        const { STLExporter } = await import('three/examples/jsm/exporters/STLExporter.js');
        const exporter = new STLExporter();
        const stlStr = exporter.parse(scene);
        triggerDownload(new Blob([stlStr], { type: 'model/stl' }), `${fname}${q}.stl`, 'model/stl');
      }

      setExportOpen(false);
    } catch (err) {
      console.error('Export error:', err);
      alert(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setExporting(false);
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
          <p className="text-muted-foreground text-sm mb-6">X Protocol AI is building your 3D model. Refresh in a minute.</p>
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

  return (
    <>
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

              {/* Download button */}
              <Button
                onClick={() => setExportOpen(true)}
                className="w-full gap-2 bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 border-0 text-white"
                size="lg"
              >
                <Download className="w-5 h-5" />
                Download Model
              </Button>

              <p className="text-xs text-muted-foreground text-center border-t border-border/30 pt-3">
                Generated by X Protocol AI · High-quality 3D model
              </p>
            </div>
          </div>
        </main>
      </div>

      {/* Export Modal */}
      {exportOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !exporting && setExportOpen(false)} />
          <div className="relative w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <FileBox className="w-5 h-5 text-violet-500" />
                <h2 className="font-bold text-lg">Export 3D Model</h2>
              </div>
              {!exporting && (
                <button onClick={() => setExportOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* Quality selection */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Quality / Size
                </p>
                <div className="space-y-2">
                  {QUALITY_OPTIONS.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => setQuality(q.id)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
                        quality === q.id
                          ? 'border-violet-500 bg-violet-500/10'
                          : 'border-border/60 hover:border-violet-500/40 hover:bg-violet-500/5'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        quality === q.id ? 'border-violet-500' : 'border-border'
                      }`}>
                        {quality === q.id && <div className="w-2 h-2 rounded-full bg-violet-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{q.label}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            quality === q.id
                              ? 'bg-violet-500/20 text-violet-600 dark:text-violet-400'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {q.badge}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{q.sub}</p>
                      </div>
                      {quality === q.id && <CheckCircle2 className="w-4 h-4 text-violet-500 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Format selection */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  File Format
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {FORMAT_OPTIONS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFormat(f.id)}
                      className={`flex flex-col items-center p-3 rounded-xl border transition-all ${
                        format === f.id
                          ? 'border-violet-500 bg-violet-500/10'
                          : 'border-border/60 hover:border-violet-500/40 hover:bg-violet-500/5'
                      }`}
                    >
                      <span className={`font-bold text-sm mb-1 ${format === f.id ? 'text-violet-600 dark:text-violet-400' : ''}`}>
                        {f.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground text-center leading-tight">{f.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Info note */}
              <div className="p-3 rounded-lg bg-muted/40 text-xs text-muted-foreground">
                {quality === 'original'
                  ? '✓ Full-resolution model · Best for professional use & 3D printing'
                  : quality === 'standard'
                  ? '✓ Balanced — great for games, AR, and portfolio use'
                  : '✓ Optimized for web embedding, fast loading apps'}
                {format !== 'glb' && ' · Converted client-side using Three.js'}
              </div>

              {/* Export button */}
              <Button
                onClick={handleExport}
                disabled={exporting}
                className="w-full gap-2 bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 border-0 text-white"
                size="lg"
              >
                {exporting ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Export {format.toUpperCase()} · {QUALITY_OPTIONS.find(q => q.id === quality)!.label}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
