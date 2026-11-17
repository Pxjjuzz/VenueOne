import type { Metadata, Viewport } from "next";
import { AppTabBar } from "@/components/mobile/app-tab-bar";
import { ServiceWorker } from "@/components/mobile/service-worker";

export const metadata: Metadata = {
  title: { default: "VenueOne", template: "%s · VenueOne" },
  applicationName: "VenueOne",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "VenueOne",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  robots: { index: false, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f6f5f0",
  colorScheme: "light",
};

export default function MobileAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background-deep">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[520px] flex-col bg-background shadow-[0_0_60px_rgba(32,35,31,0.08)]">
        <main id="app-main" className="flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
          {children}
        </main>
        <AppTabBar />
      </div>
      <ServiceWorker />
    </div>
  );
}
