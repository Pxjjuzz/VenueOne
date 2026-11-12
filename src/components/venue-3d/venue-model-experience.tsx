"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useState, useSyncExternalStore } from "react";
import { Box, MonitorSmartphone, MousePointerClick, ShieldQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { hasWebGL, isDesktopViewerDevice, prefersReducedMotion } from "@/lib/viewer/device";

// The Three.js bundle is only fetched when the viewer actually opens. Importing
// this module must stay side-effect free so a phone never downloads it.
const VenueModelViewer = dynamic(() => import("./venue-model-viewer"), {
  ssr: false,
  loading: () => (
    <div className="flex aspect-[16/10] w-full items-center justify-center rounded-[var(--radius-md)] border border-border bg-[#121716]">
      <span
        className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80"
        aria-hidden="true"
      />
    </div>
  ),
});

type DeviceState = "unknown" | "ready" | "small-screen" | "no-webgl";

/**
 * Device support is an external system, so it is read through
 * useSyncExternalStore instead of an effect. The snapshot is cached because
 * probing WebGL allocates a context, and getSnapshot runs on every render.
 */
let cachedDevice: DeviceState | null = null;

function readDevice(): DeviceState {
  if (cachedDevice) return cachedDevice;
  if (!isDesktopViewerDevice()) {
    cachedDevice = "small-screen";
  } else {
    cachedDevice = hasWebGL() ? "ready" : "no-webgl";
  }
  return cachedDevice;
}

function subscribeToDevice(onChange: () => void) {
  const invalidate = () => {
    cachedDevice = null;
    onChange();
  };
  window.addEventListener("resize", invalidate);
  window.addEventListener("orientationchange", invalidate);
  return () => {
    window.removeEventListener("resize", invalidate);
    window.removeEventListener("orientationchange", invalidate);
  };
}

function serverDevice(): DeviceState {
  return "unknown";
}

export type VenueModelExperienceProps = {
  venueName: string;
  modelUrl: string;
  posterUrl: string | null;
  accuracyLabel: string;
  variant?: "public" | "admin";
  className?: string;
};

function scrollToPhotographs() {
  const target = document.getElementById("venue-gallery");
  target?.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "start",
  });
}

export function VenueModelExperience({
  venueName,
  modelUrl,
  posterUrl,
  accuracyLabel,
  variant = "public",
  className,
}: VenueModelExperienceProps) {
  const device = useSyncExternalStore(subscribeToDevice, readDevice, serverDevice);
  const [open, setOpen] = useState(false);

  const exit = useCallback(() => setOpen(false), []);

  if (open) {
    return (
      <VenueModelViewer
        url={modelUrl}
        title={variant === "admin" ? `${venueName}, admin preview` : venueName}
        accuracyLabel={accuracyLabel}
        onExit={exit}
        className={className}
      />
    );
  }

  const supportingText =
    variant === "admin"
      ? "Same viewer and same asset the customer would receive."
      : "Drag to look around, scroll to zoom, and reset the camera at any time.";

  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border border-border bg-surface",
        variant === "admin" ? "p-4" : "mt-6 p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div
          className={cn(
            "relative w-full overflow-hidden rounded-[var(--radius-sm)] border border-border bg-surface-secondary",
            variant === "admin" ? "sm:w-40" : "aspect-[16/10] sm:aspect-auto sm:h-24 sm:w-44",
          )}
        >
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt={`Interior preview of ${venueName}`}
              fill
              sizes="(max-width: 640px) 100vw, 180px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full min-h-24 w-full items-center justify-center bg-[linear-gradient(145deg,#efede5,#ded9cb)]">
              <Box className="h-6 w-6 text-muted" aria-hidden="true" />
            </div>
          )}
          <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-white">
            3D
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[1.05rem] font-semibold tracking-[-0.02em] text-foreground">
            {variant === "admin" ? "3D model preview" : "Walk through this space"}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">{supportingText}</p>
          <p className="mt-1 flex items-start gap-1.5 text-xs leading-relaxed text-muted">
            <ShieldQuestion className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            {accuracyLabel}. Not a measured survey.
          </p>
        </div>

        <div className="shrink-0">
          {device === "small-screen" ? (
            <div className="rounded-[var(--radius-sm)] border border-border bg-surface-secondary px-3 py-2.5">
              <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted">
                <MonitorSmartphone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                Interactive 3D needs a laptop or desktop. It is not loaded on phones,
                to save data.
              </p>
              {variant === "public" ? (
                <button
                  type="button"
                  onClick={scrollToPhotographs}
                  className="mt-2 text-xs font-semibold text-primary underline underline-offset-4"
                >
                  Back to photographs
                </button>
              ) : null}
            </div>
          ) : (
            <Button
              type="button"
              variant={variant === "admin" ? "secondary" : "primary"}
              size="sm"
              onClick={() => {
                if (device === "ready") setOpen(true);
              }}
              disabled={device === "no-webgl"}
              loading={device === "unknown"}
            >
              {device === "no-webgl" ? (
                <MonitorSmartphone className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <MousePointerClick className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {device === "no-webgl" ? "WebGL unavailable" : "Explore in 3D"}
            </Button>
          )}
        </div>
      </div>

      {device === "no-webgl" ? (
        <p className="mt-3 text-xs leading-relaxed text-warning">
          This browser cannot start WebGL, so the 3D viewer is unavailable. The
          photographs and details below are unaffected.
        </p>
      ) : null}
    </div>
  );
}
