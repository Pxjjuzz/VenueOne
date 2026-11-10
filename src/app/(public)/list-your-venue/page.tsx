import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  ClipboardCheck,
  Clock3,
  ImagePlus,
  IndianRupee,
  LayoutDashboard,
} from "lucide-react";
import { OwnerRequestForm } from "@/components/owner/owner-request-form";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FormAlert } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { getSessionUser } from "@/lib/auth/session";
import { getOwnerRequestForUser } from "@/lib/venues/queries";
import { signInPath } from "@/lib/navigation";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "List your venue",
  description:
    "Apply for venue-owner access, then submit a community hall or ground for independent publication review.",
};

export const dynamic = "force-dynamic";

const steps = [
  {
    icon: ClipboardCheck,
    title: "Apply for owner access",
    body: "Tell us who operates the venue and how to reach you. Owner access is reviewed before venue tools unlock.",
  },
  {
    icon: Building2,
    title: "Create the venue",
    body: "Add the address, capacity or dimensions, facilities, photographs, operating hours and proposed pricing.",
  },
  {
    icon: BadgeCheck,
    title: "Submit for publication review",
    body: "Publication is a separate approval. A reviewer checks the content, photographs, pricing and hours.",
  },
  {
    icon: LayoutDashboard,
    title: "Manage bookings",
    body: "Approve or decline requests, block maintenance time, and keep operating details current from the owner workspace.",
  },
];

export default async function ListYourVenuePage() {
  const user = await getSessionUser();
  const request = user ? await getOwnerRequestForUser(user.id) : null;
  const approved = user?.ownerStatus === "approved";
  const pending = user?.ownerStatus === "pending" || request?.status === "pending";
  const rejected = user?.ownerStatus === "rejected" || request?.status === "rejected";

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="grid gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-start">
        <div>
          <p className="eyebrow">Venue owners</p>
          <h1 className="display-2 mt-3 max-w-xl">
            Bring a hall or ground into the directory.
          </h1>
          <p className="measure mt-5 text-[0.9375rem] leading-[1.8] text-muted-strong">
            Owner access and venue publication are two independent approvals. You
            apply once for owner access, then submit each venue for its own review.
            Nothing is published automatically.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="rounded-[var(--radius-sm)] border border-border bg-surface p-4">
                  <div className="flex items-center justify-between">
                    <span className="grid h-8 w-8 place-items-center rounded-[var(--radius-xs)] bg-primary-soft text-primary">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="text-[0.62rem] font-semibold tracking-[0.12em] text-muted tabular">
                      0{index + 1}
                    </span>
                  </div>
                  <h2 className="mt-3 text-sm font-semibold text-foreground">{step.title}</h2>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{step.body}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 rounded-[var(--radius-md)] border border-border bg-surface-secondary/60 p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              <IndianRupee className="h-3.5 w-3.5" aria-hidden="true" />
              What you will need
            </div>
            <ul className="mt-3 space-y-2 text-sm text-muted-strong">
              <li className="flex items-start gap-2">
                <ImagePlus className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                At least one real photograph, 600 × 400 pixels or larger.
              </li>
              <li className="flex items-start gap-2">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                Operating hours for every weekday, in whole hours.
              </li>
              <li className="flex items-start gap-2">
                <IndianRupee className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                Proposed half-day and full-day prices for halls, or an hourly price for grounds.
              </li>
            </ul>
          </div>
        </div>

        <div className="surface-card p-5 sm:p-7">
          {!user ? (
            <EmptyState
              variant="venue"
              title="Sign in to apply"
              description="An owner application is linked to your account so the platform can verify the requester and show decisions in one place."
              action={
                <ButtonLink href={signInPath("/list-your-venue")}>
                  Sign in to continue
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </ButtonLink>
              }
            />
          ) : approved ? (
            <div>
              <Badge tone="success" icon={<BadgeCheck className="h-3 w-3" aria-hidden="true" />}>
                Owner access approved
              </Badge>
              <h2 className="mt-4 font-display text-xl font-semibold tracking-[-0.03em] text-foreground">
                Your owner workspace is ready.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Create a venue, add photographs and submit it for publication review.
                Approved venues appear in the public directory immediately.
              </p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <ButtonLink href="/owner/venues/new">
                  Create a venue
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </ButtonLink>
                <ButtonLink href="/owner" variant="secondary">
                  Open owner dashboard
                </ButtonLink>
              </div>
            </div>
          ) : pending ? (
            <div>
              <Badge tone="warning" icon={<Clock3 className="h-3 w-3" aria-hidden="true" />}>
                Owner access pending
              </Badge>
              <h2 className="mt-4 font-display text-xl font-semibold tracking-[-0.03em] text-foreground">
                Your application is under review.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {request
                  ? `Submitted ${formatDate(request.created_at)} for ${request.business_name}.`
                  : "The platform will review the details on your account."}
              </p>
              <p className="mt-3 text-xs leading-relaxed text-muted">
                You can track the decision from the owner status page. No venue tools
                are available until owner access is approved.
              </p>
              <div className="mt-5">
                <ButtonLink href="/owner/status" variant="secondary">
                  View application status
                </ButtonLink>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="font-display text-xl font-semibold tracking-[-0.03em] text-foreground">
                Apply for owner access
              </h2>
              <p className="mt-1 text-sm text-muted">
                This is the first of the two approvals. It does not publish a venue.
              </p>

              {rejected ? (
                <FormAlert tone="warning" className="mt-4">
                  <span className="font-medium">A previous application was not approved.</span>
                  {request?.rejection_reason ? ` Reason: ${request.rejection_reason}` : ""} You may
                  submit a new application with corrected details.
                </FormAlert>
              ) : null}

              <div className="mt-5">
                <OwnerRequestForm />
              </div>

              <p className="mt-5 text-xs leading-relaxed text-muted">
                By applying you confirm that the information is accurate and that you
                are authorised to represent the venue. Read the{" "}
                <Link href="/terms" className="font-medium text-primary underline underline-offset-4">
                  Terms
                </Link>
                .
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
