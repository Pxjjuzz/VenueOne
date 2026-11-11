import "server-only";

import { dbQuery } from "@/lib/db";
import { emailConfigured, sendMail } from "@/lib/email/mailer";
import { renderGreetingEmail } from "@/lib/email/templates";

type GreetingProfile = {
  id: string;
  email: string;
  full_name: string | null;
  is_suspended: boolean;
  created_at: Date | string;
};

const THROTTLE_HOURS = 20;
const NEW_ACCOUNT_MINUTES = 15;

/**
 * Sends at most one greeting email per user per throttle window. The throttled
 * record also keeps an audit trail of delivery status in the notifications
 * table without adding an unread badge.
 */
export async function sendLoginGreeting(userId: string): Promise<void> {
  if (!emailConfigured()) return;

  try {
    const rows = await dbQuery<GreetingProfile>(
      `select id, email, full_name, is_suspended, created_at
       from profiles where id = $1`,
      [userId],
    );
    const profile = rows[0];
    if (!profile || profile.is_suspended || !profile.email) return;

    const recent = await dbQuery<{ id: string }>(
      `select id from notifications
       where user_id = $1 and type = 'account.login'
         and created_at > now() - ($2 || ' hours')::interval
       limit 1`,
      [profile.id, String(THROTTLE_HOURS)],
    );
    if (recent.length > 0) return;

    const created = new Date(profile.created_at).getTime();
    const newAccount = Number.isFinite(created) && Date.now() - created < NEW_ACCOUNT_MINUTES * 60_000;

    const message = renderGreetingEmail({
      name: profile.full_name,
      email: profile.email,
      newAccount,
    });

    const result = await sendMail({
      to: profile.email,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    await dbQuery(
      `insert into notifications
         (user_id, type, title, body, link, read_at, email_status, email_provider_id)
       values ($1, 'account.login', $2, $3, '/dashboard', now(), $4, $5)`,
      [
        profile.id,
        message.subject,
        newAccount
          ? "Welcome to your new account. A greeting email has been sent."
          : "Welcome back. A sign-in greeting email has been sent.",
        result.status,
        result.providerId,
      ],
    ).catch((error) => console.error("Greeting record failed", error));
  } catch (error) {
    console.error("Login greeting failed", error);
  }
}
