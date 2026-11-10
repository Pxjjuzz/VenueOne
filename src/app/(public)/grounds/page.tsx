import type { Metadata } from "next";
import { VenueDiscoveryPage } from "@/components/venue-discovery";

export const metadata: Metadata = {
  title: "Community grounds",
  description:
    "Discover community grounds and turfs for sport and outdoor events. Filter by sport, surface and dimensions, and book by the hour.",
};

export default async function GroundsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <VenueDiscoveryPage category="ground" searchParams={await searchParams} />;
}
