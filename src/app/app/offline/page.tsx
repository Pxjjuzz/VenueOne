import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-secondary text-muted">
        <WifiOff className="h-5 w-5" aria-hidden="true" />
      </span>
      <h1 className="mt-4 font-display text-xl font-semibold tracking-[-0.02em] text-foreground">
        You are offline
      </h1>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">
        Venue availability is checked live, so bookings need a connection. Reconnect and
        try again.
      </p>
      <Link
        href="/app"
        className="mt-6 inline-flex h-11 items-center rounded-[var(--radius-sm)] bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover"
      >
        Try again
      </Link>
    </div>
  );
}
