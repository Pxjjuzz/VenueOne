"use client";

import { usePathname } from "next/navigation";
import { AppTabBar } from "./app-tab-bar";

// Venue pages and detail screens are immersive: they own the bottom of the
// screen, so the tab bar and its reserved padding are dropped there only.
const DETAIL_ROUTES = ["/app/account/profile", "/app/account/notifications"];

function isImmersive(pathname: string) {
  if (pathname.startsWith("/app/venues/")) return true;
  if (/^\/app\/bookings\/[^/]+/.test(pathname)) return true;
  return DETAIL_ROUTES.includes(pathname);
}

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/app";
  const immersive = isImmersive(pathname);

  return (
    <>
      <main
        id="app-main"
        className={
          immersive ? "flex-1" : "flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom))]"
        }
      >
        {children}
      </main>
      {immersive ? null : <AppTabBar />}
    </>
  );
}
