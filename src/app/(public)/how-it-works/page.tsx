import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  Check,
  Clock3,
  CreditCard,
  FileCheck2,
  Search,
  ShieldCheck,
  Store,
  X,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How discovery, availability, owner approval, payment and cancellation work on this platform.",
};

const customerSteps = [
  {
    number: "01",
    icon: Search,
    title: "Find a hall or ground",
    body: "Browse by category, city, capacity, price, facilities or sport. Every listing is approved before it appears, and photographs belong to the venue.",
    detail: "No invented venues or ratings. If nothing is published, you will see an honest empty state.",
  },
  {
    number: "02",
    icon: CalendarCheck,
    title: "Choose the real slot",
    body: "Halls book by half day or full day. Grounds book by the hour. The calendar is calculated from live bookings, owner blocks and operating hours.",
    detail: "A full-day hall booking reserves every hourly grid row for that day, so overlapping bookings are impossible.",
  },
  {
    number: "03",
    icon: Clock3,
    title: "Request or book instantly",
    body: "Some venues confirm instantly. Others review each request. If the venue reviews requests, your slot is held while the owner decides.",
    detail: "The booking page shows which flow applies before you submit anything.",
  },
  {
    number: "04",
    icon: CreditCard,
    title: "Pay only when it is due",
    body: "When a booking is ready for payment, the server calculates the final total from the approved pricing and platform settings. The browser only confirms what the server already recorded.",
    detail: "Razorpay test-mode and local demo payments are labelled clearly. A browser success screen is never treated as proof of payment.",
  },
  {
    number: "05",
    icon: ShieldCheck,
    title: "Keep the record",
    body: "Your dashboard holds the booking reference, status history, payment record and cancellation eligibility in one place.",
    detail: "Cancellation approval and refund processing are separate steps. A refund is only marked processed after provider confirmation.",
  },
];

const policyRows = [
  {
    item: "Hall durations",
    rule: "Half-day morning, half-day afternoon or full day.",
    note: "The venue's operating hours determine the exact split.",
  },
  {
    item: "Ground durations",
    rule: "Whole-hour blocks up to the published daily limit.",
    note: "Start and end times must align to the hour.",
  },
  {
    item: "Owner approval",
    rule: "The venue owner accepts or declines the request.",
    note: "If accepted, a payment window begins.",
  },
  {
    item: "Payment",
    rule: "Server-created order, signature verification and webhook reconciliation.",
    note: "Duplicate provider events are ignored safely.",
  },
  {
    item: "Cancellation",
    rule: "Governed by the policy saved with your booking.",
    note: "The policy is shown before booking and on the booking page.",
  },
  {
    item: "Refunds",
    rule: "Recorded separately from cancellation status.",
    note: "Provider and bank settlement times are outside platform control.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <section className="border-b border-border bg-surface/55">
        <div className="container-page py-12 sm:py-16">
          <p className="eyebrow">How it works</p>
          <h1 className="display-2 mt-3 max-w-3xl">
            From browsing to a confirmed booking, without guesswork.
          </h1>
          <p className="measure mt-5 text-[0.9375rem] leading-[1.8] text-muted-strong sm:text-base">
            This page describes what the platform actually does in Phase 1. It does
            not describe a future mobile app or an interactive 3D viewer; those are
            separate, later phases.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/halls">
              Browse halls
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </ButtonLink>
            <ButtonLink href="/grounds" variant="secondary">
              Browse grounds
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="container-page py-14 sm:py-18" aria-labelledby="customer-flow-heading">
        <div className="max-w-2xl">
          <p className="eyebrow">For customers</p>
          <h2 id="customer-flow-heading" className="display-3 mt-2">
            Five steps, each with a visible state.
          </h2>
        </div>

        <ol className="mt-9 grid gap-4 lg:grid-cols-2">
          {customerSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Reveal key={step.number} delay={index * 0.04}>
                <li className="surface-card flex h-full flex-col p-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <span className="grid h-10 w-10 place-items-center rounded-[var(--radius-sm)] bg-primary-soft text-primary">
                      <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                    </span>
                    <span className="text-[0.68rem] font-semibold tracking-[0.14em] text-muted tabular">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-lg font-semibold tracking-[-0.025em] text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
                  <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted-strong">
                    {step.detail}
                  </p>
                </li>
              </Reveal>
            );
          })}
        </ol>
      </section>

      <section className="border-y border-border bg-surface/55 py-14 sm:py-18" aria-labelledby="owner-flow-heading">
        <div className="container-page grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-start">
          <div>
            <p className="eyebrow">For venue owners</p>
            <h2 id="owner-flow-heading" className="display-3 mt-2">
              Two approvals, deliberately separate.
            </h2>
            <p className="measure mt-4 text-sm leading-relaxed text-muted-strong">
              Owner access and venue publication are independent decisions. Being
              approved as an owner does not automatically publish a venue, and a
              venue does not appear on the platform until it has its own approval.
            </p>

            <div className="mt-6 space-y-3">
              {[
                {
                  title: "Owner access",
                  body: "The platform reviews the business details before any venue tools unlock.",
                },
                {
                  title: "Venue publication",
                  body: "Each venue is reviewed for content, photographs, pricing and operating hours.",
                },
                {
                  title: "Edits after publication",
                  body: "Substantive changes are re-submitted for review. Operational blocks and hours can be managed without republishing.",
                },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3 rounded-[var(--radius-sm)] border border-border bg-surface p-4">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <ButtonLink href="/list-your-venue" variant="secondary">
                <Store className="h-4 w-4" aria-hidden="true" />
                Start an owner application
              </ButtonLink>
            </div>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-border bg-[var(--charcoal)] p-6 text-white sm:p-8">
            <div className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#c8d59b]">
              <FileCheck2 className="h-4 w-4" aria-hidden="true" />
              What we will not claim
            </div>
            <ul className="mt-5 space-y-3.5">
              {[
                "That a venue is available before the booking engine confirms it.",
                "That a payment succeeded because a browser dialog closed.",
                "That a refund is complete before the provider confirms it.",
                "That a venue is verified beyond the owner-submitted details and review.",
                "That sample venues, reviews or transaction figures exist in an empty platform.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm leading-relaxed text-white/72">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-[#c8d59b]" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="container-page py-14 sm:py-18" aria-labelledby="rules-heading">
        <div className="max-w-2xl">
          <p className="eyebrow">Rules at a glance</p>
          <h2 id="rules-heading" className="display-3 mt-2">
            The operational contract behind a booking.
          </h2>
        </div>

        <div className="mt-8 overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <caption className="sr-only">Booking, payment, cancellation and refund rules</caption>
            <thead>
              <tr className="bg-surface-secondary">
                <th scope="col" className="px-4 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-muted">Item</th>
                <th scope="col" className="px-4 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-muted">Rule</th>
                <th scope="col" className="px-4 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-muted">Practical note</th>
              </tr>
            </thead>
            <tbody>
              {policyRows.map((row) => (
                <tr key={row.item} className="border-t border-border">
                  <th scope="row" className="px-4 py-3 font-medium text-foreground">{row.item}</th>
                  <td className="px-4 py-3 text-muted-strong">{row.rule}</td>
                  <td className="px-4 py-3 text-muted">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-5 text-xs leading-relaxed text-muted">
          The policy that applies to a booking is saved with that booking. Read the{" "}
          <Link href="/refund-policy" className="font-medium text-primary underline underline-offset-4">
            cancellation and refund policy
          </Link>{" "}
          before paying.
        </p>
      </section>
    </>
  );
}
