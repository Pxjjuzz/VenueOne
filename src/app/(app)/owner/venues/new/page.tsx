import type { Metadata } from "next";
import { ArrowLeft, ClipboardList, ImagePlus, IndianRupee, MapPin } from "lucide-react";
import { requireOwner } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/stat-card";
import { ButtonLink } from "@/components/ui/button";
import { CreateVenueForm } from "@/components/owner/create-venue-form";

export const metadata: Metadata = {
  title: "Create a venue",
  robots: { index: false, follow: false },
};

export default async function NewOwnerVenuePage() {
  await requireOwner();

  return (
    <div className="space-y-6">
      <ButtonLink href="/owner/venues" variant="ghost" size="sm">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Your venues
      </ButtonLink>

      <PageHeader
        eyebrow="Venue owner"
        title="Create a venue draft"
        description="The draft is private. You can save an incomplete listing and come back before submitting it for publication review."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <Panel title="What you will add" description="Prepare these before you start">
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius-xs)] bg-primary-soft text-primary">
                <ClipboardList className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">Accurate description</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">
                  At least 80 characters describing the space, suitable events and
                  practical details.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius-xs)] bg-primary-soft text-primary">
                <MapPin className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">Address and contact</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">
                  Street address, city, state, six-digit PIN code and a contact phone
                  number.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius-xs)] bg-primary-soft text-primary">
                <ImagePlus className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">At least one photograph</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">
                  Real photographs only, 600 × 400 pixels or larger. The server resizes
                  uploads to WebP.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius-xs)] bg-primary-soft text-primary">
                <IndianRupee className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">Proposed pricing</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">
                  Half-day and full-day prices for halls, or an hourly price for grounds.
                  An administrator approves prices before they are used publicly.
                </p>
              </div>
            </li>
          </ul>
        </Panel>

        <Panel title="Create the draft" description="You can rename it at any time">
          <p className="text-sm leading-relaxed text-muted">
            This creates an empty draft with default opening hours. Nothing is published
            until you submit it and a reviewer approves it.
          </p>
          <div className="mt-5">
            <CreateVenueForm label="Create draft venue" />
          </div>
          <p className="mt-4 text-[0.68rem] leading-relaxed text-muted">
            Drafts do not appear in search results, sitemaps or the public directory.
          </p>
        </Panel>
      </div>
    </div>
  );
}
