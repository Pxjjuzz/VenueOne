import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getOwnerRequestForUser } from "@/lib/venues/queries";
import { AppPanel, AppRow } from "@/components/mobile/app-panel";
import { AppScreenHeader } from "@/components/mobile/app-screen-header";
import { ProfileForm } from "@/components/profile-form";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { OWNER_STATUS_LABELS, type StatusTone } from "@/lib/types";

export const metadata: Metadata = {
  title: "Profile",
  robots: { index: false, follow: false },
};

function ownerTone(status: string): StatusTone {
  if (status === "approved") return "success";
  if (status === "pending") return "warning";
  if (status === "rejected" || status === "suspended") return "danger";
  return "neutral";
}

export default async function AppProfilePage() {
  const user = await requireUser("/app/account/profile");
  const request = await getOwnerRequestForUser(user.id);
  const isOwner = user.role === "owner" && user.ownerStatus === "approved";
  const isAdmin = user.role === "admin";

  return (
    <div className="pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <AppScreenHeader
        backHref="/app/account"
        backLabel="Back to account"
        title="Profile"
        hint="Name and contact details"
      />

      <div className="px-5 pt-2">
        <AppPanel title="Personal details" hint="Used across bookings, owner tools and support">
          <ProfileForm fullName={user.fullName} phone={user.phone} />
        </AppPanel>

        <AppPanel title="Account" hint="Managed by the sign-in provider">
          <dl>
            <AppRow label="Email" value={user.email} />
            <AppRow
              label="Role"
              value={isAdmin ? "Super admin" : isOwner ? "Venue owner" : "Customer"}
            />
            <AppRow
              label="Owner access"
              value={
                <Badge tone={ownerTone(user.ownerStatus)}>
                  {OWNER_STATUS_LABELS[user.ownerStatus]}
                </Badge>
              }
            />
            {user.isDemo ? (
              <AppRow label="Session" value="Local development account" />
            ) : null}
          </dl>
          <p className="mt-3 flex items-start gap-2 text-[0.72rem] leading-relaxed text-muted">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            Email addresses come from the identity provider and cannot be edited here.
            Contact support if the address on your account is wrong.
          </p>
        </AppPanel>

        <AppPanel
          title="Venue owner access"
          hint="Separate from venue publication approval"
        >
          {request ? (
            <div>
              <dl>
                <AppRow label="Business" value={request.business_name} />
                <AppRow label="Status" value={OWNER_STATUS_LABELS[user.ownerStatus]} />
                <AppRow label="Submitted" value={formatDateTime(request.created_at)} />
                {request.rejection_reason ? (
                  <AppRow label="Review note" value={request.rejection_reason} />
                ) : null}
              </dl>
              <Link
                href="/owner/status"
                className="mt-3 inline-flex items-center gap-1 text-[0.75rem] font-medium text-primary underline underline-offset-4"
              >
                View application
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <div>
              <p className="text-[0.8rem] leading-relaxed text-muted">
                You have not applied for venue-owner access. Apply once, then submit
                each venue for its own publication review.
              </p>
              <Link
                href="/list-your-venue"
                className="mt-3 inline-flex h-10 items-center rounded-full bg-surface-secondary px-4 text-[0.78rem] font-semibold text-foreground-soft"
              >
                Apply for owner access
              </Link>
            </div>
          )}
        </AppPanel>
      </div>
    </div>
  );
}
