import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { listCustomerBookings } from "@/lib/booking/queries";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { BookingSummaryCard } from "@/components/booking/booking-summary-card";
import { cn } from "@/lib/cn";
import { pluralize } from "@/lib/format";
import { nowMs } from "@/lib/time";

export const metadata: Metadata = { title: "My bookings", robots: { index: false, follow: false } };

const tabs = [
  { value: "all", label: "All" },
  { value: "upcoming", label: "Upcoming" },
  { value: "pending_owner_approval", label: "Awaiting owner" },
  { value: "awaiting_payment", label: "Awaiting payment" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export default async function CustomerBookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser("/dashboard/bookings");
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : "all";
  const all = await listCustomerBookings(user.id);
  const now = nowMs();

  const filtered = all.filter((booking) => {
    if (status === "all") return true;
    if (status === "upcoming") {
      return (
        booking.starts_at.getTime() > now &&
        ["confirmed", "awaiting_payment", "pending_owner_approval"].includes(booking.status)
      );
    }
    return booking.status === status;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Bookings"
        title="My bookings"
        description={`${pluralize(all.length, "booking")} on this account. Every row links to its status history, payment record and cancellation options.`}
        actions={
          <ButtonLink href="/halls" size="sm">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New booking
          </ButtonLink>
        }
      />

      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar" role="tablist" aria-label="Filter bookings">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === "all" ? "/dashboard/bookings" : `/dashboard/bookings?status=${tab.value}`}
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

      {filtered.length === 0 ? (
        <EmptyState
          variant="booking"
          title={all.length === 0 ? "No bookings yet" : "Nothing in this view"}
          description={
            all.length === 0
              ? "Browse halls and grounds, choose a real slot, and your booking will appear here from the moment it is requested."
              : "No bookings match this filter. Try another status or view all bookings."
          }
          action={
            all.length === 0 ? (
              <ButtonLink href="/halls">Browse community halls</ButtonLink>
            ) : (
              <ButtonLink href="/dashboard/bookings" variant="secondary">
                View all bookings
              </ButtonLink>
            )
          }
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((booking) => (
            <li key={booking.id}>
              <BookingSummaryCard booking={booking} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
