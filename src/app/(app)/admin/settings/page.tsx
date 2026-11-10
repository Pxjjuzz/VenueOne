import type { Metadata } from "next";
import { Info, ReceiptText, ShieldCheck } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { currentPlatformSettings } from "@/lib/admin/service";
import { AdminSettingsForm } from "@/components/admin/admin-settings-form";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/stat-card";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = {
  title: "Platform settings",
  robots: { index: false, follow: false },
};

export default async function AdminSettingsPage() {
  await requireAdmin();
  const settings = await currentPlatformSettings();
  const policy = settings.cancellationPolicy;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Money & policy"
        title="Platform settings"
        description="Booking fees and the cancellation policy are copied into every new booking. Existing bookings and approved refunds keep the values they were created with."
      />

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Panel
          title="Booking defaults"
          description="Changes apply to new bookings only"
        >
          <AdminSettingsForm settings={settings} />
        </Panel>

        <div className="space-y-6">
          <Panel title="Current snapshot" description="Values a new booking would use right now">
            <dl className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <dt className="inline-flex items-center gap-2 text-muted">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Owner response window
                </dt>
                <dd className="text-right font-medium text-foreground tabular">
                  {settings.ownerResponseHours} hours
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3 border-t border-border pt-3">
                <dt className="inline-flex items-center gap-2 text-muted">
                  <ReceiptText className="h-4 w-4" aria-hidden="true" />
                  Platform fee
                </dt>
                <dd className="text-right font-medium text-foreground tabular">
                  {formatMoney(settings.platformFeePaise)}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3 border-t border-border pt-3">
                <dt className="text-muted">Tax</dt>
                <dd className="text-right font-medium text-foreground tabular">
                  {settings.taxPercent}%
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3 border-t border-border pt-3">
                <dt className="text-muted">Cancellation deadline</dt>
                <dd className="text-right font-medium text-foreground tabular">
                  {policy.cancellationDeadlineHours}h before start
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3 border-t border-border pt-3">
                <dt className="text-muted">Full refund window</dt>
                <dd className="text-right font-medium text-foreground tabular">
                  {policy.fullRefundHours}h before start
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3 border-t border-border pt-3">
                <dt className="text-muted">Partial refund window</dt>
                <dd className="text-right font-medium text-foreground tabular">
                  {policy.partialRefundHours}h at {policy.partialRefundPercent}%
                </dd>
              </div>
            </dl>
          </Panel>

          <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-warning/30 bg-warning-soft px-4 py-4">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <div className="min-w-0 text-xs leading-relaxed text-warning">
              <p className="font-medium text-warning">Refunds are not automatic</p>
              <p className="mt-1">
                The cancellation policy only calculates an eligible refund. A refund must
                still be submitted to the payment provider from the refunds queue, and is
                marked processed only after the provider confirms it.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
