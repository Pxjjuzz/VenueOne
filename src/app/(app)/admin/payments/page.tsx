import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { listAdminPayments } from "@/lib/booking/queries";
import { paymentDisplayMode } from "@/lib/payments/service";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { TableShell, Td, Th } from "@/components/ui/table";
import { formatDateTime, formatMoney, pluralize } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Payments",
  robots: { index: false, follow: false },
};

const tabs = [
  { value: "all", label: "All" },
  { value: "created", label: "Created" },
  { value: "authorized", label: "Authorized" },
  { value: "captured", label: "Captured" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
  { value: "partially_refunded", label: "Partially refunded" },
] as const;

function statusTone(status: string) {
  if (status === "captured") return "success" as const;
  if (status === "failed") return "danger" as const;
  if (status === "created" || status === "authorized") return "warning" as const;
  return "info" as const;
}

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : "all";
  const q = typeof params.q === "string" ? params.q : "";
  const [payments, mode] = await Promise.all([
    listAdminPayments(status, q),
    Promise.resolve(paymentDisplayMode()),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Money & policy"
        title="Payments"
        description="Server-created orders and provider-confirmed payments. A browser response alone is never treated as proof of payment."
      />

      <div
        className={cn(
          "rounded-[var(--radius-md)] border px-4 py-3 text-xs leading-relaxed",
          mode.mode === "razorpay"
            ? "border-border bg-surface text-muted"
            : "border-warning/30 bg-warning-soft text-warning",
        )}
      >
        {mode.mode === "razorpay" ? (
          <>
            Razorpay is configured in <strong>{mode.testMode ? "test" : "live"}</strong> mode.
            Webhooks and signature verification are required for confirmation.
          </>
        ) : (
          <>
            Demo payments are active because Razorpay keys are not configured. Demo
            confirmation is recorded by the server, is clearly labelled, and is disabled
            in production.
          </>
        )}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar"
          role="tablist"
          aria-label="Filter payments"
        >
          {tabs.map((tab) => (
            <Link
              key={tab.value}
              href={
                tab.value === "all"
                  ? "/admin/payments"
                  : `/admin/payments?status=${tab.value}${q ? `&q=${encodeURIComponent(q)}` : ""}`
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

        <form action="/admin/payments" method="get" className="flex items-center gap-2">
          {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
          <label htmlFor="payment-search" className="sr-only">
            Search payments
          </label>
          <Input
            id="payment-search"
            name="q"
            defaultValue={q}
            placeholder="Reference, venue, email or provider id"
            className="h-9 w-full sm:w-72"
          />
          <Button type="submit" variant="secondary" size="sm">
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            Search
          </Button>
        </form>
      </div>

      {payments.length === 0 ? (
        <EmptyState
          variant="generic"
          title={q ? "No payments match this search" : "No payment records"}
          description={
            q
              ? "Try another booking reference, venue, email or provider payment id."
              : "Payment orders appear here when a customer starts checkout. No fictional transactions are seeded."
          }
        />
      ) : (
        <section className="surface-card overflow-hidden">
          <div className="border-b border-border px-4 py-3 text-xs text-muted sm:px-5">
            {pluralize(payments.length, "payment record")} · most recent first
          </div>
          <TableShell label="Payment records">
            <thead>
              <tr>
                <Th>Booking</Th>
                <Th>Venue / customer</Th>
                <Th>Provider</Th>
                <Th>Status</Th>
                <Th>Amount</Th>
                <Th>Created</Th>
                <Th>Open</Th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-surface-secondary/40">
                  <Td>
                    <p className="font-medium text-foreground">{payment.booking_reference}</p>
                    <p className="mt-0.5 text-[0.68rem] text-muted">{payment.booking_status}</p>
                  </Td>
                  <Td>
                    <p className="text-xs font-medium text-foreground">{payment.venue_name}</p>
                    <p className="mt-0.5 text-[0.68rem] text-muted">{payment.customer_email}</p>
                  </Td>
                  <Td>
                    <p className="text-xs text-foreground-soft">
                      {payment.provider === "demo" ? "Demo" : "Razorpay"}
                    </p>
                    {payment.provider_payment_id ? (
                      <p className="mt-0.5 max-w-[10rem] truncate text-[0.62rem] text-muted">
                        {payment.provider_payment_id}
                      </p>
                    ) : null}
                  </Td>
                  <Td>
                    <Badge tone={statusTone(payment.status)}>{payment.status}</Badge>
                  </Td>
                  <Td className="tabular">{formatMoney(payment.amount_paise)}</Td>
                  <Td className="text-xs text-muted">{formatDateTime(payment.created_at)}</Td>
                  <Td>
                    <Link
                      href={`/admin/bookings/${payment.booking_id}`}
                      className="text-xs font-medium text-primary underline underline-offset-4"
                    >
                      Inspect
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </section>
      )}
    </div>
  );
}
