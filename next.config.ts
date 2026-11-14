import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const csp = [
  "default-src 'self'",
  // Three's GLTFLoader ships a meshopt decoder that compiles WebAssembly as soon
  // as the viewer chunk loads. 'wasm-unsafe-eval' permits that one capability
  // without enabling general eval.
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isProd ? "" : " 'unsafe-eval'"} https://checkout.razorpay.com https://api.razorpay.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://*.razorpay.com",
  "font-src 'self' data: https://*.razorpay.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.razorpay.com https://checkout.razorpay.com https://lumberjack.razorpay.com",
  // Card 3DS and some bank pages load inside Razorpay iframes.
  "frame-src https://*.razorpay.com",
  "object-src 'none'",
  "base-uri 'self'",
  // Razorpay opens a popup for some card and bank steps and posts a form into it.
  // A popup inherits this policy, so 'self' alone leaves that tab blank.
  "form-action 'self' https://*.razorpay.com",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  serverExternalPackages: ["@electric-sql/pglite", "nodemailer"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(self)",
          },
          // Razorpay checkout uses popup windows for some card and bank steps and
          // talks back to this page through window.opener. 'same-origin' severs
          // that link; allowing popups keeps the handshake while still isolating
          // pages that open us.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
