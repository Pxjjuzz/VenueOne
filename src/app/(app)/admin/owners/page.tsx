import type { Metadata } from "next";
import Link from "next/link";
import { Clock3, Mail, MapPin, Phone, Users, XCircle } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { listAdminOwnerRequests } from "@/lib/venues/queries";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { AdminOwnerDecision } from "@/components/admin/admin-owner-decision";
import { formatDateTime, pluralize } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Owner requests",
  robots: { index: false, follow: false },
};

const tabs = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
] as const;

function requestTone(status: string) {
  if (status === "approved") return "success" as const;
  if (status === "rejected") return "danger" as const;
  return "warning" as const;
}

export default async function AdminOwnerRequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : "pending";
  const requests = await listAdminOwnerRequests(status);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Owner access requests"
        description="Owner access is verified once. Approval unlocks venue drafts; each venue still needs its own publication review."
      />

      <div
        className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar"
        role="tablist"
        aria-label="Filter owner requests"
      >
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === "pending" ? "/admin/owners" : `/admin/owners?status=${tab.value}`}
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

      {requests.length === 0 ? (
        <EmptyState
          variant="venue"
          title={status === "pending" ? "No applications waiting" : "Nothing in this view"}
          description={
            status === "pending"
              ? "Owner applications appear here when someone asks to list a venue. An empty queue is a valid state."
              : "No owner applications match this filter."
          }
        />
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-muted">{pluralize(requests.length, "application")}</p>
          <ul className="grid gap-4 xl:grid-cols-2">
            {requests.map((request) => (
              <li key={request.id} className="surface-card overflow-hidden">
                <div className="border-b border-border px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-lg font-semibold tracking-[-0.025em] text-foreground">
                        {request.business_name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        Applied {formatDateTime(request.created_at)}
                      </p>
                    </div>
                    <Badge tone={requestTone(request.status)}>{request.status}</Badge>
                  </div>
                </div>

                <div className="space-y-3 px-4 py-4 sm:px-5">
                  <div className="grid gap-2 text-sm">
                    <p className="flex items-start gap-2 text-muted-strong">
                      <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      <span>
                        {request.full_name || "No name"}
                        <span className="mt-0.5 block text-xs text-muted">
                          Account status: {request.owner_status}
                        </span>
                      </span>
                    </p>
                    <p className="flex items-start gap-2 text-muted-strong">
                      <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      <a href={`mailto:${request.email}`} className="break-all hover:text-foreground">
                        {request.email}
                      </a>
                    </p>
                    <p className="flex items-start gap-2 text-muted-strong">
                      <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      <a href={`tel:${request.contact_phone}`} className="hover:text-foreground">
                        {request.contact_phone}
                      </a>
                    </p>
                    <p className="flex items-start gap-2 text-muted-strong">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      {request.address}, {request.city}, {request.state} {request.pincode}
                    </p>
                  </div>

                  {request.ownership_notes ? (
                    <div className="rounded-[var(--radius-sm)] border border-border bg-surface-secondary/50 px-3 py-2.5">
                      <p className="text-[0.62rem] uppercase tracking-[0.1em] text-muted">
                        Ownership notes
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-foreground-soft">
                        {request.ownership_notes}
                      </p>
                    </div>
                  ) : null}

                  {request.rejection_reason ? (
                    <div className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-error/25 bg-error-soft px-3 py-2.5 text-xs leading-relaxed text-error">
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>{request.rejection_reason}</span>
                    </div>
                  ) : null}

                  {request.status === "pending" ? (
                    <div className="border-t border-border pt-4">
                      <AdminOwnerDecision requestId={request.id} />
                    </div>
                  ) : request.reviewed_at ? (
                    <p className="flex items-center gap-1.5 border-t border-border pt-3 text-[0.68rem] text-muted">
                      <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                      Reviewed {formatDateTime(request.reviewed_at)}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
