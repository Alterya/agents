"use client";
import dynamic from "next/dynamic";
import React, { useEffect, useMemo, useRef, useState } from "react";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

type Node = { id: string; group?: number };
type Link = { source: string; target: string };

export default function NodeGraph() {
  const data = useMemo(() => {
    const nodes: Node[] = Array.from({ length: 20 }, (_, i) => ({
      id: `n${i + 1}`,
      group: (i % 4) + 1,
    }));
    const links: Link[] = [];
    for (let i = 0; i < nodes.length - 1; i++)
      links.push({ source: nodes[i].id, target: nodes[i + 1].id });
    return { nodes, links } as { nodes: Node[]; links: Link[] };
  }, []);

  const prefersReducedMotion = usePrefersReducedMotion();
  const cooldownTime = prefersReducedMotion ? 0 : 2000;
  const ref = useRef<any>(null);

  useEffect(() => {
    if (!ref.current) return;
    // Reduce work on low motion preference
    ref.current?.d3VelocityDecay?.(prefersReducedMotion ? 0.9 : 0.4);
  }, [prefersReducedMotion]);

  return (
    <div style={{ width: "100%", height: 280 }} aria-label="Node graph" role="img">
      <ForceGraph2D
        ref={ref as any}
        graphData={data as any}
        nodeAutoColorBy="group"
        cooldownTime={cooldownTime}
        nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
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
