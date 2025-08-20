"use client";
import dynamic from "next/dynamic";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  ForceGraph2DInstance,
  ForceGraphNode,
} from "react-force-graph-2d";
import { graphRouteMap } from "@/lib/graphRoutes";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

type Node = ForceGraphNode & { id: string; group?: number; route?: string };
type Link = { source: string; target: string };

export default function NodeGraph() {
  const router = useRouter();
  const data = useMemo(() => {
    const nodes: Node[] = Array.from({ length: 20 }, (_, i) => ({
      id: `n${i + 1}`,
      group: (i % 4) + 1,
    }));
    for (const n of nodes) if (graphRouteMap[n.id]) n.route = graphRouteMap[n.id];
    const links: Link[] = [];
    for (let i = 0; i < nodes.length - 1; i++)
      links.push({ source: nodes[i].id, target: nodes[i + 1].id });
    return { nodes, links } as { nodes: Node[]; links: Link[] };
  }, []);

  const prefersReducedMotion = usePrefersReducedMotion();
  const cooldownTime = prefersReducedMotion ? 0 : 2000;
  const ref = useRef<ForceGraph2DInstance | null>(null);
  const [hovered, setHovered] = useState<Node | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Expose a minimal test hook in non-production to trigger routing deterministically from E2E
  useEffect(() => {
    if (typeof window === "undefined" || process.env.NODE_ENV === "production") return;
    (window as any).__clickGraphNode = (id: string) => {
      const node = data.nodes.find((n) => String(n.id) === id);
      if (node?.route) router.push(node.route);
    };
    return () => {
      try {
        delete (window as any).__clickGraphNode;
      } catch {}
    };
  }, [data, router]);

  useEffect(() => {
    if (!ref.current) return;
    // Reduce work on low motion preference
    ref.current.d3VelocityDecay(prefersReducedMotion ? 0.9 : 0.4);
  }, [prefersReducedMotion]);

  return (
    <div
      className="relative"
      onMouseMove={(e) => setMousePos({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY })}
      style={{ width: "100%", height: 280 }}
      aria-label="Node graph"
      role="img"
      data-testid="capabilities-graph"
      tabIndex={0}
      onKeyDown={(e) => {
        if (!hovered?.route) return;
        if (e.key === "Enter" || e.key === " ") router.push(hovered.route);
      }}
    >
      <ForceGraph2D
        ref={ref}
        graphData={data}
        nodeAutoColorBy="group"
        cooldownTime={cooldownTime}
        // improve basic keyboard accessibility: focusable container handles Enter/Space to activate hovered node
        onNodeHover={(n) => {
          const node = (n as Node) || null;
          setHovered(node);
          if (typeof document !== "undefined") document.body.style.cursor = node?.route ? "pointer" : "default";
        }}
        onNodeClick={(n) => {
          const node = n as Node;
          if (node?.route) router.push(node.route);
        }}
        nodePointerAreaPaint={(node, color, ctx) => {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc((node as ForceGraphNode).x!, (node as ForceGraphNode).y!, 8, 0, 2 * Math.PI, false);
          ctx.fill();
        }}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = String((node as ForceGraphNode).id);
          const fontSize = 8 / globalScale;
          ctx.font = `${fontSize}px sans-serif`;
          // color is added by library; keep fallback
          ctx.fillStyle = (node as any).color || "#60a5fa";
          ctx.beginPath();
          ctx.arc((node as ForceGraphNode).x!, (node as ForceGraphNode).y!, 3, 0, 2 * Math.PI, false);
          ctx.fill();
          ctx.fillStyle = "#e5e7eb";
          ctx.fillText(label, (node as ForceGraphNode).x! + 4, (node as ForceGraphNode).y! + 2);
        }}
      />
      {hovered && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-6 rounded-md bg-slate-800/90 px-2 py-1 text-xs text-slate-100 shadow"
          style={{ left: mousePos.x, top: mousePos.y }}
          role="tooltip"
        >
          {hovered.id}
          {hovered.route ? ` → ${hovered.route}` : ""}
        </div>
      )}
    </div>
  );
}
