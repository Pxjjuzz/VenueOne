# Security

Common Ground handles identity, personal contact details, booking records and money
state. This document describes the controls implemented in Phase 1, the assumptions
they rely on, and the gaps that remain.

The guiding rule is **the server is the authority**. The browser may propose a slot,
an amount or a decision, but it never decides one.

---

## 1. Authentication

### Production

- Supabase Auth with Google OAuth only. Users cannot set a password for this app.
- The OAuth code is exchanged in `/auth/callback`. The profile row is created or
  updated server-side and the session is stored in Supabase's httpOnly cookies.
- `src/proxy.ts` refreshes the Supabase session on navigation. It fails soft: a
  Supabase network failure does not take the public site down.
- Admin access is bootstrapped only by `ADMIN_BOOTSTRAP_EMAILS`, matched against the
  verified email of a signed-in Google account. There is no admin sign-up form and no
  default admin credential.
- Suspended profiles (`is_suspended = true`) are rejected by `requireUser` and RLS
  helper functions.

### Local development

Local sign-in is a separate, explicitly labelled system:

- It requires `NODE_ENV !== "production"`, `VERCEL !== "1"`, `DEV_AUTH_ENABLED=true`
  and a password of at least 10 characters.
- The password is compared in constant time.
- The session is an HMAC-signed httpOnly cookie using `DEV_SESSION_SECRET`.
- Accounts are seeded only on a local PGlite database.
- It cannot be enabled in a production build or on Vercel.

The production code path never falls back to local auth.

---

## 2. Authorization

Authorization is checked on the server for every mutation and every authenticated
read. It is not delegated to the UI.

- `requireUser`, `requireAdmin`, `requireOwner` and `adminSession` load the session
  and enforce role and status.
- Customer queries are scoped by `customer_id = session.user.id`.
- Owner mutations first resolve the venue with `owner_id = session.user.id`; a venue
  ID belonging to another owner returns “not found”, not “forbidden”, to avoid
  leaking existence.
- Admin actions run only after `requireAdmin`.
- Booking detail pages explicitly filter by the signed-in customer, which prevents
  IDOR by URL editing. Owner and admin detail pages apply the same scoping.
- Server Actions validate input with Zod and never trust a client-supplied price,
  total, status, role or ownership field.

### Defense in depth: RLS

`0002_rls.sql` enables row-level security and defines deny-by-default policies for
public read paths, own-profile reads, owner venue reads and booking visibility.
Every other table relies on “no policy means no access” for the anon/user key.

RLS is a second boundary. Privileged writes are performed by the server's direct
Postgres connection after application authorization, so a mistake in a policy cannot
silently grant a write path.

---

## 3. Booking integrity

- Slots are materialized in `booking_slots` with a unique `(venue_id, slot_start)`
  index. Two confirmed or held bookings cannot occupy the same hour.
- A per-venue transaction advisory lock serializes booking creation for that venue,
  so concurrent requests cannot both pass an availability check.
- Full-day bookings consume the entire hourly grid for that day; half-day bookings
  consume their four hours. Overlap is therefore enforced by the database, not by a
  UI list.
- Holds and owner-approval deadlines are stored as timestamps. `refresh_booking_states()`
  runs before availability reads, booking creation, payment start/confirmation,
  cancellation and owner decisions, so expired rows cannot be double-sold.
- Demo and Razorpay confirmation paths perform their state changes and history
  inserts in one transaction.
- Price is recalculated on the server from approved venue pricing and current platform
  settings at booking creation. A tampered `total` in the request is ignored.
- `idempotencyKey` is unique per customer and booking attempt, so retries do not create
  duplicate bookings.

---

## 4. Payments

- Razorpay orders are created server-side with an amount derived from the stored
  booking total.
- Checkout success is never trusted on its own. The server verifies the HMAC signature
  of `razorpay_order_id|razorpay_payment_id` with the key secret before confirming.
- Webhooks verify `X-Razorpay-Signature` against the **raw** request body, not parsed
  JSON.
- Every webhook event is inserted into `payment_events` with a unique event ID in the
  same transaction as its state changes. Replays are detected and ignored.
- Payment status and refund status are separate state machines. A refund starts as
  pending/initiated and becomes `processed` only after a provider confirmation or an
  explicit, clearly labelled local demo action.
- Refund amounts are calculated from the cancellation policy snapshot stored with the
  booking, not from a client value or the current global policy.
- Demo payments are impossible in production and on Vercel, and are disabled whenever
  Razorpay keys are configured.
- Payment and refund rows are append-only by convention. Admin actions change state
  and write audit entries; they do not delete financial history.

---

## 5. Uploads

- Photographs arrive through a Server Action, not a public upload endpoint.
- The server requires an approved owner session and verifies venue ownership.
- Sharp checks the actual decoded format (JPEG/PNG/WebP), caps the input at 8 MB, and
  requires at least 600 × 400 pixels.
- Images are re-encoded to WebP, stripped of metadata by re-encoding, and resized to
  at most 2000 × 2000 before storage.
- Storage paths are generated server-side from the venue ID and a random UUID; the
  original filename is never used.
- Local media reads resolve the path against `.data/uploads` and reject traversal
  outside that root.
- Supabase Storage uses a public bucket for reads only. Writes use the server-side
  service-role key, never the browser.
- Each venue is limited to eight photographs.

---

## 6. Input, abuse and rate limits

- Every Server Action and API route validates its input with Zod: IDs as UUIDs,
  money as integers, dates as ISO date strings, text with explicit maximum lengths.
- Text is rendered through React, which escapes by default. Markdown legal pages are
  rendered with `react-markdown` and GFM without raw HTML injection.
- Database-backed rate limits cover sign-in, booking creation, payment start, demo
  payment, cancellation requests, owner decisions, admin decisions, refunds, payment
  sync, contact messages and profile writes.
- The limiter fails **closed** for sensitive operations: if the limiter store is
  unavailable, the action is refused rather than allowed.
- Webhook bodies are capped at 1 MB. Server Action bodies are capped at 10 MB, with a
  tighter 8 MB per-image check.
- `purge_rate_limits()` is called by the scheduled maintenance endpoint.

---

## 7. Browser hardening

Headers set globally in `next.config.ts`:

- `Content-Security-Policy` with `default-src 'self'`, explicit Razorpay and Supabase
  origins, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` and
  `frame-ancestors 'none'`.
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` disabling camera, microphone and geolocation
- `Cross-Origin-Opener-Policy: same-origin`
- `poweredByHeader: false`

The development CSP adds `'unsafe-eval'` for the bundler; production does not.
`'unsafe-inline'` remains for styles and for Next.js hydration scripts. Moving to a
nonce-based script policy is a worthwhile follow-up once the deployment is stable.

---

## 8. Secrets

| Secret | Exposure |
| --- | --- |
| `DATABASE_URL` | Server only |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only; bypasses RLS |
| `RAZORPAY_KEY_SECRET` | Server only |
| `RAZORPAY_WEBHOOK_SECRET` | Server only |
| `CRON_SECRET` | Server and scheduler only |
| `RESEND_API_KEY` | Server only |
| `DEV_AUTH_PASSWORD`, `DEV_SESSION_SECRET` | Local only; never set in production |
| `NEXT_PUBLIC_*` | Public by definition; never put a secret here |

`.env.local` is gitignored. `.env.example` contains names and comments only. The
service-role key is the most dangerous credential in the system: if it leaks, RLS will
not protect the database. Rotate it immediately if exposed.

---

## 9. Audit and accountability

- Owner, admin and payment actions write to `audit_logs` with actor, action, entity,
  metadata and timestamp.
- Booking status transitions are written to `booking_status_history`.
- Owner decisions store the note shown to the customer.
- Admin decisions store an optional note and the acting admin ID.
- Contact messages and notifications are retained for support.
- The admin audit page exposes the trail read-only.

---

## 10. Privacy

- Venue contact details are hidden from customers until a booking is accepted or
  awaiting payment.
- Customer contact details are visible to the venue owner only for bookings on that
  owner's venues.
- Public venue pages show business contact details supplied for publication.
- Legal pages are drafts and must be reviewed for DPDP Act 2023 and applicable
  consumer-protection requirements before launch.
- No analytics, advertising pixels or third-party trackers are included.

---

## 11. Known gaps and recommendations

These are deliberate Phase 1 boundaries or follow-ups, not hidden claims:

1. **No automated penetration test or external security review** has been performed.
2. **No MFA enforcement** for administrators. Google account security is the only
   gate; consider requiring hardware keys for admin accounts at the identity provider.
3. **CSP still allows inline scripts/styles.** A nonce-based policy is recommended.
4. **No WAF or bot protection** beyond application rate limits. Add a provider-level
   WAF or Turnstile if abuse appears.
5. **Email deliverability and bounce handling** are not implemented. Resend failures
   are logged and skipped.
6. **No data-retention job** for old audit, notification or contact rows. Define a
   retention policy before scale.
7. **No formal backup/restore drill.** Rely on Supabase backups and test a restore
   before launch.
8. **Refund reconciliation is webhook-driven.** If webhooks are misconfigured, an
   admin can reconcile through the payment sync action, but this requires operator
   attention.
9. **Local demo flows** are intentionally powerful. Never expose a development server
   to the public internet; the demo payment and dev sign-in are local-only by design.
10. **Legal content is placeholder text.** It must be replaced and reviewed by a
    qualified professional.
