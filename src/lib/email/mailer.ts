import "server-only";

import nodemailer, { type Transporter } from "nodemailer";
import { brand } from "@/lib/brand";

export type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export type MailResult = {
  status: "sent" | "skipped" | "failed";
  messageId: string | null;
  error?: string;
};

let cachedTransporter: Transporter | null = null;

export function getGmailUser(): string | null {
  return process.env.GMAIL_USER?.trim() || null;
}

export function getSupportEmail(): string {
  return (
    process.env.SUPPORT_EMAIL?.trim() ||
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() ||
    getGmailUser() ||
    "support@venueone.in"
  );
}

function getTransporter(): Transporter | null {
  const user = getGmailUser();
  const rawPass = process.env.GMAIL_APP_PASSWORD?.trim();
  const pass = rawPass ? rawPass.replace(/\s+/g, "") : null;

  if (!user || !pass) {
    return null;
  }

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user,
        pass,
      },
      pool: true,
      maxConnections: 3,
      maxMessages: 50,
    });
  }

  return cachedTransporter;
}

export async function sendMail(options: SendEmailOptions): Promise<MailResult> {
  const transporter = getTransporter();
  const gmailUser = getGmailUser();
  const supportEmail = getSupportEmail();

  if (!transporter || !gmailUser) {
    // If Gmail credentials are not yet configured, log cleanly so dev/test is unaffected
    console.warn(
      `[VenueOne Mailer] Skipped email to ${options.to} ("${options.subject}"). ` +
        `GMAIL_USER and GMAIL_APP_PASSWORD must be configured in .env.local to send live emails.`,
    );
    return {
      status: "skipped",
      messageId: null,
      error: "GMAIL_USER or GMAIL_APP_PASSWORD is not configured.",
    };
  }

  // When sending via Gmail SMTP, the From address must match the authenticated Gmail user to pass Google SPF/DKIM
  const fromAddress = `"${brand.name}" <${gmailUser}>`;

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: options.to,
      replyTo: options.replyTo || supportEmail,
      subject: options.subject,
      html: options.html,
      text: options.text,
      headers: {
        "X-Entity-Ref-ID": `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        "Auto-Submitted": "auto-generated",
      },
    });

    return {
      status: "sent",
      messageId: info.messageId || null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[VenueOne Mailer] Failed to send email via Gmail:", message);
    return {
      status: "failed",
      messageId: null,
      error: message,
    };
  }
}
