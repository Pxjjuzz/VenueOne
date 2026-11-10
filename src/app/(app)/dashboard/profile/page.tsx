import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldCheck, UserRound } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getOwnerRequestForUser } from "@/lib/venues/queries";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, InfoRow } from "@/components/ui/stat-card";
import { ProfileForm } from "@/components/profile-form";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { OWNER_STATUS_LABELS } from "@/lib/types";

export const metadata: Metadata = { title: "Profile", robots: { index: false, follow: false } };

export default async function ProfilePage() {
  const user = await requireUser("/dashboard/profile");
  const request = await getOwnerRequestForUser(user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Profile"
        description="Keep your name and contact number current so venues can reach you about confirmed bookings."
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <Panel title="Personal details" description="Used across bookings, owner tools and support.">
          <ProfileForm fullName={user.fullName} phone={user.phone} />
        </Panel>

        <div className="space-y-6">
          <Panel title="Account" description="Managed by the sign-in provider">
            <dl className="divide-y divide-border">
              <InfoRow label="Email" value={user.email} />
              <InfoRow
                label="Role"
                value={
                  user.role === "admin" ? "Super admin" : user.role === "owner" ? "Venue owner" : "Customer"
                }
              />
              <InfoRow
                label="Owner access"
                value={
                  <Badge
                    tone={
                      user.ownerStatus === "approved"
                        ? "success"
                        : user.ownerStatus === "pending"
                          ? "warning"
                          : user.ownerStatus === "rejected" || user.ownerStatus === "suspended"
                            ? "danger"
                            : "neutral"
                    }
                  >
                    {OWNER_STATUS_LABELS[user.ownerStatus]}
                  </Badge>
                }
              />
              {user.isDemo ? <InfoRow label="Session" value="Local development account" /> : null}
            </dl>
            <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
              Email addresses come from the identity provider and cannot be edited here.
              Contact support if the address on your account is wrong.
            </p>
          </Panel>

          <Panel
            title="Venue owner access"
            description="Separate from venue publication approval"
            actions={
              user.ownerStatus === "approved" ? (
                <ButtonLink href="/owner" size="sm" variant="secondary">
                  Owner dashboard
                </ButtonLink>
              ) : null
            }
          >
            {request ? (
              <div className="space-y-3">
                <dl className="divide-y divide-border">
                  <InfoRow label="Business" value={request.business_name} />
                  <InfoRow label="Status" value={OWNER_STATUS_LABELS[user.ownerStatus]} />
                  <InfoRow label="Submitted" value={formatDateTime(request.created_at)} />
                  {request.rejection_reason ? (
                    <InfoRow label="Review note" value={request.rejection_reason} />
                  ) : null}
                </dl>
                <Link
                  href="/owner/status"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-4"
                >
                  View application <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </div>
            ) : (
              <div>
                <p className="text-sm leading-relaxed text-muted">
                  You have not applied for venue-owner access. Apply once, then submit each
                  venue for its own publication review.
                </p>
                <ButtonLink href="/list-your-venue" variant="secondary" size="sm" className="mt-4">
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                  Apply for owner access
                </ButtonLink>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
