---
title: Research Session
query: "React Three Fiber (v9) performance best practices in Next.js App Router: dynamic import, frameloop control, DPR tuning, reduced motion (2025)."
date: 8/11/2025
time: 6:16:57 PM
timestamp: 2025-08-11T15:16:57.907Z
exchanges: 1
---

# Research Session

## Initial Query

**Question:** React Three Fiber (v9) performance best practices in Next.js App Router: dynamic import, frameloop control, DPR tuning, reduced motion (2025).

**Response:**

Below is a 2025-focused, React Three Fiber (v9) performance playbook tailored for Next.js App Router projects. It emphasizes practical, copy/paste-ready patterns: dynamic import to avoid SSR pitfalls, frameloop control that saves CPU when idle, DPR/clamping and adaptive quality, and a robust reduced-motion strategy. I also include notes that matter for this project’s pages (Hub, Scale, PromptBro) where streaming updates and responsive UI are more important than maximal 3D fidelity.

Executive summary
- Use a leaf client component for Canvas and dynamically import it with ssr: false.
- Default to frameloop="demand" and only switch to always during active animations/interactions; invalidate on controls/user input to render when needed.
- Clamp DPR to a sane range and enable adaptive DPR; lower DPR on hidden tabs and for reduced motion.
- Respect prefers-reduced-motion: pause the loop, disable autorotation/physics, and provide a static fallback.
- Keep the scene small: code-split heavy 3D into Suspense boundaries, use instancing, compress models, avoid expensive shadows, and cache loaders.
- Dispose properly and keep Canvas isolated from the rest of the App Router to avoid hydration mismatch and re-renders.

1) Next.js App Router + R3F integration: client-only Canvas and dynamic import
- Never render Canvas during SSR. Use a client-only leaf component and dynamically import it from RSC pages or layouts. This preserves the RSC benefits for the rest of the app while keeping the WebGL tree on the client.

Example structure:
- app/(marketing)/page.tsx (Server Component)
- components/r3f/SceneCanvas.tsx (Client Component with Canvas)

app/(marketing)/page.tsx (RSC)
- Keeps SSR, streams HTML quickly, and then hydrates the Canvas client-side.

import dynamic from 'next/dynamic';

const R3FCanvas = dynamic(() => import('@/components/r3f/SceneCanvas').then(m => m.SceneCanvas), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse bg-muted rounded-lg" />,
});

export default async function Page() {
  // Server Component logic, fetch data, etc.
  return (
    <main>
      <h1 className="text-2xl font-semibold">Welcome</h1>
      <R3FCanvas />
    </main>
  );
}

components/r3f/SceneCanvas.tsx (Client)
- This is the only file with 'use client' and Canvas.

'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr, PerformanceMonitor, /* AdaptiveEvents */ } from '@react-three/drei';
import { useReducedMotion } from '@/lib/useReducedMotion'; // small custom hook below

function SceneContent({ reduced }: { reduced: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  // Example: Invalidate on visibility regain
  useEffect(() => {
    const onVis = () => {
      if (!document.hidden) invalidate();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [invalidate]);

  // ... add your meshes/lights here
  return null;
}

export function SceneCanvas() {
  const reduced = useReducedMotion();

  // You can keep powerPreference low-power for battery devices and let PerformanceMonitor bump quality later if needed
  return (
    <Canvas
      // Render only when needed (user input, invalidate calls, etc.)
      frameloop={reduced ? 'never' : 'demand'}
      // Clamp DPR; retina screens often don’t need full devicePixelRatio for UI scenes
      dpr={[1, reduced ? 1 : 1.75]}
      // Basic GL flags for performance; alpha true if you’re compositing
      gl={{ antialias: true, powerPreference: 'low-power', alpha: true, stencil: false, depth: true }}
      // Avoid rerender storms by isolating this subtree
      events={{ priority: 1 }} // keep pointer events local to the canvas
    >
      <Suspense fallback={null}>
        <PerformanceMonitor
          onDecline={() => {
            // Optional: respond to FPS decline by reducing quality features via state
            // e.g., disable shadows or reduce draw distance
          }}
        >
          <AdaptiveDpr pixelated />
          {/* <AdaptiveEvents /> // if you have heavy pointer event usage */}
          <SceneContent reduced={reduced} />
        </PerformanceMonitor>
      </Suspense>

      {/* Controls: with frameloop='demand', invalidate on change to redraw only during interaction */}
      <OrbitControls
        makeDefault
        enableDamping
        onChange={(e) => e.target.object?.dispatchEvent?.({ type: 'invalidate' })} // see note below
        // Alternatively, just call invalidate directly via a ref/hook:
        // onChange={() => invalidate()}
        enablePan={false}
        autoRotate={false}
      />
    </Canvas>
  );
}

Notes:
- Invalidate on control changes: OrbitControls doesn’t know about R3F’s invalidate, so use onChange={() => invalidate()} (call invalidate from a closure/hook). The code above shows a dispatchEvent trick, but a direct invalidate() is simpler and more reliable.
- Keep this as a leaf client component. Do not add 'use client' to your Server Components, or you lose App Router RSC benefits site-wide.

2) Frameloop control patterns that actually save CPU
- always: renders every rAF; easiest but most expensive.
- demand: renders only when explicitly invalidated (pointer events, control changes, state updates that call invalidate).
- never: renders once then never again unless manually invalidated or frameloop is switched.

Recommended baseline: frameloop="demand"
- Invalidate when you need a frame:
  - Pointer events: e.g., onPointerMove={() => invalidate()}
  - Controls: onChange={() => invalidate()}
  - Scene state updates that affect visuals: call invalidate() after state mutates.
- For transient animations (e.g., a brief hover or “breathing” animation), temporarily switch to always and then back to demand.

Toggle frameloop at runtime (v9):
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

function AnimateWhile(cond: boolean) {
  const setFrameloop = useThree((s) => s.setFrameloop);
  useEffect(() => {
    if (cond) setFrameloop('always');
    else setFrameloop('demand');
    return () => setFrameloop('demand');
  }, [cond, setFrameloop]);
  return null;
}

In your Canvas:
<AnimateWhile cond={userIsHovering || playingAnimation} />

Pitfalls:
- If you put continuous useFrame-driven animations inside a demand loop without toggling to always or calling invalidate per frame, they won’t update. For true continuous animation, temporarily switch to always during playback, or call invalidate() inside useFrame (which effectively makes it always while it’s running).
- Avoid global state props that change frequently across the React tree; prefer localized state and call invalidate as needed.

3) Device Pixel Ratio (DPR) tuning and adaptation
- Clamp DPR via the dpr prop on Canvas. On high DPI laptops/phones, a DPR of 2–3 can tank performance with little visible benefit at typical canvas sizes.
- Use a range: dpr={[1, 1.75]} is a good general-purpose clamp. Go lower for battery-focused pages.
- Use AdaptiveDpr from drei to dynamically reduce DPR if FPS drops; pair it with PerformanceMonitor to react to persistent low performance.

Visibility and focus optimizations:
- When the tab is hidden or document is not visible, lower DPR to 1 and pause rendering.
- On visibilitychange, restore DPR and invalidate to refresh.

4) Reduced motion and accessibility
- Respect the prefers-reduced-motion media query. For users who prefer reduced motion:
  - Set frameloop="never".
  - Disable autorotation, heavy postprocessing, physics, and any continuous animations.
  - Optionally serve a static fallback image (poster) and do not mount heavy components/models at all.
- Do not just hide; actually avoid heavy GPU/CPU work.

A small hook:
'use client';
import { useEffect, useState } from 'react';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener ? mq.addEventListener('change', onChange) : mq.addListener(onChange);
    return () => {
      mq.removeEventListener ? mq.removeEventListener('change', onChange) : mq.removeListener(onChange);
    };
  }, []);
  return reduced;
}

Example fallback:
{reduced ? (
  <img src="/static/poster.webp" alt="Static scene" className="rounded-lg" />
) : (
  <R3FCanvas />
)}

5) Asset loading, Suspense, and code-splitting heavy 3D
- Split your heavy scene into a separate component and lazy-load it (we already do via dynamic import for the Canvas).
- Use Suspense around the 3D model subtree so the rest of the UI is interactive while models decode.
- Preload assets in idle time and cache decoders:
  - Compress GLTF with Meshopt and/or Draco.
  - Use three-stdlib decoders and drei’s useGLTF.preload.

Example model component:
import { useEffect, Suspense } from 'react';
import { useGLTF } from '@react-three/drei';
import { GLTFLoader } from 'three-stdlib';
import { MeshoptDecoder } from 'three-stdlib';

GLTFLoader.setMeshoptDecoder(MeshoptDecoder);
// If using Draco:
// import { DRACOLoader } from 'three-stdlib';
// GLTFLoader.setDRACOLoader((loader) => {
//   const draco = new DRACOLoader();
//   draco.setDecoderConfig({ type: 'js' }); // or 'wasm'
//   draco.setDecoderPath('/draco/'); // host decoder files
//   loader.setDRACOLoader(draco);
// });

useGLTF.preload('/models/scene-meshopt.glb');

export function Model() {
  const gltf = useGLTF('/models/scene-meshopt.glb');
  return <primitive object={gltf.scene} />;
}

In Canvas:
<Suspense fallback={null}>
  <Model />
</Suspense>

Best practices:
- Prefer Meshopt-compressed GLB; decode is fast and streaming-friendly.
- Keep texture sizes reasonable (1024–2048 max) and use KTX2 Basis compression where possible.
- Avoid big shadow maps and heavy postprocessing on UI pages.

6) Rendering and material optimization
- Shadows: If you must have shadows, keep shadowMap.enabled true only when needed, reduce shadow map sizes (e.g., 512–1024), and limit casters/receivers.
- Materials: Prefer MeshStandardMaterial only where needed; Basic/Matcap materials are cheaper for static/non-PBR elements.
- Instancing: For many similar meshes, use InstancedMesh or drei’s Instances to reduce draw calls.
- Text: Use drei’s Text (troika-three-text) which atlases glyphs and is performant compared to TextGeometry.
- Environment: Use a small PMREM-processed environment map, avoid 8k HDRIs on UI. Drei’s useEnvironment with files in 512–1024 range is often enough.
- Frustum culling: Keep it enabled; ensure bounding boxes are correct (avoid negative scales that break culling).

7) Events, reactivity, and avoiding unnecessary React work
- Keep React state minimal inside the Canvas tree; avoid prop-drilling that triggers React reconciliations on every SSE/chat tick.
- For frequent UI updates elsewhere (e.g., battle/scale SSE), isolate the Canvas in its own client island so it doesn’t re-render when chat messages stream in.
- Pointer events: If you have dense meshes, consider AdaptiveEvents to avoid heavy raycasting when idle.
- Use memoization (useMemo) for static geometries and avoid re-creating materials on every render.

8) Memory and cleanup in App Router
- R3F will auto-dispose objects on unmount, but still:
  - Don’t retain references (closures, external stores) that keep large THREE objects alive after unmount.
  - If you preload many GLTFs, clear caches when navigating away if memory is a concern: useGLTF.clear('/model.glb').
- App Router layouts persist across routes. If your Canvas is in a layout, it won’t unmount on page change; design accordingly (this can be good for performance, but be deliberate).

9) Handling visibility, focus, and thermal throttling
- Listen to visibilitychange and pagehide: drop DPR to 1 and set frameloop to never when hidden; restore on focus.
- Consider powerPreference:
  - For battery-friendly UI: 'low-power'.
  - For heavy scenes on desktops: 'high-performance'. You can switch at runtime in onCreated if you detect strong GPU, but do this sparingly to avoid context churn.

10) Full example: production-ready Canvas with demand loop, adaptive DPR, and reduced motion
'use client';
import { Suspense, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr, PerformanceMonitor } from '@react-three/drei';
import { useReducedMotion } from '@/lib/useReducedMotion';

function QualityGuards() {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        gl.setPixelRatio(1);
      } else {
        gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
        invalidate();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [gl, invalidate]);

  return null;
}

function Scene() {
  // ... your scene content
  return null;
}

export function SceneCanvas() {
  const reduced = useReducedMotion();

  return (
    <Canvas
      frameloop={reduced ? 'never' : 'demand'}
      dpr={[1, reduced ? 1 : 1.75]}
      gl={{ antialias: true, powerPreference: 'low-power', alpha: true }}
      // Only enable if you actually need shadows:
      // shadows
      onCreated={({ gl }) => {
        // Example: fine-tune renderer if needed
        // gl.outputColorSpace = THREE.SRGBColorSpace; // usually set by R3F/three defaults
      }}
    >
      <Suspense fallback={null}>
        <PerformanceMonitor
          onChange={({ factor }) => {
            // factor < 1 means performance dropped; you could lower quality flags via state
          }}
          onFallback={() => {
            // React if device is too slow (e.g., disable postprocessing)
          }}
        >
          <AdaptiveDpr pixelated />
          <QualityGuards />
          <Scene />
        </PerformanceMonitor>
      </Suspense>
      <OrbitControls
        makeDefault
        enableDamping
        autoRotate={false}
        onChange={({ target }) => {
          // easiest: use a module-level invalidate from '@react-three/fiber'
          // but since we’re in a component, just grab it from useThree:
          // not accessible here directly; wrap controls in a component if you need invalidate()
        }}
      />
    </Canvas>
  );
}

If you want direct invalidate in Controls’ onChange, wrap OrbitControls in a component that has access to useThree:
function DemandControls() {
  const invalidate = useThree((s) => s.invalidate);
  return <OrbitControls makeDefault enableDamping onChange={() => invalidate()} />;
}

11) Project-specific guidance (Hub, Scale, PromptBro)
- These pages are chat-first (SSE polling/streaming) with forms and lists. If you add R3F for lightweight visuals (e.g., progress indicator, subtle background), prioritize UI responsiveness:
  - Keep Canvas decoupled as a client-only island and default to frameloop="demand".
  - Invalidate on user interaction only; do not run continuous animations while SSE events stream in.
  - Clamp DPR aggressively (e.g., [1, 1.5]) and avoid shadows/postprocessing altogether.
  - If the 3D is decorative, hide it entirely under prefers-reduced-motion and in narrow viewports (mobile).
  - Testing: run Lighthouse plus Chrome Performance panel while simulating SSE bursts; ensure TTFR and input delay remain low. Validate no hydration mismatch by keeping Canvas out of SSR.
- If the Hub shows “live battles” visualizations, render them as discrete frames triggered by message updates (invalidate when a new message arrives) rather than a continuous animation.
- For marketing/landing-only scenes, consider loading the Canvas only when it scrolls into view (IntersectionObserver) and unmounting when off-screen.

12) Additional micro-optimizations and pitfalls
- Avoid creating materials/geometries in render; memoize or create once per component mount.
- Prefer a single Canvas per route; multiple contexts increase overhead.
- Don’t set preserveDrawingBuffer unless you need screenshotting; it disables certain driver optimizations.
- Avoid CSS transforms on the canvas element that force composition/decomposition repeatedly—keep it relatively static in layout.
- If you must overlay heavy DOM elements, ensure their animations are GPU-accelerated (transform/opacity) and respect reduced motion.

13) Optional: model preparation pipeline
- GLTF: Draco+Meshopt compression; KTX2 texture compression; strip unused nodes/animations.
- Reduce texture resolution to perceptual minimum; prefer WebP/AVIF for textures where appropriate (converted to KTX2 for GPU).
- Bake lighting if you need “shadows” without runtime cost.

Checklists
- Integration
  - Canvas is in a leaf client component, imported via dynamic(..., { ssr: false }).
  - No 'use client' at page/layout level unnecessarily.
  - Canvas isolated from streaming chat state to avoid rerenders.
- Frameloop
  - Default frameloop="demand".
  - Invalidate on controls and pointer events.
  - Temporarily switch to 'always' for short animations, then restore 'demand'.
- DPR
  - dpr={[1, 1.5–1.75]}, AdaptiveDpr enabled.
  - Lower DPR on background tab; restore on focus.
- Reduced motion
  - Prefers-reduced-motion respected.
  - Disable animations/autorotate; consider a static poster instead of mounting heavy scene.
- Assets
  - Suspense around heavy models; preload during idle.
  - Meshopt/Draco decoders configured; textures compressed.
- Quality/perf toggles
  - PerformanceMonitor hooks adjust quality on poor devices.
  - Shadows/postprocessing off by default for app pages.

How it maps to this project
- The Hub (/hub), Scale (/scale), and PromptBro (/promptbro) pages should remain snappy while streaming and background jobs run. If you add 3D flourishes:
  - Use the dynamic client-only Canvas pattern and frameloop="demand".
  - Clamp DPR and enable AdaptiveDpr to protect against FPS dips on laptops/phones.
  - Respect reduced motion; for many app screens, skip mounting 3D entirely for reduced-motion users.
  - Avoid any continuous animation unless directly user-triggered.
- Testing wise, keep your Playwright/Lighthouse runs as part of CI measuring TTI/CLS with and without Canvas mounted. Ensure the Canvas is not interfering with SSE updates or causing hydration warnings.

If you want, I can provide a ready-made R3F “decorative background” component tuned for demand-loop, reduced motion, and SSR-safe dynamic import that you can drop into any of the App Router pages, along with an IntersectionObserver wrapper to only mount when visible.


---

*Generated by Task Master Research Command*  
*Timestamp: 2025-08-11T15:16:57.907Z*
