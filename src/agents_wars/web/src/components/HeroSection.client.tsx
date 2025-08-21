"use client";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import CanvasErrorBoundary from "@/components/CanvasErrorBoundary";
import Scene from "@/components/Scene.client";

export default function HeroSection() {
  const reduced = usePrefersReducedMotion();
  return (
    <section className="rounded-xl bg-slate-900/70 p-3">
      <h2 className="mb-2 text-blue-400">3D Scene</h2>
      {reduced ? (
        <div
          className="h-[280px] w-full rounded-xl"
          style={{
            background:
              "radial-gradient( circle at 30% 30%, rgba(56,189,248,0.35), rgba(2,6,23,1) 60% ), linear-gradient( to bottom right, rgba(29,78,216,0.25), rgba(2,6,23,1) )",
          }}
          aria-label="Agent Wars hero"
          data-testid="hero-fallback"
        />
      ) : (
        <CanvasErrorBoundary>
          <Scene />
        </CanvasErrorBoundary>
      )}
    </section>
  );
}
