-- Core schema for the community booking platform.
-- Works on Supabase Postgres and on the local PGlite development database.

create table if not exists profiles (
  id uuid primary key,
  email text not null unique,
  full_name text,
  phone text,
  avatar_url text,
  role text not null default 'customer' check (role in ('customer', 'owner', 'admin')),
  owner_status text not null default 'none' check (owner_status in ('none', 'pending', 'approved', 'rejected', 'suspended')),
  is_suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on profiles (role);
create index if not exists profiles_owner_status_idx on profiles (owner_status);

create table if not exists owner_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  business_name text not null,
  contact_phone text not null,
  address text not null,
  city text not null,
  state text not null,
  pincode text not null,
  ownership_notes text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_by uuid references profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists owner_requests_status_idx on owner_requests (status, created_at);
create index if not exists owner_requests_user_idx on owner_requests (user_id, created_at desc);

create table if not exists venues (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles (id) on delete set null,
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique,
  category text not null check (category in ('hall', 'ground')),
  description text not null default '',
  address_line text not null default '',
  city text not null default '',
  state text not null default '',
  pincode text not null default '',
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  contact_name text,
  contact_phone text,
  contact_email text,
  capacity integer check (capacity is null or (capacity > 0 and capacity <= 100000)),
  length_m numeric(7, 2) check (length_m is null or length_m > 0),
  width_m numeric(7, 2) check (width_m is null or width_m > 0),
  attributes jsonb not null default '{}'::jsonb,
  booking_policy text not null default 'approval' check (booking_policy in ('instant', 'approval')),
  payment_window_minutes integer not null default 20 check (payment_window_minutes between 5 and 1440),
  accepting_bookings boolean not null default true,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'unpublished', 'suspended')),
  rejection_reason text,
  submitted_at timestamptz,
  reviewed_by uuid references profiles (id) on delete set null,
  reviewed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    to_tsvector(
      'english',
      coalesce(name, '') || ' ' || coalesce(city, '') || ' ' || coalesce(state, '') || ' ' || coalesce(description, '')
    )
  ) stored
);

create index if not exists venues_status_category_idx on venues (status, category, created_at desc);
create index if not exists venues_city_idx on venues (city);
create index if not exists venues_owner_idx on venues (owner_id, created_at desc);
create index if not exists venues_search_idx on venues using gin (search_vector);
create index if not exists venues_capacity_idx on venues (capacity);

create table if not exists venue_photos (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues (id) on delete cascade,
  storage_path text not null unique,
  alt_text text not null default '',
  sort_order integer not null default 0,
  width integer,
  height integer,
  created_at timestamptz not null default now()
);

create index if not exists venue_photos_venue_idx on venue_photos (venue_id, sort_order);

create table if not exists venue_amenities (
  venue_id uuid not null references venues (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  primary key (venue_id, name)
);

create table if not exists venue_pricing (
  venue_id uuid not null references venues (id) on delete cascade,
  slot text not null check (slot in ('half_day', 'full_day', 'hour')),
  amount_paise integer check (amount_paise is null or amount_paise >= 0),
  proposed_amount_paise integer check (proposed_amount_paise is null or proposed_amount_paise >= 0),
  proposed_at timestamptz,
  approved_by uuid references profiles (id) on delete set null,
  approved_at timestamptz,
  primary key (venue_id, slot)
);

create table if not exists venue_hours (
  venue_id uuid not null references venues (id) on delete cascade,
  weekday integer not null check (weekday between 0 and 6),
  opens_at time not null default '09:00',
  closes_at time not null default '18:00',
  is_closed boolean not null default false,
  primary key (venue_id, weekday),
  check (is_closed or closes_at > opens_at)
);

create table if not exists venue_blocks (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null default '',
  block_type text not null default 'owner' check (block_type in ('owner', 'admin', 'maintenance')),
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists venue_blocks_range_idx on venue_blocks (venue_id, starts_at, ends_at);

create table if not exists venue_reviews (
  id bigserial primary key,
  venue_id uuid not null references venues (id) on delete cascade,
  actor_id uuid references profiles (id) on delete set null,
  from_status text,
  to_status text not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists venue_reviews_venue_idx on venue_reviews (venue_id, created_at desc);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  venue_id uuid not null references venues (id) on delete restrict,
  customer_id uuid not null references profiles (id) on delete restrict,
  slot_type text not null check (slot_type in ('half_day_morning', 'half_day_afternoon', 'full_day', 'hourly')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  guest_count integer check (guest_count is null or guest_count > 0),
  event_type text,
  notes text,
  status text not null default 'awaiting_payment' check (
    status in ('pending_owner_approval', 'awaiting_payment', 'confirmed', 'rejected', 'cancelled', 'expired', 'completed')
  ),
  payment_status text not null default 'unpaid' check (
    payment_status in ('unpaid', 'processing', 'paid', 'failed', 'refunded', 'partially_refunded')
  ),
  subtotal_paise integer not null default 0 check (subtotal_paise >= 0),
  fee_paise integer not null default 0 check (fee_paise >= 0),
  tax_paise integer not null default 0 check (tax_paise >= 0),
  total_paise integer not null default 0 check (total_paise >= 0),
  currency text not null default 'INR',
  hold_expires_at timestamptz,
  pricing_snapshot jsonb not null default '{}'::jsonb,
  cancellation_policy_snapshot jsonb not null default '{}'::jsonb,
  idempotency_key text,
  decision_note text,
  decided_by uuid references profiles (id) on delete set null,
  decided_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by uuid references profiles (id) on delete set null,
  cancellation_reason text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (total_paise = subtotal_paise + fee_paise + tax_paise),
  unique (customer_id, idempotency_key)
);

create index if not exists bookings_customer_idx on bookings (customer_id, created_at desc);
create index if not exists bookings_venue_idx on bookings (venue_id, starts_at desc);
create index if not exists bookings_status_idx on bookings (status, hold_expires_at);
create index if not exists bookings_reference_idx on bookings (reference);

create table if not exists booking_slots (
  id bigserial primary key,
  booking_id uuid not null references bookings (id) on delete cascade,
  venue_id uuid not null references venues (id) on delete cascade,
  slot_start timestamptz not null,
  slot_end timestamptz not null,
  unique (venue_id, slot_start),
  check (slot_end > slot_start)
);

create index if not exists booking_slots_venue_range_idx on booking_slots (venue_id, slot_start);
create index if not exists booking_slots_booking_idx on booking_slots (booking_id);

create table if not exists booking_status_history (
  id bigserial primary key,
  booking_id uuid not null references bookings (id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_id uuid references profiles (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists booking_history_booking_idx on booking_status_history (booking_id, created_at);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings (id) on delete restrict,
  provider text not null check (provider in ('razorpay', 'demo')),
  provider_order_id text unique,
  provider_payment_id text unique,
  amount_paise integer not null check (amount_paise > 0),
  currency text not null default 'INR',
  status text not null default 'created' check (status in ('created', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded')),
  is_demo boolean not null default false,
  method text,
  receipt text,
  failure_reason text,
  notes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  captured_at timestamptz
);

create index if not exists payments_booking_idx on payments (booking_id, created_at desc);
create index if not exists payments_status_idx on payments (status, created_at desc);

create table if not exists payment_events (
  id bigserial primary key,
  provider text not null,
  event_id text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);

create table if not exists cancellations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references bookings (id) on delete cascade,
  requested_by uuid not null references profiles (id) on delete restrict,
  reason text not null,
  status text not null default 'requested' check (status in ('requested', 'approved', 'rejected', 'withdrawn')),
  refund_eligible boolean not null default false,
  refund_percent integer not null default 0 check (refund_percent between 0 and 100),
  refund_amount_paise integer not null default 0 check (refund_amount_paise >= 0),
  policy_snapshot jsonb not null default '{}'::jsonb,
  reviewed_by uuid references profiles (id) on delete set null,
  reviewed_at timestamptz,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cancellations_status_idx on cancellations (status, created_at desc);

create table if not exists refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments (id) on delete restrict,
  booking_id uuid not null references bookings (id) on delete restrict,
  amount_paise integer not null check (amount_paise > 0),
  status text not null default 'pending' check (status in ('pending', 'initiated', 'processed', 'failed')),
  provider_refund_id text unique,
  is_demo boolean not null default false,
  reason text,
  initiated_by uuid references profiles (id) on delete set null,
  initiated_at timestamptz,
  processed_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists refunds_booking_idx on refunds (booking_id, created_at desc);
create index if not exists refunds_status_idx on refunds (status, created_at desc);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  link text,
  read_at timestamptz,
  email_status text not null default 'skipped' check (email_status in ('skipped', 'queued', 'sent', 'failed')),
  email_provider_id text,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on notifications (user_id) where read_at is null;

create table if not exists audit_logs (
  id bigserial primary key,
  actor_id uuid references profiles (id) on delete set null,
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_idx on audit_logs (created_at desc);
create index if not exists audit_logs_actor_idx on audit_logs (actor_id, created_at desc);

create table if not exists platform_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists legal_pages (
  slug text primary key,
  title text not null,
  content_md text not null default '',
  requires_legal_review boolean not null default true,
  updated_by uuid references profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  status text not null default 'new' check (status in ('new', 'read', 'replied')),
  created_at timestamptz not null default now()
);

create index if not exists contact_messages_created_idx on contact_messages (created_at desc);

create table if not exists rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on profiles;
create trigger profiles_set_updated_at before update on profiles
for each row execute function set_updated_at();

drop trigger if exists owner_requests_set_updated_at on owner_requests;
create trigger owner_requests_set_updated_at before update on owner_requests
for each row execute function set_updated_at();

drop trigger if exists venues_set_updated_at on venues;
create trigger venues_set_updated_at before update on venues
for each row execute function set_updated_at();

drop trigger if exists bookings_set_updated_at on bookings;
create trigger bookings_set_updated_at before update on bookings
for each row execute function set_updated_at();

drop trigger if exists payments_set_updated_at on payments;
create trigger payments_set_updated_at before update on payments
for each row execute function set_updated_at();

drop trigger if exists cancellations_set_updated_at on cancellations;
create trigger cancellations_set_updated_at before update on cancellations
for each row execute function set_updated_at();

drop trigger if exists refunds_set_updated_at on refunds;
create trigger refunds_set_updated_at before update on refunds
for each row execute function set_updated_at();
