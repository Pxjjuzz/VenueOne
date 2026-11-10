import { brand } from "@/lib/brand";
import { formatMoney } from "@/lib/format";
import {
  button,
  details,
  emailLayout,
  invoiceBlock,
  textLayout,
  type EmailMessage,
  type InvoiceLine,
} from "./render";

function fullUrl(path: string): string {
  const base = brand.siteUrl.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export function renderGreetingEmail(input: {
  name?: string | null;
  email: string;
}): EmailMessage {
  const firstName = input.name?.trim() ? input.name.trim().split(" ")[0] : "there";
  const heading = `Welcome to ${brand.name}, ${firstName}!`;
  const subject = `Welcome to ${brand.name} — Space for every gathering`;
  const exploreUrl = fullUrl("/halls");
  const dashboardUrl = fullUrl("/dashboard");

  const bodyHtml = `
    <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#3f443e">
      We are glad to have you with us. With ${brand.name}, finding and booking community halls and sports grounds is straightforward, transparent, and verified.
    </p>
    <div style="margin:20px 0;padding:16px 18px;background:#f7f6f0;border-radius:10px;border-left:4px solid #244c3b">
      <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#20231f">What you can do on ${brand.name}:</p>
      <ul style="margin:0;padding-left:18px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#555a52">
        <li style="margin-bottom:6px">Browse verified community halls and open sports grounds with live calendar slots</li>
        <li style="margin-bottom:6px">Reserve slots instantly with secure online payment via UPI, cards, and netbanking</li>
        <li style="margin-bottom:6px">Track your confirmations, payment receipts, and manage bookings right from your personal dashboard</li>
      </ul>
    </div>
    ${button(exploreUrl, "Explore venues")}
  `;

  const html = emailLayout({
    preheader: `Welcome to ${brand.name}. Discover and reserve verified community halls and grounds.`,
    kicker: "Welcome to VenueOne",
    heading,
    intro: "Your account is ready. Discover and book local spaces with clear terms and zero hidden charges.",
    bodyHtml,
    footerNote: "You are receiving this because you signed in to VenueOne.",
  });

  const text = textLayout(
    [
      heading,
      "",
      `We're glad to have you with us! With ${brand.name}, finding and booking community halls and sports grounds is straightforward, transparent, and verified.`,
      "",
      "- Real slot availability from the booking engine",
      "- Instant booking and secure online payments",
      "- Track reservations and invoices in your dashboard",
    ],
    { url: dashboardUrl, label: "Open your dashboard" },
  );

  return { subject, html, text };
}

export function renderBookingCreatedEmail(input: {
  customerName?: string | null;
  reference: string;
  venueName: string;
  venueCity?: string | null;
  slotLabel: string;
  dateStr: string;
  timeStr: string;
  totalPaise: number;
  status: "awaiting_payment" | "pending_owner_approval" | "confirmed";
  bookingId: string;
}): EmailMessage {
  const firstName = input.customerName?.trim() ? input.customerName.trim().split(" ")[0] : "Customer";
  const bookingUrl = fullUrl(`/dashboard/bookings/${input.bookingId}`);

  const isInstant = input.status === "awaiting_payment";
  const statusLabel = isInstant ? "Awaiting Payment" : "Pending Owner Review";
  const subject = `Booking ${input.reference} — ${input.venueName} (${statusLabel})`;

  const infoRows: Array<[string, string]> = [
    ["Reference", input.reference],
    ["Venue", `${input.venueName}${input.venueCity ? ` · ${input.venueCity}` : ""}`],
    ["Slot / Date", `${input.dateStr} (${input.slotLabel})`],
    ["Time", input.timeStr],
    ["Total Amount", formatMoney(input.totalPaise)],
    ["Status", statusLabel],
  ];

  const bodyHtml = `
    <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#3f443e">
      Hello ${firstName}, your booking request for <strong>${input.venueName}</strong> has been registered on the server.
    </p>
    ${
      isInstant
        ? `<div style="margin:16px 0;padding:14px 16px;background:#fef7ea;border:1px solid #f0ddba;border-radius:8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#784912">
            <strong>Payment Required:</strong> Your slot is temporarily held. Please complete the online payment before the hold window closes to confirm your booking.
          </div>`
        : `<div style="margin:16px 0;padding:14px 16px;background:#eef5f1;border:1px solid #c9decb;border-radius:8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#1d4634">
            <strong>Owner Approval:</strong> The venue owner has been notified. As soon as the owner approves your date, you will receive an update to complete payment.
          </div>`
    }
    ${details(infoRows)}
    ${button(bookingUrl, isInstant ? "Complete payment now" : "View booking details")}
  `;

  const html = emailLayout({
    preheader: `Booking details for ${input.reference} at ${input.venueName}.`,
    kicker: "Booking update",
    heading: `Booking ${input.reference}`,
    intro: `Details of your scheduled booking at ${input.venueName}.`,
    bodyHtml,
    footerNote: "Review cancellation terms and updates anytime in My Bookings.",
  });

  const text = textLayout(
    [
      `Booking ${input.reference} — ${input.venueName}`,
      "",
      `Slot: ${input.dateStr} (${input.timeStr})`,
      `Total: ${formatMoney(input.totalPaise)}`,
      `Status: ${statusLabel}`,
      "",
      isInstant
        ? "Please complete your payment to finalize this booking."
        : "Your request is awaiting venue owner confirmation.",
    ],
    { url: bookingUrl, label: "View Booking" },
  );

  return { subject, html, text };
}

export function renderPaymentInvoiceEmail(input: {
  customerName?: string | null;
  reference: string;
  invoiceNumber: string;
  venueName: string;
  venueCity?: string | null;
  slotLabel: string;
  dateStr: string;
  timeStr: string;
  subtotalPaise: number;
  feePaise: number;
  taxPaise: number;
  totalPaise: number;
  paymentReference?: string | null;
  paymentMethod?: string | null;
  bookingId: string;
}): EmailMessage {
  const firstName = input.customerName?.trim() ? input.customerName.trim().split(" ")[0] : "there";
  const bookingUrl = fullUrl(`/dashboard/bookings/${input.bookingId}`);
  const subject = `Payment Confirmed & Invoice: ${input.reference} — ${input.venueName}`;

  const lines: InvoiceLine[] = [
    { label: `${input.venueName} · ${input.slotLabel}`, amountPaise: input.subtotalPaise },
  ];
  if (input.feePaise > 0) {
    lines.push({ label: "Platform convenience fee", amountPaise: input.feePaise });
  }
  if (input.taxPaise > 0) {
    lines.push({ label: "Applicable Taxes (GST)", amountPaise: input.taxPaise });
  }

  const invoice = invoiceBlock({
    number: input.invoiceNumber,
    issuedAt: new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    status: "PAID",
    lines,
    totalPaise: input.totalPaise,
    paymentReference: input.paymentReference,
    method: input.paymentMethod || "Online Payment",
    note: "This document serves as your verified payment receipt for VenueOne. Keep this for your records.",
  });

  const bodyHtml = `
    <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#3f443e">
      Hello ${firstName}, we have received and verified your payment. Your booking at <strong>${input.venueName}</strong> is now officially confirmed!
    </p>
    <div style="margin:16px 0;padding:12px 16px;background:#e9f4eb;border-radius:8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1e4c36">
      ✓ <strong>Confirmed Date:</strong> ${input.dateStr} &nbsp;|&nbsp; <strong>Time:</strong> ${input.timeStr}
    </div>
    ${invoice}
    <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#555a52">
      If you ever need to reschedule, inspect policy details, or cancel your booking, you can do so directly from your account in <strong>My Bookings</strong> under the venue's cancellation policy.
    </p>
    ${button(bookingUrl, "View confirmed booking")}
  `;

  const html = emailLayout({
    preheader: `Payment receipt and tax invoice for booking ${input.reference} at ${input.venueName}.`,
    kicker: "Payment Confirmed & Invoice",
    heading: "Booking Confirmed",
    intro: `Thank you for booking with ${brand.name}. Below is your itemized tax invoice and booking receipt.`,
    bodyHtml,
    footerNote: "Cancellation and refund policies apply as recorded at the time of booking.",
  });

  const text = textLayout(
    [
      `Payment Receipt & Confirmed Booking: ${input.reference}`,
      `Venue: ${input.venueName}`,
      `Date & Time: ${input.dateStr} (${input.timeStr})`,
      `Total Paid: ${formatMoney(input.totalPaise)}`,
      input.paymentReference ? `Transaction ID: ${input.paymentReference}` : "",
      `Invoice #: ${input.invoiceNumber}`,
      "",
      "Your slot is confirmed. Cancellation and support are available under My Bookings.",
    ],
    { url: bookingUrl, label: "View Booking & Invoice" },
  );

  return { subject, html, text };
}

export function renderCancellationEmail(input: {
  customerName?: string | null;
  reference: string;
  venueName: string;
  dateStr: string;
  status: "requested" | "approved" | "rejected";
  refundAmountPaise?: number;
  reason?: string;
  note?: string | null;
  bookingId: string;
}): EmailMessage {
  const firstName = input.customerName?.trim() ? input.customerName.trim().split(" ")[0] : "Customer";
  const bookingUrl = fullUrl(`/dashboard/bookings/${input.bookingId}`);

  let title = "Cancellation Update";
  let statusBadge = "Under Review";
  let color = "#8a5a12";

  if (input.status === "approved") {
    title = "Booking Cancelled & Refund Processed";
    statusBadge = "Approved";
    color = "#226a46";
  } else if (input.status === "rejected") {
    title = "Cancellation Request Declined";
    statusBadge = "Declined";
    color = "#b03a3a";
  }

  const subject = `${title}: Booking ${input.reference} — ${input.venueName}`;

  const infoRows: Array<[string, string]> = [
    ["Reference", input.reference],
    ["Venue", input.venueName],
    ["Event Date", input.dateStr],
    ["Request Status", statusBadge],
  ];

  if (input.refundAmountPaise !== undefined) {
    infoRows.push(["Calculated Refund", formatMoney(input.refundAmountPaise)]);
  }
  if (input.reason) {
    infoRows.push(["Reason Given", input.reason]);
  }
  if (input.note) {
    infoRows.push(["Review Note", input.note]);
  }

  const bodyHtml = `
    <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#3f443e">
      Hello ${firstName}, here is an update regarding the cancellation of booking <strong>${input.reference}</strong>.
    </p>
    <div style="margin:16px 0;padding:14px 16px;background:#faf9f5;border-left:4px solid ${color};border-radius:6px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#20231f">
      <strong>Status:</strong> ${statusBadge}
      ${
        input.status === "approved" && input.refundAmountPaise
          ? `<div style="margin-top:6px;color:#226a46">A refund of <strong>${formatMoney(input.refundAmountPaise)}</strong> has been initiated back to your original payment method. Depending on your bank, it typically reflects in 3–5 working days.</div>`
          : input.status === "requested"
            ? "<div style=\"margin-top:6px\">Your cancellation request has been received and is being processed in accordance with the cancellation policy.</div>"
            : ""
      }
    </div>
    ${details(infoRows)}
    ${button(bookingUrl, "View in My Bookings")}
  `;

  const html = emailLayout({
    preheader: `Cancellation notice for booking ${input.reference} at ${input.venueName}.`,
    kicker: "Cancellation notice",
    heading: title,
    intro: `Notice concerning your booking at ${input.venueName}.`,
    bodyHtml,
    footerNote: "Refunds are processed to the source payment account via the payment gateway.",
  });

  const text = textLayout(
    [
      `${title} — ${input.reference}`,
      `Venue: ${input.venueName}`,
      `Date: ${input.dateStr}`,
      `Status: ${statusBadge}`,
      input.refundAmountPaise !== undefined ? `Refund: ${formatMoney(input.refundAmountPaise)}` : "",
      input.note ? `Note: ${input.note}` : "",
    ],
    { url: bookingUrl, label: "View Booking" },
  );

  return { subject, html, text };
}

export function renderBookingReminderEmail(input: {
  customerName?: string | null;
  reference: string;
  venueName: string;
  venueAddress?: string | null;
  venuePhone?: string | null;
  slotLabel: string;
  dateStr: string;
  timeStr: string;
  bookingId: string;
}): EmailMessage {
  const firstName = input.customerName?.trim() ? input.customerName.trim().split(" ")[0] : "there";
  const bookingUrl = fullUrl(`/dashboard/bookings/${input.bookingId}`);
  const subject = `Reminder: Upcoming booking at ${input.venueName} (${input.dateStr})`;

  const infoRows: Array<[string, string]> = [
    ["Reference", input.reference],
    ["Venue", input.venueName],
    ["Address", input.venueAddress || "Check venue listing for location details"],
    ["Date & Slot", `${input.dateStr} · ${input.slotLabel}`],
    ["Time", input.timeStr],
  ];

  if (input.venuePhone) {
    infoRows.push(["Venue Contact", input.venuePhone]);
  }

  const bodyHtml = `
    <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#3f443e">
      Hello ${firstName}, this is a friendly reminder that your booking at <strong>${input.venueName}</strong> is coming up soon!
    </p>
    <div style="margin:16px 0;padding:14px 16px;background:#f0f5ee;border-radius:8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#20231f">
      <strong>Event Date:</strong> ${input.dateStr}<br/>
      <strong>Time:</strong> ${input.timeStr} (${input.slotLabel})<br/>
      <strong>Booking ID:</strong> ${input.reference}
    </div>
    ${details(infoRows)}
    <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#555a52">
      Please present your booking reference at the venue gate for entry. If you have questions before arriving, reach out to the venue contact or our support team.
    </p>
    ${button(bookingUrl, "View booking pass & directions")}
  `;

  const html = emailLayout({
    preheader: `Reminder: Your event at ${input.venueName} is coming up on ${input.dateStr}.`,
    kicker: "Upcoming Event Reminder",
    heading: "Your Event is Coming Up",
    intro: `Everything you need to know for your upcoming reservation at ${input.venueName}.`,
    bodyHtml,
    footerNote: "Need assistance? Reply to this email or reach out to VenueOne support.",
  });

  const text = textLayout(
    [
      `Reminder: Your reservation at ${input.venueName}`,
      `Date: ${input.dateStr}`,
      `Time: ${input.timeStr}`,
      `Reference: ${input.reference}`,
      input.venueAddress ? `Address: ${input.venueAddress}` : "",
      input.venuePhone ? `Phone: ${input.venuePhone}` : "",
    ],
    { url: bookingUrl, label: "Open Booking Pass" },
  );

  return { subject, html, text };
}

