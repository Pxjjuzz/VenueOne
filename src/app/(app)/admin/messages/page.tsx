import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageSquare, Reply } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { listContactMessages } from "@/lib/admin/service";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { AdminMessageActions } from "@/components/admin/admin-message-actions";
import { formatDateTime, pluralize } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Contact messages",
  robots: { index: false, follow: false },
};

const tabs = [
  { value: "new", label: "New" },
  { value: "read", label: "Read" },
  { value: "replied", label: "Replied" },
  { value: "all", label: "All" },
] as const;

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  read: "Read",
  replied: "Replied",
};

function messageTone(status: string) {
  if (status === "new") return "warning" as const;
  if (status === "replied") return "success" as const;
  return "neutral" as const;
}

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const requested = typeof params.status === "string" ? params.status : "new";
  const status = tabs.some((tab) => tab.value === requested) ? requested : "new";
  const messages = await listContactMessages(status);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="Contact messages"
        description="Enquiries submitted through the public contact form. Sender details stay private to administrators; replies happen by email from your own mailbox."
      />

      <div
        className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar"
        role="tablist"
        aria-label="Filter contact messages"
      >
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === "new" ? "/admin/messages" : `/admin/messages?status=${tab.value}`}
            role="tab"
            aria-selected={status === tab.value}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              status === tab.value
                ? "border-primary bg-primary text-white"
                : "border-border-strong bg-surface text-foreground-soft hover:border-primary/40",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {messages.length === 0 ? (
        <EmptyState
          variant="search"
          title={status === "new" ? "No new messages" : "Nothing in this view"}
          description={
            status === "new"
              ? "Messages from the public contact form appear here. An empty inbox is a valid state."
              : "No contact messages match this filter."
          }
        />
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-muted">{pluralize(messages.length, "message")}</p>
          <ul className="space-y-4">
            {messages.map((message) => (
              <li key={message.id} className="surface-card overflow-hidden">
                <div className="border-b border-border px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-base font-semibold tracking-[-0.02em] text-foreground">
                        {message.subject}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {message.name} · {formatDateTime(message.created_at)}
                      </p>
                    </div>
                    <Badge tone={messageTone(message.status)}>
                      {STATUS_LABELS[message.status] ?? message.status}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-4 px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
                    <a
                      href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`}
                      className="inline-flex items-center gap-1.5 break-all font-medium text-primary hover:underline"
                    >
                      <Reply className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {message.email}
                    </a>
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                      Sent to support inbox
                    </span>
                  </div>

                  <div className="rounded-[var(--radius-sm)] border border-border bg-surface-secondary/50 px-3.5 py-3">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground-soft">
                      {message.message}
                    </p>
                  </div>

                  <div className="border-t border-border pt-4">
                    <AdminMessageActions messageId={message.id} status={message.status} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-border bg-surface px-4 py-4">
        <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-muted">
          Marking a message replied only records the status here. It does not send email.
          Replying from your mailbox keeps the conversation outside the platform.
        </p>
      </div>
    </div>
  );
}
