import type { Metadata } from "next";
import Link from "next/link";
import { Bell, CheckCircle2 } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { listNotifications } from "@/lib/notifications";
import { AppScreenHeader } from "@/components/mobile/app-screen-header";
import { MarkAllReadButton } from "@/components/app/mark-all-read";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Notifications",
  robots: { index: false, follow: false },
};

// Records created by the booking and payment services link to the website
// dashboard. Inside the app the same booking lives under /app/bookings, and
// destinations that only exist on the website are dropped rather than shown as
// links that leave the app shell.
function appHref(link: string | null) {
  if (!link) return null;
  if (link.startsWith("/dashboard/bookings/")) {
    return link.replace("/dashboard/bookings/", "/app/bookings/");
  }
  if (link.startsWith("/app/")) return link;
  return null;
}

export default async function AppNotificationsPage() {
  const user = await requireUser("/app/account/notifications");
  const notifications = await listNotifications(user.id, 100);
  const unread = notifications.filter((notification) => !notification.read_at);
  const earlier = notifications.filter((notification) => notification.read_at);

  function renderItems(items: typeof notifications) {
    return (
      <ul className="space-y-2.5">
        {items.map((notification) => {
          const href = appHref(notification.link);
          const isUnread = !notification.read_at;
          return (
            <li
              key={notification.id}
              className={cn(
                "rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)]",
                isUnread ? "bg-primary-soft/45" : "bg-surface",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full",
                    isUnread ? "bg-primary text-white" : "bg-surface-secondary text-muted",
                  )}
                  aria-hidden="true"
                >
                  <Bell className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[0.88rem] font-semibold leading-snug text-foreground">
                      {notification.title}
                    </p>
                    {isUnread ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-primary">
                        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                        New
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[0.8rem] leading-relaxed text-muted-strong">
                    {notification.body}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[0.7rem] text-muted">
                    <span>{formatDateTime(notification.created_at)}</span>
                    {href ? (
                      <Link
                        href={href}
                        className="font-semibold text-primary underline underline-offset-4"
                      >
                        Open booking
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <AppScreenHeader
        backHref="/app/account"
        backLabel="Back to account"
        title="Notifications"
        hint={
          unread.length
            ? `${unread.length} unread`
            : notifications.length
              ? "You are up to date"
              : "Booking and payment updates"
        }
        action={unread.length ? <MarkAllReadButton /> : null}
      />

      <div className="px-5 pt-3">
        {notifications.length === 0 ? (
          <div className="mt-10 flex flex-col items-center px-2 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-surface text-muted shadow-[var(--shadow-sm)]">
              <Bell className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="mt-4 text-[1.05rem] font-semibold text-foreground">
              No notifications yet
            </p>
            <p className="mt-1.5 max-w-xs text-[0.85rem] leading-relaxed text-muted">
              When a venue accepts or declines a request, a payment is confirmed, or a
              cancellation is reviewed, the update appears here.
            </p>
          </div>
        ) : (
          <>
            {unread.length ? (
              <>
                <h2 className="px-1 text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-muted">
                  New
                </h2>
                <div className="mt-2">{renderItems(unread)}</div>
              </>
            ) : null}

            {earlier.length ? (
              <>
                <h2 className="mt-6 px-1 text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-muted">
                  Earlier
                </h2>
                <div className="mt-2">{renderItems(earlier)}</div>
              </>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
