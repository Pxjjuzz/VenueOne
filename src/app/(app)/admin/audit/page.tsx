import type { Metadata } from "next";
import Link from "next/link";
import { History, Search, ShieldCheck } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { listAuditLogs } from "@/lib/admin/service";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { formatDateTime, pluralize } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Audit log",
  robots: { index: false, follow: false },
};

const LIMIT = 200;

function filterHref(entity: string, q: string) {
  const search = new URLSearchParams();
  if (entity !== "all") search.set("entity", entity);
  if (q) search.set("q", q);
  const query = search.toString();
  return query ? `/admin/audit?${query}` : "/admin/audit";
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const entity = typeof params.entity === "string" ? params.entity : "all";
  const q = typeof params.q === "string" ? params.q.trim() : "";

  const logs = await listAuditLogs(LIMIT);
  const entityTypes = Array.from(new Set(logs.map((log) => log.entity_type))).sort();
  const needle = q.toLowerCase();

  const filtered = logs.filter((log) => {
    if (entity !== "all" && log.entity_type !== entity) return false;
    if (!needle) return true;
    return [log.action, log.entity_type, log.entity_id, log.actor_email]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(needle));
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="Audit log"
        description="Privileged actions recorded by the server: publication decisions, owner approvals, payment recovery, refunds, settings and policy changes. Entries are append-only."
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <form action="/admin/audit" method="get" className="flex w-full max-w-md gap-2">
          {entity !== "all" ? <input type="hidden" name="entity" value={entity} /> : null}
          <label htmlFor="audit-search" className="sr-only">
            Search audit log
          </label>
          <Input
            id="audit-search"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search action, entity or actor…"
            className="flex-1"
          />
          <Button type="submit" variant="secondary">
            <Search className="h-4 w-4" aria-hidden="true" />
            Search
          </Button>
        </form>

        <p className="text-xs text-muted">
          Showing {pluralize(filtered.length, "entry", "entries")} from the latest {LIMIT}
        </p>
      </div>

      <div
        className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar"
        role="tablist"
        aria-label="Filter audit log by entity"
      >
        {["all", ...entityTypes].map((value) => (
          <Link
            key={value}
            href={filterHref(value, q)}
            role="tab"
            aria-selected={entity === value}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              entity === value
                ? "border-primary bg-primary text-white"
                : "border-border-strong bg-surface text-foreground-soft hover:border-primary/40",
            )}
          >
            {value === "all" ? "All entities" : value.replaceAll("_", " ")}
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          variant="search"
          title={logs.length === 0 ? "No privileged actions yet" : "No entries match"}
          description={
            logs.length === 0
              ? "Administrator decisions and money operations are written here as they happen."
              : "Try a different search term or entity filter."
          }
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((log) => {
            const metadata = log.metadata ?? {};
            const keys = Object.keys(metadata);
            return (
              <li key={log.id} className="surface-card overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3.5 sm:px-5">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius-xs)] bg-primary-soft text-primary">
                      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="break-words font-mono text-xs font-medium text-foreground">
                        {log.action}
                      </p>
                      <p className="mt-1 text-[0.68rem] text-muted">
                        {log.entity_type}
                        {log.entity_id ? (
                          <>
                            {" · "}
                            <span className="font-mono break-all">{log.entity_id}</span>
                          </>
                        ) : null}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-[0.68rem] text-muted">
                    <p className="font-medium text-foreground-soft">
                      {log.actor_email ?? "system"}
                    </p>
                    <p className="mt-0.5 inline-flex items-center gap-1">
                      <History className="h-3 w-3" aria-hidden="true" />
                      {formatDateTime(log.created_at)}
                    </p>
                  </div>
                </div>

                {keys.length > 0 ? (
                  <div className="border-t border-border bg-surface-secondary/40 px-4 py-3 sm:px-5">
                    <dl className="grid gap-x-6 gap-y-1.5 text-[0.68rem] sm:grid-cols-2 lg:grid-cols-3">
                      {keys.map((key) => {
                        const value = metadata[key];
                        return (
                          <div key={key} className="flex min-w-0 items-baseline gap-2">
                            <dt className="shrink-0 text-muted">{key}:</dt>
                            <dd className="min-w-0 break-words font-medium text-foreground-soft">
                              {typeof value === "string" || typeof value === "number"
                                ? String(value)
                                : JSON.stringify(value)}
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
