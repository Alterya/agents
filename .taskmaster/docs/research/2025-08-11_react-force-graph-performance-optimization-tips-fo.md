---
title: Research Session
query: "react-force-graph performance optimization tips for 2D graphs in React (cooldownTicks, nodeCanvasObject, hover tooltips) (2024-2025)."
date: 8/11/2025
time: 6:19:10 PM
timestamp: 2025-08-11T15:19:10.860Z
exchanges: 1
---

# Research Session

## Initial Query

**Question:** react-force-graph performance optimization tips for 2D graphs in React (cooldownTicks, nodeCanvasObject, hover tooltips) (2024-2025).

**Response:**

Below is a field-tested set of performance and UX optimization patterns for react-force-graph 2D in modern React/Next.js (2024–2025). It focuses on three hot spots you called out—cooldownTicks, nodeCanvasObject, and hover tooltips—and extends to engine selection, pointer/hover handling, streaming updates, and rendering trade-offs. I’ll include concrete code you can drop into a Next.js page/component, plus guidance tailored to our project where we’ll likely show dynamic, streaming graphs (e.g., conversations, agent interactions) with relatively modest sizes (tens to a few hundreds of nodes), but with potential bursts of updates.

Key principles
- Start and stop the physics deliberately: Tune warmupTicks and cooldownTicks/Time so you stabilize quickly and then “freeze” to stop unnecessary CPU.
- Draw your nodes yourself: Use nodeCanvasObject to render minimal shapes and labels with caching. Avoid per-frame expensive calls (e.g., measureText) and reduce DOM churn.
- Keep hover light: Show tooltips via a single absolutely-positioned HTML element, updated sparingly; avoid re-rendering the graph component.
- Scale complexity down: Disable costly visual features (arrows, particles, heavy text) when zoomed out or for large graphs to keep FPS high.
- Avoid React re-renders: Use refs and memoization for callbacks; imperatively control the graph via fgRef rather than changing props frequently.

1) Choose the right engine and “stabilization” settings
- Engine selection:
  - d3-force (default): Excellent for small–mid graphs (up to ~2–5k nodes with careful tuning).
  - ngraph: Better for larger graphs (10k+ nodes). react-force-graph supports forceEngine="ngraph" and ngraphPhysics config. Use it when growth or steady-state >5k nodes is expected.
- Stabilization knobs:
  - warmupTicks: Number of simulation ticks before the first render. For busy initial layouts, a small warmup smooths out the first paint.
  - cooldownTicks: Number of ticks to run after (re)heat before stopping the engine to “freeze” the layout. Use a finite value (e.g., 60–300) to save CPU.
  - cooldownTime: Alternative to cooldownTicks (milliseconds). Pick one or the other. Time is easier to reason about for variable graph sizes.
- Practical heuristics:
  - warmupTicks: ~30–60 for small graphs; ~80–120 as node count grows (logarithmic scaling is fine).
  - cooldownTicks: ~60–120 for small graphs; ~150–300 for larger graphs; or cooldownTime ~1500–2500ms.
  - Use onEngineStop to do any final drawing tweaks or to trigger UI state that indicates “stable”.

2) Render strategy: nodeCanvasObject, linkCanvasObject, and caching
- Prefer Canvas over SVG for 2D:
  - ForceGraph2D is Canvas-based. It’s significantly faster than SVG for mid/large graphs.
- Use nodeCanvasObject to fully control node drawing:
  - Return 'replace' in nodeCanvasObjectMode to avoid the default drawing.
  - Cache text metrics (measureText) and precompute label widths/heights once per data load or when labels change. Re-computing this on every frame kills FPS.
  - Don’t build new objects/strings in your draw loop; compute them up-front or memoize.
- Optimize link rendering:
  - Keep links as straight lines; avoid heavy link labels or directionalParticles.
  - If you need custom links, use linkCanvasObject similarly and keep it simple.
  - For large graphs, consider hiding links when zoomed out (linkVisibility) or drawing only a subset.
- Antialias and pixel ratio:
  - Set pixelRatio to 1 on large graphs or low-power devices to reduce work on the Canvas.
  - For desktop retina displays and small graphs, 2 looks crisp.

3) Hover and tooltips: keep it outside the Canvas and don’t re-render the graph
- Use a single absolutely-positioned HTML tooltip overlay positioned via fgRef.graph2ScreenCoords(node.x, node.y).
- Update tooltip position/state via onNodeHover with lightweight throttling (requestAnimationFrame or a short debounce). Do not set React state on every mousemove; coalesce updates.
- Use nodePointerAreaPaint to enlarge the hit area for small nodes and reduce “missed” hovers while keeping the visual node small.
- For links, use onLinkHover and linkHoverPrecision to fine-tune hover behavior. Set linkHoverPrecision to 1–2px; lower precision reduces computations but makes hover “harder”. For large graphs, prefer lower precision and simpler link styles.

4) Data updates in React/Next.js: avoid prop churn; use refs; batch updates
- SSR: ForceGraph2D should be dynamically imported with ssr: false in Next.js to avoid SSR issues.
- Keep a stable graphData object as long as possible. Mutating props every tick forces rebuilds.
- For streaming updates (e.g., new messages/edges in Agent Wars or Scale Testing):
  - Collect updates in a ref buffer and apply them in batches (e.g., every 250–500ms).
  - Only call fgRef.current.d3ReheatSimulation() when topology meaningfully changes (node/link structure), not for metadata tweaks.
- On large graphs, prefer engine='ngraph'. For smaller graphs, d3 is fine; just cap and freeze with cooldown.
- Avoid heavy onEngineTick logic—no deep React state updates from within it. If needed for hover repositioning, keep it minimal or throttle.

5) Visual complexity knobs: degrade gracefully
- Disable heavy features by default:
  - linkDirectionalParticles: false
  - linkDirectionalArrowLength/RelPos: keep at 0 unless essential.
  - label drawing for all nodes: only render labels at high zoom levels or for highlighted/hovered nodes.
- Progressive disclosure:
  - When zoom < threshold, show only nodes (no labels). When zoom > threshold, draw labels for hovered or selected nodes only.
- Node size and style:
  - Keep node shapes simple (circles or sprites) and stable in size. Scale linearly with nodeVal but precompute the radius per node to avoid recalculation.

6) Practical example: Optimized ForceGraph2D component (Next.js, React 18)
This example uses:
- dynamic import with ssr: false
- tuned warmup/cooldown
- nodeCanvasObject with cached label widths
- pointer area painting
- overlay HTML tooltip
- throttled hover updates
- safe defaults for large graphs (pixelRatio clamp, no arrows/particles)

```tsx
// components/OptimizedForceGraph2D.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { ForceGraphMethods } from 'react-force-graph-2d';

// Dynamic import to avoid SSR
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

type Node = {
  id: string | number;
  label?: string;
  group?: string | number;
  val?: number; // used for node size
  x?: number; y?: number; // set by engine
  // any other metadata
};

type Link = {
  source: string | number | Node;
  target: string | number | Node;
  // weight, etc.
};

type GraphData = { nodes: Node[]; links: Link[] };

type Props = {
  data: GraphData;
  width?: number;
  height?: number;
  engine?: 'd3' | 'ngraph';
  backgroundColor?: string;
};

export default function OptimizedForceGraph2D({
  data,
  width = 800,
  height = 600,
  engine = 'd3',
  backgroundColor = '#0b0f16'
}: Props) {
  const fgRef = useRef<ForceGraphMethods>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Pixel ratio: clamp for perf on large graphs
  const pixelRatio = useMemo(() => {
    const n = data?.nodes?.length || 0;
    if (n > 2000) return 1;
    return Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio : 1);
  }, [data]);

  // Heuristics for warmup/cooldown
  const { warmupTicks, cooldownTicks } = useMemo(() => {
    const n = data?.nodes?.length || 0;
    const logN = Math.log2(Math.max(2, n));
    return {
      warmupTicks: Math.min(120, Math.round(20 + logN * 15)),
      cooldownTicks: Math.min(300, Math.round(80 + logN * 25))
    };
  }, [data]);

  // Cache label widths to avoid measureText per frame
  const labelCache = useMemo(() => {
    const cache = new Map<string | number, { text: string; w: number; h: number }>();
    // Create a scratch canvas for measurement (off-DOM)
    if (typeof document !== 'undefined') {
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.font = '12px Inter, system-ui, sans-serif';
        data?.nodes?.forEach(n => {
          const text = n.label ?? String(n.id);
          const metrics = ctx.measureText(text);
          cache.set(n.id, { text, w: metrics.width, h: 12 });
        });
      }
    }
    return cache;
  }, [data]);

  // Hover state (keep minimal; no graph re-render on every move)
  const [hover, setHover] = useState<{ node: Node | null; x: number; y: number } | null>(null);
  const hoverRAF = useRef<number | null>(null);

  const setHoverThrottled = useCallback((node: Node | null) => {
    if (!fgRef.current) return;
    if (hoverRAF.current) cancelAnimationFrame(hoverRAF.current);
    hoverRAF.current = requestAnimationFrame(() => {
      if (node) {
        const { x, y } = node as any;
        if (x != null && y != null) {
          const pt = fgRef.current!.graph2ScreenCoords(x, y);
          setHover({ node, x: pt.x, y: pt.y });
        } else {
          setHover(null);
        }
      } else {
        setHover(null);
      }
    });
  }, []);

  useEffect(() => {
    return () => {
      if (hoverRAF.current) cancelAnimationFrame(hoverRAF.current);
    };
  }, []);

  // Custom node drawing
  const drawNode = useCallback((node: Node, ctx: CanvasRenderingContext2D, scale: number) => {
    const radius = Math.max(2, Math.min(8, (node.val ?? 1) * 2)); // precompute in data for best perf
    // Circle
    ctx.beginPath();
    ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = '#48a6ff'; // customize per group if needed; avoid per-frame heavy logic
    ctx.fill();

    // Draw label only when zoomed in or if hovered
    // This keeps text cost low at low zoom
    const zoom = scale;
    const showLabel = zoom > 1.2 || (hover?.node && hover.node.id === node.id);
    if (!showLabel) return;

    const cached = labelCache.get(node.id);
    if (!cached) return;
    const label = cached.text;
    const padX = 6, padY = 4;

    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // Halo for readability
    ctx.fillStyle = 'rgba(11,15,22,0.85)';
    ctx.fillRect(node.x! + radius + 3, node.y! - cached.h / 2 - padY / 2, cached.w + padX, cached.h + padY);

    // Text
    ctx.fillStyle = '#e6edf3';
    ctx.fillText(label, node.x! + radius + 3 + padX / 2, node.y!);
  }, [hover, labelCache]);

  // Pointer area (improves hover hit testing without drawing larger visual)
  const paintPointer = useCallback((node: Node, color: string, ctx: CanvasRenderingContext2D, scale: number) => {
    const baseR = Math.max(2, Math.min(8, (node.val ?? 1) * 2));
    const r = Math.max(baseR + 4, 6);
    ctx.beginPath();
    ctx.arc(node.x!, node.y!, r, 0, 2 * Math.PI, false);
    ctx.fillStyle = color;
    ctx.fill();
  }, []);

  // Configure forces once
  const onInit = useCallback((fg: ForceGraphMethods) => {
    if (engine === 'd3') {
      // Example: lightly repel nodes; tune to your data
      const charge = fg.d3Force('charge');
      if (charge) (charge as any).strength(-60);
      const collide = fg.d3Force('collide');
      if (collide) (collide as any).radius(6);
    }
    // For ngraph: fg.ngraphPhysics({ timeStep: 20, springLength: 30, ... });
  }, [engine]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width, height }}>
      <ForceGraph2D
        ref={fgRef as any}
        width={width}
        height={height}
        graphData={data}
        backgroundColor={backgroundColor}
        forceEngine={engine}
        // Stabilization
        warmupTicks={warmupTicks}
        cooldownTicks={cooldownTicks}
        // Use cooldownTime instead if you prefer time-based control:
        // cooldownTime={1800}
        // Rendering perf
        pixelRatio={pixelRatio}
        nodeId="id"
        nodeRelSize={4} // keep small; actual radius set in custom draw
        // Custom drawing
        nodeCanvasObjectMode={() => 'replace'}
        nodeCanvasObject={(node, ctx, scale) => drawNode(node as Node, ctx, scale)}
        nodePointerAreaPaint={(node, color, ctx, scale) => paintPointer(node as Node, color, ctx, scale)}
        // Links: keep simple
        linkColor={() => 'rgba(255,255,255,0.15)'}
        linkWidth={() => 1}
        linkDirectionalParticles={0}
        linkDirectionalArrowLength={0}
        linkHoverPrecision={1}
        // Interaction
        enableNodeDrag={true}
        enableZoomInteraction={true}
        onNodeHover={(node) => setHoverThrottled(node as Node | null)}
        onLinkHover={() => { /* keep light or set a separate tooltip if needed */ }}
        onEngineStop={() => {
          // Example: you can center/zoom after stabilization if desired:
          // fgRef.current?.zoomToFit(400, 50, (n: any) => true);
        }}
        onEngineTick={() => {
          // Keep empty or extremely light; heavy work here will tank FPS
        }}
        // Optional DAG mode if your graph is acyclic (td|bu|lr|rl|radial)
        // dagMode="td"
      />
      {/* Hover tooltip overlay */}
      {hover?.node && (
        <div
          style={{
            position: 'absolute',
            top: (hover.y ?? 0) + 8,
            left: (hover.x ?? 0) + 8,
            background: 'rgba(18,22,28,0.92)',
            color: '#e6edf3',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 6,
            padding: '6px 8px',
            fontSize: 12,
            pointerEvents: 'none',
            transform: 'translate(-50%, -100%)',
            whiteSpace: 'nowrap'
          }}
        >
          {hover.node.label ?? hover.node.id}
        </div>
      )}
    </div>
  );
}
```

7) Cooldown, warmup, and reheat in streaming/batch scenarios (project-aligned)
- Agent Wars Hub (Task 5) and Scale Testing (Task 6) will stream updates (messages, runs). When adding nodes/links:
  - Batch updates: Accumulate incoming changes and apply to graphData every 250–500ms to avoid thrashing. Example pattern:

```ts
// Pseudocode in parent that owns graphData
const dataRef = useRef<GraphData>({ nodes: [], links: [] });
const [data, setData] = useState<GraphData>(dataRef.current);

const pending = useRef<{ nodes: Node[]; links: Link[] }>({ nodes: [], links: [] });
const scheduleFlush = useRef<number | null>(null);

function queueUpdate(n: Node[], l: Link[]) {
  pending.current.nodes.push(...n);
  pending.current.links.push(...l);
  if (scheduleFlush.current) return;
  scheduleFlush.current = window.setTimeout(() => {
    const addN = pending.current.nodes.splice(0);
    const addL = pending.current.links.splice(0);
    // Deduplicate by id
    const seen = new Set(dataRef.current.nodes.map(n => n.id));
    const newNodes = addN.filter(n => !seen.has(n.id));
    dataRef.current = {
      nodes: [...dataRef.current.nodes, ...newNodes],
      links: [...dataRef.current.links, ...addL]
    };
    setData(dataRef.current);
    scheduleFlush.current = null;
  }, 300);
}
```

  - Reheating the simulation: If you need the graph to relax after a topology change, you can call fgRef.current?.d3ReheatSimulation() inside the child component (exposed via a prop callback). Only do this when you’ve applied a batch, not for every small change.
  - Freeze quickly: After a burst of updates stabilizes, rely on cooldownTicks/cooldownTime. If updates remain frequent (every <300ms), consider setting a lower cooldownTicks to limit CPU drain.
  - Live UX knob: Provide a “Freeze layout” toggle that sets cooldownTicks={0} and disables reheat. Useful when users just want to explore the current state.

8) Hover, pointer detection, and React state management pitfalls
- Avoid redrawing labels or changing ForceGraph props on hover. Use a single overlay tooltip and nodeCanvasObject to draw only minimal highlights. We used nodePointerAreaPaint to ensure larger hit zones for small nodes without making them visually bigger.
- Throttle setHover. Unthrottled onNodeHover can fire continuously while moving the mouse, causing React state churn and layout thrashing.
- Don’t compute text metrics per node inside nodeCanvasObject. Precompute and cache.
- Don’t close over large objects or create new callback instances every render; wrap in useCallback/useMemo to avoid unnecessary work in the Canvas draw loop.

9) Extra dials and edge cases for very large graphs
- Switch to ngraph for very large graphs:
  - <ForceGraph2D forceEngine="ngraph" ngraphPhysics={{ timeStep: 20, springLength: 25, springCoefficient: 0.0008 }} />
  - Start with conservative physics; measure, then adjust springLength and coefficient to reduce oscillation.
- Hide links until stabilized or zoomed in:
  - linkVisibility={(l) => currentZoom > 0.8}
- Conditional labels:
  - Draw labels only when scale > 1.2 or for hovered/selected nodes (as shown).
- Minimize per-frame allocations:
  - Keep colors, fonts, and radii as constants or precomputed fields.
- High-DPI screens:
  - pixelRatio=1 for N>2000 nodes, even on retina. Users will still see acceptable clarity but you cut the per-frame cost.

10) Tooling, profiling, and stability in Next.js/React 18
- Dev mode double-invocation: React Strict Mode double-invokes effects in development; make sure you don’t register listeners twice. Keep onInit idempotent.
- Resize behavior:
  - Either pass fixed width/height (as in the example) or wrap the component in a container with ResizeObserver and update size sparingly (debounced).
- Profiling:
  - Use Performance/Memory tabs in Chrome to watch frame time and GC. Look for spikes when hovering—if they appear, you likely have unthrottled state updates or per-frame allocations.
  - Use fps meter libraries or log onRenderFramePre/Post for debugging (keep disabled in production).

11) Project-specific guidance and integration ideas
- Agent Wars Hub (Task 5):
  - Consider visualizing each battle as a small graph: nodes as turns/messages or participants; links as reply edges. Typical size is small (<50 nodes), so d3 engine with warmupTicks 20–40 and cooldownTicks 60–120 is adequate.
  - Streaming updates: tune the batching window (300ms) to line up with message streaming without making the graph feel jittery. Reheat after each batch, not per message chunk.
  - Tooltips: show message snippets or agent names; cap length to avoid big layouts. For long content, show a preview and provide a click to open the full message in the chat panel.
- Scale Testing (Task 6):
  - Summarized runs can be drawn as a cluster graph: runs as nodes, grouped by outcome (goal/limit/error). Use color coding for outcome; use ngraph only if you render thousands of runs.
  - Provide a “Freeze layout” toggle so users can interact with the result without the engine running. Default to frozen after initial cooldown.
- Provider/Background tasks (Tasks 2–3):
  - If you show system prompts/models as nodes, pre-aggregate repeated models or prompts to reduce node/link counts.
  - Avoid constant graph mutation in the UI for high-frequency SSE; buffer updates and reheat sparingly.

12) Quick checklist
- Engine: d3 (small/medium) vs ngraph (large)
- warmupTicks: 20–120; cooldownTicks: 60–300 (or cooldownTime ~1.5–2.5s)
- pixelRatio: clamp to 1 for large graphs
- nodeCanvasObject: custom draw; cache label metrics
- nodePointerAreaPaint: enlarge hit area; better UX
- Hover tooltips: single overlay div; throttled updates; no prop churn
- Links: no particles/arrows by default; hide or simplify at low zoom
- Streaming: batch updates and reheat on batch, not per event
- Dev mode: dynamic import with ssr: false; memoize callbacks; avoid per-frame allocations

If you want, I can adapt the OptimizedForceGraph2D into a ready-to-use component for the /hub or /scale pages with props for “freeze,” “engine,” and a tooltip renderer that formats Agent/Message data from our Prisma models.


---

*Generated by Task Master Research Command*  
*Timestamp: 2025-08-11T15:19:10.860Z*
