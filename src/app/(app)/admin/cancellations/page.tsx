import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Clock3, IndianRupee, Mail } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { listAdminCancellations } from "@/lib/booking/queries";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { AdminCancellationDecision } from "@/components/admin/admin-cancellation-decision";
import { formatDateTime, formatMoney, pluralize } from "@/lib/format";
import { cn } from "@/lib/cn";
import { CANCELLATION_STATUS_LABELS } from "@/lib/types";

export const metadata: Metadata = {
  title: "Cancellations",
  robots: { index: false, follow: false },
};

const tabs = [
  { value: "requested", label: "Requested" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "all", label: "All" },
] as const;

function cancellationTone(status: string) {
  if (status === "approved") return "success" as const;
  if (status === "rejected") return "danger" as const;
  if (status === "withdrawn") return "neutral" as const;
  return "warning" as const;
}

export default async function AdminCancellationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : "requested";
  const cancellations = await listAdminCancellations(status);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Money & policy"
        title="Cancellation requests"
        description="Approving a cancellation releases the slot. Refund creation is calculated from the policy saved with the booking and processed separately."
      />

      <div
        className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar"
        role="tablist"
        aria-label="Filter cancellations"
      >
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={
              tab.value === "requested"
                ? "/admin/cancellations"
                : `/admin/cancellations?status=${tab.value}`
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

      {cancellations.length === 0 ? (
        <EmptyState
          variant="booking"
          title={status === "requested" ? "No cancellations awaiting review" : "Nothing in this view"}
          description={
            status === "requested"
              ? "Customer cancellation requests appear here when they need an administrator decision."
              : "No cancellations match this filter."
          }
        />
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-muted">{pluralize(cancellations.length, "cancellation")}</p>
          <ul className="grid gap-4 xl:grid-cols-2">
            {cancellations.map((cancellation) => (
              <li key={cancellation.id} className="surface-card overflow-hidden">
                <div className="border-b border-border px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-base font-semibold tracking-[-0.02em] text-foreground">
                        {cancellation.booking_reference}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {cancellation.venue_name} · {cancellation.customer_email}
                      </p>
                    </div>
                    <Badge tone={cancellationTone(cancellation.status)}>
                      {CANCELLATION_STATUS_LABELS[cancellation.status]}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.68rem] text-muted">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" aria-hidden="true" />
                      Starts {formatDateTime(cancellation.starts_at)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3 w-3" aria-hidden="true" />
                      Requested {formatDateTime(cancellation.created_at)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3 w-3" aria-hidden="true" />
                      Payment {cancellation.payment_status}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 px-4 py-4 sm:px-5">
                  <div>
                    <p className="text-[0.62rem] uppercase tracking-[0.1em] text-muted">
                      Customer reason
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-strong">
                      {cancellation.reason}
                    </p>
                  </div>

                  <dl className="grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs">
                    <div>
                      <dt className="text-muted">Booking total</dt>
                      <dd className="mt-0.5 font-medium text-foreground tabular">
                        {formatMoney(cancellation.total_paise)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Calculated refund</dt>
                      <dd className="mt-0.5 inline-flex items-center gap-1 font-medium text-foreground tabular">
                        <IndianRupee className="h-3 w-3" aria-hidden="true" />
                        {formatMoney(cancellation.refund_amount_paise)} ({cancellation.refund_percent}%)
                      </dd>
                    </div>
                  </dl>

                  {cancellation.admin_note ? (
                    <div className="rounded-[var(--radius-sm)] border border-border bg-surface-secondary/50 px-3 py-2 text-xs leading-relaxed text-muted-strong">
                      <span className="font-medium text-foreground">Admin note:</span>{" "}
                      {cancellation.admin_note}
                    </div>
                  ) : null}

                  {cancellation.status === "requested" ? (
                    <div className="border-t border-border pt-4">
                      <AdminCancellationDecision cancellationId={cancellation.id} />
                    </div>
                  ) : (
                    <div className="border-t border-border pt-3">
                      <Link
                        href={`/admin/bookings/${cancellation.booking_id}`}
                        className="text-xs font-medium text-primary underline underline-offset-4"
                      >
                        Open booking record
                      </Link>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
