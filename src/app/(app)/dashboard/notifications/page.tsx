import type { Metadata } from "next";
import Link from "next/link";
import { Bell, CheckCircle2 } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { listNotifications } from "@/lib/notifications";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { MarkAllReadButton } from "@/components/app/mark-all-read";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Notifications", robots: { index: false, follow: false } };

export default async function NotificationsPage() {
  const user = await requireUser("/dashboard/notifications");
  const notifications = await listNotifications(user.id, 100);
  const unread = notifications.filter((notification) => !notification.read_at).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Notifications"
        title="Updates on your account"
        description={
          unread
            ? `${unread} unread notification${unread === 1 ? "" : "s"}. Booking decisions, payment changes and cancellation outcomes appear here.`
            : "You are up to date. New booking and payment updates will appear here."
        }
        actions={unread ? <MarkAllReadButton /> : null}
      />

      {notifications.length === 0 ? (
        <EmptyState
          variant="generic"
          title="No notifications yet"
          description="When a venue accepts or declines a request, a payment is confirmed, or a cancellation is reviewed, the update is recorded here."
        />
      ) : (
        <ul className="space-y-2">
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className={
                notification.read_at
                  ? "rounded-[var(--radius-md)] border border-border bg-surface p-4"
                  : "rounded-[var(--radius-md)] border border-primary/25 bg-primary-soft/35 p-4"
              }
            >
              <div className="flex items-start gap-3">
                <span
                  className={
                    notification.read_at
                      ? "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-secondary text-muted"
                      : "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-white"
                  }
                  aria-hidden="true"
                >
                  <Bell className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{notification.title}</p>
                    {!notification.read_at ? (
                      <Badge tone="info" icon={<CheckCircle2 className="h-3 w-3" aria-hidden="true" />}>
                        New
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted-strong">{notification.body}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
                    <span>{formatDateTime(notification.created_at)}</span>
                    {notification.link ? (
                      <Link
                        href={notification.link}
                        className="font-medium text-primary underline underline-offset-4"
                      >
                        Open related record
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
