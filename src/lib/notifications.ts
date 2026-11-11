import "server-only";

import { dbQuery } from "@/lib/db";
import { brand } from "@/lib/brand";
import { sendMail, type MailResult } from "@/lib/email/mailer";
import { sendLoginGreeting } from "@/lib/email/account";
import {
  button,
  emailLayout,
  textLayout,
  type EmailMessage,
} from "@/lib/email/render";
import type { NotificationRow } from "@/lib/types";

export type NotifyInput = {
  type: string;
  title: string;
  body: string;
  link?: string | null;
  email?: boolean;
  /** Rich, fully rendered message. Falls back to a branded generic layout. */
  emailContent?: EmailMessage | null;
  /** Legacy template fields still used by booking and payment services. */
  emailSubject?: string;
  emailHtml?: string;
  emailText?: string;
};

type Recipient = { id: string; email: string; full_name: string | null };

function absoluteLink(link: string | null): string {
  if (!link) return brand.siteUrl;
  return link.startsWith("http") ? link : `${brand.siteUrl}${link}`;
}

function genericEmail(
  title: string,
  body: string,
  link: string | null,
): EmailMessage {
  const url = absoluteLink(link);
  return {
    subject: title,
    html: emailLayout({
      preheader: body,
      kicker: "Notification",
      heading: title,
      intro: body,
      bodyHtml: button(url, `Open ${brand.name}`),
    }),
    text: textLayout([title, "", body], { url, label: `Open ${brand.name}` }),
  };
}

async function sendEmail(
  recipient: Recipient,
  title: string,
  body: string,
  link: string | null,
  content?: EmailMessage | null,
): Promise<MailResult> {
  const message = content ?? genericEmail(title, body, link);
  return sendMail({
    to: recipient.email,
    subject: message.subject,
    html: message.html,
    text: message.text,
  });
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

    const content =
      input.emailContent ??
      (input.emailSubject && input.emailHtml
        ? {
            subject: input.emailSubject,
            html: input.emailHtml,
            text: input.emailText ?? "",
          }
        : null);

    const email = await sendEmail(
      recipient,
      input.title,
      input.body,
      input.link ?? null,
      content,
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

export async function notifyAdmins(input: NotifyInput): Promise<void> {
  const rows = await dbQuery<Recipient>(
    `select id, email, full_name from profiles
     where role = 'admin' and is_suspended = false`,
  );
  await deliver(rows, input);
}

/**
 * Login greeting. Throttled inside the email module so repeated session
 * refreshes do not send duplicate mail.
 */
export async function sendGreetingOnLogin(
  userId: string,
  _email?: string,
  _fullName?: string | null,
): Promise<void> {
  await sendLoginGreeting(userId);
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
