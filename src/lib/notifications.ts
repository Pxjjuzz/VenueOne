import "server-only";

import { dbQuery } from "@/lib/db";
import { brand } from "@/lib/brand";
import type { NotificationRow } from "@/lib/types";
import { sendMail } from "@/lib/email/mailer";
import { emailLayout, textLayout, button } from "@/lib/email/render";

export type NotifyInput = {
  type: string;
  title: string;
  body: string;
  link?: string | null;
  email?: boolean;
  emailSubject?: string;
  emailHtml?: string;
  emailText?: string;
};

type Recipient = { id: string; email: string; full_name: string | null };

async function sendEmail(
  recipient: Recipient,
  title: string,
  body: string,
  link: string | null,
  customHtml?: string,
  customText?: string,
): Promise<{ status: "skipped" | "sent" | "failed"; providerId: string | null }> {
  const absoluteLink = link
    ? link.startsWith("http")
      ? link
      : `${brand.siteUrl}${link}`
    : brand.siteUrl;

  const html =
    customHtml ||
    emailLayout({
      preheader: body.slice(0, 100),
      kicker: "Notification",
      heading: title,
      intro: body,
      bodyHtml: button(absoluteLink, `Open ${brand.name}`),
      footerNote: `This notification relates to your ${brand.name} account.`,
    });

  const text =
    customText ||
    textLayout([title, "", body], { url: absoluteLink, label: `Open ${brand.name}` });

  // 1. Primary transport: Gmail system via Nodemailer
  if (process.env.GMAIL_USER?.trim() && process.env.GMAIL_APP_PASSWORD?.trim()) {
    const result = await sendMail({
      to: recipient.email,
      subject: title,
      html,
      text,
    });
    return {
      status: result.status,
      providerId: result.messageId,
    };
  }

  // 2. Secondary fallback: Resend if configured
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || `${brand.name} <notifications@venueone.in>`,
          to: [recipient.email],
          subject: title,
          html,
        }),
        signal: AbortSignal.timeout(7000),
      });

      if (!response.ok) {
        const detail = await response.text();
        console.error("Resend notification email failed", response.status, detail.slice(0, 300));
        return { status: "failed", providerId: null };
      }

      const payload = (await response.json()) as { id?: string };
      return { status: "sent", providerId: payload.id ?? null };
    } catch (error) {
      console.error("Resend notification email failed", error);
      return { status: "failed", providerId: null };
    }
  }

  return { status: "skipped", providerId: null };
}

async function deliver(recipients: Recipient[], input: NotifyInput) {
  if (recipients.length === 0) return;

  for (const recipient of recipients) {
    const inserted = await dbQuery<{ id: string }>(
      `insert into notifications (user_id, type, title, body, link)
       values ($1, $2, $3, $4, $5)
       returning id`,
      [recipient.id, input.type, input.title, input.body, input.link ?? null],
    );

    if (!input.email || !inserted[0]) continue;

    const email = await sendEmail(
      recipient,
      input.emailSubject || input.title,
      input.body,
      input.link ?? null,
      input.emailHtml,
      input.emailText,
    );
    await dbQuery(
      `update notifications
       set email_status = $2, email_provider_id = $3
       where id = $1`,
      [inserted[0].id, email.status, email.providerId],
    ).catch((error) => console.error("Notification status update failed", error));
  }
}

export async function notifyUsers(userIds: string[], input: NotifyInput): Promise<void> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return;

  const rows = await dbQuery<Recipient>(
    `select id, email, full_name from profiles
     where id = any($1::uuid[]) and is_suspended = false`,
    [`{${unique.join(",")}}`],
  );

  await deliver(rows, input);
}

export async function notifyUser(userId: string, input: NotifyInput): Promise<void> {
  await notifyUsers([userId], input);
}

export async function sendGreetingOnLogin(
  userId: string,
  email: string,
  fullName: string | null,
): Promise<void> {
  try {
    const existing = await dbQuery<{ id: string }>(
      `select id from notifications
       where user_id = $1 and type = 'auth.greeting'
         and created_at > now() - interval '6 hours'
       limit 1`,
      [userId],
    );
    if (existing.length > 0) return;

    const { renderGreetingEmail } = await import("@/lib/email/templates");
    const mail = renderGreetingEmail({ name: fullName, email });

    await notifyUser(userId, {
      type: "auth.greeting",
      title: mail.subject,
      body: `Welcome to ${brand.name}, ${fullName || "there"}! Discover and reserve verified community halls and grounds.`,
      link: "/dashboard",
      email: true,
      emailSubject: mail.subject,
      emailHtml: mail.html,
      emailText: mail.text,
    });
  } catch (error) {
    console.error("Failed to send login greeting notification", error);
  }
}

export async function notifyAdmins(input: NotifyInput): Promise<void> {
  const rows = await dbQuery<Recipient>(
    `select id, email, full_name from profiles
     where role = 'admin' and is_suspended = false`,
  );
  await deliver(rows, input);
}

export async function listNotifications(userId: string, limit = 50): Promise<NotificationRow[]> {
  return dbQuery<NotificationRow>(
    `select * from notifications
     where user_id = $1
     order by created_at desc
     limit $2`,
    [userId, limit],
  );
}

export async function unreadNotificationCount(userId: string): Promise<number> {
  const rows = await dbQuery<{ count: number }>(
    "select count(*)::int as count from notifications where user_id = $1 and read_at is null",
    [userId],
  );
  return rows[0]?.count ?? 0;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await dbQuery(
    "update notifications set read_at = now() where user_id = $1 and read_at is null",
    [userId],
  );
}
