/** Coarse-pointer / touch detection, cached. Used to show on-screen controls. */

let cached: boolean | null = null;

export function isTouchDevice(): boolean {
  if (cached !== null) return cached;
  try {
    cached =
      (typeof window !== "undefined" &&
        (("ontouchstart" in window) ||
          (navigator.maxTouchPoints ?? 0) > 0 ||
          window.matchMedia?.("(pointer: coarse)").matches)) ||
      false;
  } catch {
    cached = false;
  }
  return cached;
}
