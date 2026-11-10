import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { listLegalPages } from "@/lib/legal";
import { AdminLegalEditor } from "@/components/admin/admin-legal-editor";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Legal pages",
  robots: { index: false, follow: false },
};

const SLUG_LABELS: Record<string, string> = {
  terms: "Terms",
  privacy: "Privacy",
  "refund-policy": "Refund policy",
  about: "About",
  contact: "Contact",
};

export default async function AdminLegalPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const pages = await listLegalPages();
  const order = ["terms", "privacy", "refund-policy", "about", "contact"];
  const orderedPages = [...pages].sort((a, b) => {
    const ai = order.indexOf(a.slug);
    const bi = order.indexOf(b.slug);
    return (ai === -1 ? order.length : ai) - (bi === -1 ? order.length : bi);
  });
  const requested = typeof params.slug === "string" ? params.slug : "";
  const selected =
    orderedPages.find((page) => page.slug === requested) ??
    orderedPages.find((page) => page.slug === "terms") ??
    orderedPages[0];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Money & policy"
        title="Legal and policy pages"
        description="Public policy text is stored in the database so it can be corrected without a deploy. Pages marked for review show a visible draft notice until a qualified reviewer signs them off."
      />

      {pages.length === 0 ? (
        <EmptyState
          variant="generic"
          title="No legal pages found"
          description="The seeded policy pages are missing. Run the database migrations before editing policy text."
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[240px_1fr]">
          <nav aria-label="Policy pages" className="space-y-1.5">
            {orderedPages.map((page) => {
              const active = page.slug === selected.slug;
              return (
                <Link
                  key={page.slug}
                  href={`/admin/legal?slug=${page.slug}`}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "border-primary/30 bg-primary-soft text-primary"
                      : "border-border bg-surface text-foreground-soft hover:border-primary/40",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="truncate">{SLUG_LABELS[page.slug] ?? page.title}</span>
                  {page.requires_legal_review ? (
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning"
                      title="Requires legal review"
                    />
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="space-y-4">
            <div className="surface-card p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[0.62rem] uppercase tracking-[0.12em] text-muted">
                    /{selected.slug}
                  </p>
                  <h2 className="mt-1 font-display text-lg font-semibold tracking-[-0.02em] text-foreground">
                    {selected.title}
                  </h2>
                  <p className="mt-1 text-xs text-muted">
                    Last updated {formatDateTime(selected.updated_at)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={selected.requires_legal_review ? "warning" : "success"}>
                    {selected.requires_legal_review ? "Draft notice shown" : "Reviewed"}
                  </Badge>
                  <Link
                    href={`/${selected.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-4"
                  >
                    View public page
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </Link>
                </div>
              </div>

              <div
                className={cn(
                  "mt-4 flex items-start gap-2.5 rounded-[var(--radius-sm)] border px-3 py-2.5 text-xs leading-relaxed",
                  selected.requires_legal_review
                    ? "border-warning/30 bg-warning-soft text-warning"
                    : "border-success/25 bg-success-soft text-success",
                )}
              >
                {selected.requires_legal_review ? (
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                )}
                <span>
                  {selected.requires_legal_review
                    ? "This page still requires legal review. Placeholders in square brackets must be replaced with real business details."
                    : "This page has been marked as reviewed. Re-check it whenever business details, fees or the refund policy change."}
                </span>
              </div>
            </div>

            <div className="surface-card p-4 sm:p-5">
              <AdminLegalEditor
                page={{
                  slug: selected.slug,
                  title: selected.title,
                  contentMd: selected.content_md,
                  requiresLegalReview: selected.requires_legal_review,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
