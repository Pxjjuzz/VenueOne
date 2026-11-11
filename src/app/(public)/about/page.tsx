import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, Compass, Layers3, MapPin, ShieldCheck, Smartphone } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";
import { BrandMark } from "@/components/brand-mark";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "About",
  description:
    "What this platform is, what Phase 1 includes, and what is deliberately planned for later.",
};

const phases = [
  {
    icon: Layers3,
    label: "Phase 1 · current",
    title: "The web platform",
    body: "Discovery, owner onboarding and approval, venue submission and review, availability, bookings, test-mode payments, cancellation handling and administrative controls.",
    tone: "current" as const,
  },
  {
    icon: Compass,
    label: "Phase 2 · planned",
    title: "Interactive 3D venue viewer",
    body: "An untextured, desktop-oriented viewer built from venue photographs and measurements. It is not part of the current release and no viewer is promised on a venue page yet.",
    tone: "future" as const,
  },
  {
    icon: Smartphone,
    label: "Phase 3 · planned",
    title: "Android application",
    body: "A mobile app using the same accounts, database and booking engine as the website. It is not available today.",
    tone: "future" as const,
  },
];

const principles = [
  {
    icon: ShieldCheck,
    title: "Server truth",
    body: "Prices, availability, approvals and payment state are resolved on the server. The browser is a view, not an authority.",
  },
  {
    icon: MapPin,
    title: "Real places",
    body: "Listings come from owners and are reviewed before publication. No fictional venues, borrowed photographs or placeholder reviews.",
  },
  {
    icon: Building2,
    title: "Two separate gates",
    body: "Approved owner access and approved venue publication are different states, checked independently.",
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="container-page py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div>
            <BrandMark />
            <p className="eyebrow mt-8">About</p>
            <h1 className="display-2 mt-3 max-w-xl">
              Community infrastructure, made easier to find and reserve.
            </h1>
            <div className="measure mt-5 space-y-4 text-[0.9375rem] leading-[1.8] text-muted-strong">
              <p>
                {brand.name} brings community halls and community grounds into one
                directory, gives venue owners a clear way to present and manage their
                spaces, and gives customers a reliable booking record.
              </p>
              <p>
                It is built around a simple premise: a booking should reflect real
                availability, a readable price and terms that can be checked before
                money changes hands. Where the platform cannot verify something, it
                says so instead of filling the gap with invented content.
              </p>
            </div>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/halls">
                Browse halls
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href="/list-your-venue" variant="secondary">
                List a venue
              </ButtonLink>
            </div>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6 shadow-[var(--shadow-sm)] sm:p-8">
            <p className="eyebrow">In one view</p>
            <dl className="mt-5 divide-y divide-border">
              {[
                ["Category", "Halls and grounds"],
                ["Hall bookings", "Half day or full day"],
                ["Ground bookings", "Hourly blocks"],
                ["Payments", "Razorpay test mode, plus labelled local demo"],
                ["Platform state", "Empty until real venues are approved"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4 py-3">
                  <dt className="text-[0.8125rem] text-muted">{label}</dt>
                  <dd className="text-right text-[0.8125rem] font-medium text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 border-t border-border pt-4 text-xs leading-relaxed text-muted">
              No seeded transactions, ratings, testimonials or analytics figures are
              present. Dashboards explain their zero states instead of decorating them.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-surface/55 py-14 sm:py-18" aria-labelledby="principles-heading">
        <div className="container-page">
          <div className="max-w-2xl">
            <p className="eyebrow">Principles</p>
            <h2 id="principles-heading" className="display-3 mt-2">
              What the build optimises for.
            </h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {principles.map((item, index) => {
              const Icon = item.icon;
              return (
                <Reveal key={item.title} delay={index * 0.05}>
                  <article className="surface-card h-full p-5">
                    <span className="grid h-10 w-10 place-items-center rounded-[var(--radius-sm)] bg-primary-soft text-primary">
                      <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-5 font-display text-lg font-semibold tracking-[-0.025em] text-foreground">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="container-page py-14 sm:py-18" aria-labelledby="phases-heading">
        <div className="max-w-2xl">
          <p className="eyebrow">Roadmap</p>
          <h2 id="phases-heading" className="display-3 mt-2">
            Current scope, stated without inflation.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            The data model and frontend keep room for later phases, but planned work
            is not presented as shipped work.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {phases.map((phase, index) => {
            const Icon = phase.icon;
            return (
              <Reveal key={phase.title} delay={index * 0.05}>
                <article
                  className={
                    phase.tone === "current"
                      ? "h-full rounded-[var(--radius-md)] border border-primary/30 bg-primary-soft/45 p-5"
                      : "h-full rounded-[var(--radius-md)] border border-border bg-surface p-5"
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-[var(--radius-sm)] bg-surface text-primary">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted">
                      {phase.label}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold tracking-[-0.025em] text-foreground">
                    {phase.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{phase.body}</p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="container-page pb-4">
        <div className="rounded-[var(--radius-md)] border border-border bg-surface px-5 py-5 sm:px-6">
          <p className="text-sm leading-relaxed text-muted">
            Our published policies cover how bookings, payments and personal data
            are handled. Read the{" "}
            <Link href="/terms" className="font-medium text-primary underline underline-offset-4">Terms</Link>,{" "}
            <Link href="/privacy" className="font-medium text-primary underline underline-offset-4">Privacy Policy</Link>{" "}
            and{" "}
            <Link href="/refund-policy" className="font-medium text-primary underline underline-offset-4">Refund Policy</Link>.
          </p>
        </div>
      </section>
    </>
  );
}
