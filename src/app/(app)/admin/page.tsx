import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck2,
  CalendarDays,
  CreditCard,
  History,
  LayoutDashboard,
  Mail,
  MessageSquare,
  ShieldCheck,
  Undo2,
  Users,
  Wallet,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { getAdminOverview } from "@/lib/admin/service";
import { PageHeader } from "@/components/ui/page-header";
import { MetricRow, Panel, StatCard } from "@/components/ui/stat-card";
import { ButtonLink } from "@/components/ui/button";
import { formatDateTime, formatMoney, pluralize } from "@/lib/format";

export const metadata: Metadata = {
  title: "Admin overview",
  robots: { index: false, follow: false },
};

const queues = [
  {
    href: "/admin/venues",
    label: "Venue publication review",
    description: "Check listings, photographs, pricing and hours before publishing.",
    icon: LayoutDashboard,
    key: "venuesInReview" as const,
  },
  {
    href: "/admin/owners",
    label: "Owner access applications",
    description: "Verify operators before venue tools unlock.",
    icon: Users,
    key: "ownerRequests" as const,
  },
  {
    href: "/admin/cancellations",
    label: "Cancellation requests",
    description: "Review policy eligibility and release slots.",
    icon: History,
    key: "cancellations" as const,
  },
  {
    href: "/admin/refunds",
    label: "Refunds awaiting action",
    description: "Submit provider refunds and reconcile confirmed outcomes.",
    icon: Undo2,
    key: "refunds" as const,
  },
  {
    href: "/admin/messages",
    label: "New contact messages",
    description: "Support enquiries submitted from the public site.",
    icon: MessageSquare,
    key: "messages" as const,
  },
];

export default async function AdminDashboardPage() {
  const user = await requireAdmin();
  const overview = await getAdminOverview();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Administration"
        title={user.fullName ? `Platform overview, ${user.fullName.split(" ")[0]}.` : "Platform overview"}
        description="Empty queues are a valid state. This dashboard only reports records that exist in the database."
        actions={
          <ButtonLink href="/admin/venues" size="sm">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Review venues
          </ButtonLink>
        }
      />

      <MetricRow>
        <StatCard
          label="In review"
          value={overview.venuesInReview}
          hint={`${pluralize(overview.venuesPublished, "published venue")}`}
          tone={overview.venuesInReview ? "warning" : "neutral"}
          icon={<LayoutDashboard className="h-4 w-4" />}
        />
        <StatCard
          label="Owner applications"
          value={overview.ownerRequests}
          hint="Pending access decisions"
          tone={overview.ownerRequests ? "warning" : "neutral"}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Owner decisions"
          value={overview.pendingBookings}
          hint="Booking requests holding a slot"
          tone={overview.pendingBookings ? "warning" : "neutral"}
          icon={<CalendarCheck2 className="h-4 w-4" />}
        />
        <StatCard
          label="Captured"
          value={formatMoney(overview.capturedRevenuePaise)}
          hint="Verified payments, before refunds"
          icon={<Wallet className="h-4 w-4" />}
        />
      </MetricRow>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Work queues" description="Each queue opens with its oldest pending item first">
          <ul className="divide-y divide-border">
            {queues.map((queue) => {
              const Icon = queue.icon;
              const count = overview[queue.key];
              return (
                <li key={queue.href}>
                  <Link
                    href={queue.href}
                    className="flex items-center justify-between gap-4 py-3 transition-colors hover:text-primary"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius-xs)] bg-primary-soft text-primary">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{queue.label}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted">
                          {queue.description}
                        </p>
                      </div>
                    </div>
                    <span
                      className={
                        count
                          ? "shrink-0 rounded-full bg-warning-soft px-2.5 py-1 text-xs font-semibold text-warning tabular"
                          : "shrink-0 text-xs text-muted tabular"
                      }
                    >
                      {count}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>

        <div className="space-y-6">
          <Panel
            title="Payments and money"
            description="Provider-confirmed records only"
            actions={
              <Link
                href="/admin/payments"
                className="text-xs font-medium text-primary underline underline-offset-4"
              >
                Open
              </Link>
            }
          >
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="inline-flex items-center gap-2 text-muted">
                  <CreditCard className="h-4 w-4" aria-hidden="true" />
                  Captured payments
                </dt>
                <dd className="font-semibold text-foreground tabular">
                  {formatMoney(overview.capturedRevenuePaise)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                <dt className="inline-flex items-center gap-2 text-muted">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  Confirmed bookings
                </dt>
                <dd className="font-semibold text-foreground tabular">
                  {overview.confirmedBookings}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                <dt className="inline-flex items-center gap-2 text-muted">
                  <Undo2 className="h-4 w-4" aria-hidden="true" />
                  Refunds to action
                </dt>
                <dd className="font-semibold text-foreground tabular">{overview.refunds}</dd>
              </div>
            </dl>
            <p className="mt-4 border-t border-border pt-3 text-[0.68rem] leading-relaxed text-muted">
              Refunds remain separate from cancellations. A refund is shown as processed
              only when the provider has confirmed it.
            </p>
          </Panel>

          <Panel
            title="Recent audit activity"
            description="Privileged actions recorded by the server"
            actions={
              <Link
                href="/admin/audit"
                className="text-xs font-medium text-primary underline underline-offset-4"
              >
                Full log
              </Link>
            }
          >
            {overview.recentAudit.length === 0 ? (
              <p className="text-sm text-muted">No privileged actions have been recorded yet.</p>
            ) : (
              <ul className="space-y-3">
                {overview.recentAudit.map((entry) => (
                  <li key={entry.id} className="border-b border-border/70 pb-3 last:border-0 last:pb-0">
                    <p className="text-xs font-medium text-foreground">{entry.action}</p>
                    <p className="mt-0.5 text-[0.68rem] text-muted">
                      {entry.actor_email ?? "system"} · {formatDateTime(entry.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-border bg-surface px-4 py-4">
        <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            {overview.messages
              ? `${pluralize(overview.messages, "new contact message")} waiting`
              : "No new contact messages"}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            Contact messages are stored in the database and never exposed publicly with
            their sender details.
          </p>
        </div>
        <Link
          href="/admin/messages"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary underline underline-offset-4"
        >
          Open <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
