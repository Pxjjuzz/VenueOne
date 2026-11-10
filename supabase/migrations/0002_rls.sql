-- Row Level Security is a defence-in-depth boundary for any request made with
-- the Supabase anon/user key. All privileged writes in this application are
-- performed by the server connection, which validates authorization first.
-- Browser clients are never given direct write access.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_suspended = false
  );
$$;

create or replace function public.is_approved_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'owner' and owner_status = 'approved' and is_suspended = false
  );
$$;

create or replace function public.can_view_venue(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.venues v
    where v.id = target
      and (v.status = 'approved' or v.owner_id = auth.uid() or public.is_admin())
  );
$$;

create or replace function public.owns_venue(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.venues v
    where v.id = target and (v.owner_id = auth.uid() or public.is_admin())
  );
$$;

create or replace function public.can_view_booking(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bookings b
    join public.venues v on v.id = b.venue_id
    where b.id = target
      and (b.customer_id = auth.uid() or v.owner_id = auth.uid() or public.is_admin())
  );
$$;

create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     or new.owner_status is distinct from old.owner_status
     or new.is_suspended is distinct from old.is_suspended then
    if current_user in ('postgres', 'supabase_admin', 'service_role') or public.is_admin() then
      return new;
    end if;
    raise exception 'Profile privileges cannot be changed directly';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_privileges on profiles;
create trigger profiles_guard_privileges before update on profiles
for each row execute function public.guard_profile_privileges();

alter table profiles enable row level security;
alter table owner_requests enable row level security;
alter table venues enable row level security;
alter table venue_photos enable row level security;
alter table venue_amenities enable row level security;
alter table venue_pricing enable row level security;
alter table venue_hours enable row level security;
alter table venue_blocks enable row level security;
alter table venue_reviews enable row level security;
alter table bookings enable row level security;
alter table booking_slots enable row level security;
alter table booking_status_history enable row level security;
alter table payments enable row level security;
alter table payment_events enable row level security;
alter table cancellations enable row level security;
alter table refunds enable row level security;
alter table notifications enable row level security;
alter table audit_logs enable row level security;
alter table platform_settings enable row level security;
alter table legal_pages enable row level security;
alter table contact_messages enable row level security;
alter table rate_limits enable row level security;

-- Profiles ------------------------------------------------------------------
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select
using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_self on profiles;
create policy profiles_update_self on profiles for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists profiles_admin_update on profiles;
create policy profiles_admin_update on profiles for update
using (public.is_admin())
with check (public.is_admin());

-- Owner requests ------------------------------------------------------------
drop policy if exists owner_requests_select on owner_requests;
create policy owner_requests_select on owner_requests for select
using (user_id = auth.uid() or public.is_admin());

-- Venues and public venue data ----------------------------------------------
drop policy if exists venues_select on venues;
create policy venues_select on venues for select
using (status = 'approved' or owner_id = auth.uid() or public.is_admin());

drop policy if exists venue_photos_select on venue_photos;
create policy venue_photos_select on venue_photos for select
using (public.can_view_venue(venue_id));

drop policy if exists venue_amenities_select on venue_amenities;
create policy venue_amenities_select on venue_amenities for select
using (public.can_view_venue(venue_id));

drop policy if exists venue_pricing_select on venue_pricing;
create policy venue_pricing_select on venue_pricing for select
using (public.can_view_venue(venue_id));

drop policy if exists venue_hours_select on venue_hours;
create policy venue_hours_select on venue_hours for select
using (public.can_view_venue(venue_id));

drop policy if exists venue_blocks_select on venue_blocks;
create policy venue_blocks_select on venue_blocks for select
using (public.owns_venue(venue_id));

drop policy if exists venue_reviews_select on venue_reviews;
create policy venue_reviews_select on venue_reviews for select
using (public.owns_venue(venue_id));

-- Bookings and money --------------------------------------------------------
drop policy if exists bookings_select on bookings;
create policy bookings_select on bookings for select
using (public.can_view_booking(id));

drop policy if exists booking_slots_select on booking_slots;
create policy booking_slots_select on booking_slots for select
using (public.can_view_booking(booking_id));

drop policy if exists booking_history_select on booking_status_history;
create policy booking_history_select on booking_status_history for select
using (public.can_view_booking(booking_id));

drop policy if exists payments_select on payments;
create policy payments_select on payments for select
using (public.can_view_booking(booking_id));

drop policy if exists cancellations_select on cancellations;
create policy cancellations_select on cancellations for select
using (public.can_view_booking(booking_id));

drop policy if exists refunds_select on refunds;
create policy refunds_select on refunds for select
using (public.can_view_booking(booking_id));

-- Personal notifications ----------------------------------------------------
drop policy if exists notifications_select on notifications;
create policy notifications_select on notifications for select
using (user_id = auth.uid());

drop policy if exists notifications_update on notifications;
create policy notifications_update on notifications for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Public content ------------------------------------------------------------
drop policy if exists legal_pages_select on legal_pages;
create policy legal_pages_select on legal_pages for select
using (true);

-- Administrative records ----------------------------------------------------
drop policy if exists audit_logs_admin_select on audit_logs;
create policy audit_logs_admin_select on audit_logs for select
using (public.is_admin());

drop policy if exists platform_settings_admin_select on platform_settings;
create policy platform_settings_admin_select on platform_settings for select
using (public.is_admin());
