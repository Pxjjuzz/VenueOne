import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// Card section used across the app screens. The website dashboard keeps its own
// `Panel`; this one drops the header bar so a plain heading can sit on the page
// background, which reads better on a phone.
export function AppPanel({
  title,
  hint,
  action,
  children,
  className,
}: {
  title?: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mt-6", className)} aria-label={title}>
      {title ? (
        <div className="flex items-end justify-between gap-3 px-1">
          <div className="min-w-0">
            <h2 className="text-[0.95rem] font-semibold tracking-[-0.01em] text-foreground">
              {title}
            </h2>
            {hint ? (
              <p className="mt-0.5 text-[0.78rem] leading-snug text-muted">{hint}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0 pb-0.5">{action}</div> : null}
        </div>
      ) : null}
      <div className="mt-2.5 rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-sm)]">
        {children}
      </div>
    </section>
  );
}

export function AppRow({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-border py-2.5 last:border-0 last:pb-0 first:pt-0",
        className,
      )}
    >
      <dt className="shrink-0 text-[0.8rem] text-muted">{label}</dt>
      <dd className="max-w-[64%] text-right text-[0.8rem] font-medium text-foreground">
        {value}
      </dd>
    </div>
  );
}
