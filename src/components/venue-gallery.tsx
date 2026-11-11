"use client";

import Image from "next/image";
import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type Photo = { id: string; url: string; alt: string };

function Placeholder({ category }: { category: "hall" | "ground" }) {
  return (
    <div
      className={cn(
        "absolute inset-0",
        category === "hall"
          ? "bg-[linear-gradient(145deg,#efede5,#ded9cb)]"
          : "bg-[linear-gradient(145deg,#e7ecd8,#c9d49f)]",
      )}
    >
      <svg viewBox="0 0 900 560" className="h-full w-full" aria-hidden="true" fill="none">
        {category === "hall" ? (
          <>
            <path d="M170 470V260l280-140 280 140v210" stroke="#b4b1a4" strokeWidth="2" />
            <path d="M320 470V360a130 130 0 0 1 260 0v110" stroke="#244c3b" strokeWidth="3" />
            <path d="M170 470h560" stroke="#244c3b" strokeWidth="3" strokeLinecap="round" />
            <rect x="170" y="262" width="560" height="12" fill="#c8d59b" opacity="0.55" />
            <path d="M240 470V380h50v90M610 470v-90h50v90" stroke="#b4b1a4" strokeWidth="2" />
          </>
        ) : (
          <>
            <rect x="120" y="100" width="660" height="360" stroke="#ffffff" strokeWidth="3" opacity="0.9" />
            <path d="M450 100v360" stroke="#ffffff" strokeWidth="3" opacity="0.9" />
            <circle cx="450" cy="280" r="72" stroke="#ffffff" strokeWidth="3" opacity="0.9" />
            <path d="M120 180h90v200h-90M780 180h-90v200h90" stroke="#ffffff" strokeWidth="3" opacity="0.9" />
            <path d="M120 490h660" stroke="#244c3b" strokeWidth="3" strokeLinecap="round" />
          </>
        )}
      </svg>
      <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-[var(--radius-sm)] border border-white/50 bg-white/75 px-2.5 py-1.5 text-[0.65rem] font-medium text-foreground-soft backdrop-blur">
        <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
        Illustrative placeholder: photographs are added by the venue
      </div>
    </div>
  );
}

export function VenueGallery({
  photos,
  category,
  venueName,
}: {
  photos: Photo[];
  category: "hall" | "ground";
  venueName: string;
}) {
  const [active, setActive] = useState(0);
  const current = photos[active];

  return (
    <div className="grid gap-2">
      <div className="relative aspect-[16/10] overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface-secondary sm:aspect-[16/9]">
        {current ? (
          <Image
            key={current.id}
            src={current.url}
            alt={current.alt || `Photograph of ${venueName}`}
            fill
            sizes="(max-width: 1024px) 100vw, 62vw"
            className="object-cover"
            priority
          />
        ) : (
          <Placeholder category={category} />
        )}
      </div>

      {photos.length > 1 ? (
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-6" role="group" aria-label="Venue photographs">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setActive(index)}
              className={cn(
                "relative aspect-[4/3] overflow-hidden rounded-[var(--radius-xs)] border-2 transition-colors",
                index === active ? "border-primary" : "border-transparent opacity-80 hover:opacity-100",
              )}
              aria-label={`Show photograph ${index + 1}`}
              aria-pressed={index === active}
            >
              <Image
                src={photo.url}
                alt=""
                fill
                sizes="120px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
