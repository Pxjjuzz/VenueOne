# Testing

This document records what was actually tested, how to reproduce it, and what remains
unverified. It intentionally separates automated coverage from manual browser
verification and from integrations that need external credentials.

---

## 1. Automated checks

Run from the project root:

```bash
npm run typecheck
npm run test
npm run build
npm run lint
```

### Current status

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passes |
| `npm run test` | 32 tests pass |
| `npm run build` | Passes locally with no `DATABASE_URL` |
| `npm run lint` | Passes (run before release) |

The build is expected to work without a database because every DB-backed page is
marked dynamic. The local PGlite database is created only when a request is served.

### Unit test coverage

| File | What it covers |
| --- | --- |
| `src/lib/booking/slots.test.ts` | Slot grids for halls and grounds, half/full-day expansion, overlap detection, invalid ranges, timezone boundaries. |
| `src/lib/booking/availability.test.ts` | Category-aware monthly availability: halls receive three fixed periods, grounds receive hourly starts, and unapproved hourly prices stay unavailable. |
| `src/lib/policies.test.ts` | Full/partial/non-refundable windows, cancellation deadline, policy validation, totals and fee/tax rounding. |
| `src/lib/payments/signature.test.ts` | Razorpay payment and webhook HMAC verification, tampering and length mismatch. |
| `src/lib/reference.test.ts` | Booking reference format/uniqueness shape and idempotency key format. |

These are deterministic and do not require network access.

---

## 2. Manual browser verification (completed)

The following was exercised in a real browser against the local PGlite database on
`http://localhost:3000`. Local-only test data was used and is gitignored.

### Authentication and shell

- [x] Local development sign-in for customer, owner and admin.
- [x] Role-aware navigation and page titles.
- [x] Sign-out returns to the public site.
- [x] Authenticated routes redirect to sign-in with a `next` path.

### Owner access and venue publication

- [x] Owner created a draft venue.
- [x] Venue details saved; pricing proposals written as paise.
- [x] A 900 × 600 JPEG uploaded through the owner photo form, converted to WebP and
      served through `/api/media/...`.
- [x] Venue submitted for review.
- [x] Admin approved publication; proposed prices became approved amounts.
- [x] Approved venue appeared publicly at `/venues/riverstone-community-hall` with
      its gallery, pricing and booking widget.
- [x] Saving the approved venue moved it back to `submitted` and showed
      “Venue saved.”
- [x] Admin re-approved it and public availability returned.

### Instant booking and payment

- [x] Customer signed in and selected a full-day slot: 14 November 2026, 09:00–18:00.
- [x] Quote showed ₹10,000 from server-approved pricing.
- [x] Booking created with reference `CG-K4DCH6` and status `awaiting_payment`.
- [x] Booking detail showed the hold expiry and the demo payment panel.
- [x] Demo payment confirmed server-side; status became `confirmed` and payment
      `captured`, with history entries.
- [x] Payment record showed the generated demo payment ID.

### Cancellation and refund

- [x] Customer submitted a cancellation request with a reason.
- [x] Request recorded with a 100% / ₹10,000 calculated refund for a booking more than
      72 hours away.
- [x] Admin approved the cancellation; booking became `cancelled`, payment
      `refunded`.
- [x] A refund row was created as `pending` with provider demo metadata.
- [x] Admin processed the demo refund; refund became `processed`.
- [x] Customer view showed cancellation “Approved”, refund “Processed”, and the
      payment record as refunded.
- [x] Admin booking record showed the full history and separate refund section.

### Owner-approval booking

- [x] Venue booking policy changed from instant to owner approval.
- [x] Saving the approved venue sent it back to review; admin re-approved it.
- [x] Customer booked 20 November 2026 full day; status became
      `pending_owner_approval` with the slot held.
- [x] Customer cancellation panel correctly said no payment had been captured.
- [x] Owner accepted the request with a customer note; status became
      `awaiting_payment` with a 20-minute window.
- [x] Customer saw the owner note and completed the demo payment; booking became
      `confirmed`.
- [x] Owner booking page showed the customer contact details and confirmed payment.

### Hourly ground booking widget

- [x] A temporary approved ground venue was created against the local database to
      exercise the hourly path, then deleted.
- [x] Availability returned one offer per opening hour instead of hall periods.
- [x] Selecting 09:00 offered 1–9 consecutive hours; choosing 3 showed
      09:00–12:00 and a ₹4,500 server quote from an approved ₹1,500 hourly rate.
- [x] The hidden booking payload carried the derived duration.

### Deep-linked booking state

- [x] `/venues/...?date=2026-12-05&slotType=half_day_morning` loaded the December
      month rather than only the current month, and restored the slot and quote.

### Empty states and public pages

- [x] Home, halls, grounds, how it works, about, contact and list-your-venue render.
- [x] Empty platform states show honest zero states; no fictional venues, reviews,
      transactions or analytics were seeded.
- [x] The public Reviews section shows the honest empty state; publication history
      stays internal to the owner and admin venue pages.
- [x] Legal pages render their draft notice.
- [x] `/robots.txt` and `/sitemap.xml` resolve; the sitemap includes static routes and
      the approved venue.

### Accessibility

Lighthouse was run against the local site. Every audited page now scores **100** for
Accessibility, Best Practices and SEO:

- `/` (home)
- `/halls`
- `/venues/riverstone-community-hall`
- `/dashboard`
- `/dashboard/bookings`
- `/owner`
- `/owner/venues/[id]`
- `/admin/legal`
- `/admin/settings`

Fixes made during this pass:

- Brand link label-in-name mismatch: removed a redundant `aria-label` when visible
  text is present.
- Calendar used `role="grid"` without grid rows/gridcells: changed to a labelled
  `role="group"` of buttons.
- Notification badge label said the exact unread count while the visible badge showed
  `9+`: the accessible name now matches the visible badge.
- Muted text on the secondary surface measured 4.33:1: the token was darkened to
  5.11:1.
- Warning text at 90% opacity measured 4.18:1: changed to the full warning token at
  5.09:1.
- Heading order skipped from `h1` to `h3` on listing, booking and empty states:
  promoted to `h2`.

Reduced-motion support is implemented with a global `prefers-reduced-motion` rule and
Framer Motion `useReducedMotion` checks.

### Bug found and fixed during verification

The customer cancellation form computed the refund preview only for `confirmed`
bookings, while the form is also shown for `awaiting_payment` and
`pending_owner_approval`. Unpaid bookings therefore displayed “outside the refund
window”, which was false. The preview now distinguishes “no payment captured” from a
real refund-window calculation.

---

## 3. Not verified in this environment

These integrations are implemented but could not be exercised because no credentials
or external services were available:

| Area | Why not verified | What to test before launch |
| --- | --- | --- |
| Supabase Postgres | No project credentials | Migrations, pooler connectivity, query performance |
| Supabase Auth / Google OAuth | No Google/Supabase project | Sign-in, callback, profile creation, admin bootstrap |
| Supabase Storage | No bucket | Upload, public URL, delete, bucket policy |
| Razorpay Orders + Checkout | No test keys | Order creation, checkout, signature verification |
| Razorpay webhooks | No webhook secret/endpoint | Signature, dedupe, captured/failed/refund events |
| Razorpay refunds | No live/test payment | Initiate refund and confirm `refund.processed` |
| Resend email | No API key | Delivery, sender domain, failure handling |
| Vercel deployment | No project | Build, env vars, cron, headers, domain |
| Real mobile devices | No device lab | Touch targets, iOS Safari, Android Chrome |
| Load / concurrency | Local single instance | Simultaneous bookings, DB lock contention |

Local demo payments and local dev auth are **not** evidence that real payments or
Google auth work.

---

## 4. Reproducing the local walkthrough

```bash
npm run db:reset-local
npm run dev
```

1. Sign in as `owner@local.test`; create a venue, complete the required fields, set
   prices, upload a JPEG of at least 600 × 400, and submit.
2. Sign in as `admin@local.test`; approve the owner request if needed, then approve the
   venue publication.
3. Sign in as `customer@local.test`; open the venue, choose a future date and slot,
   and create the booking.
4. On the booking page, complete the demo payment.
5. Submit a cancellation request, approve it as admin, process the demo refund, and
   re-check the customer page.
6. Change the venue booking policy to owner approval, re-approve it as admin, and
   repeat the booking flow through an owner decision.

Use a different slot/date for each run, or reset the local database.

---

## 5. Suggested additions

- Integration tests against a disposable Postgres container for `createBooking`,
  `reviewCancellation` and `handleRazorpayWebhook`.
- Concurrent booking test that fires N requests at the same slot and asserts exactly
  one succeeds.
- Contract tests with recorded Razorpay payloads (captured, failed, refund processed,
  duplicate delivery).
- Playwright smoke tests for the three roles.
- Accessibility regression check in CI using the Lighthouse results or axe.
- Vercel preview deployment tests with a staging Supabase project and Razorpay test
  keys.
