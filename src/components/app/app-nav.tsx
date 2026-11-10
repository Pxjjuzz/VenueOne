"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  CalendarDays,
  CreditCard,
  FileText,
  Gauge,
  History,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Settings,
  ShieldCheck,
  Store,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { signOutAction } from "@/app/auth/actions";
import { cn } from "@/lib/cn";
import type { AppRole, OwnerStatus } from "@/lib/types";

type NavItem = { href: string; label: string; icon: React.ReactNode; badge?: number };
type NavGroup = { label: string; items: NavItem[] };

function icon(Component: React.ComponentType<{ className?: string }>) {
  return <Component className="h-4 w-4" aria-hidden="true" />;
}

export function AppNav({
  role,
  ownerStatus,
  unread,
}: {
  role: AppRole;
  ownerStatus: OwnerStatus;
  unread: number;
}) {
  const pathname = usePathname();
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;

  const groups: NavGroup[] = [
    {
      label: "Your account",
      items: [
        { href: "/dashboard", label: "Overview", icon: icon(Gauge) },
        { href: "/dashboard/bookings", label: "My bookings", icon: icon(CalendarDays) },
        {
          href: "/dashboard/notifications",
          label: "Notifications",
          icon: icon(Bell),
          badge: unread,
        },
        { href: "/dashboard/profile", label: "Profile", icon: icon(UserRound) },
      ],
    },
  ];

  if (role === "owner" && ownerStatus === "approved") {
    groups.push({
      label: "Venue owner",
      items: [
        { href: "/owner", label: "Owner overview", icon: icon(Store) },
        { href: "/owner/venues", label: "Venues", icon: icon(LayoutDashboard) },
        { href: "/owner/bookings", label: "Booking requests", icon: icon(CalendarDays) },
      ],
    });
  }

  if (role === "admin") {
    groups.push(
      {
        label: "Administration",
        items: [
          { href: "/admin", label: "Admin overview", icon: icon(ShieldCheck) },
          { href: "/admin/venues", label: "Venue review", icon: icon(LayoutDashboard) },
          { href: "/admin/owners", label: "Owner requests", icon: icon(Users) },
          { href: "/admin/bookings", label: "Bookings", icon: icon(CalendarDays) },
        ],
      },
      {
        label: "Money & policy",
        items: [
          { href: "/admin/payments", label: "Payments", icon: icon(CreditCard) },
          { href: "/admin/cancellations", label: "Cancellations", icon: icon(History) },
          { href: "/admin/refunds", label: "Refunds", icon: icon(Wallet) },
          { href: "/admin/settings", label: "Settings", icon: icon(Settings) },
          { href: "/admin/legal", label: "Legal pages", icon: icon(FileText) },
        ],
      },
      {
        label: "Platform",
        items: [
          { href: "/admin/messages", label: "Messages", icon: icon(MessageSquare) },
          { href: "/admin/audit", label: "Audit log", icon: icon(History) },
        ],
      },
    );
  }

  function isActive(href: string) {
    if (href === "/dashboard" || href === "/owner" || href === "/admin") {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const nav = (
    <nav className="space-y-6" aria-label="Dashboard">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="px-2 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-muted">
            {group.label}
          </p>
          <ul className="mt-2 space-y-0.5">
            {group.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-[0.8125rem] font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-primary-soft text-primary"
                      : "text-foreground-soft hover:bg-surface-secondary",
                  )}
                  aria-current={isActive(item.href) ? "page" : undefined}
                >
                  <span className={isActive(item.href) ? "text-primary" : "text-muted"}>{item.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.badge ? (
                    <span className="rounded-full bg-primary px-1.5 text-[0.6rem] font-bold text-white">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="border-t border-border pt-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-[0.8125rem] font-medium text-muted hover:bg-surface-secondary hover:text-foreground"
        >
          <span aria-hidden="true">↗</span> Browse the public site
        </Link>
        <form action={signOutAction} className="mt-1">
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-[0.8125rem] font-medium text-muted hover:bg-surface-secondary hover:text-foreground"
          >
            <span aria-hidden="true">→</span> Sign out
          </button>
        </form>
      </div>
    </nav>
  );

  return (
    <>
      <aside className="hidden w-60 shrink-0 lg:block">
        <div className="sticky top-[calc(var(--header-height)+1.5rem)] max-h-[calc(100dvh-var(--header-height)-3rem)] overflow-y-auto pb-6 pr-2">
          {nav}
        </div>
      </aside>

      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpenAt(open ? null : pathname)}
          className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-sm)] border border-border-strong bg-surface px-3 text-xs font-medium text-foreground"
          aria-expanded={open}
          aria-controls="app-mobile-nav"
        >
          {open ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
          Dashboard menu
        </button>
        {open ? (
          <div id="app-mobile-nav" className="mt-3 rounded-[var(--radius-md)] border border-border bg-surface p-3 shadow-[var(--shadow-md)]">
            {nav}
          </div>
        ) : null}
      </div>
    </>
  );
}
