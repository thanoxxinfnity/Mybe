'use client';

import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Sun, Maximize2 } from 'lucide-react';

interface ModelViewerProps {
  modelUrl: string;
  autoRotate?: boolean;
}

export function ModelViewer({ modelUrl, autoRotate = true }: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rotating, setRotating] = useState(autoRotate);
  const rotatingRef = useRef(autoRotate);
  const controlsRef = useRef<any>(null);

  const toggleRotate = () => {
    const next = !rotatingRef.current;
    rotatingRef.current = next;
    setRotating(next);
    if (controlsRef.current) controlsRef.current.autoRotate = next;
  };

  useEffect(() => {
    if (!containerRef.current || !modelUrl) return;

    let renderer: any, animationId: number;

    const setup = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const THREE = await import('three');
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
        const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');

        const container = containerRef.current!;
        const w = container.clientWidth;
        const h = container.clientHeight;

        // ── Renderer ─────────────────────────────────────────
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.5));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        container.appendChild(renderer.domElement);

        // ── Scene ─────────────────────────────────────────────
        const scene = new THREE.Scene();

        // Studio gradient background
        const bgCanvas = document.createElement('canvas');
        bgCanvas.width = 2; bgCanvas.height = 512;
        const ctx = bgCanvas.getContext('2d')!;
        const grad = ctx.createLinearGradient(0, 0, 0, 512);
        grad.addColorStop(0, '#111118');
        grad.addColorStop(1, '#1a1a2e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 2, 512);
        scene.background = new THREE.CanvasTexture(bgCanvas);

        // PBR Environment (RoomEnvironment gives metallic/shiny surface reflections)
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        pmremGenerator.compileEquirectangularShader();
        const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
        scene.environment = envTexture;
        pmremGenerator.dispose();

        // ── Lights ───────────────────────────────────────────
        // Ambient — soft base fill
        scene.add(new THREE.AmbientLight(0xffffff, 0.35));

        // Key light — strong main light from top-right
        const keyLight = new THREE.DirectionalLight(0xfff5e0, 3.5);
        keyLight.position.set(6, 12, 8);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.set(4096, 4096);
        keyLight.shadow.camera.near = 0.1;
        keyLight.shadow.camera.far = 100;
        keyLight.shadow.camera.left = -5;
        keyLight.shadow.camera.right = 5;
        keyLight.shadow.camera.top = 5;
        keyLight.shadow.camera.bottom = -5;
        keyLight.shadow.bias = -0.0003;
        keyLight.shadow.radius = 3;
        scene.add(keyLight);

        // Rim light — electric blue backlight (Forza-style)
        const rimLight = new THREE.DirectionalLight(0x4488ff, 2.0);
        rimLight.position.set(-8, 4, -10);
        scene.add(rimLight);

        // Fill light — warm front fill
        const fillLight = new THREE.DirectionalLight(0xffd0a0, 0.8);
        fillLight.position.set(-4, 2, 6);
        scene.add(fillLight);

        // Top kicker — adds highlights on top surfaces
        const topLight = new THREE.DirectionalLight(0xffffff, 1.2);
        topLight.position.set(0, 20, 0);
        scene.add(topLight);

        // ── Camera ───────────────────────────────────────────
        const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 1000);
        camera.position.set(0, 1.2, 3.5);

        // ── Ground shadow plane ───────────────────────────────
        const shadowGeo = new THREE.PlaneGeometry(20, 20);
        const shadowMat = new THREE.ShadowMaterial({ opacity: 0.35, color: 0x000000 });
        const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
        shadowPlane.rotation.x = -Math.PI / 2;
        shadowPlane.receiveShadow = true;
        scene.add(shadowPlane);

        // ── Controls ─────────────────────────────────────────
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.06;
        controls.autoRotate = rotatingRef.current;
        controls.autoRotateSpeed = 1.8;
        controls.minDistance = 0.3;
        controls.maxDistance = 25;
        controls.minPolarAngle = 0;
        controls.maxPolarAngle = Math.PI * 0.85;
        controlsRef.current = controls;

        // ── Load model ───────────────────────────────────────
        const loader = new GLTFLoader();
        loader.load(
          modelUrl,
          (gltf: any) => {
            const model = gltf.scene;

            // Center + scale
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2.2 / maxDim;

            model.position.sub(center.multiplyScalar(scale));
            model.scale.setScalar(scale);

            // Place shadow plane at model bottom
            const newBox = new THREE.Box3().setFromObject(model);
            shadowPlane.position.y = newBox.min.y;

            // PBR material quality upgrade
            model.traverse((child: any) => {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                // Ensure proper PBR settings
                if (child.material) {
                  const mats = Array.isArray(child.material) ? child.material : [child.material];
                  mats.forEach((mat: any) => {
                    mat.envMapIntensity = 1.4;
                    if (mat.map) mat.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
                    if (mat.normalMap) mat.normalScale?.set(1.5, 1.5);
                    mat.needsUpdate = true;
                  });
                }
              }
            });

            scene.add(model);

            // Frame camera to model
            camera.position.set(0, size.y * 0.3 * scale, maxDim * scale * 1.8);
            controls.target.set(0, 0, 0);
            controls.update();

            setIsLoading(false);
          },
          undefined,
          (err: any) => {
            console.error('Model load error:', err);
            setError('Failed to load 3D model');
            setIsLoading(false);
          }
        );

        // ── Animate ──────────────────────────────────────────
        const animate = () => {
          animationId = requestAnimationFrame(animate);
          controls.update();
          renderer.render(scene, camera);
        };
        animate();

        // ── Resize ───────────────────────────────────────────
        const onResize = () => {
          if (!container) return;
          const w2 = container.clientWidth;
          const h2 = container.clientHeight;
          camera.aspect = w2 / h2;
          camera.updateProjectionMatrix();
          renderer.setSize(w2, h2);
        };
        window.addEventListener('resize', onResize);

        return () => window.removeEventListener('resize', onResize);
      } catch (err) {
        console.error('Viewer setup error:', err);
        setError('Failed to initialize 3D viewer');
        setIsLoading(false);
      }
    };

    setup();

    return () => {
      cancelAnimationFrame(animationId);
      if (renderer) {
        renderer.dispose();
        try { containerRef.current?.removeChild(renderer.domElement); } catch {}
      }
    };
  }, [modelUrl]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden bg-[#111118]">
      <div ref={containerRef} className="w-full h-full" />

      {/* Loading */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111118]">
          <div className="relative mb-5">
            <div className="w-14 h-14 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-cyan-500/30 border-t-cyan-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.7s' }} />
            </div>
          </div>
          <p className="text-sm font-medium text-white/60">Loading 3D model...</p>
          <p className="text-xs text-white/30 mt-1">High-quality render</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#111118]">
          <div className="text-center p-6">
            <p className="text-red-400 font-medium mb-2">Failed to load model</p>
            <p className="text-xs text-white/40">{error}</p>
          </div>
        </div>
      )}

      {/* Controls overlay */}
      {!isLoading && !error && (
        <>
          {/* Top-right controls */}
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              onClick={toggleRotate}
              title={rotating ? 'Stop rotation' : 'Auto rotate'}
              className={`p-2 rounded-lg backdrop-blur-sm transition-all ${
                rotating
                  ? 'bg-violet-500/80 text-white'
                  : 'bg-black/40 text-white/60 hover:bg-black/60 hover:text-white'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Bottom hint */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
            <p className="text-[11px] text-white/35 bg-black/25 px-3 py-1 rounded-full backdrop-blur-sm whitespace-nowrap">
              Drag to rotate · Scroll to zoom · Right-drag to pan
            </p>
          </div>

          {/* Quality badge */}
          <div className="absolute top-3 left-3">
            <span className="text-[10px] font-bold text-white/50 bg-black/30 px-2 py-1 rounded-md backdrop-blur-sm tracking-widest uppercase">
              PBR · 4K
            </span>
          </div>
        </>
      )}
    </div>
  );
}
