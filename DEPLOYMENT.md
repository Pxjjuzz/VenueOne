# Deployment

This runbook deploys VenueOne to Vercel with Supabase Postgres/Auth/Storage and
Razorpay. The database and application are independent: the app never relies on
Supabase RLS for authorization, only as defense in depth.

> The database, Gmail SMTP sender and OAuth redirect URLs are configured for the
> current deployment. Follow the checklist below when standing up a new environment;
> treat the first deploy as an integration test.

---

## 1. Prerequisites

- A Supabase project (Postgres 15+)
- A Google Cloud OAuth 2.0 client
- A Razorpay account in test mode
- A Vercel project connected to this repository
- A Gmail account with 2-Step Verification and an App Password (transactional email)
- Optional: a Resend API key as a second transport

---

## 2. Supabase

### 2.1 Database connection

Copy the **session pooler** (or direct) connection string from
Supabase → Project Settings → Database. Include `sslmode=require`.

```dotenv
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require
```

The application opens a small pool (max 5) and uses `prepare: false`, which is
compatible with Supabase pooling.

### 2.2 Apply migrations

```bash
DATABASE_URL="..." npm run db:migrate
```

This applies, in order:

- `0001_init.sql` — schema, enums, indexes, search vector, booking overlap guard
- `0002_rls.sql` — deny-by-default RLS and public read policies
- `0003_settings.sql` — platform settings and seeded legal pages
- `0004_auth_fk.sql` — foreign keys from profiles to `auth.users`
- `0005_functions.sql` — booking references, slot checks, expiry, rate-limit purge
- `0006_venueone_policies.sql` — the published privacy, terms and refund policies

Migrations are recorded in `schema_migrations` and are safe to re-run. Run them
before the first deploy and after every schema change.

### 2.3 Storage bucket

Create a **public** bucket named `venue-photos` in Supabase → Storage (or set
`SUPABASE_STORAGE_BUCKET` to another name and create that).

- Public read is required because venue photographs are public assets.
- Uploads and deletes go through the server using the service-role key; do not add
  public write policies.
- The server validates type, dimensions and size with Sharp and re-encodes every
  upload to WebP before storing it.
- Optional hardening: add an object policy restricting writes to the service role
  only. The application never uploads from the browser.

### 2.4 API keys

From Supabase → Project Settings → API:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. Never prefix it with `NEXT_PUBLIC_` and
never expose it in client code.

### 2.5 Google OAuth

1. In Google Cloud Console create an OAuth 2.0 Web application.
2. Authorized JavaScript origin: `https://your-domain`.
3. Authorized redirect URI:
   `https://<ref>.supabase.co/auth/v1/callback`.
4. In Supabase → Authentication → Providers → Google, enable Google and paste the
   client ID and secret.
5. In Supabase → Authentication → URL Configuration set the Site URL to
   `https://your-domain` and add `https://your-domain/auth/callback` as a redirect
   URL.
6. In Vercel set `NEXT_PUBLIC_SITE_URL=https://your-domain`.

The app exchanges the OAuth code on `/auth/callback`, creates/updates the profile row
and redirects the user. There is no password login in production.

### 2.6 Administrator bootstrap

Set:

```dotenv
ADMIN_BOOTSTRAP_EMAILS=founder@example.com,ops@example.com
```

Those verified Google accounts are promoted to `admin` the first time they sign in.
Remove addresses afterwards if they should not keep standing access. There is no
default admin password and no public admin sign-up.

---

## 3. Razorpay

### 3.1 Keys

Create test keys in the Razorpay dashboard:

```dotenv
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=<a long random secret>
```

Key ID and secret are server-only. The app only sends the public Key ID to Checkout.
When the Key ID starts with `rzp_test_`, the UI labels the environment as Razorpay
test.

### 3.2 Webhook

Create a webhook pointing at:

```text
https://your-domain/api/payments/webhook
```

Subscribe to:

- `order.paid`
- `payment.captured`
- `payment.authorized`
- `payment.failed`
- `refund.processed`
- `refund.failed`

Use the same value as `RAZORPAY_WEBHOOK_SECRET`. The handler:

- verifies the `X-Razorpay-Signature` HMAC against the raw request body;
- records every event in `payment_events` with a unique event ID;
- processes state changes and the event insert in one transaction, so duplicate
  deliveries are ignored safely;
- never marks a payment captured or a refund processed without provider evidence.

Configure the webhook before accepting real traffic. If you change the secret,
redeploy with the new value.

### 3.3 Live mode

When moving to live keys, replace both keys and the webhook secret together, verify a
small live payment, then reconcile it in `/admin/payments`. Demo payments are
disabled automatically in production and on Vercel.

---

## 4. Vercel

### 4.1 Project

1. Import the repository into Vercel.
2. Framework preset: Next.js. Node.js 22+.
3. Build command: `npm run build`. Install command: `npm install`.
4. Do **not** add a `DATABASE_URL` that points at a local machine. Use Supabase.

### 4.2 Environment variables

Set these for Production (and Preview where appropriate):

```dotenv
NEXT_PUBLIC_SITE_URL=https://your-domain
NEXT_PUBLIC_BRAND_NAME=VenueOne
NEXT_PUBLIC_SUPPORT_EMAIL=venueone.team@gmail.com

DATABASE_URL=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=venue-photos

ADMIN_BOOTSTRAP_EMAILS=...
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
CRON_SECRET=...

GMAIL_USER=venueone.team@gmail.com
GMAIL_APP_PASSWORD=...
SUPPORT_EMAIL=venueone.team@gmail.com
EMAIL_FROM=VenueOne <venueone.team@gmail.com>
# Optional second transport, used only when the Gmail pair is absent.
RESEND_API_KEY=...
```

`GMAIL_APP_PASSWORD` is a 16-character Google App Password, not the account
password. Google displays it in four groups; spaces are ignored by the app. Mail is
sent over `smtp.gmail.com` and `SUPPORT_EMAIL` becomes the reply-to address, so
customer replies land in the same mailbox that sends the notifications.

Do **not** set `DEV_AUTH_ENABLED`, `DEV_AUTH_PASSWORD` or `DEV_SESSION_SECRET` in
production. Even if set, local sign-in refuses to run when `NODE_ENV=production` or
`VERCEL=1`.

### 4.3 Scheduled expiry

Booking holds and owner-approval windows expire lazily whenever a relevant page or
action runs, but a scheduled sweep keeps the database tidy. Create a Vercel Cron job
(or any scheduler) that calls:

```text
GET https://your-domain/api/cron/expire
Authorization: Bearer $CRON_SECRET
```

Recommended frequency: every 5 minutes. Vercel Hobby plans restrict cron frequency;
on Hobby use a daily sweep plus the lazy expiry built into every booking action, or
an external scheduler. The endpoint also purges old rate-limit rows.

`CRON_SECRET` must be set, otherwise the endpoint returns 401.

### 4.4 Headers and CSP

Security headers are set in `next.config.ts`: CSP, `X-Frame-Options: DENY`,
`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` and
`Cross-Origin-Opener-Policy`. The CSP allows Razorpay Checkout and Supabase only.
If you add a new third-party origin, add it deliberately to the correct directive.

`next.config.ts` raises the Server Action body limit to 10 MB for photograph
uploads. Uploads are still individually capped at 8 MB and validated with Sharp.

---

## 5. Post-deploy checklist

Run these against the deployed URL, signed in as the right role.

### Public

- [ ] `/` renders with the real brand name and no placeholder venues.
- [ ] `/halls` and `/grounds` show honest zero states.
- [ ] `/terms`, `/privacy`, `/refund-policy` show the draft notice.
- [ ] `/robots.txt` and `/sitemap.xml` resolve.

### Auth

- [ ] Google sign-in works and creates a customer profile.
- [ ] Admin bootstrap promotes `ADMIN_BOOTSTRAP_EMAILS` on first sign-in.
- [ ] Local development sign-in is absent in production.
- [ ] A customer cannot open `/admin` or `/owner`.

### Owner and admin

- [ ] Submit an owner access request; approve it in `/admin/owners`.
- [ ] Create and submit a venue; review and approve it in `/admin/venues`.
- [ ] Confirm approved prices appear publicly and proposed prices do not.
- [ ] Save an approved venue; confirm it returns to `submitted`.
- [ ] Suspend and republish a venue.

### Booking and payment

- [ ] Instant venue: create a booking, confirm the hold countdown, pay with a
      Razorpay test card, confirm the booking becomes `confirmed`.
- [ ] Approval venue: request a booking, accept it as owner, pay as customer.
- [ ] Confirm a second customer cannot book the same slot during a hold.
- [ ] Trigger a `payment.failed` webhook and confirm the booking does not confirm.
- [ ] Replay a webhook and confirm it is reported as duplicate with no side effects.

### Cancellation and refund

- [ ] Request cancellation as customer; approve as admin.
- [ ] Confirm the refund is created as `pending`/`initiated`, not `processed`.
- [ ] Initiate a Razorpay refund and confirm `refund.processed` webhook marks it
      processed.
- [ ] Confirm the customer sees refund status separately from cancellation.

### Operations

- [ ] `/admin/audit` shows the actions taken during the checklist.
- [ ] `/api/cron/expire` returns 401 without the secret and 200 with it.
- [ ] Supabase logs show no 5xx errors; Vercel logs show no unhandled exceptions.

---

## 6. Rollback

- **Application:** promote the previous Vercel deployment. It is safe because the app
  is stateless.
- **Database:** migrations are additive in Phase 1. Do not drop columns or tables on
  a live database without a tested backward-compatible migration.
- **Payments:** never delete payment, refund or webhook rows. Correct state through
  the admin flows and keep the audit trail.
- **Storage:** deleting objects breaks public venue galleries immediately; remove
  only through the owner photo manager, which also updates the database.

---

## 7. Known operational limits

- Real Supabase, Google, Razorpay, Resend and Vercel behavior was not executed in
  this environment. See `TESTING.md`.
- Email is best-effort. Without `RESEND_API_KEY`, in-app notifications still work and
  email attempts are recorded as skipped.
- The local PGlite database is a development convenience and must never be used in
  production.
- Legal pages ship as editable drafts and require review by a qualified professional
  before launch.
