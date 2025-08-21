import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

function mockMatchMedia(matches: boolean) {
  (global as any).window = (global as any).window || {};
  (window as any).matchMedia = (query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

describe("usePrefersReducedMotion", () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it("returns false by default", () => {
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });

  it("returns true when media query matches", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);
  });
});
