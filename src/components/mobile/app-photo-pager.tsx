"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Building2, Trees } from "lucide-react";

type Photo = { id: string; url: string; alt: string };

export function AppPhotoPager({
  photos,
  venueName,
  category,
}: {
  photos: Photo[];
  venueName: string;
  category: "hall" | "ground";
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  function handleScroll() {
    const element = scroller.current;
    if (!element || element.clientWidth === 0) return;
    const next = Math.round(element.scrollLeft / element.clientWidth);
    setIndex(Math.max(0, Math.min(photos.length - 1, next)));
  }

  if (photos.length === 0) {
    return (
      <div className="grid aspect-[4/3] place-items-center bg-[linear-gradient(150deg,#e9eee4,#d7e1d0)] text-primary/55">
        {category === "hall" ? (
          <Building2 className="h-14 w-14" aria-hidden="true" />
        ) : (
          <Trees className="h-14 w-14" aria-hidden="true" />
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={scroller}
        onScroll={handleScroll}
        className="app-hscroll no-scrollbar flex aspect-[4/3] overflow-x-auto"
        role="group"
        aria-label={`Photographs of ${venueName}`}
      >
        {photos.map((photo, photoIndex) => (
          <div key={photo.id} className="relative aspect-[4/3] w-full shrink-0">
            <Image
              src={photo.url}
              alt={photo.alt || `Photograph of ${venueName}`}
              fill
              sizes="(max-width: 520px) 100vw, 520px"
              className="object-cover"
              priority={photoIndex === 0}
            />
          </div>
        ))}
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(to_top,rgba(9,14,11,0.5),transparent)]"
        aria-hidden="true"
      />

      {photos.length > 1 ? (
        <>
          <div
            className="pointer-events-none absolute bottom-10 left-1/2 flex -translate-x-1/2 items-center gap-1.5"
            aria-hidden="true"
          >
            {photos.map((photo, photoIndex) => (
              <span
                key={photo.id}
                className={
                  photoIndex === index
                    ? "h-1.5 w-5 rounded-full bg-white transition-all"
                    : "h-1.5 w-1.5 rounded-full bg-white/55 transition-all"
                }
              />
            ))}
          </div>
          <span className="pointer-events-none absolute bottom-9 right-4 rounded-full bg-[rgba(9,14,11,0.55)] px-2.5 py-1 text-[0.66rem] font-semibold text-white backdrop-blur">
            {index + 1} / {photos.length}
          </span>
        </>
      ) : null}
    </div>
  );
}
