import "server-only";

import nodemailer, { type Transporter } from "nodemailer";
import { brand } from "@/lib/brand";

export type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  from?: string;
};

export type MailResult = {
  status: "skipped" | "sent" | "failed";
  providerId: string | null;
  error?: string;
};

let cachedTransporter: Transporter | null | undefined;

function gmailUser(): string | null {
  return process.env.GMAIL_USER?.trim() || null;
}

function gmailPassword(): string | null {
  // Google shows app passwords in groups of four; the spaces are cosmetic.
  const value = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "").trim();
  return value || null;
}

export function gmailConfigured(): boolean {
  return Boolean(gmailUser() && gmailPassword());
}

export function emailConfigured(): boolean {
  return gmailConfigured() || Boolean(process.env.RESEND_API_KEY?.trim());
}

export function emailProvider(): "gmail" | "resend" | null {
  if (gmailConfigured()) return "gmail";
  if (process.env.RESEND_API_KEY?.trim()) return "resend";
  return null;
}

export function supportEmail(): string | null {
  return (
    process.env.SUPPORT_EMAIL?.trim() ||
    brand.supportEmail ||
    gmailUser() ||
    null
  );
}

export function defaultFromAddress(): string {
  const explicit = process.env.EMAIL_FROM?.trim();
  if (explicit) return explicit;
  const user = gmailUser();
  return user ? `${brand.name} <${user}>` : `${brand.name} <notifications@example.com>`;
}

function transporter(): Transporter | null {
  if (cachedTransporter !== undefined) return cachedTransporter;
  if (!gmailConfigured()) {
    cachedTransporter = null;
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser()!, pass: gmailPassword()! },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return cachedTransporter;
}

async function sendViaGmail(message: MailMessage): Promise<MailResult> {
  const transport = transporter();
  if (!transport) return { status: "skipped", providerId: null };

  try {
    const info = await transport.sendMail({
      from: message.from ?? defaultFromAddress(),
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      replyTo: message.replyTo ?? supportEmail() ?? undefined,
    });
    return { status: "sent", providerId: info.messageId ?? null };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("Gmail delivery failed", detail);
    return { status: "failed", providerId: null, error: detail };
  }
}

async function sendViaResend(message: MailMessage): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { status: "skipped", providerId: null };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: message.from ?? defaultFromAddress(),
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        reply_to: message.replyTo ?? supportEmail() ?? undefined,
      }),
      signal: AbortSignal.timeout(9000),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("Resend delivery failed", response.status, detail.slice(0, 300));
      return {
        status: "failed",
        providerId: null,
        error: `Resend responded with ${response.status}`,
      };
    }

    const payload = (await response.json()) as { id?: string };
    return { status: "sent", providerId: payload.id ?? null };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("Resend delivery failed", detail);
    return { status: "failed", providerId: null, error: detail };
  }
}

/**
 * Sends transactional mail through Gmail SMTP when credentials exist. Resend
 * remains an optional fallback for deployments that prefer it.
 */
export async function sendMail(message: MailMessage): Promise<MailResult> {
  if (gmailConfigured()) return sendViaGmail(message);
  if (process.env.RESEND_API_KEY?.trim()) return sendViaResend(message);
  return { status: "skipped", providerId: null };
}
