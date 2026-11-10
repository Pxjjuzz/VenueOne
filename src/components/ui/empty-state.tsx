import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "hall" | "ground" | "booking" | "venue" | "search" | "generic";

function Artwork({ variant }: { variant: Variant }) {
  if (variant === "ground") {
    return (
      <svg viewBox="0 0 220 130" className="h-28 w-auto" aria-hidden="true" fill="none">
        <rect x="20" y="26" width="180" height="86" rx="3" stroke="var(--border-strong)" />
        <path d="M110 26v86" stroke="var(--border-strong)" />
        <circle cx="110" cy="69" r="18" stroke="var(--border-strong)" />
        <path d="M20 52h26v34H20M200 52h-26v34h26" stroke="var(--border-strong)" />
        <rect x="20" y="26" width="180" height="86" fill="var(--accent-soft)" opacity="0.45" />
        <path d="M56 118h108" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (variant === "booking") {
    return (
      <svg viewBox="0 0 220 130" className="h-28 w-auto" aria-hidden="true" fill="none">
        <rect x="34" y="18" width="152" height="96" rx="4" stroke="var(--border-strong)" />
        <path d="M34 44h152" stroke="var(--border-strong)" />
        <path d="M64 12v14M156 12v14" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="m91 76 12 12 26-28" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="34" y="18" width="152" height="26" fill="var(--primary-soft)" />
      </svg>
    );
  }

  if (variant === "venue") {
    return (
      <svg viewBox="0 0 220 130" className="h-28 w-auto" aria-hidden="true" fill="none">
        <path d="M42 104V54l68-32 68 32v50" stroke="var(--border-strong)" />
        <path d="M78 104V70a32 32 0 0 1 64 0v34" stroke="var(--border-strong)" />
        <path d="M42 104h136" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="110" y="22" width="34" height="12" fill="var(--accent)" opacity="0.8" />
      </svg>
    );
  }

  if (variant === "search") {
    return (
      <svg viewBox="0 0 220 130" className="h-28 w-auto" aria-hidden="true" fill="none">
        <circle cx="100" cy="58" r="30" stroke="var(--border-strong)" />
        <path d="m122 80 24 24" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />
        <path d="M58 108h104" stroke="var(--border-strong)" />
      </svg>
    );
  }

  if (variant === "hall") {
    return (
      <svg viewBox="0 0 220 130" className="h-28 w-auto" aria-hidden="true" fill="none">
        <path d="M34 104V58l76-38 76 38v46" stroke="var(--border-strong)" />
        <path d="M74 104V74a36 36 0 0 1 72 0v30" stroke="var(--border-strong)" />
        <path d="M34 104h152" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M98 104V82a12 12 0 0 1 24 0v22" stroke="var(--border-strong)" />
        <rect x="34" y="58" width="152" height="6" fill="var(--accent)" opacity="0.55" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 220 130" className="h-28 w-auto" aria-hidden="true" fill="none">
      <rect x="48" y="30" width="124" height="72" rx="4" stroke="var(--border-strong)" />
      <path d="M48 54h124M48 78h124M82 30v72M138 30v72" stroke="var(--border-strong)" opacity="0.7" />
      <rect x="48" y="30" width="124" height="72" fill="var(--surface-secondary)" opacity="0.5" />
    </svg>
  );
}

export function EmptyState({
  title,
  description,
  action,
  variant = "generic",
  className,
  compact = false,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  variant?: Variant;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-lg)] border border-dashed border-border-strong bg-surface/65 px-6 text-center",
        compact ? "py-9" : "py-14",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 grid-floor opacity-50" aria-hidden="true" />
      <div className="relative mx-auto flex max-w-md flex-col items-center">
        <Artwork variant={variant} />
        <h2 className="mt-4 font-display text-xl font-semibold tracking-[-0.025em] text-foreground">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}
