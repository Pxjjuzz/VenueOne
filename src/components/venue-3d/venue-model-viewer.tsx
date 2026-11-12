"use client";

/* eslint-disable react-hooks/immutability --
   React Three Fiber hands back an imperative Three.js camera and controls.
   Setting projection, position and target is the supported way to drive them;
   there is no immutable alternative. */

import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, useProgress } from "@react-three/drei";
import { Maximize2, Minimize2, Move3d, RotateCcw, X } from "lucide-react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

type ViewerProps = {
  url: string;
  title: string;
  accuracyLabel: string;
  onExit: () => void;
  className?: string;
};

type Bounds = {
  min: THREE.Vector3;
  max: THREE.Vector3;
  centre: THREE.Vector3;
  size: THREE.Vector3;
};

function measure(object: THREE.Object3D): Bounds {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  return { min: box.min.clone(), max: box.max.clone(), centre, size };
}

/* -------------------------------------------------------------------------- */
/* Model                                                                       */
/* -------------------------------------------------------------------------- */

function Model({
  url,
  onReady,
  onMeasure,
}: {
  url: string;
  onReady: () => void;
  onMeasure: (bounds: Bounds) => void;
}) {
  const { scene } = useGLTF(url);

  // The cached scene is shared through useGLTF, so clone before touching it.
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);

  useLayoutEffect(() => {
    onMeasure(measure(model));
    onReady();
  }, [model, onMeasure, onReady]);

  return <primitive object={model} />;
}

/* -------------------------------------------------------------------------- */
/* Camera and controls                                                         */
/* -------------------------------------------------------------------------- */

function VenueControls({
  bounds,
  resetToken,
  controlsRef,
}: {
  bounds: Bounds | null;
  resetToken: number;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();
  const home = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null);

  const frame = useCallback(
    (next: Bounds) => {
      const { centre, size, min } = next;
      const target = new THREE.Vector3(centre.x, min.y + size.y * 0.34, centre.z);
      const position = new THREE.Vector3(
        centre.x + size.x * 0.16,
        min.y + size.y * 0.52,
        centre.z + size.z * 0.42,
      );

      const perspective = camera as THREE.PerspectiveCamera;
      perspective.fov = 45;
      perspective.near = Math.max(0.05, size.length() * 0.002);
      perspective.far = size.length() * 6;
      perspective.updateProjectionMatrix();

      camera.position.copy(position);
      camera.lookAt(target);
      if (controlsRef.current) {
        controlsRef.current.target.copy(target);
        controlsRef.current.update();
      }
      home.current = { position: position.clone(), target: target.clone() };
    },
    [camera, controlsRef],
  );

  useEffect(() => {
    if (bounds) frame(bounds);
  }, [bounds, frame]);

  useEffect(() => {
    if (!bounds || resetToken === 0 || !home.current || !controlsRef.current) return;
    const controls = controlsRef.current;
    camera.position.copy(home.current.position);
    controls.target.copy(home.current.target);
    controls.update();
  }, [resetToken, bounds, camera, controlsRef]);

  // Pan must not let the user walk the target outside the building.
  const clampTarget = useCallback(() => {
    const controls = controlsRef.current;
    if (!bounds || !controls) return;
    const margin = 0.5;
    const clamped = controls.target.clone().clamp(
      new THREE.Vector3(bounds.min.x + margin, bounds.min.y + margin, bounds.min.z + margin),
      new THREE.Vector3(bounds.max.x - margin, bounds.max.y - margin, bounds.max.z - margin),
    );
    if (!clamped.equals(controls.target)) {
      const delta = clamped.clone().sub(controls.target);
      controls.target.copy(clamped);
      camera.position.add(delta);
      controls.update();
    }
  }, [bounds, camera, controlsRef]);

  const diagonal = bounds ? bounds.size.length() : 40;

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.09}
      enablePan
      screenSpacePanning={false}
      minDistance={Math.max(0.8, diagonal * 0.06)}
      maxDistance={diagonal * 0.62}
      minPolarAngle={0.12}
      maxPolarAngle={Math.PI / 2 - 0.05}
      onChange={clampTarget}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Lighting                                                                    */
/* -------------------------------------------------------------------------- */

function Lighting({ bounds }: { bounds: Bounds | null }) {
  const light = useRef<THREE.DirectionalLight>(null);

  useEffect(() => {
    if (!bounds || !light.current) return;
    const { min, size, centre } = bounds;
    const camera = light.current.shadow.camera as THREE.OrthographicCamera;
    camera.left = -size.x * 0.75;
    camera.right = size.x * 0.75;
    camera.top = size.z * 0.75;
    camera.bottom = -size.z * 0.75;
    camera.near = 0.1;
    camera.far = size.y * 3;
    camera.updateProjectionMatrix();
    light.current.target.position.copy(
      new THREE.Vector3(centre.x, min.y, centre.z),
    );
    light.current.target.updateMatrixWorld();
  }, [bounds]);

  return (
    <>
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#fffaf0", "#b6b0a2", 0.85]} />
      <directionalLight
        ref={light}
        castShadow
        intensity={1.45}
        color="#fff7ea"
        position={
          bounds
            ? [
                bounds.centre.x + bounds.size.x * 0.24,
                bounds.min.y + bounds.size.y * 0.86,
                bounds.centre.z + bounds.size.z * 0.22,
              ]
            : [6, 5, 8]
        }
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Error handling                                                              */
/* -------------------------------------------------------------------------- */

class ModelErrorBoundary extends Component<
  { children: ReactNode; onRetry: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Venue model failed to load", error);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[#121716] px-6 text-center">
          <p className="text-sm font-medium text-white">The 3D model did not load.</p>
          <p className="max-w-sm text-xs leading-relaxed text-white/70">
            This is usually a network interruption. The photographs and venue details
            are unaffected.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              this.setState({ failed: false });
              this.props.onRetry();
            }}
          >
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* -------------------------------------------------------------------------- */
/* Viewer                                                                      */
/* -------------------------------------------------------------------------- */

export default function VenueModelViewer({
  url,
  title,
  accuracyLabel,
  onExit,
  className,
}: ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const [canvasKey, setCanvasKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { active, progress } = useProgress();

  const onMeasure = useCallback((next: Bounds) => setBounds(next), []);
  const onReady = useCallback(() => setReady(true), []);

  // Release the parsed geometry when the viewer closes, otherwise a second
  // visit would hold two copies of the model in GPU memory.
  useEffect(() => {
    return () => {
      useGLTF.clear(url);
    };
  }, [url]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.fullscreenElement) onExit();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onExit]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await containerRef.current?.requestFullscreen();
      }
    } catch (error) {
      console.error("Fullscreen is unavailable", error);
    }
  }, []);

  const retry = useCallback(() => {
    useGLTF.clear(url);
    setReady(false);
    setBounds(null);
    setFailed(false);
    setCanvasKey((key) => key + 1);
  }, [url]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative isolate w-full overflow-hidden border border-border bg-[#121716]",
        isFullscreen ? "h-screen rounded-none" : "aspect-[16/10] rounded-[var(--radius-md)]",
        className,
      )}
    >
      {!ready && !failed ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[#121716]">
          <span
            className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80"
            aria-hidden="true"
          />
          <p className="text-xs font-medium tracking-wide text-white/80">
            {active ? `Loading interior ${Math.round(progress)}%` : "Preparing the interior"}
          </p>
        </div>
      ) : null}

      <ModelErrorBoundary onRetry={retry}>
        <Canvas
          key={canvasKey}
          shadows="percentage"
          dpr={[1, 2]}
          camera={{ fov: 45, near: 0.05, far: 400, position: [0, 2.4, 9] }}
          gl={{ antialias: true, powerPreference: "high-performance", alpha: false }}
          onCreated={({ gl }) => {
            gl.setClearColor("#121716");
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.02;
            gl.domElement.addEventListener("webglcontextlost", () => setFailed(true), {
              once: true,
            });
          }}
        >
          <Suspense fallback={null}>
            <Model url={url} onReady={onReady} onMeasure={onMeasure} />
            <Lighting bounds={bounds} />
            <VenueControls bounds={bounds} resetToken={resetToken} controlsRef={controlsRef} />
          </Suspense>
        </Canvas>
      </ModelErrorBoundary>

      {/* Top bar. Always reachable, so the viewer is never a trap. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 bg-gradient-to-b from-black/55 to-transparent p-3">
        <div className="pointer-events-auto flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onExit}
            className="border-white/25 bg-black/35 text-white hover:bg-black/55"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Back to photographs
          </Button>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setResetToken((token) => token + 1)}
            className="border-white/25 bg-black/35 text-white hover:bg-black/55"
            aria-label="Reset camera"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={toggleFullscreen}
            className="border-white/25 bg-black/35 text-white hover:bg-black/55"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">{isFullscreen ? "Exit" : "Fullscreen"}</span>
          </Button>
        </div>
      </div>

      {/* Bottom bar: what the user is looking at, and how to move. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-wrap items-end justify-between gap-3 bg-gradient-to-t from-black/60 to-transparent p-3">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-white/70">
            {title}
          </p>
          <p className="mt-0.5 text-[0.68rem] text-white/60">{accuracyLabel}</p>
        </div>
        <p className="flex items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1 text-[0.65rem] text-white/70">
          <Move3d className="h-3 w-3" aria-hidden="true" />
          Drag to look, scroll to zoom, right-drag to pan
        </p>
      </div>

      {failed ? (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-[#121716] px-6 text-center">
          <p className="text-sm font-medium text-white">The viewer could not start.</p>
          <p className="max-w-sm text-xs leading-relaxed text-white/70">
            Your browser reported a graphics problem. The photographs and booking
            details below still work.
          </p>
          <Button variant="secondary" size="sm" onClick={retry}>
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  );
}
