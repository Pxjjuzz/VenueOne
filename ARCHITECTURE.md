# Architecture

Phase 1 is a single Next.js application with a server-owned domain layer and a
PostgreSQL database. There are no microservices, queues or caches in the critical
path. That keeps the booking and payment invariants easy to reason about and cheap to
operate.

---

## 1. Layers

```text
Browser
  │  HTML / RSC payload, Server Action calls, minimal fetch
  ▼
Next.js App Router
  ├─ (public)  marketing, discovery, venue, auth, legal
  ├─ (app)     authenticated shell: dashboard, owner, admin
  ├─ actions/  Server Actions (validation + authorization entry points)
  └─ api/      availability, media, Razorpay webhook, cron
  ▼
Domain services (src/lib)
  ├─ auth/       session, dev auth
  ├─ booking/    slots, selection, quote, availability, queries
  ├─ payments/   orders, verification, webhooks, refunds, reconciliation
  ├─ venues/     public, owner, admin services
  ├─ admin/      queues, decisions, settings, legal, audit
  ├─ policies.ts refund rules and totals
  ├─ storage.ts  Sharp validation + local/Supabase storage
  └─ audit.ts, notifications.ts, rate-limit.ts
  ▼
Database abstraction (src/lib/db)
  ├─ Supabase Postgres via postgres.js when DATABASE_URL is set
  └─ PGlite locally, auto-migrated from supabase/migrations
```

Rules that keep the layers honest:

- Only `src/lib/**` talks to the database. Components never import a SQL client.
- Only services mutate money, slots or status. Server Actions validate and delegate.
- `src/lib/**` modules that touch secrets or the DB import `server-only`.
- Client components receive plain data and call Server Actions; they never compute
  authoritative prices or statuses.

---

## 2. Data model

Canonical schema: `supabase/migrations/0001_init.sql`.

### Identity and access

| Table | Purpose |
| --- | --- |
| `profiles` | One row per auth user. Role (`customer`/`owner`/`admin`), owner approval status, suspension. |
| `owner_requests` | Owner access applications, independent of venue publication. |

### Venues

| Table | Purpose |
| --- | --- |
| `venues` | Listing, status, location, capacity, attributes, booking policy, payment window, contact details. |
| `venue_photos` | Ordered photographs, alt text, stored path and dimensions. |
| `venue_amenities` | Normalized amenity list for filtering. |
| `venue_pricing` | One row per slot type: approved `amount_paise` and proposed amount/time. |
| `venue_hours` | Per-weekday opening hours. |
| `venue_blocks` | Operational unavailability (maintenance, private events). |
| `venue_reviews` | Internal publication status history (submitted, approved, rejected notes). Not customer reviews. |

Venue lifecycle:

```text
draft ──submit──▶ submitted ──review──▶ approved ──save──▶ submitted
  ▲                   │                    │
  └────save───────────┘                    ├──suspend──▶ suspended
                                           └──reject───▶ rejected
```

- Saving an `approved` venue sets it back to `submitted` (editorial changes need
  re-review).
- Saving a `submitted`, `under_review` or `rejected` venue resets it to `draft`.
- Operational actions (accepting bookings and time blocks) take effect immediately
  and do not require review.
- Publication approval copies proposed prices into the public approved amounts.

### Booking

| Table | Purpose |
| --- | --- |
| `bookings` | Customer, venue, snapshots, status, total, hold and decision timestamps, reference. |
| `booking_slots` | Materialized slot rows with a unique `(venue_id, slot_start)`. The collision guard. |
| `booking_status_history` | Append-only status transitions with note and timestamp. |
| `payments` | Provider or demo payment attempts, unique provider IDs, captured/refunded state. |
| `payment_events` | Raw webhook events with unique `(provider, event_id)` for replay protection. |
| `cancellations` | One request per booking, policy snapshot, computed refund, decision. |
| `refunds` | Provider-confirmed refund records, separate from cancellation. |

### Platform

| Table | Purpose |
| --- | --- |
| `platform_settings` | Owner response window, platform fee, tax, cancellation policy, legal review flags. |
| `legal_pages` | Editable public policy markdown with a review flag. |
| `notifications` | In-app inbox per user. |
| `audit_logs` | Actor, action, entity and metadata for privileged operations. |
| `contact_messages` | Public contact form submissions. |
| `rate_limits` | Fixed-window counters keyed by hashed scope + identifier. |

Money is always integer paise. Dates are `timestamptz`; user-facing dates are
formatted in India Standard Time from `src/lib/time.ts`.

---

## 3. Approval systems

Two decisions are deliberately independent:

1. **Owner access** (`owner_requests` → `profiles.owner_status`). A customer becomes
   an approved owner only after an admin decision.
2. **Venue publication** (`venues.status`). An approved owner can still have zero
   public venues. Venue approval is a separate admin decision.

A new owner therefore goes through: owner request → approved owner → create draft →
submit → admin publication review → public listing.

---

## 4. Slot model and availability

Halls and grounds share one grid internally but expose different choices.

- **Hall:** `half_day_morning` (09:00–13:00), `half_day_afternoon` (13:00–18:00),
  `full_day` (09:00–18:00). The grid is hourly rows; a half-day consumes 4 rows and a
  full day consumes the whole open range.
- **Ground:** consecutive whole hours chosen by start time and duration (1–12).

Availability is computed from:

- venue status `approved` and accepting bookings,
- operating hours for that weekday in IST,
- existing `booking_slots` in non-terminal states (held, awaiting payment, confirmed),
- operational blocks,
- dates in the past and the current day's elapsed hours.

The public calendar calls `/api/venues/[id]/availability?month=YYYY-MM`; the server
refreshes expired states before computing.

### Collision protection

`booking_slots` has `unique (venue_id, slot_start)`. Creation runs inside a
transaction that first takes a per-venue advisory lock, then re-checks availability,
inserts the booking and inserts every slot row. If two requests race, one transaction
loses on the unique constraint or sees the lock and is rejected with a clean “no
longer available” message. The database, not the calendar UI, is the guarantee.

---

## 5. Booking lifecycle

```text
                    ┌─ instant booking ─────────────────────────────┐
customer selects ──▶│ create booking                                  │
slot and quotes     │   status = awaiting_payment (hold 20 min)       │
                    └───────────────┬────────────────────────────────┘
                                    │ payment verified
                                    ▼
                                 confirmed
                                    │ start passes
                                    ▼
                                 completed

                    ┌─ approval venue ───────────────────────────────┐
                    │ create booking                                  │
                    │   status = pending_owner_approval (held)        │
                    └───────────────┬────────────────────────────────┘
                                    │ owner accepts      │ owner declines
                                    ▼                    ▼
                              awaiting_payment         rejected
                                    │ payment verified
                                    ▼
                                 confirmed

any non-terminal state ── hold/window expires ──▶ expired
any cancellable state ── admin approves ────────▶ cancelled
```

Key invariants:

- `refresh_booking_states()` expires stale holds and approval windows before every
  relevant read or write.
- A booking reference (`CG-XXXXXX`) and an idempotency key are generated server-side.
- Price breakdown, slot label and cancellation policy are snapshotted onto the
  booking at creation. Later venue edits do not rewrite history.
- Customer contact details are exposed to the owner; venue contact details are
  exposed to the customer only from `awaiting_payment` onward.

---

## 6. Payments and refunds

```text
payments:  created ──▶ authorized ──▶ captured ──▶ refunded
                 │                       │
                 └──▶ failed             └──▶ partially_refunded

refunds:   pending ──▶ initiated ──▶ processed
                  │           │
                  └───────────┴──▶ failed
```

- `startPayment` creates or reuses a provider order for the stored booking total.
- Razorpay Checkout returns IDs to the browser; `verifyPayment` checks the signature
  server-side and confirms the booking in one transaction.
- Webhooks also confirm, with event deduplication in `payment_events`.
- A cancellation approval creates a refund record only when the saved policy
  calculates a positive amount. It does not mark the refund successful.
- A real Razorpay refund stays `initiated` until `refund.processed`; a demo refund is
  completed by an explicit, labelled admin action.
- Every payment and refund decision writes history, notifications and audit rows.

---

## 7. Cancellation policy

`src/lib/policies.ts` is the single implementation of refund rules:

- Full refund at or beyond `fullRefundHours` before start.
- Partial percentage between `partialRefundHours` and `fullRefundHours`.
- Requests close at `cancellationDeadlineHours` before start.
- The policy is validated when settings are saved and snapshotted onto each booking.

The quote, booking detail, cancellation form and admin decision all read the same
function, so the preview and the recorded amount cannot drift.

---

## 8. Settings and configuration

- Brand name, support email and site URL come from `NEXT_PUBLIC_*` values
  (`src/lib/brand.ts`).
- Platform fee, tax and cancellation policy live in `platform_settings` and are
  editable at `/admin/settings`.
- Legal copy lives in `legal_pages` and is editable at `/admin/legal`.
- Secrets are read only on the server. No secret is ever bundled into client code.
- Payment mode is derived once by `paymentDisplayMode()`: `razorpay`, `demo` or
  `unavailable`.

---

## 9. Storage

- Production: Supabase Storage, public bucket `venue-photos`, server-side service-role
  writes.
- Local: `.data/uploads`, served by `/api/media/[...path]`.
- Both paths store the same generated relative path, so the database is portable
  between them.
- Sharp validates and re-encodes every upload before either adapter is called.

---

## 10. Notifications and email

Notifications are stored in `notifications` and surfaced in the app shell.
Email is best-effort: when Resend is configured the server sends an email; otherwise
the attempt is recorded as skipped and the in-app notification remains. No user flow
depends on email delivery.

---

## 11. Scheduled work

`/api/cron/expire` (Bearer `CRON_SECRET`) runs:

- `refresh_booking_states()`: expire stale holds and approval windows,
- `purge_rate_limits()`: remove old counters.

Expiry also runs lazily in the booking services, so a missed cron run cannot cause a
double booking; it can only leave rows in a stale state until the next read.

---

## 12. Extensibility for Phase 2 and Phase 3

- **Phase 2 (3D viewer, shipped):** implemented as a `venue_models` table keyed by
  `venue_id`, one row per venue with versioned storage paths. Booking and payment code
  were not changed. The public venue page reads the published row and renders the
  viewer beside the gallery.
- **Phase 3 (Android):** the domain services are UI-agnostic. Exposing a versioned API
  means wrapping the same service functions in route handlers; no business rules need
  to move out of `src/lib`.
- **Reviews:** Phase 1 has no customer review table. The public venue page shows an
  honest “No reviews yet” state. Adding reviews needs a new table, verified-booking
  constraints and moderation before anything is displayed.
- **Multi-city / multi-currency:** city is already a column; currency is fixed to INR
  in Phase 1 and would need an explicit migration to change.

---

## 13. Deliberate non-goals in Phase 1

- No 3D venue viewer.
- No native or PWA app.
- No real-time websockets; availability is refreshed per request.
- No background queue; webhooks and cron are the only asynchronous paths.
- No multi-tenant organizational accounts.
- No automated refunds without a provider confirmation.
