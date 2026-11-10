import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { listAdminBookings } from "@/lib/booking/queries";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Pagination, TableShell, Td, Th } from "@/components/ui/table";
import { formatDateTime, formatMoney, pluralize } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  BOOKING_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  bookingStatusTone,
} from "@/lib/types";

export const metadata: Metadata = {
  title: "All bookings",
  robots: { index: false, follow: false },
};

const tabs = [
  { value: "all", label: "All" },
  { value: "pending_owner_approval", label: "Pending owner" },
  { value: "awaiting_payment", label: "Awaiting payment" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "rejected", label: "Rejected" },
] as const;

function paymentTone(status: string) {
  if (status === "paid") return "success" as const;
  if (status === "failed") return "danger" as const;
  if (status === "processing") return "warning" as const;
  if (status === "refunded" || status === "partially_refunded") return "info" as const;
  return "neutral" as const;
}

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : "all";
  const q = typeof params.q === "string" ? params.q : "";
  const page = Math.max(1, Number(typeof params.page === "string" ? params.page : "1") || 1);

  const result = await listAdminBookings({ status, q, page, pageSize: 20 });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Bookings"
        description="Read-only oversight of every booking. Owner decisions and cancellations have dedicated workflows."
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar"
          role="tablist"
          aria-label="Filter bookings"
        >
          {tabs.map((tab) => (
            <Link
              key={tab.value}
              href={
                tab.value === "all"
                  ? "/admin/bookings"
                  : `/admin/bookings?status=${tab.value}${q ? `&q=${encodeURIComponent(q)}` : ""}`
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

        <form action="/admin/bookings" method="get" className="flex items-center gap-2">
          {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
          <label htmlFor="booking-search" className="sr-only">
            Search bookings
          </label>
          <Input
            id="booking-search"
            name="q"
            defaultValue={q}
            placeholder="Reference, venue or email"
            className="h-9 w-full sm:w-64"
          />
          <Button type="submit" variant="secondary" size="sm">
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            Search
          </Button>
        </form>
      </div>

      {result.items.length === 0 ? (
        <EmptyState
          variant="booking"
          title={q ? "No bookings match this search" : "Nothing in this view"}
          description={
            q
              ? "Try another reference, venue or customer email."
              : "No bookings are in this state yet. Zero is the correct state for a new platform."
          }
        />
      ) : (
        <section className="surface-card overflow-hidden">
          <div className="border-b border-border px-4 py-3 text-xs text-muted sm:px-5">
            {pluralize(result.total, "booking")} found
          </div>
          <TableShell label="All bookings">
            <thead>
              <tr>
                <Th>Reference</Th>
                <Th>Venue / customer</Th>
                <Th>Date</Th>
                <Th>Status</Th>
                <Th>Payment</Th>
                <Th>Total</Th>
                <Th>Open</Th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((booking) => (
                <tr key={booking.id} className="hover:bg-surface-secondary/40">
                  <Td>
                    <p className="font-medium text-foreground">{booking.reference}</p>
                    <p className="mt-0.5 text-[0.68rem] text-muted">
                      {formatDateTime(booking.created_at)}
                    </p>
                  </Td>
                  <Td>
                    <p className="text-xs font-medium text-foreground">{booking.venue_name}</p>
                    <p className="mt-0.5 text-[0.68rem] text-muted">{booking.customer_email}</p>
                  </Td>
                  <Td className="text-xs text-muted">{formatDateTime(booking.starts_at)}</Td>
                  <Td>
                    <StatusBadge
                      status={booking.status}
                      label={BOOKING_STATUS_LABELS[booking.status]}
                      tone={bookingStatusTone(booking.status)}
                    />
                  </Td>
                  <Td>
                    <StatusBadge
                      status={booking.payment_status}
                      label={PAYMENT_STATUS_LABELS[booking.payment_status]}
                      tone={paymentTone(booking.payment_status)}
                    />
                  </Td>
                  <Td className="tabular">{formatMoney(booking.total_paise)}</Td>
                  <Td>
                    <Link
                      href={`/admin/bookings/${booking.id}`}
                      className="text-xs font-medium text-primary underline underline-offset-4"
                    >
                      Open
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
          <div className="px-4 pb-4 sm:px-5">
            <Pagination
              basePath="/admin/bookings"
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
