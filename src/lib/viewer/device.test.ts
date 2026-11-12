import { describe, expect, it } from "vitest";
import {
  VIEWER_MIN_WIDTH,
  hasWebGL,
  isDesktopViewerDevice,
  prefersReducedMotion,
} from "@/lib/viewer/device";

describe("viewer device gate without a browser", () => {
  it("treats a renderer with no window as unsupported", () => {
    // This is the server render path. It must never claim the viewer can start,
    // otherwise the entry card would render an enabled button before hydration.
    expect(typeof window).toBe("undefined");
    expect(isDesktopViewerDevice()).toBe(false);
    expect(hasWebGL()).toBe(false);
  });

  it("reports no reduced-motion preference when the media query is unavailable", () => {
    expect(prefersReducedMotion()).toBe(false);
  });

  it("keeps the desktop breakpoint at a laptop width", () => {
    expect(VIEWER_MIN_WIDTH).toBeGreaterThanOrEqual(1024);
  });
});
