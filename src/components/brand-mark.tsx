import Link from "next/link";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/cn";

export function BrandMark({
  className,
  href = "/",
  compact = false,
}: {
  className?: string;
  href?: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn("group inline-flex items-center gap-2.5", className)}
      aria-label={compact ? `${brand.name} home` : undefined}
    >
      <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-[5px] bg-primary text-white shadow-sm">
        <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true" fill="none">
          <path
            d="M5 27V13.5L16 5l11 8.5V27"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="square"
          />
          <path
            d="M11 27V18.5a5 5 0 0 1 10 0V27"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path d="M5 27h22" stroke="currentColor" strokeWidth="1.7" strokeLinecap="square" />
          <path d="M20.5 9.5 16 5v6.5h4.5Z" fill="var(--accent)" />
        </svg>
      </span>
      {compact ? null : (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[1.02rem] font-semibold tracking-[-0.035em] text-foreground">
            {brand.name}
          </span>
          <span className="mt-1 hidden text-[0.58rem] font-medium uppercase tracking-[0.18em] text-muted sm:block">
            Halls &amp; grounds
          </span>
        </span>
      )}
    </Link>
  );
}
