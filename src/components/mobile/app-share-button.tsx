"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

export function AppShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text: `${title} on VenueOne`, url });
        return;
      } catch {
        // The sheet was dismissed or sharing is blocked; fall through to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied; the button simply does nothing visible.
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      aria-label={copied ? "Link copied" : "Share this venue"}
      className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-white/85 text-foreground shadow-[var(--shadow-sm)] backdrop-blur transition-transform active:scale-95"
    >
      {copied ? (
        <Check className="h-4.5 w-4.5" aria-hidden="true" />
      ) : (
        <Share2 className="h-4.5 w-4.5" aria-hidden="true" />
      )}
    </button>
  );
}
