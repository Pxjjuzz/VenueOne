function resolveSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL?.trim()) {
    return process.env.NEXT_PUBLIC_SITE_URL.trim().replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.trim()}`;
  }
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }
  return "https://venueone-team.vercel.app";
}

export const brand = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME?.trim() || "VenueOne",
  tagline: "Space for every gathering.",
  description:
    "Discover and reserve community halls, event spaces and grounds — all in one place.",
  supportEmail:
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() ||
    process.env.SUPPORT_EMAIL?.trim() ||
    process.env.GMAIL_USER?.trim() ||
    null,
  siteUrl: resolveSiteUrl(),
} as const;

export const navigation = {
  public: [
    { href: "/halls", label: "Community Halls" },
    { href: "/grounds", label: "Community Grounds" },
    { href: "/how-it-works", label: "How it works" },
    { href: "/list-your-venue", label: "List your venue" },
  ],
  footer: {
    explore: [
      { href: "/halls", label: "Community halls" },
      { href: "/grounds", label: "Community grounds" },
      { href: "/how-it-works", label: "How booking works" },
      { href: "/list-your-venue", label: "List your venue" },
    ],
    company: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/dashboard", label: "My bookings" },
    ],
    legal: [
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
      { href: "/refund-policy", label: "Cancellation & refunds" },
    ],
  },
} as const;
