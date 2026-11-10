import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

function buildHref(basePath: string, searchParams: Record<string, string | undefined>, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value && key !== "page") params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function Pagination({
  basePath,
  page,
  pageSize,
  total,
  searchParams = {},
}: {
  basePath: string;
  page: number;
  pageSize: number;
  total: number;
  searchParams?: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;

  const prev = Math.max(1, page - 1);
  const next = Math.min(totalPages, page + 1);
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  return (
    <nav className="flex items-center justify-between gap-3 border-t border-border pt-4" aria-label="Pagination">
      <p className="text-xs text-muted tabular">
        {start}–{end} of {total}
      </p>
      <div className="flex items-center gap-1.5">
        {page > 1 ? (
          <Link
            href={buildHref(basePath, searchParams, prev)}
            className="inline-flex h-9 items-center gap-1 rounded-[var(--radius-sm)] border border-border-strong bg-surface px-3 text-xs font-medium hover:bg-surface-secondary"
            rel="prev"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" /> Previous
          </Link>
        ) : (
          <span className="inline-flex h-9 items-center gap-1 rounded-[var(--radius-sm)] border border-border bg-surface-secondary px-3 text-xs font-medium text-muted">
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" /> Previous
          </span>
        )}
        <span className="hidden px-2 text-xs text-muted tabular sm:inline">
          Page {page} of {totalPages}
        </span>
        {page < totalPages ? (
          <Link
            href={buildHref(basePath, searchParams, next)}
            className="inline-flex h-9 items-center gap-1 rounded-[var(--radius-sm)] border border-border-strong bg-surface px-3 text-xs font-medium hover:bg-surface-secondary"
            rel="next"
          >
            Next <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        ) : (
          <span className="inline-flex h-9 items-center gap-1 rounded-[var(--radius-sm)] border border-border bg-surface-secondary px-3 text-xs font-medium text-muted">
            Next <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        )}
      </div>
    </nav>
  );
}

export function TableShell({
  children,
  className,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <table className="w-full min-w-[640px] border-collapse text-left text-sm" aria-label={label}>
        {children}
      </table>
    </div>
  );
}

export function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-border px-3 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-muted",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("border-b border-border/70 px-3 py-3 align-middle text-[0.8125rem]", className)}>{children}</td>;
}
