import type { Metadata } from "next";
import { Mail, MapPin, MessageSquare, ShieldCheck } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { BrandMark } from "@/components/brand-mark";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact the platform team about bookings, venue listings or access.",
};

const topics = [
  {
    icon: <MessageSquare className="h-4 w-4" aria-hidden="true" />,
    title: "Bookings and payments",
    body: "Include the booking reference from your dashboard. Never send card numbers, UPI PINs or one-time passwords.",
  },
  {
    icon: <MapPin className="h-4 w-4" aria-hidden="true" />,
    title: "Venue corrections",
    body: "Tell us which listing needs a correction and what is inaccurate. Owners can also edit their own venue from the owner workspace.",
  },
  {
    icon: <ShieldCheck className="h-4 w-4" aria-hidden="true" />,
    title: "Access and security",
    body: "Report suspected account misuse, an unexpected sign-in, or a security concern. We may ask you to verify account ownership.",
  },
];

export default function ContactPage() {
  return (
    <div className="container-page py-10 sm:py-14">
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <BrandMark />
          <p className="eyebrow mt-8">Contact</p>
          <h1 className="display-2 mt-3 max-w-md">Talk to the platform team.</h1>
          <p className="measure mt-4 text-[0.9375rem] leading-[1.8] text-muted-strong">
            Questions about a booking, a venue listing or owner access all start
            here. Messages are stored for follow-up and are not published.
          </p>

          {brand.supportEmail ? (
            <a
              href={`mailto:${brand.supportEmail}`}
              className="mt-6 inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-border-strong bg-surface px-4 py-3 text-sm font-medium text-foreground hover:border-primary/40"
            >
              <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
              {brand.supportEmail}
            </a>
          ) : (
            <p className="mt-6 rounded-[var(--radius-sm)] border border-border bg-surface px-4 py-3 text-sm text-muted">
              A public support email has not been configured for this environment.
              Use the form to reach the team.
            </p>
          )}

          <div className="mt-8 space-y-4">
            {topics.map((topic) => (
              <div key={topic.title} className="flex items-start gap-3 border-t border-border pt-4">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius-xs)] bg-primary-soft text-primary">
                  {topic.icon}
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">{topic.title}</h2>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{topic.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card p-5 sm:p-7">
          <h2 className="font-display text-xl font-semibold tracking-[-0.03em] text-foreground">
            Send a message
          </h2>
          <p className="mt-1 text-sm text-muted">
            Fields marked with an asterisk are required.
          </p>
          <div className="mt-6">
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}
