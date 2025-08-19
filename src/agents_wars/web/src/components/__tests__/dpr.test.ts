import { describe, expect, it } from "vitest";
import { clampDpr } from "@/lib/dpr";

describe("clampDpr", () => {
  it("clamps within default 1..1.5", () => {
    expect(clampDpr(0.5)).toBe(1);
    expect(clampDpr(1.25)).toBe(1.25);
    expect(clampDpr(2)).toBe(1.5);
  });

  it("handles custom bounds and swaps when min>max", () => {
    expect(clampDpr(3, 0.75, 1.25)).toBe(1.25);
    expect(clampDpr(0.5, 1.25, 0.75)).toBe(0.75);
  });

  it("handles NaN/Infinity", () => {
    // @ts-expect-error intentional NaN
    expect(clampDpr(NaN)).toBe(1);
    expect(clampDpr(Infinity)).toBe(1);
  });
});


