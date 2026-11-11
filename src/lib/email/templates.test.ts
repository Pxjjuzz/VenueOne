import { describe, expect, it } from "vitest";
import {
  renderBookingCreatedEmail,
  renderBookingReminderEmail,
  renderCancellationEmail,
  renderGreetingEmail,
  renderPaymentInvoiceEmail,
} from "./templates";

describe("VenueOne Email System Templates", () => {
  it("renders a personalized greeting email", () => {
    const email = renderGreetingEmail({ name: "Rahul Sharma", email: "rahul@example.com" });
    expect(email.subject).toContain("Welcome to VenueOne");
    expect(email.html).toContain("Rahul");
    expect(email.html).toContain("community halls");
  });

  it("renders booking created notification", () => {
    const email = renderBookingCreatedEmail({
      customerName: "Prajwal",
      reference: "BK-1024",
      venueName: "Greenwood Hall",
      venueCity: "Bengaluru",
      slotLabel: "Morning Half Day",
      dateStr: "15 Dec 2026",
      timeStr: "08:00 – 14:00",
      totalPaise: 2500000,
      status: "awaiting_payment",
      bookingId: "test-booking-id",
    });
    expect(email.subject).toContain("BK-1024");
    expect(email.html).toContain("Greenwood Hall");
    expect(email.html).toContain("₹25,000");
  });

  it("renders itemized tax invoice receipt", () => {
    const email = renderPaymentInvoiceEmail({
      customerName: "Anita",
      reference: "BK-8899",
      invoiceNumber: "INV-BK-8899",
      venueName: "City Arena Turf",
      venueCity: "Mumbai",
      slotLabel: "Hourly 18:00 - 20:00",
      dateStr: "20 Dec 2026",
      timeStr: "18:00 – 20:00",
      subtotalPaise: 300000,
      feePaise: 15000,
      taxPaise: 54000,
      totalPaise: 369000,
      bookingId: "test-inv-id",
    });
    expect(email.subject).toContain("Payment confirmed and invoice");
    expect(email.html).toContain("INV-BK-8899");
    expect(email.html).toContain("Total paid");
  });

  it("renders cancellation email with calculated refund", () => {
    const email = renderCancellationEmail({
      customerName: "Prajwal",
      reference: "BK-7700",
      venueName: "Town Hall",
      dateStr: "10 Jan 2027",
      status: "approved",
      refundAmountPaise: 1800000,
      bookingId: "test-cancel-id",
    });
    expect(email.subject).toContain("Booking Cancelled & Refund Initiated");
    expect(email.html).toContain("₹18,000");
  });

  it("renders upcoming event reminder email", () => {
    const email = renderBookingReminderEmail({
      customerName: "Prajwal",
      reference: "BK-9911",
      venueName: "Sports Pavilion",
      venueAddress: "MG Road, Bengaluru",
      venuePhone: "+91 98765 43210",
      slotLabel: "Evening Slot",
      dateStr: "12 Dec 2026",
      timeStr: "16:00 – 19:00",
      bookingId: "test-rem-id",
    });
    expect(email.subject).toContain("Reminder: Upcoming booking");
    expect(email.html).toContain("Sports Pavilion");
    expect(email.html).toContain("MG Road, Bengaluru");
  });
});
