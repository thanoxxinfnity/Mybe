'use client';

import { useEffect, useRef, useState } from 'react';

interface ModelViewerProps {
  modelUrl: string;
  autoRotate?: boolean;
}

export function ModelViewer({ modelUrl, autoRotate = true }: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !modelUrl) return;

    let scene: any, camera: any, renderer: any, controls: any, animationId: number;

    const setup = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const THREE = await import('three');
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');

        const container = containerRef.current!;
        const w = container.clientWidth;
        const h = container.clientHeight;

        // Scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0f0f13);

        // Add environment fog for depth
        scene.fog = new THREE.FogExp2(0x0f0f13, 0.15);

        // Camera
        camera = new THREE.PerspectiveCamera(60, w / h, 0.01, 1000);
        camera.position.set(0, 1, 3);

        // Renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        container.appendChild(renderer.domElement);

        // Lights
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambient);

        const key = new THREE.DirectionalLight(0xffffff, 1.5);
        key.position.set(5, 10, 5);
        key.castShadow = true;
        scene.add(key);

        const fill = new THREE.DirectionalLight(0x8888ff, 0.5);
        fill.position.set(-5, 2, -5);
        scene.add(fill);

        const rim = new THREE.DirectionalLight(0xffaa44, 0.4);
        rim.position.set(0, -5, -5);
        scene.add(rim);

        // Controls
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.autoRotate = autoRotate;
        controls.autoRotateSpeed = 1.5;
        controls.minDistance = 0.5;
        controls.maxDistance = 20;

        // Load model
        const loader = new GLTFLoader();
        loader.load(
          modelUrl,
          (gltf: any) => {
            const model = gltf.scene;

            // Center and scale
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);

            model.position.sub(center);
            model.scale.setScalar(2 / maxDim);

            // Enable shadows
            model.traverse((child: any) => {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });

            scene.add(model);

            camera.position.set(0, 0.5, 2.5);
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

        // Animate
        const animate = () => {
          animationId = requestAnimationFrame(animate);
          controls.update();
          renderer.render(scene, camera);
        };
        animate();

        // Resize
        const onResize = () => {
          if (!container) return;
          const w2 = container.clientWidth;
          const h2 = container.clientHeight;
          camera.aspect = w2 / h2;
          camera.updateProjectionMatrix();
          renderer.setSize(w2, h2);
        };
        window.addEventListener('resize', onResize);

        return () => {
          window.removeEventListener('resize', onResize);
        };
      } catch (err) {
        console.error('Viewer setup error:', err);
        setError('Failed to initialize 3D viewer');
        setIsLoading(false);
      }
    };

    const cleanup = setup();

    return () => {
      cancelAnimationFrame(animationId);
      if (renderer) {
        renderer.dispose();
        containerRef.current?.removeChild(renderer.domElement);
      }
    };
  }, [modelUrl, autoRotate]);

  return (
    <div className="relative w-full h-full bg-[#0f0f13] rounded-xl overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />

      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f0f13]">
          <div className="w-12 h-12 rounded-full border-2 border-violet-500 border-t-transparent animate-spin mb-4" />
          <p className="text-sm text-muted-foreground">Loading 3D model...</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0f0f13]">
          <div className="text-center p-6">
            <p className="text-red-400 font-medium mb-2">Failed to load model</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        </div>
      )}

      {!isLoading && !error && (
        <div className="absolute bottom-3 left-3 right-3 flex justify-center">
          <p className="text-xs text-white/40 bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm">
            Drag to rotate • Scroll to zoom
          </p>
        </div>
      )}
    </div>
  );
}
