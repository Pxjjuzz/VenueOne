import type { Metadata } from "next";
import { VenueDiscoveryPage } from "@/components/venue-discovery";

export const metadata: Metadata = {
  title: "Community halls",
  description:
    "Discover community halls for gatherings, meetings and celebrations. Compare capacity, facilities and half-day or full-day pricing.",
};

export default async function HallsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <VenueDiscoveryPage category="hall" searchParams={await searchParams} />;
}
