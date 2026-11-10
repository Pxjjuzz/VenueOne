import "server-only";

import { dbQuery } from "@/lib/db";
import type {
  BookingWithVenue,
  CancellationRow,
  PaymentRow,
  RefundRow,
} from "@/lib/types";

export type BookingWithVenueExtra = BookingWithVenue & {
  customer_phone: string | null;
  owner_id: string | null;
  venue_contact_phone: string | null;
  venue_contact_email: string | null;
};

const BOOKING_SELECT = `
  b.*,
  v.name as venue_name,
  v.slug as venue_slug,
  v.category as venue_category,
  v.city as venue_city,
  v.address_line as venue_address_line,
  v.state as venue_state,
  v.owner_id,
  v.contact_phone as venue_contact_phone,
  v.contact_email as venue_contact_email,
  p.full_name as customer_name,
  p.email as customer_email,
  p.phone as customer_phone,
  (select photo.storage_path from venue_photos photo
   where photo.venue_id = v.id order by photo.sort_order asc, photo.created_at asc limit 1) as photo_path
`;

export async function getBookingForCustomer(
  bookingId: string,
  customerId: string,
): Promise<BookingWithVenueExtra | null> {
  const rows = await dbQuery<BookingWithVenueExtra>(
    `select ${BOOKING_SELECT}
     from bookings b
     join venues v on v.id = b.venue_id
     join profiles p on p.id = b.customer_id
     where b.id = $1 and b.customer_id = $2`,
    [bookingId, customerId],
  );
  return rows[0] ?? null;
}

export async function getBookingForOwner(
  bookingId: string,
  ownerId: string,
): Promise<BookingWithVenueExtra | null> {
  const rows = await dbQuery<BookingWithVenueExtra>(
    `select ${BOOKING_SELECT}
     from bookings b
     join venues v on v.id = b.venue_id
     join profiles p on p.id = b.customer_id
     where b.id = $1 and v.owner_id = $2`,
    [bookingId, ownerId],
  );
  return rows[0] ?? null;
}

export async function getBookingForAdmin(
  bookingId: string,
): Promise<BookingWithVenueExtra | null> {
  const rows = await dbQuery<BookingWithVenueExtra>(
    `select ${BOOKING_SELECT}
     from bookings b
     join venues v on v.id = b.venue_id
     join profiles p on p.id = b.customer_id
     where b.id = $1`,
    [bookingId],
  );
  return rows[0] ?? null;
}

export async function listCustomerBookings(customerId: string): Promise<BookingWithVenueExtra[]> {
  return dbQuery<BookingWithVenueExtra>(
    `select ${BOOKING_SELECT}
     from bookings b
     join venues v on v.id = b.venue_id
     join profiles p on p.id = b.customer_id
     where b.customer_id = $1
     order by b.created_at desc`,
    [customerId],
  );
}

export async function listOwnerBookings(
  ownerId: string,
  status?: string,
): Promise<BookingWithVenueExtra[]> {
  const params: (string | number)[] = [ownerId];
  let clause = "";
  if (status && status !== "all") {
    params.push(status);
    clause = `and b.status = $${params.length}`;
  }
  return dbQuery<BookingWithVenueExtra>(
    `select ${BOOKING_SELECT}
     from bookings b
     join venues v on v.id = b.venue_id
     join profiles p on p.id = b.customer_id
     where v.owner_id = $1 ${clause}
     order by
       case b.status when 'pending_owner_approval' then 0 when 'awaiting_payment' then 1 else 2 end,
       b.starts_at asc`,
    params,
  );
}

export async function listAdminBookings(input: {
  status?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: BookingWithVenueExtra[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 20));
  const where: string[] = ["1 = 1"];
  const params: (string | number)[] = [];

  if (input.status && input.status !== "all") {
    params.push(input.status);
    where.push(`b.status = $${params.length}`);
  }
  if (input.q?.trim()) {
    params.push(`%${input.q.trim().slice(0, 100)}%`);
    where.push(`(b.reference ilike $${params.length} or v.name ilike $${params.length} or p.email ilike $${params.length})`);
  }

  params.push(pageSize, (page - 1) * pageSize);

  const rows = await dbQuery<BookingWithVenueExtra & { total_count: number }>(
    `select ${BOOKING_SELECT}, count(*) over()::int as total_count
     from bookings b
     join venues v on v.id = b.venue_id
     join profiles p on p.id = b.customer_id
     where ${where.join(" and ")}
     order by b.created_at desc
     limit $${params.length - 1} offset $${params.length}`,
    params,
  );

  return {
    items: rows.map(({ total_count: _count, ...row }) => row),
    total: rows[0]?.total_count ?? 0,
    page,
    pageSize,
  };
}

export async function getBookingStatusHistory(
  bookingId: string,
): Promise<
  {
    id: number;
    from_status: string | null;
    to_status: string;
    note: string | null;
    created_at: Date;
  }[]
> {
  return dbQuery(
    `select id, from_status, to_status, note, created_at
     from booking_status_history where booking_id = $1 order by created_at asc`,
    [bookingId],
  );
}

export async function listBookingPayments(bookingId: string): Promise<PaymentRow[]> {
  return dbQuery<PaymentRow>(
    "select * from payments where booking_id = $1 order by created_at desc",
    [bookingId],
  );
}

export async function getCancellationForBooking(
  bookingId: string,
): Promise<CancellationRow | null> {
  const rows = await dbQuery<CancellationRow>(
    "select * from cancellations where booking_id = $1",
    [bookingId],
  );
  return rows[0] ?? null;
}

export async function listRefundsForBooking(bookingId: string): Promise<RefundRow[]> {
  return dbQuery<RefundRow>(
    "select * from refunds where booking_id = $1 order by created_at desc",
    [bookingId],
  );
}

export type AdminCancellation = CancellationRow & {
  booking_reference: string;
  venue_name: string;
  customer_email: string;
  total_paise: number;
  payment_status: string;
  starts_at: Date;
};

export type AdminRefund = RefundRow & {
  booking_reference: string;
  venue_name: string;
  customer_email: string;
  provider: string;
  provider_payment_id: string | null;
};

export async function listAdminCancellations(status = "all"): Promise<AdminCancellation[]> {
  const params: string[] = [];
  let clause = "1 = 1";
  if (status !== "all") {
    params.push(status);
    clause = "c.status = $1";
  }
  return dbQuery<AdminCancellation>(
    `select c.*, b.reference as booking_reference, v.name as venue_name,
            p.email as customer_email, b.total_paise, b.payment_status, b.starts_at
     from cancellations c
     join bookings b on b.id = c.booking_id
     join venues v on v.id = b.venue_id
     join profiles p on p.id = c.requested_by
     where ${clause}
     order by case c.status when 'requested' then 0 else 1 end, c.created_at desc`,
    params,
  );
}

export type AdminPayment = PaymentRow & {
  booking_reference: string;
  booking_status: string;
  venue_name: string;
  customer_email: string;
};

export async function listAdminPayments(
  status = "all",
  query = "",
): Promise<AdminPayment[]> {
  const params: (string | number)[] = [];
  const where: string[] = ["1 = 1"];

  if (status !== "all") {
    params.push(status);
    where.push(`pay.status = $${params.length}`);
  }
  if (query.trim()) {
    params.push(`%${query.trim().slice(0, 100)}%`);
    where.push(
      `(b.reference ilike $${params.length} or v.name ilike $${params.length} or p.email ilike $${params.length} or pay.provider_payment_id ilike $${params.length})`,
    );
  }

  return dbQuery<AdminPayment>(
    `select pay.*, b.reference as booking_reference, b.status as booking_status,
            v.name as venue_name, p.email as customer_email
     from payments pay
     join bookings b on b.id = pay.booking_id
     join venues v on v.id = b.venue_id
     join profiles p on p.id = b.customer_id
     where ${where.join(" and ")}
     order by case pay.status when 'created' then 0 when 'authorized' then 1 when 'failed' then 2 else 3 end,
              pay.created_at desc
     limit 200`,
    params,
  );
}

export async function listAdminRefunds(status = "all"): Promise<AdminRefund[]> {
  const params: string[] = [];
  let clause = "1 = 1";
  if (status !== "all") {
    params.push(status);
    clause = `r.status = $1`;
  }
  return dbQuery<AdminRefund>(
    `select r.*, b.reference as booking_reference, v.name as venue_name,
            p.email as customer_email, pay.provider, pay.provider_payment_id
     from refunds r
     join bookings b on b.id = r.booking_id
     join venues v on v.id = b.venue_id
     join profiles p on p.id = b.customer_id
     join payments pay on pay.id = r.payment_id
     where ${clause}
     order by case r.status when 'pending' then 0 when 'failed' then 1 else 2 end,
              r.created_at desc`,
    params,
  );
}
