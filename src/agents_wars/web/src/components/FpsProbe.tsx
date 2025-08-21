"use client";
import { useEffect } from "react";

export default function FpsProbe() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (mq?.matches) return;
    let raf = 0;
    let frames = 0;
    let start = performance.now();
    const sample = () => {
      frames += 1;
      const now = performance.now();
      if (now - start >= 1000) {
        const fps = Math.round((frames * 1000) / (now - start));
        (window as any).__fpsSample = fps;
        frames = 0;
        start = now;
      }
      raf = requestAnimationFrame(sample);
    };
    raf = requestAnimationFrame(sample);
    return () => cancelAnimationFrame(raf);
  }, []);
  return null;
}
