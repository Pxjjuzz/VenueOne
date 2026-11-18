"use client";

import { usePathname } from "next/navigation";
import { AppTabBar } from "./app-tab-bar";

// Venue pages are immersive: the photo pager owns the bottom bar space, so the
// tab bar and its reserved padding are dropped there only.
export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/app";
  const immersive = pathname.startsWith("/app/venues/");

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
