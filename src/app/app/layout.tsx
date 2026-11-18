import type { Metadata, Viewport } from "next";
import { AppFrame } from "@/components/mobile/app-frame";
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
  themeColor: "#f3f4f1",
  colorScheme: "light",
};

// Venue data changes without an app release, so no app page is prerendered.
export const dynamic = "force-dynamic";

export default function MobileAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-surface min-h-dvh bg-background-deep">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[520px] flex-col bg-background shadow-[0_0_60px_rgba(15,20,17,0.1)]">
        <AppFrame>{children}</AppFrame>
      </div>
      <ServiceWorker />
    </div>
  );
}
