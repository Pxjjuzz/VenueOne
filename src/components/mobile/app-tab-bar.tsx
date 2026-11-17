"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, Compass, UserRound } from "lucide-react";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/app", label: "Explore", icon: Compass, match: (path: string) => path === "/app" },
  {
    href: "/app/bookings",
    label: "Bookings",
    icon: CalendarCheck,
    match: (path: string) => path.startsWith("/app/bookings"),
  },
  {
    href: "/app/account",
    label: "Account",
    icon: UserRound,
    match: (path: string) => path.startsWith("/app/account"),
  },
];

export function AppTabBar() {
  const pathname = usePathname() ?? "/app";

  return (
    <nav
      aria-label="App sections"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[520px] border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="grid grid-cols-3">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 px-2 py-2 text-[0.66rem] font-semibold tracking-[0.02em] transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--focus)]",
                  active ? "text-primary" : "text-muted hover:text-foreground",
                )}
              >
                <Icon
                  className={cn("h-5 w-5", active ? "text-primary" : "text-muted")}
                  aria-hidden="true"
                  strokeWidth={active ? 2.2 : 1.8}
                />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
