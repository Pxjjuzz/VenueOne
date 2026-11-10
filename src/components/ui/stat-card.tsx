import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  href,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  href?: string;
}) {
  const tones = {
    neutral: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    danger: "text-error",
    info: "text-info",
  } as const;

  const content = (
    <div className="surface-card h-full p-4 transition-shadow hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
        {icon ? <span className="text-muted" aria-hidden="true">{icon}</span> : null}
      </div>
      <p className={cn("mt-3 font-display text-[1.9rem] font-semibold leading-none tracking-[-0.04em] tabular", tones[tone])}>
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs leading-relaxed text-muted">{hint}</p> : null}
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block rounded-[var(--radius-md)] focus-visible:outline-2">
        {content}
      </a>
    );
  }
  return content;
}

export function MetricRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>{children}</div>
  );
}

export function InfoRow({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 py-2.5", className)}>
      <dt className="text-[0.8125rem] text-muted">{label}</dt>
      <dd className="text-right text-[0.8125rem] font-medium text-foreground">{value}</dd>
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("surface-card overflow-hidden", className)}>
      {title ? (
        <div className="flex flex-col gap-2 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="font-display text-base font-semibold tracking-[-0.02em] text-foreground">{title}</h2>
            {description ? <p className="mt-0.5 text-xs leading-relaxed text-muted">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}
