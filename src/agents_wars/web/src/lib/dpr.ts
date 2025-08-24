/**
 * Connected to: Task 4 (Landing page). Type: frontend/utilities
 * Clamp devicePixelRatio to a sane range for performance.
 */
export function clampDpr(input: number, min = 1, max = 1.5): number {
  if (Number.isNaN(input) || !Number.isFinite(input)) return min;
  if (min > max) [min, max] = [max, min];
  return Math.min(max, Math.max(min, input));
}
