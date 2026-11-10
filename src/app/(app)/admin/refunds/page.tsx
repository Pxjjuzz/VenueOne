import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CalendarDays, CreditCard } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { listAdminRefunds } from "@/lib/booking/queries";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { AdminProcessRefund } from "@/components/admin/admin-refund-button";
import { formatDateTime, formatMoney, pluralize } from "@/lib/format";
import { cn } from "@/lib/cn";
import { REFUND_STATUS_LABELS } from "@/lib/types";

export const metadata: Metadata = {
  title: "Refunds",
  robots: { index: false, follow: false },
};

const tabs = [
  { value: "pending", label: "Pending" },
  { value: "initiated", label: "With provider" },
  { value: "processed", label: "Processed" },
  { value: "failed", label: "Failed" },
  { value: "all", label: "All" },
] as const;

function refundTone(status: string) {
  if (status === "processed") return "success" as const;
  if (status === "failed") return "danger" as const;
  return "warning" as const;
}

export default async function AdminRefundsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : "pending";
  const refunds = await listAdminRefunds(status);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Money & policy"
        title="Refunds"
        description="Refund status is tracked separately from cancellation. A real Razorpay refund stays initiated until the provider confirms it."
      />

      <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3 text-xs leading-relaxed text-muted">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
        Demo refunds are labelled and can be completed locally. Razorpay refunds are only
        marked processed by a confirmed provider webhook or reconciliation.
      </div>

      <div
        className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar"
        role="tablist"
        aria-label="Filter refunds"
      >
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === "pending" ? "/admin/refunds" : `/admin/refunds?status=${tab.value}`}
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

      {refunds.length === 0 ? (
        <EmptyState
          variant="generic"
          title={status === "pending" ? "No refunds waiting" : "Nothing in this view"}
          description={
            status === "pending"
              ? "Approved cancellations with a positive refund calculation create a pending refund here."
              : "No refunds match this filter."
          }
        />
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-muted">{pluralize(refunds.length, "refund")}</p>
          <ul className="grid gap-4 xl:grid-cols-2">
            {refunds.map((refund) => (
              <li key={refund.id} className="surface-card overflow-hidden">
                <div className="border-b border-border px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-lg font-semibold tracking-[-0.025em] text-foreground tabular">
                        {formatMoney(refund.amount_paise)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {refund.booking_reference} · {refund.venue_name}
                      </p>
                      <p className="mt-0.5 text-[0.68rem] text-muted">{refund.customer_email}</p>
                    </div>
                    <Badge tone={refundTone(refund.status)}>
                      {REFUND_STATUS_LABELS[refund.status]}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3 px-4 py-4 sm:px-5">
                  {refund.reason ? (
                    <p className="text-xs leading-relaxed text-muted-strong">{refund.reason}</p>
                  ) : null}

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[0.68rem] text-muted">
                    <span className="inline-flex items-center gap-1">
                      <CreditCard className="h-3 w-3" aria-hidden="true" />
                      {refund.is_demo ? "Demo payment" : refund.provider === "demo" ? "Demo" : "Razorpay"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" aria-hidden="true" />
                      Created {formatDateTime(refund.created_at)}
                    </span>
                    {refund.processed_at ? (
                      <span>Processed {formatDateTime(refund.processed_at)}</span>
                    ) : null}
                  </div>

                  {refund.provider_refund_id ? (
                    <p className="break-all text-[0.62rem] text-muted">
                      Provider refund: {refund.provider_refund_id}
                    </p>
                  ) : null}
                  {refund.provider_payment_id ? (
                    <p className="break-all text-[0.62rem] text-muted">
                      Provider payment: {refund.provider_payment_id}
                    </p>
                  ) : null}
                  {refund.failure_reason ? (
                    <p className="rounded-[var(--radius-sm)] border border-error/25 bg-error-soft px-3 py-2 text-xs leading-relaxed text-error">
                      {refund.failure_reason}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
                    {refund.status === "pending" || refund.status === "failed" ? (
                      <AdminProcessRefund refundId={refund.id} isDemo={refund.is_demo || refund.provider === "demo"} />
                    ) : null}
                    <Link
                      href={`/admin/bookings/${refund.booking_id}`}
                      className="text-xs font-medium text-primary underline underline-offset-4"
                    >
                      Open booking record
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
