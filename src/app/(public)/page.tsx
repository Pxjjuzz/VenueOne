import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  IndianRupee,
  FileCheck2,
  Sparkles,
} from "lucide-react";
import { ArchitecturalSculpture } from "@/components/architectural-sculpture";
import { Landing3DScroll } from "@/components/landing-3d-scroll";
import { Reveal } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/ui/button";

function HallDrawing() {
  return (
    <svg viewBox="0 0 360 220" className="h-full w-full" aria-hidden="true" fill="none">
      <defs>
        <linearGradient id="hall-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4f1e8" />
          <stop offset="1" stopColor="#e3dfd1" />
        </linearGradient>
      </defs>
      <rect x="26" y="26" width="308" height="168" fill="url(#hall-floor)" stroke="#cfcabb" />
      <path d="M56 194V92l62-40 62 40v102" stroke="#9ba092" strokeWidth="1.4" />
      <path d="M88 194v-52a30 30 0 0 1 60 0v52" stroke="#244c3b" strokeWidth="2" />
      <path d="M56 194h124" stroke="#244c3b" strokeWidth="2" strokeLinecap="round" />
      <path d="M210 194V112h72v82" stroke="#9ba092" strokeWidth="1.4" />
      <path d="M222 194v-58h48v58" stroke="#9ba092" strokeWidth="1.2" />
      <path d="M30 194h300" stroke="#244c3b" strokeWidth="2" strokeLinecap="round" />
      <rect x="244" y="44" width="54" height="16" fill="#c8d59b" opacity="0.75" />
      <path d="M26 64h28M26 44h16" stroke="#c8b89a" strokeWidth="1" />
      <circle cx="308" cy="52" r="7" stroke="#9ba092" />
    </svg>
  );
}

function GroundDrawing() {
  return (
    <svg viewBox="0 0 360 220" className="h-full w-full" aria-hidden="true" fill="none">
      <defs>
        <linearGradient id="ground-turf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e8eed3" />
          <stop offset="1" stopColor="#c8d59b" />
        </linearGradient>
      </defs>
      <rect x="34" y="30" width="292" height="160" fill="url(#ground-turf)" stroke="#a9b57c" />
      <path d="M180 30v160" stroke="#ffffff" strokeWidth="2" opacity="0.85" />
      <circle cx="180" cy="110" r="34" stroke="#ffffff" strokeWidth="2" opacity="0.9" />
      <circle cx="180" cy="110" r="2.5" fill="#244c3b" />
      <path d="M34 72h42v76H34M326 72h-42v76h42" stroke="#ffffff" strokeWidth="2" opacity="0.9" />
      <path d="M34 30h292M34 190h292" stroke="#ffffff" strokeWidth="2" opacity="0.55" />
      <rect x="76" y="86" width="28" height="48" stroke="#ffffff" strokeWidth="1.5" opacity="0.8" />
      <rect x="256" y="86" width="28" height="48" stroke="#ffffff" strokeWidth="1.5" opacity="0.8" />
      <path d="M34 206h292" stroke="#244c3b" strokeWidth="2" strokeLinecap="round" />
      <path d="M34 198v16M326 198v16" stroke="#244c3b" strokeWidth="1.5" />
    </svg>
  );
}

const steps = [
  {
    number: "01",
    title: "Find the right kind of space",
    body: "Browse community halls for gatherings or grounds for sport and outdoor events. Every listing shows the details that matter for its category.",
  },
  {
    number: "02",
    title: "Choose a real, available slot",
    body: "Availability comes from the booking engine, not a calendar image. Halls book by half or full day; grounds book by the hour.",
  },
  {
    number: "03",
    title: "Confirm with clear terms",
    body: "See the full price, cancellation terms and whether the venue books instantly or needs owner approval before you commit.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_75%_25%,rgba(200,213,155,0.22),transparent_58%)]" />
        <div className="container-page relative grid items-center gap-10 pb-16 pt-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-6 lg:pb-24 lg:pt-16">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted">
              <span className="h-px w-7 bg-primary/50" aria-hidden="true" />
              Community spaces, considered
            </div>

            <h1 className="display-1 mt-5 text-foreground">
              Space for every
              <span className="relative ml-2 inline-block">
                gathering.
                <svg
                  viewBox="0 0 320 18"
                  className="absolute -bottom-2 left-0 w-full text-accent"
                  aria-hidden="true"
                  preserveAspectRatio="none"
                >
                  <path d="M2 14C62 4 126 3 186 7c46 3 86 5 130 1" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
                </svg>
              </span>
            </h1>

            <p className="measure mt-7 text-[1.0625rem] leading-[1.75] text-muted-strong sm:text-lg">
              Discover and reserve community halls, event spaces and grounds, all
              in one place. Real availability, transparent pricing and booking
              terms you can read before you pay.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/halls" size="lg" className="group">
                Find a community hall
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href="/grounds" variant="secondary" size="lg" className="group">
                Find a ground
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </ButtonLink>
            </div>

            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-border pt-5">
              {[
                ["Real slots", "From the booking engine"],
                ["INR pricing", "No hidden totals"],
                ["Clear terms", "Before payment"],
              ].map(([term, detail]) => (
                <div key={term}>
                  <dt className="flex items-center gap-1.5 text-[0.72rem] font-semibold text-foreground">
                    <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    {term}
                  </dt>
                  <dd className="mt-1 text-[0.68rem] leading-snug text-muted">{detail}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            <div className="absolute -right-12 top-8 hidden h-40 w-40 rounded-full border border-primary/15 lg:block" aria-hidden="true" />
            <div className="relative aspect-[1.06/1] w-full max-w-[600px] justify-self-center lg:justify-self-end">
              <ArchitecturalSculpture className="absolute inset-0" />
              <div className="absolute bottom-3 left-3 hidden rounded-[var(--radius-sm)] border border-border bg-surface/90 px-3 py-2 text-[0.65rem] text-muted shadow-sm backdrop-blur sm:block">
                <span className="font-semibold text-foreground">Phase 1</span> · halls &amp; grounds
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-16 sm:py-20" aria-labelledby="categories-heading">
        <Reveal>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">Two kinds of space</p>
              <h2 id="categories-heading" className="display-2 mt-2 max-w-xl">
                Choose the space that fits the occasion.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-muted">
              Halls are set up for gatherings and indoor events. Grounds are open
              spaces booked by the hour. Each has its own booking rhythm.
            </p>
          </div>
        </Reveal>

        <div className="mt-9 grid gap-4 lg:grid-cols-2">
          <Reveal>
            <Link
              href="/halls"
              className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface transition-shadow duration-300 hover:shadow-[var(--shadow-md)]"
            >
              <div className="relative aspect-[16/9] overflow-hidden border-b border-border bg-[#eeece4]">
                <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.025]">
                  <HallDrawing />
                </div>
                <span className="absolute left-4 top-4 rounded-full border border-border bg-surface/90 px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-foreground-soft backdrop-blur">
                  Category 01
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display text-2xl font-semibold tracking-[-0.035em] text-foreground">
                      Community halls
                    </h3>
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
                      Proportioned rooms for celebrations, meetings and community
                      events. Compare capacity, stage, kitchen, parking and
                      accessibility details.
                    </p>
                  </div>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-muted transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-white">
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
                <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-4 text-xs text-muted">
                  <li>Half-day or full-day</li>
                  <li>Capacity-led discovery</li>
                  <li>Indoor facilities</li>
                </ul>
              </div>
            </Link>
          </Reveal>

          <Reveal delay={0.08}>
            <Link
              href="/grounds"
              className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface transition-shadow duration-300 hover:shadow-[var(--shadow-md)]"
            >
              <div className="relative aspect-[16/9] overflow-hidden border-b border-border bg-[#e6ecd5]">
                <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.025]">
                  <GroundDrawing />
                </div>
                <span className="absolute left-4 top-4 rounded-full border border-[#b7c38c] bg-surface/90 px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[#405138] backdrop-blur">
                  Category 02
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display text-2xl font-semibold tracking-[-0.035em] text-foreground">
                      Community grounds
                    </h3>
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
                      Open fields for sport, practice and outdoor events. Filter by
                      sport, surface and dimensions, then book the hours you need.
                    </p>
                  </div>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-muted transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-white">
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
                <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-4 text-xs text-muted">
                  <li>Hourly slots</li>
                  <li>Surface &amp; sport filters</li>
                  <li>Outdoor facilities</li>
                </ul>
              </div>
            </Link>
          </Reveal>
        </div>
      </section>

      <Landing3DScroll />

      <section className="border-y border-border bg-surface/55 py-16 sm:py-20" aria-labelledby="how-heading">
        <div className="container-page">
          <Reveal>
            <div className="max-w-2xl">
              <p className="eyebrow">How booking works</p>
              <h2 id="how-heading" className="display-2 mt-2">
                Fewer surprises between browsing and showing up.
              </h2>
            </div>
          </Reveal>

          <div className="mt-9 grid gap-px overflow-hidden rounded-[var(--radius-md)] border border-border bg-border md:grid-cols-3">
            {steps.map((step, index) => {
              return (
                <Reveal key={step.number} delay={index * 0.06} className="bg-surface">
                  <article className="flex h-full flex-col p-5 sm:p-6">
                    <span className="text-[0.72rem] font-semibold tracking-[0.12em] text-muted tabular">
                      {step.number}
                    </span>
                    <h3 className="mt-4 font-display text-lg font-semibold tracking-[-0.025em] text-foreground">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
                  </article>
                </Reveal>
              );
            })}
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <IndianRupee className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Server-validated prices in paise
            </span>
            <span className="inline-flex items-center gap-1.5">
              <FileCheck2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Separate owner and venue approvals
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Test payments clearly labelled
            </span>
          </div>
        </div>
      </section>

      <section className="container-page py-16 sm:py-20" aria-labelledby="honest-heading">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <Reveal>
            <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-border bg-[var(--charcoal)] p-7 text-white sm:p-10">
              <div className="pointer-events-none absolute inset-0 grid-floor opacity-[0.18]" aria-hidden="true" />
              <div className="relative max-w-lg">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#c8d59b]">
                  An honest starting point
                </p>
                <h2 id="honest-heading" className="display-3 mt-3 text-white">
                  The first listings are being reviewed now.
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-white/72">
                  We do not fill the platform with invented venues, ratings or
                  reviews. When no approved spaces exist, you will see a clear
                  empty state, not a pretend marketplace. Owners can submit a
                  venue for review at any time.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <ButtonLink href="/list-your-venue" variant="accent" size="md">
                    List your venue
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </ButtonLink>
                  <ButtonLink
                    href="/how-it-works"
                    variant="ghost"
                    size="md"
                    className="border border-white/20 text-white hover:bg-white/10"
                  >
                    Read how it works
                  </ButtonLink>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  title: "Real photographs only",
                  body: "Venue images come from the owner and are reviewed before publication.",
                },
                {
                  title: "No invented availability",
                  body: "Slots reflect live bookings and owner blocks from the database.",
                },
                {
                  title: "No fake reviews",
                  body: "There is no seeded rating or testimonial content on this platform.",
                },
                {
                  title: "Zero states designed",
                  body: "Empty dashboards explain what will appear and what to do next.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-[var(--radius-md)] border border-border bg-surface p-4">
                  <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                  <h3 className="mt-3 text-sm font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{item.body}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="container-page pb-4">
        <div className="flex flex-col items-start justify-between gap-4 rounded-[var(--radius-md)] border border-border bg-surface px-5 py-5 sm:flex-row sm:items-center sm:px-6">
          <div>
            <p className="font-display text-lg font-semibold tracking-[-0.025em] text-foreground">
              Have a hall or ground to share with the community?
            </p>
            <p className="mt-1 text-sm text-muted">
              Create an owner account, submit your space, and track approval in one place.
            </p>
          </div>
          <ButtonLink href="/list-your-venue" variant="secondary">
            Start a listing
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
