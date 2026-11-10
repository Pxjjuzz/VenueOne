import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";
import { dbQuery } from "@/lib/db";

export const dynamic = "force-dynamic";

const STATIC_ROUTES: Array<{ path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }> = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/halls", priority: 0.9, changeFrequency: "daily" },
  { path: "/grounds", priority: 0.9, changeFrequency: "daily" },
  { path: "/how-it-works", priority: 0.6, changeFrequency: "monthly" },
  { path: "/list-your-venue", priority: 0.6, changeFrequency: "monthly" },
  { path: "/about", priority: 0.5, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.5, changeFrequency: "monthly" },
  { path: "/terms", priority: 0.3, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "monthly" },
  { path: "/refund-policy", priority: 0.3, changeFrequency: "monthly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${brand.siteUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  try {
    const venues = await dbQuery<{ slug: string; updated_at: Date }>(
      "select slug, updated_at from venues where status = 'approved' order by updated_at desc",
    );
    return [
      ...staticEntries,
      ...venues.map((venue) => ({
        url: `${brand.siteUrl}/venues/${venue.slug}`,
        lastModified: venue.updated_at,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ];
  } catch {
    return staticEntries;
  }
}
