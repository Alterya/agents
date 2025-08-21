"use client";
import { useEffect, useState } from "react";

/**
 * Connected to: Task 4 (Landing page). Type: frontend/utilities
 * Returns true when user prefers reduced motion.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(!!mq.matches);
    onChange();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
    // Fallback for older browsers (cast to any for legacy API)
    (mq as any).addListener?.(onChange);
    return () => {
      (mq as any).removeListener?.(onChange);
    };
  }, []);

  return reduced;
}
