Landing 3D + Node Graph: implementation notes and decisions

Installed versions (web frontend)
- next: 14.2.5 (App Router)
- @react-three/fiber: ^8.15.16
- @react-three/drei: ^9.114.3
- three: ^0.158.0
- react-force-graph-2d: ^1.28.0

Notes: Task copy referenced “R3F v9”. Current app uses R3F v8; we will proceed on v8 now and revisit v9 migration separately to avoid scope creep.

R3F performance and SSR
- Use Canvas frameloop="demand" to render only on change; switch to always during active user interaction; trigger invalidate()/performance.regress() on controls changes. See React Three Fiber scaling/pitfalls docs ([frameloop demand](https://github.com/pmndrs/react-three-fiber/blob/master/docs/advanced/scaling-performance.mdx), [controls regress](https://github.com/pmndrs/react-three-fiber/blob/master/docs/advanced/scaling-performance.mdx#_snippet_16)).
- Avoid per-frame allocations; reuse vectors and mutate via refs in useFrame (no-new-in-loop / no-clone-in-loop). See R3F pitfalls ([anti-pattern](https://github.com/pmndrs/react-three-fiber/blob/master/packages/eslint-plugin/docs/rules/no-new-in-loop.md), [correct reuse](https://github.com/pmndrs/react-three-fiber/blob/master/packages/eslint-plugin/docs/rules/no-clone-in-loop.md)).
- Use Suspense + useLoader for assets; nested Suspense for progressive LOD. ([loading](https://github.com/pmndrs/react-three-fiber/blob/master/docs/tutorials/loading-models.mdx), [nested suspense](https://github.com/pmndrs/react-three-fiber/blob/master/docs/advanced/scaling-performance.mdx#_snippet_9)).
- Prefer visibility toggles over mount/unmount to avoid recompiles. ([pitfalls](https://github.com/pmndrs/react-three-fiber/blob/master/docs/advanced/pitfalls.mdx#_snippet_8)).
- Client-only boundary: load Canvas and any three-dependent components via next/dynamic with ssr:false inside a Client Component. ([Next dynamic import](https://github.com/vercel/next.js/blob/canary/docs/01-app/02-guides/lazy-loading.mdx#_snippet_6)).

Drei helpers (adaptive quality)
- PerformanceMonitor + AdaptiveDpr to clamp DPR adaptively (baseline ~1–1.5) with onIncline/onDecline/onFallback; consider AdaptiveEvents to pause raycaster during regress. ([PerformanceMonitor](https://github.com/pmndrs/drei/blob/master/docs/performances/performance-monitor.mdx), [AdaptiveDpr](https://github.com/pmndrs/drei/blob/master/docs/performances/adaptive-dpr.mdx), [AdaptiveEvents](https://github.com/pmndrs/drei/blob/master/docs/performances/adaptive-events.mdx)).
- For static shadows, BakeShadows frames={1}. ([BakeShadows](https://github.com/pmndrs/drei/blob/master/docs/performances/bake-shadows.mdx)).

react-force-graph (2D) performance and UX
- Stabilize quickly: set cooldownTicks (~80–120) so layout settles then stops; optionally call zoomToFit on engine stop. ([fit to canvas example](https://github.com/vasturiano/react-force-graph/blob/master/example/fit-to-canvas/index.html#L1)).
- Custom draw: nodeCanvasObject with cached text metrics on node to avoid repeated measureText; pair with nodePointerAreaPaint for larger hit areas. ([text nodes example](https://github.com/vasturiano/react-force-graph/blob/master/example/text-nodes/index-2d.html#L1)).
- Expose pauseAnimation()/resumeAnimation via ref for perf when static; consider autoPauseRedraw when engine halted. ([API methods](https://github.com/vasturiano/react-force-graph/blob/master/README.md#_snippet_9), [autoPauseRedraw](https://github.com/vasturiano/react-force-graph/blob/master/README.md#_snippet_8)).

Next.js dynamic import patterns (App Router)
- Wrap browser-only libs in Client Components ('use client'); import with next/dynamic({ ssr:false }). ([client-only dynamic](https://github.com/vercel/next.js/blob/canary/docs/01-app/02-guides/single-page-applications.mdx#_snippet_5)).
- Use next/navigation hooks in Client Components for routing on node clicks.

Accessibility and reduced motion
- Honor prefers-reduced-motion: render a static hero instead of Canvas; if mounted, set frameloop='never' and stop graph animation.
- Tooltips: render as HTML overlay synchronized via requestAnimationFrame; avoid causing canvas rerenders.

Decisions to apply in code
1) 3D Canvas
   - Dynamic import client-only, frameloop='demand'.
   - Use drei PerformanceMonitor + AdaptiveDpr, clamp DPR between 1 and 1.5; avoid shadows/post.
   - Mutate via refs in useFrame; reuse objects; use Suspense for loading.
2) Node Graph
   - ForceGraph2D with cooldownTicks≈100, onEngineStop zoomToFit.
   - nodeCanvasObject + nodePointerAreaPaint; cache label widths on node.
   - Keep animations paused when idle via pauseAnimation/autoPauseRedraw as appropriate.
3) Reduced motion
   - Static fallback hero on prefers-reduced-motion/narrow screens; or frameloop='never' + no graph cooldown if mounted.
4) Tests
   - Playwright: assert [data-testid='scene-canvas'] and [data-testid='capabilities-graph'] visible; navigation via node click; reduced-motion path renders fallback; basic FPS sanity (idle ≥ ~45fps) via Performance API.

Primary sources
- React Three Fiber: performance, pitfalls, scaling, Suspense, invalidate ([docs index](https://github.com/pmndrs/react-three-fiber/tree/master/docs))
- Drei: PerformanceMonitor, AdaptiveDpr, AdaptiveEvents, BakeShadows ([docs index](https://github.com/pmndrs/drei/tree/master/docs))
- React Force Graph: README + examples ([README](https://github.com/vasturiano/react-force-graph), [examples directory](https://github.com/vasturiano/react-force-graph/tree/master/example))
- Next.js dynamic import (App Router): lazy-loading, SPA patterns ([lazy loading](https://github.com/vercel/next.js/blob/canary/docs/01-app/02-guides/lazy-loading.mdx), [SPA integration](https://github.com/vercel/next.js/blob/canary/docs/01-app/02-guides/single-page-applications.mdx))


