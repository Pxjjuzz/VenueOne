import "server-only";

import { dbQuery } from "@/lib/db";
import { notifyUser } from "@/lib/notifications";
import { renderBookingReminderEmail } from "@/lib/email/templates";
import { formatIstDateLong, formatTimeRange } from "@/lib/time";

type UpcomingBookingRow = {
  id: string;
  reference: string;
  customer_id: string;
  starts_at: Date;
  ends_at: Date;
  slot_type: string;
  venue_name: string;
  address_line: string;
  city: string;
  contact_phone: string | null;
  customer_email: string;
  customer_name: string | null;
};

export async function dispatchUpcomingBookingReminders(): Promise<{ dispatched: number }> {
  try {
    const rows = await dbQuery<UpcomingBookingRow>(
      `select b.id, b.reference, b.customer_id, b.starts_at, b.ends_at, b.slot_type,
              v.name as venue_name, v.address_line, v.city, v.contact_phone,
              p.email as customer_email, p.full_name as customer_name
       from bookings b
       join venues v on v.id = b.venue_id
       join profiles p on p.id = b.customer_id
       where b.status = 'confirmed'
         and b.starts_at between now() and (now() + interval '48 hours')
         and not exists (
           select 1 from notifications n
           where n.user_id = b.customer_id
             and n.type = 'booking.reminder'
             and n.link = '/dashboard/bookings/' || b.id
         )
       limit 50`,
    );

    let dispatched = 0;
    for (const b of rows) {
      const dateStr = formatIstDateLong(b.starts_at);
      const timeStr = formatTimeRange(b.starts_at, b.ends_at);
      const address = [b.address_line, b.city].filter(Boolean).join(", ");

      const mail = renderBookingReminderEmail({
        customerName: b.customer_name,
        reference: b.reference,
        venueName: b.venue_name,
        venueAddress: address,
        venuePhone: b.contact_phone,
        slotLabel: b.slot_type || "Event Slot",
        dateStr,
        timeStr,
        bookingId: b.id,
      });

      await notifyUser(b.customer_id, {
        type: "booking.reminder",
        title: mail.subject,
        body: `Reminder: Your reservation for ${b.venue_name} is on ${dateStr} at ${timeStr}. Keep reference ${b.reference} ready.`,
        link: `/dashboard/bookings/${b.id}`,
        email: true,
        emailSubject: mail.subject,
        emailHtml: mail.html,
        emailText: mail.text,
      });

      dispatched += 1;
    }

    return { dispatched };
  } catch (err) {
    console.error("Failed to dispatch booking reminders:", err);
    return { dispatched: 0 };
  }
}

