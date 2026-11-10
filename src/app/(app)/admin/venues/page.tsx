import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { listAdminVenues } from "@/lib/venues/queries";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Pagination, TableShell, Td, Th } from "@/components/ui/table";
import { formatDateTime, formatMoneyRange, pluralize } from "@/lib/format";
import { cn } from "@/lib/cn";
import { VENUE_STATUS_LABELS, venueStatusTone } from "@/lib/types";

export const metadata: Metadata = {
  title: "Venue review",
  robots: { index: false, follow: false },
};

const tabs = [
  { value: "all", label: "All" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under review" },
  { value: "approved", label: "Published" },
  { value: "rejected", label: "Rejected" },
  { value: "unpublished", label: "Unpublished" },
  { value: "suspended", label: "Suspended" },
] as const;

export default async function AdminVenuesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : "all";
  const q = typeof params.q === "string" ? params.q : "";
  const page = Math.max(1, Number(typeof params.page === "string" ? params.page : "1") || 1);

  const result = await listAdminVenues({ status, q, page, pageSize: 20 });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Venue review"
        description="Publication is a separate decision from owner access. Approving copies proposed prices into the public record."
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar"
          role="tablist"
          aria-label="Filter venues by status"
        >
          {tabs.map((tab) => (
            <Link
              key={tab.value}
              href={
                tab.value === "all"
                  ? "/admin/venues"
                  : `/admin/venues?status=${tab.value}${q ? `&q=${encodeURIComponent(q)}` : ""}`
              }
              role="tab"
              aria-selected={status === tab.value}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                status === tab.value
                  ? "border-primary bg-primary text-white"
                  : "border-border-strong bg-surface text-foreground-soft hover:border-primary/40",
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        <form action="/admin/venues" method="get" className="flex items-center gap-2">
          {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
          <label htmlFor="venue-search" className="sr-only">
            Search venues
          </label>
          <Input
            id="venue-search"
            name="q"
            defaultValue={q}
            placeholder="Search name or city"
            className="h-9 w-full sm:w-56"
          />
          <Button type="submit" variant="secondary" size="sm">
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            Search
          </Button>
        </form>
      </div>

      {result.items.length === 0 ? (
        <EmptyState
          variant="venue"
          title={q ? "No venues match this search" : "Nothing in this view"}
          description={
            q
              ? "Try a different name or city, or clear the search to see the full queue."
              : "No venues are in this state. Empty review queues are expected on a new platform."
          }
        />
      ) : (
        <section className="surface-card overflow-hidden">
          <div className="border-b border-border px-4 py-3 text-xs text-muted sm:px-5">
            {pluralize(result.total, "venue")} found
          </div>
          <TableShell label="Venues awaiting or holding publication decisions">
            <thead>
              <tr>
                <Th>Venue</Th>
                <Th>Owner</Th>
                <Th>Status</Th>
                <Th>Pricing</Th>
                <Th>Last update</Th>
                <Th>Open</Th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((venue) => (
                <tr key={venue.id} className="hover:bg-surface-secondary/40">
                  <Td>
                    <p className="font-medium text-foreground">{venue.name}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {venue.category === "hall" ? "Hall" : "Ground"}
                      {venue.city ? ` · ${venue.city}` : ""}
                    </p>
                  </Td>
                  <Td>
                    <p className="text-xs text-foreground-soft">{venue.owner_name || "—"}</p>
                    <p className="mt-0.5 text-[0.68rem] text-muted">{venue.owner_email || ""}</p>
                  </Td>
                  <Td>
                    <StatusBadge
                      status={venue.status}
                      label={VENUE_STATUS_LABELS[venue.status]}
                      tone={venueStatusTone(venue.status)}
                    />
                  </Td>
                  <Td className="tabular">
                    {formatMoneyRange(venue.min_price_paise, venue.max_price_paise)}
                  </Td>
                  <Td className="text-xs text-muted">
                    {venue.submitted_at
                      ? `Submitted ${formatDateTime(venue.submitted_at)}`
                      : formatDateTime(venue.updated_at)}
                  </Td>
                  <Td>
                    <Link
                      href={`/admin/venues/${venue.id}`}
                      className="text-xs font-medium text-primary underline underline-offset-4"
                    >
                      Review
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
          <div className="px-4 pb-4 sm:px-5">
            <Pagination
              basePath="/admin/venues"
              page={result.page}
              pageSize={result.pageSize}
              total={result.total}
              searchParams={{ status, q }}
            />
          </div>
        </section>
      )}
    </div>
  );
}
