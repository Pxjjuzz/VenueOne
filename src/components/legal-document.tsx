import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Scale, ShieldAlert } from "lucide-react";
import type { LegalPageRow } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";

export function LegalDocument({ page }: { page: LegalPageRow }) {
  return (
    <div className="container-page py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <PageHeader
          eyebrow="Legal"
          title={page.title}
          description={`Last updated ${formatDate(page.updated_at)}. This page is maintained by the platform administrator.`}
        />

        {page.requires_legal_review ? (
          <div
            className="mt-6 flex items-start gap-3 rounded-[var(--radius-sm)] border border-warning/35 bg-warning-soft px-4 py-3.5 text-sm leading-relaxed text-warning"
            role="note"
          >
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">Draft: legal review required</p>
              <p className="mt-1">
                Bracketed placeholders in this document must be completed with real
                business and legal details, and the whole document must be reviewed
                by a qualified professional before this platform accepts real
                bookings or payments.
              </p>
            </div>
          </div>
        ) : null}

        <article className="mt-8 space-y-4 text-[0.9375rem] leading-[1.8] text-muted-strong">
          <Markdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h2 className="mt-8 font-display text-2xl font-semibold tracking-[-0.035em] text-foreground first:mt-0">
                  {children}
                </h2>
              ),
              h2: ({ children }) => (
                <h3 className="mt-8 font-display text-xl font-semibold tracking-[-0.03em] text-foreground">
                  {children}
                </h3>
              ),
              h3: ({ children }) => (
                <h4 className="mt-6 text-base font-semibold text-foreground">{children}</h4>
              ),
              p: ({ children }) => <p className="leading-[1.8]">{children}</p>,
              ul: ({ children }) => <ul className="ml-5 list-disc space-y-1.5">{children}</ul>,
              ol: ({ children }) => <ol className="ml-5 list-decimal space-y-1.5">{children}</ol>,
              li: ({ children }) => <li className="pl-1 leading-[1.75]">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
              a: ({ href, children }) => (
                <a href={href} className="font-medium text-primary underline underline-offset-4">
                  {children}
                </a>
              ),
              blockquote: ({ children }) => (
                <blockquote className="rounded-[var(--radius-sm)] border-l-2 border-accent bg-accent-soft/50 px-4 py-3 text-sm text-foreground-soft">
                  {children}
                </blockquote>
              ),
              code: ({ children }) => (
                <code className="rounded bg-surface-secondary px-1.5 py-0.5 text-[0.8125rem] text-foreground">
                  {children}
                </code>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">{children}</table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border border-border bg-surface-secondary px-3 py-2 text-left font-semibold text-foreground">
                  {children}
                </th>
              ),
              td: ({ children }) => <td className="border border-border px-3 py-2">{children}</td>,
              hr: () => <hr className="my-8 border-border" />,
            }}
          >
            {page.content_md}
          </Markdown>
        </article>

        <div className="mt-10 flex items-start gap-3 rounded-[var(--radius-sm)] border border-border bg-surface px-4 py-3.5 text-xs leading-relaxed text-muted">
          <Scale className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <p>
            This document is stored in the platform database and can be edited by a
            platform administrator. Editing does not replace legal review. Contact
            support if you need the current effective version.
          </p>
        </div>
      </div>
    </div>
  );
}
