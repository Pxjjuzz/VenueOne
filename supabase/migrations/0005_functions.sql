-- Housekeeping is centralised in the database so every entry point (public
-- availability, booking creation, dashboards, cron) observes the same state.

create or replace function refresh_booking_states()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  expired_ids uuid[];
  completed_ids uuid[];
begin
  select array_agg(id) into expired_ids
  from (
    select id
    from bookings
    where status in ('pending_owner_approval', 'awaiting_payment')
      and hold_expires_at is not null
      and hold_expires_at < now()
    for update skip locked
  ) candidates;

  if expired_ids is not null then
    insert into booking_status_history (booking_id, from_status, to_status, note)
    select id, null, 'expired', 'Hold expired automatically'
    from unnest(expired_ids) as id;

    update bookings
    set status = 'expired', updated_at = now()
    where id = any(expired_ids);

    delete from booking_slots where booking_id = any(expired_ids);
  end if;

  select array_agg(id) into completed_ids
  from (
    select id
    from bookings
    where status = 'confirmed'
      and ends_at < now() - interval '12 hours'
    for update skip locked
  ) candidates;

  if completed_ids is not null then
    insert into booking_status_history (booking_id, from_status, to_status, note)
    select id, 'confirmed', 'completed', 'Booking period ended'
    from unnest(completed_ids) as id;

    update bookings
    set status = 'completed', completed_at = now(), updated_at = now()
    where id = any(completed_ids);
  end if;

  return coalesce(array_length(expired_ids, 1), 0);
end;
$$;

create or replace function purge_rate_limits()
returns void
language sql
security definer
set search_path = public
as $$
  delete from rate_limits where window_start < now() - interval '1 day';
$$;
