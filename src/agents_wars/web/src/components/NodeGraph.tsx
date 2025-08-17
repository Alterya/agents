"use client";
import dynamic from "next/dynamic";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

type Node = { id: string; group?: number; route?: string };
type Link = { source: string; target: string };

export default function NodeGraph() {
  const router = useRouter();
  const data = useMemo(() => {
    const nodes: Node[] = Array.from({ length: 20 }, (_, i) => ({
      id: `n${i + 1}`,
      group: (i % 4) + 1,
    }));
    const routeMap: Record<string, string> = { n1: "/hub", n2: "/scale", n3: "/promptbro" };
    for (const n of nodes) if (routeMap[n.id]) n.route = routeMap[n.id];
    const links: Link[] = [];
    for (let i = 0; i < nodes.length - 1; i++)
      links.push({ source: nodes[i].id, target: nodes[i + 1].id });
    return { nodes, links } as { nodes: Node[]; links: Link[] };
  }, []);

  const prefersReducedMotion = usePrefersReducedMotion();
  const cooldownTime = prefersReducedMotion ? 0 : 2000;
  const ref = useRef<any>(null);
  const [hovered, setHovered] = useState<Node | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (!ref.current) return;
    // Reduce work on low motion preference
    ref.current?.d3VelocityDecay?.(prefersReducedMotion ? 0.9 : 0.4);
  }, [prefersReducedMotion]);

  return (
    <div
      className="relative"
      onMouseMove={(e) => setMousePos({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY })}
      style={{ width: "100%", height: 280 }}
      aria-label="Node graph"
      role="img"
      data-testid="capabilities-graph"
    >
      <ForceGraph2D
        ref={ref as any}
        graphData={data as any}
        nodeAutoColorBy="group"
        cooldownTime={cooldownTime}
        onNodeHover={(n: any) => {
          const node = (n as Node) || null;
          setHovered(node);
          if (typeof document !== "undefined") document.body.style.cursor = node?.route ? "pointer" : "default";
        }}
        onNodeClick={(n: any) => {
          const node = n as Node;
          if (node?.route) router.push(node.route);
        }}
        nodePointerAreaPaint={(node, color, ctx) => {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc((node as any).x, (node as any).y, 8, 0, 2 * Math.PI, false);
          ctx.fill();
        }}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = String((node as any).id);
          const fontSize = 8 / globalScale;
          ctx.font = `${fontSize}px sans-serif`;
          ctx.fillStyle = (node as any).color || "#60a5fa";
          ctx.beginPath();
          ctx.arc((node as any).x!, (node as any).y!, 3, 0, 2 * Math.PI, false);
          ctx.fill();
          ctx.fillStyle = "#e5e7eb";
          ctx.fillText(label, (node as any).x! + 4, (node as any).y! + 2);
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

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}
