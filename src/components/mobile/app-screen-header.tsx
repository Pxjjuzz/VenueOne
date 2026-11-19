import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Detail screens get a floating back chip and a single line of context, the way
// a native navigation bar behaves. The tab bar is hidden on these routes.
export function AppScreenHeader({
  backHref,
  backLabel,
  title,
  hint,
  action,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 bg-background/92 px-3 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] backdrop-blur">
      <Link
        href={backHref}
        aria-label={backLabel}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface text-foreground shadow-[var(--shadow-sm)] transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        {hint ? <p className="truncate text-[0.7rem] text-muted">{hint}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
