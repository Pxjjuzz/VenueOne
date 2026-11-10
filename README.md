# VenueOne

A production-oriented community hall and ground booking platform for India. Customers
discover venues, request or instantly book fixed slots, and pay online. Venue owners
manage listings and booking requests. Platform administrators review owner access,
publication, cancellations and refunds.

Phase 1 is a complete web application. Phase 2 (3D venue viewer) and Phase 3
(Android app) are intentionally **not** included; the data model and public API keep
room for them.

> **Status.** Every flow described below is implemented and has been exercised locally
> against a real PostgreSQL engine (PGlite). Real Supabase, Google OAuth, Razorpay,
> Resend and Vercel integrations are implemented but could not be exercised here
> because no external credentials were available. See `TESTING.md` for exactly what
> was and was not verified.

---

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16.4.5 (App Router) with React 19.3.1 |
| Language | TypeScript 5.9 |
| Styling | Tailwind CSS 4.3 + design tokens in `src/app/globals.css` |
| Motion | Framer Motion 14.11 (reduced-motion aware) |
| Icons | Lucide React |
| Database | Supabase Postgres in production; PGlite locally |
| Auth | Supabase Auth (Google OAuth) in production; local dev accounts otherwise |
| Storage | Supabase Storage public bucket in production; `.data/uploads` locally |
| Payments | Razorpay Orders API, Checkout, signature verification and webhooks |
| Validation | Zod 4.6 |
| Images | Sharp (server-side validation, resize to WebP) |
| Tests | Vitest 5.1 |
| Hosting | Vercel (Node.js runtime) |

---

## What is implemented

### Public

- Editorial home page with a restrained architectural 3D scene, category entries and
  honest product principles.
- Venue discovery for halls and grounds with search, city, price, amenity, surface
  and sort filters.
- Venue pages with gallery, facilities, approved pricing, operating hours, venue
  policies, availability calendar and the booking widget.
- Separate visual identities for halls (fixed half/full day) and grounds (hourly).
- How it works, about, contact and list-your-venue pages.
- Legal pages (`/terms`, `/privacy`, `/refund-policy`, `/about`, `/contact`) stored in
  the database and clearly marked as drafts until a reviewer signs them off.

### Customer

- Google sign-in in production; clearly labelled local development sign-in otherwise.
- Dashboard with upcoming bookings, notification inbox and profile.
- Booking detail with price snapshot, status history, payment panel, venue contact
  after acceptance, cancellation request and refund records.
- Booking creation for instant and owner-approval venues, with server-side price
  validation and idempotency.

### Venue owner

- Independent owner-access request and approval.
- Venue workspace: create drafts, edit details, manage photographs, proposed pricing,
  operating hours, booking policy, payment window and unavailable blocks.
- Publish/suspend controls and venue review history.
- Booking request queue with accept/decline decisions and a required customer note on
  decline.
- Owner booking detail with customer contact details and payment state.

### Administrator

- Secure bootstrap through `ADMIN_BOOTSTRAP_EMAILS`; no default production password.
- Overview metrics derived from real rows only (zero states when empty).
- Owner access queue.
- Venue review queue with publication decisions, price approval, suspension and
  rejection reasons.
- Booking, payment and cancellation queues.
- Refund queue with separate provider-confirmed status.
- Platform settings (owner response window, platform fee, tax, cancellation policy).
- Legal page editor with draft-review flags.
- Contact messages and audit log.

### Platform behavior

- Two independent approval systems: **owner access** and **venue publication**.
- Approved venues become `submitted` again when editorial details are saved.
- Published prices are only the admin-approved amounts; edits create proposals.
- Fixed durations: halls use half-day/full-day, grounds use consecutive whole hours.
- All money is stored as integer paise and displayed in INR.
- Booking collision protection at the database level using a unique
  `(venue_id, slot_start)` index plus a per-venue transaction advisory lock.
- Holds, expiry, owner-approval deadlines and idempotent booking creation.
- Server-side calculation of subtotal, platform fee, tax and total.
- Payments are only confirmed after server verification of a provider signature or a
  verified webhook; a front-end success screen is never proof.
- Refund status is tracked separately from cancellation and is never marked complete
  before provider confirmation.
- Deny-by-default RLS as defense in depth, with all privileged writes through
  server-only, centrally authorized code.
- Database-backed rate limiting, audit logs, secure uploads and IDOR checks.

---

## Local quick start

### Requirements

- Node.js 22+ and npm 11+
- Windows, macOS or Linux

No Docker, Supabase CLI or external database is required for local development.

### 1. Install

```bash
npm install
```

### 2. Create the local environment file

```bash
cp .env.example .env.local
```

Set at least:

```dotenv
NEXT_PUBLIC_SITE_URL=http://localhost:3000
DEV_AUTH_ENABLED=true
DEV_AUTH_PASSWORD=choose-a-password-at-least-10-chars
DEV_SESSION_SECRET=<64 hex characters>
```

Generate the session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Leave `DATABASE_URL`, Supabase and Razorpay values empty for local development.

### 3. Run

```bash
npm run dev
```

Open <http://localhost:3000>. On first request the app creates a real PostgreSQL
instance through PGlite at `.data/pglite`, applies every migration in
`supabase/migrations`, and seeds the local accounts and legal pages.

Local sign-in appears on `/auth/sign-in` only while `DEV_AUTH_ENABLED=true` and
`NODE_ENV` is not production. It is disabled automatically on Vercel.

### Local development accounts

All local accounts share `DEV_AUTH_PASSWORD`.

| Account | Email |
| --- | --- |
| Customer | `customer@local.test` |
| Approved owner | `owner@local.test` |
| Pending owner request | `pending-owner@local.test` |
| Super admin | `admin@local.test` |

The local database and uploads are gitignored. To start over:

```bash
npm run db:reset-local
```

### Demo payments

With no Razorpay keys and outside production/Vercel, the payment panel runs an
explicitly labelled server-side demo flow (`DEMO_PAYMENTS_ENABLED`, default on).
No money moves. The server still performs the real state transition and writes the
same audit, payment, notification and refund rows. The demo flow is impossible in a
production build and on Vercel, and is disabled whenever Razorpay keys are present.

---

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Serve a production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm run test` | Vitest unit tests |
| `npm run test:watch` | Vitest in watch mode |
| `npm run db:migrate` | Apply `supabase/migrations` to `DATABASE_URL` |
| `npm run db:reset-local` | Delete `.data/pglite` and local uploads |

`npm run db:migrate` requires a reachable `DATABASE_URL`. The local PGlite database
migrates itself when the dev server starts.

---

## Project structure

```text
commonground/
  src/
    app/
      (public)/            Marketing, discovery, venue, auth, legal pages
      (app)/               Authenticated shell
        dashboard/         Customer area
        owner/             Owner workspace
        admin/             Administrator area
      actions/             Server actions (booking, owner, admin, auth, profile)
      api/                 Availability, media, Razorpay webhook, cron
      globals.css          Design tokens and base styles
      layout.tsx           Fonts, metadata, viewport
      robots.ts            robots.txt
      sitemap.ts           sitemap.xml (static routes + approved venues)
    components/            UI, booking, owner, admin, app shell
    lib/
      auth/                Session and local development auth
      booking/             Slots, selection, quote, availability, queries
      db/                  Postgres/PGlite abstraction
      payments/            Razorpay orders, verification, webhooks, refunds
      venues/              Public, owner and admin venue services
      admin/               Admin queries, decisions, settings, audit helpers
      policies.ts          Cancellation rules and totals
      storage.ts           Upload validation and storage adapters
      validation.ts        Shared Zod schemas
    proxy.ts               Supabase session refresh (Next 16 proxy)
  supabase/migrations/     Canonical schema, RLS, functions, storage policies
  scripts/                 Migration and local reset scripts
  .env.example
  README.md DEPLOYMENT.md SECURITY.md ARCHITECTURE.md TESTING.md
```

---

## Design direction

Architectural luxury, not a generic template: warm stone paper, charcoal ink and a
deep forest primary, Manrope display type over Inter body copy, editorial spacing,
restrained decorative 3D built from SVG/CSS rather than a heavy 3D runtime, and
deliberately different visual treatments for halls and grounds. Light theme only.
All interactive states are keyboard reachable and respect `prefers-reduced-motion`.

---

## Production

See `DEPLOYMENT.md` for Supabase, Google OAuth, Razorpay, storage, cron, Vercel and
post-deploy verification. See `SECURITY.md` for the security model and
`ARCHITECTURE.md` for schema and state machines.

## License

Proprietary. All rights reserved.
