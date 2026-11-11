export type AppRole = "customer" | "owner" | "admin";
export type OwnerStatus = "none" | "pending" | "approved" | "rejected" | "suspended";
export type VenueCategory = "hall" | "ground";
export type VenueStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "unpublished"
  | "suspended";
export type BookingPolicy = "instant" | "approval";
export type PricingSlot = "half_day" | "full_day" | "hour";
export type BookingSlotType =
  | "half_day_morning"
  | "half_day_afternoon"
  | "full_day"
  | "hourly";
export type BookingStatus =
  | "pending_owner_approval"
  | "awaiting_payment"
  | "confirmed"
  | "rejected"
  | "cancelled"
  | "expired"
  | "completed";
export type PaymentStatus = "unpaid" | "processing" | "paid" | "failed" | "refunded" | "partially_refunded";
export type PaymentTxnStatus = "created" | "authorized" | "captured" | "failed" | "refunded" | "partially_refunded";
export type CancellationStatus = "requested" | "approved" | "rejected" | "withdrawn";
export type RefundStatus = "pending" | "initiated" | "processed" | "failed";

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: AppRole;
  owner_status: OwnerStatus;
  is_suspended: boolean;
  created_at: Date;
  updated_at: Date;
};

export type OwnerRequestRow = {
  id: string;
  user_id: string;
  business_name: string;
  contact_phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  ownership_notes: string | null;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type VenueRow = {
  id: string;
  owner_id: string | null;
  name: string;
  slug: string;
  category: VenueCategory;
  description: string;
  address_line: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  capacity: number | null;
  length_m: number | null;
  width_m: number | null;
  attributes: Record<string, unknown>;
  booking_policy: BookingPolicy;
  payment_window_minutes: number;
  accepting_bookings: boolean;
  status: VenueStatus;
  rejection_reason: string | null;
  submitted_at: Date | null;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type VenuePhotoRow = {
  id: string;
  venue_id: string;
  storage_path: string;
  alt_text: string;
  sort_order: number;
  width: number | null;
  height: number | null;
  created_at: Date;
};

export type VenuePricingRow = {
  venue_id: string;
  slot: PricingSlot;
  amount_paise: number | null;
  proposed_amount_paise: number | null;
  proposed_at: Date | null;
  approved_by: string | null;
  approved_at: Date | null;
};

export type VenueHourRow = {
  venue_id: string;
  weekday: number;
  opens_at: string;
  closes_at: string;
  is_closed: boolean;
};

export type VenueBlockRow = {
  id: string;
  venue_id: string;
  starts_at: Date;
  ends_at: Date;
  reason: string;
  block_type: "owner" | "admin" | "maintenance";
  created_by: string | null;
  created_at: Date;
};

export type VenueStatusEventRow = {
  id: string;
  venue_id: string;
  actor_id: string | null;
  from_status: string | null;
  to_status: string;
  note: string | null;
  created_at: Date;
};

export type VenueWithOwner = VenueRow & {
  owner_name: string | null;
  owner_email: string | null;
  photo_path: string | null;
  min_price_paise: number | null;
  max_price_paise: number | null;
  photo_count: number;
};

export type BookingRow = {
  id: string;
  reference: string;
  venue_id: string;
  customer_id: string;
  slot_type: BookingSlotType;
  starts_at: Date;
  ends_at: Date;
  guest_count: number | null;
  event_type: string | null;
  notes: string | null;
  status: BookingStatus;
  payment_status: PaymentStatus;
  subtotal_paise: number;
  fee_paise: number;
  tax_paise: number;
  total_paise: number;
  currency: string;
  hold_expires_at: Date | null;
  pricing_snapshot: Record<string, unknown>;
  cancellation_policy_snapshot: Record<string, unknown>;
  idempotency_key: string | null;
  decision_note: string | null;
  decided_by: string | null;
  decided_at: Date | null;
  cancelled_at: Date | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type BookingWithVenue = BookingRow & {
  venue_name: string;
  venue_slug: string;
  venue_category: VenueCategory;
  venue_city: string;
  venue_address_line: string;
  venue_state: string;
  customer_name: string | null;
  customer_email: string;
  photo_path: string | null;
};

export type PaymentRow = {
  id: string;
  booking_id: string;
  provider: "razorpay" | "demo";
  provider_order_id: string | null;
  provider_payment_id: string | null;
  amount_paise: number;
  currency: string;
  status: PaymentTxnStatus;
  is_demo: boolean;
  method: string | null;
  receipt: string | null;
  failure_reason: string | null;
  notes: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
  captured_at: Date | null;
};

export type CancellationRow = {
  id: string;
  booking_id: string;
  requested_by: string;
  reason: string;
  status: CancellationStatus;
  refund_eligible: boolean;
  refund_percent: number;
  refund_amount_paise: number;
  policy_snapshot: Record<string, unknown>;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  admin_note: string | null;
  created_at: Date;
  updated_at: Date;
};

export type RefundRow = {
  id: string;
  payment_id: string;
  booking_id: string;
  amount_paise: number;
  status: RefundStatus;
  provider_refund_id: string | null;
  is_demo: boolean;
  reason: string | null;
  initiated_by: string | null;
  initiated_at: Date | null;
  processed_at: Date | null;
  failure_reason: string | null;
  created_at: Date;
  updated_at: Date;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read_at: Date | null;
  email_status: "skipped" | "queued" | "sent" | "failed";
  email_provider_id: string | null;
  created_at: Date;
};

export type AuditLogRow = {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  ip: string | null;
  created_at: Date;
};

export type LegalPageRow = {
  slug: string;
  title: string;
  content_md: string;
  requires_legal_review: boolean;
  updated_by: string | null;
  updated_at: Date;
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending_owner_approval: "Pending owner approval",
  awaiting_payment: "Awaiting payment",
  confirmed: "Confirmed",
  rejected: "Rejected",
  cancelled: "Cancelled",
  expired: "Expired",
  completed: "Completed",
};

export const VENUE_STATUS_LABELS: Record<VenueStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  rejected: "Rejected",
  unpublished: "Unpublished",
  suspended: "Suspended",
};

export const OWNER_STATUS_LABELS: Record<OwnerStatus, string> = {
  none: "Not requested",
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  processing: "Processing",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
};

export const CANCELLATION_STATUS_LABELS: Record<CancellationStatus, string> = {
  requested: "Requested",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const REFUND_STATUS_LABELS: Record<RefundStatus, string> = {
  pending: "Pending",
  initiated: "Initiated, awaiting provider",
  processed: "Processed",
  failed: "Failed",
};

export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";

export function bookingStatusTone(status: BookingStatus): StatusTone {
  switch (status) {
    case "confirmed":
    case "completed":
      return "success";
    case "pending_owner_approval":
    case "awaiting_payment":
      return "warning";
    case "rejected":
    case "cancelled":
    case "expired":
      return "danger";
    default:
      return "neutral";
  }
}

export function venueStatusTone(status: VenueStatus): StatusTone {
  switch (status) {
    case "approved":
      return "success";
    case "submitted":
    case "under_review":
      return "warning";
    case "rejected":
    case "suspended":
      return "danger";
    case "unpublished":
      return "info";
    default:
      return "neutral";
  }
}
