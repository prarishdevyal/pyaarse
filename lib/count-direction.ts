export type CountDirection = "up" | "down" | null;

/** Which way a counter should roll when its value changes; null on first render or no change. */
export function countDirection(prev: number | null, next: number): CountDirection {
  if (prev === null || prev === next) return null;
  return next > prev ? "up" : "down";
}
