import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${brand.name}: book a hall or ground`,
    short_name: brand.name,
    description: brand.description,
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f3f4f1",
    theme_color: "#f3f4f1",
    categories: ["events", "lifestyle", "travel"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
