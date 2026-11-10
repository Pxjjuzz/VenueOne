import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  ClipboardCheck,
  Clock3,
  MapPin,
  Phone,
  ShieldCheck,
  Store,
  XCircle,
} from "lucide-react";
import { requireOwnerApplicant } from "@/lib/auth/session";
import { getOwnerRequestForUser } from "@/lib/venues/queries";
import { PageHeader } from "@/components/ui/page-header";
import { InfoRow, Panel } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatDateTime } from "@/lib/format";
import { OWNER_STATUS_LABELS, type OwnerStatus } from "@/lib/types";

export const metadata: Metadata = {
  title: "Owner access status",
  robots: { index: false, follow: false },
};

function ownerTone(status: OwnerStatus) {
  if (status === "approved") return "success" as const;
  if (status === "rejected" || status === "suspended") return "danger" as const;
  if (status === "pending") return "warning" as const;
  return "neutral" as const;
}

export default async function OwnerStatusPage() {
  const user = await requireOwnerApplicant();
  if (user.ownerStatus === "approved") redirect("/owner");

  const request = await getOwnerRequestForUser(user.id);
  const status: OwnerStatus = user.ownerStatus;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Venue owner"
        title="Owner access"
        description="Owner access is the first of two independent decisions. It unlocks the venue workspace; it does not publish a venue."
        actions={
          <ButtonLink href="/list-your-venue" variant="secondary" size="sm">
            {request ? "Open application page" : "Apply for owner access"}
          </ButtonLink>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel
          title="Application"
          description={request ? `Submitted ${formatDate(request.created_at)}` : "No application on file"}
          actions={<Badge tone={ownerTone(status)}>{OWNER_STATUS_LABELS[status]}</Badge>}
        >
          {!request ? (
            <EmptyState
              variant="venue"
              compact
              title="You have not applied yet"
              description="Tell the platform who operates the venue and how to reach you. Approval unlocks drafts, photographs and publication submissions."
              action={<ButtonLink href="/list-your-venue">Start an application</ButtonLink>}
            />
          ) : (
            <>
              {status === "pending" ? (
                <div className="mb-4 flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-warning/30 bg-warning-soft px-3.5 py-3 text-xs leading-relaxed text-warning">
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <p>
                    Your application is waiting for an administrator. You can keep using
                    the customer side of the platform in the meantime. Venue tools unlock
                    only after approval.
                  </p>
                </div>
              ) : null}

              {status === "rejected" ? (
                <div className="mb-4 flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-error/30 bg-error-soft px-3.5 py-3 text-xs leading-relaxed text-error">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="font-semibold">This application was not approved.</p>
                    <p className="mt-1">
                      {request.rejection_reason ||
                        "No reason was recorded. Submit a new application with corrected details or contact support."}
                    </p>
                  </div>
                </div>
              ) : null}

              {status === "suspended" ? (
                <div className="mb-4 flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-error/30 bg-error-soft px-3.5 py-3 text-xs leading-relaxed text-error">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <p>
                    Owner access is currently suspended. Contact platform support before
                    making further changes.
                  </p>
                </div>
              ) : null}

              <dl className="divide-y divide-border">
                <InfoRow label="Business or trust" value={request.business_name} />
                <InfoRow
                  label="Contact"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                      {request.contact_phone}
                    </span>
                  }
                />
                <InfoRow
                  label="Location"
                  value={
                    <span className="inline-flex items-start gap-1.5 text-right">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
                      {request.address}, {request.city}, {request.state} {request.pincode}
                    </span>
                  }
                />
                {request.ownership_notes ? (
                  <InfoRow label="Notes" value={request.ownership_notes} />
                ) : null}
                <InfoRow
                  label="Last update"
                  value={formatDateTime(request.updated_at)}
                />
                {request.reviewed_at ? (
                  <InfoRow label="Decision recorded" value={formatDateTime(request.reviewed_at)} />
                ) : null}
              </dl>

              {status === "rejected" ? (
                <div className="mt-4">
                  <ButtonLink href="/list-your-venue">Submit a corrected application</ButtonLink>
                </div>
              ) : null}
            </>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel title="What happens next" description="Two separate approvals">
            <ol className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius-xs)] bg-primary-soft text-primary">
                  <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">Owner access</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">
                    Reviewed by an administrator. Approval unlocks the owner workspace
                    but does not publish anything.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius-xs)] bg-primary-soft text-primary">
                  <Building2 className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">Venue publication</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">
                    Each hall or ground is submitted separately. A reviewer checks the
                    listing, photographs, pricing and hours.
                  </p>
                </div>
              </li>
            </ol>
            <div className="mt-5 flex items-start gap-2 border-t border-border pt-4 text-[0.68rem] leading-relaxed text-muted">
              <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
              Admin-controlled pricing approval keeps public prices consistent until the
              platform signs off on proposed amounts.
            </div>
          </Panel>

          <Panel title="Questions about the review?" description="Support can help">
            <p className="text-sm leading-relaxed text-muted">
              If details need correcting or the decision is unclear, contact platform
              support rather than submitting duplicate applications.
            </p>
            <ButtonLink href="/contact" variant="secondary" size="sm" className="mt-3">
              <Store className="h-4 w-4" aria-hidden="true" />
              Contact support
            </ButtonLink>
          </Panel>
        </div>
      </div>
    </div>
  );
}
