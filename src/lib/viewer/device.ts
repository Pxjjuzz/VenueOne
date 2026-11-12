/**
 * Device checks for the venue viewer.
 *
 * These run in the browser only, and deliberately before any Three.js code is
 * imported. A phone must never download the viewer bundle or the model.
 */

export const VIEWER_MIN_WIDTH = 1024;

export function isDesktopViewerDevice(): boolean {
  if (typeof window === "undefined") return false;
  if (window.innerWidth < VIEWER_MIN_WIDTH) return false;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const fine = window.matchMedia("(pointer: fine)").matches;
  // Touch laptops report coarse and fine at once, so only reject a device that
  // is coarse without any fine pointer at all.
  return !coarse || fine;
}

export function hasWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const context = (canvas.getContext("webgl2") ??
      canvas.getContext("webgl")) as WebGLRenderingContext | null;
    if (!context) return false;
    context.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
