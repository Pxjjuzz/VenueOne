import { brand } from "@/lib/brand";
import { formatMoney } from "@/lib/format";

export type EmailMessage = {
  subject: string;
  html: string;
  text: string;
};

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function siteUrl(): string {
  return brand.siteUrl;
}

function displayHost(): string {
  const host = brand.siteUrl.replace(/^https?:\/\//, "");
  return host.includes("localhost") || host.includes("127.0.0.1") ? "venueone.in" : host;
}

function supportLine(): string {
  const support =
    process.env.SUPPORT_EMAIL?.trim() ||
    brand.supportEmail ||
    process.env.GMAIL_USER?.trim() ||
    null;
  return support ? escapeHtml(support) : "";
}

export function button(url: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px">
    <tr>
      <td style="border-radius:8px;background:#244c3b">
        <a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 22px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

export function details(rows: Array<[string, string]>): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0;border:1px solid #e2e2d9;border-radius:10px;border-collapse:separate;overflow:hidden">
    ${rows
      .map(
        ([label, value], index) => `<tr>
      <td style="padding:11px 14px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#61655d;background:${index % 2 === 0 ? "#faf9f5" : "#ffffff"};border-bottom:${index === rows.length - 1 ? "0" : "1px solid #eeeeE8"};vertical-align:top;width:42%">${escapeHtml(label)}</td>
      <td style="padding:11px 14px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#20231f;background:${index % 2 === 0 ? "#faf9f5" : "#ffffff"};border-bottom:${index === rows.length - 1 ? "0" : "1px solid #eeeeE8"};vertical-align:top">${escapeHtml(value)}</td>
    </tr>`,
      )
      .join("")}
  </table>`;
}

export type InvoiceLine = { label: string; amountPaise: number };

export function invoiceBlock(input: {
  number: string;
  issuedAt: string;
  status: string;
  lines: InvoiceLine[];
  totalPaise: number;
  paymentReference?: string | null;
  method?: string | null;
  note?: string | null;
}): string {
  const rows = input.lines
    .map(
      (line) => `<tr>
      <td style="padding:9px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#34382f;border-bottom:1px solid #eeeeE8">${escapeHtml(line.label)}</td>
      <td align="right" style="padding:9px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#20231f;border-bottom:1px solid #eeeeE8;white-space:nowrap">${escapeHtml(formatMoney(line.amountPaise))}</td>
    </tr>`,
    )
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0;border:1px solid #d8dcd2;border-radius:12px;border-collapse:separate;overflow:hidden">
    <tr>
      <td style="padding:16px 18px;background:#244c3b">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#c8d59b">Payment receipt</td>
            <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;color:#ffffff">${escapeHtml(input.status)}</td>
          </tr>
        </table>
        <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:bold;color:#ffffff">${escapeHtml(input.number)}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 18px;background:#ffffff">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px">
          <tr>
            <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#61655d">Issued ${escapeHtml(input.issuedAt)}</td>
            ${
              input.paymentReference
                ? `<td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#61655d">Ref ${escapeHtml(input.paymentReference)}</td>`
                : ""
            }
          </tr>
          ${
            input.method
              ? `<tr><td colspan="2" style="padding-top:3px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#61655d">Method ${escapeHtml(input.method)}</td></tr>`
              : ""
          }
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${rows}
          <tr>
            <td style="padding:14px 0 2px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#20231f">Total paid</td>
            <td align="right" style="padding:14px 0 2px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#244c3b;white-space:nowrap">${escapeHtml(formatMoney(input.totalPaise))}</td>
          </tr>
        </table>
        ${
          input.note
            ? `<p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:#777b73">${escapeHtml(input.note)}</p>`
            : ""
        }
      </td>
    </tr>
  </table>`;
}

export function emailLayout(input: {
  preheader: string;
  kicker: string;
  heading: string;
  intro?: string;
  bodyHtml?: string;
  footerNote?: string;
}): string {
  const support = supportLine();
  const year = new Date().getUTCFullYear();

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${escapeHtml(input.heading)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f1efe7">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(input.preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1efe7;padding:24px 12px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid #e2e2d9;border-radius:14px;overflow:hidden">
            <tr>
              <td style="background:#20231f;padding:22px 26px">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:bold;letter-spacing:-0.02em;color:#ffffff">${escapeHtml(brand.name)}</td>
                    <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#c8d59b">Halls &amp; grounds</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 26px 24px">
                <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:bold;letter-spacing:0.18em;text-transform:uppercase;color:#61655d">${escapeHtml(input.kicker)}</p>
                <h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:25px;line-height:1.22;letter-spacing:-0.02em;color:#20231f">${escapeHtml(input.heading)}</h1>
                ${
                  input.intro
                    ? `<p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#3f443e">${escapeHtml(input.intro)}</p>`
                    : ""
                }
                ${input.bodyHtml ?? ""}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 26px 24px;background:#faf9f5;border-top:1px solid #e2e2d9">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.7;color:#777b73">
                  ${input.footerNote ? `${escapeHtml(input.footerNote)}<br />` : ""}
                  Need help? Reply to this email${support ? ` or write to <a href="mailto:${support}" style="color:#244c3b;font-weight:bold">${support}</a>` : ""}.
                  <br />
                  <a href="${escapeHtml(siteUrl())}" style="color:#244c3b;font-weight:bold">${escapeHtml(displayHost())}</a>
                  &nbsp;·&nbsp; © ${year} ${escapeHtml(brand.name)}
                </p>
              </td>
            </tr>
          </table>
          <p style="max-width:600px;margin:14px auto 0;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.6;color:#8a8d85;text-align:center">
            You are receiving this because of an account or booking on ${escapeHtml(brand.name)}.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function textLayout(lines: string[], cta?: { url: string; label: string }): string {
  const support =
    process.env.SUPPORT_EMAIL?.trim() ||
    brand.supportEmail ||
    process.env.GMAIL_USER?.trim() ||
    null;
  return [
    ...lines,
    "",
    cta ? `${cta.label}: ${cta.url}` : `Open ${brand.name}: ${siteUrl()}`,
    support ? `Support: ${support}` : "",
    "",
    `${brand.name} · ${siteUrl()}`,
  ]
    .filter((line) => line !== "")
    .join("\n");
}
