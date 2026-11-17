# Phase 3 mobile app: build plan

Status: five of six slices shipped as an installable app, 17 November 2026. The
figures below are an estimate of delivered weight, not a certified percentage.

The app is a web app served at `/app`, installable from Chrome, plus a signed Android
package that opens the same pages in a Trusted Web Activity. No venue data is bundled in
either build, so a new venue, a new price or an unpublished listing reaches installed
phones on the next refresh.

## Milestones

| Slice | Work | Weight | Delivered | State |
| --- | --- | --- | --- | --- |
| 1 | Public v1 API: catalogue, venue detail, availability | 15% | 15% | Done |
| 2 | App shell, navigation, catalogue list and filters | 20% | 20% | Done |
| 3 | Venue page: gallery, price, hours, policies, availability | 15% | 15% | Done |
| 4 | Accounts, booking creation, payment handoff | 25% | 25% | Done |
| 5 | Bookings list, invoice access, notifications | 15% | 10% | Partial |
| 6 | Offline handling, performance budget, release build | 10% | 8% | Partial |
| | **Total** | **100%** | **93%** | |

Slice 5 is short because an invoice is still sent by email and has no in-app view, and
the notifications screen is the existing dashboard page rather than an app-styled one.
Slice 6 is short because the performance budget is defined but has not been measured on
a physical device. Everything else in both slices ships.

## Slice 1: what shipped

Three read-only endpoints under `/api/v1`. They call the same `src/lib` functions as
the website, so a price or an availability rule cannot drift between web and app.

| Endpoint | Returns |
| --- | --- |
| `GET /api/v1/venues?category=hall\|ground` | Published venue summaries with cover photo, photo count and approved price range |
| `GET /api/v1/venues/{slug}` | Full detail: address, coordinates, size, attributes, booking policy, pricing, hours, amenities, photos, attribution, published model preview |
| `GET /api/v1/venues/{slug}/availability?month=YYYY-MM` | Month of day and slot availability from the booking engine |

Code:

- `src/lib/api/catalog-params.ts` parses and validates query strings.
- `src/lib/api/venue-contract.ts` maps database rows to the JSON shape.
- `src/lib/api/response.ts` sets the version header, JSON type and error shape.
- `src/app/api/v1/` holds the three route handlers.

## Contract rules

- Money is an integer in paise, named `amountPaise` or `minPaise` / `maxPaise`. The app
  shows rupees and never recomputes tax or fees.
- Only `approved` venues are readable. Draft, submitted, under review and rejected rows
  return 404.
- An ownerless venue reports `attribution.kind = "venueone"` and the label
  `The VenueOne team`. An owned venue reports the business name, or the owner name,
  or `A verified venue owner`.
- Pricing rows with no approved amount are omitted, not sent as zero.
- A model is described only when it is published. The response carries its preview URL
  and accuracy label and never the GLB path, matching the phone rule in the
  requirements.
- Photos are ordered cover first, with alt text and pixel dimensions.
- Caching: 60 seconds with a 5 minute stale window for catalogue and detail, `no-store`
  for availability.
- Errors use `{ "error": { "code", "message" } }` with 400, 404 or 429. Rate limits are
  per IP and shared with the existing limiter.
- Responses carry `X-VenueOne-API: 1`.

## How slice 1 was checked

- Unit tests cover query validation, pagination caps, price range ordering, month
  validation, slug safety, attribution, pricing omission, photo order and model
  exposure.
- A production build served locally against the production database returned the live
  Sowbhagya listing with six photos and both approved prices.
- Bad category, unknown slug and month 13 each returned the documented error code.
- Availability returned 31 days for December 2026.

## Slice 2: shell and catalogue

Routes live under `src/app/app/`. The shell (`src/app/app/layout.tsx`) is a single
520px column with a bottom tab bar for Explore, Bookings and Account, safe-area
padding, and `force-dynamic` so no page is prerendered with stale venue data.

| Piece | File |
| --- | --- |
| Shell, tabs, manifest metadata | `src/app/app/layout.tsx`, `src/components/mobile/app-tab-bar.tsx` |
| Catalogue with search, category, city, price, sort, pages | `src/app/app/page.tsx` |
| Venue card | `src/components/mobile/mobile-venue-card.tsx` |
| Web manifest and icons | `src/app/manifest.ts`, `public/icons/` |
| Offline fallback | `src/app/app/offline/page.tsx`, `public/sw.js` |

The catalogue calls `listPublicVenues` and `getPublicVenueFacets` in the page, not
through the JSON API, so it shares the exact query the website uses. Anything new
appears after a refresh.

## Slice 3: venue page

`src/app/app/venues/[slug]/page.tsx` renders the same bundle as the website detail page:
cover photo, specs, price, the full `BookingWidget`, description, facilities, pricing,
opening hours, policies, attribution and a link to the full website listing. A venue
that is unpublished shows an in-app notice instead of a bare 404.

The gallery thumbnails became a horizontal strip on phones, which also fixed an orphan
thumbnail on the website when a venue has six photos.

## Slice 4: accounts, booking and payment

| Screen | File |
| --- | --- |
| Bookings list with status tabs | `src/app/app/bookings/page.tsx` |
| Booking detail, payment, cancellation | `src/app/app/bookings/[id]/page.tsx` |
| Account tab | `src/app/app/account/page.tsx` |

Booking creation reuses `BookingWidget` with an `app` flag. The flag keeps the sign-in
return path inside `/app` and adds a `returnTo` field so `createBookingAction` lands on
`/app/bookings/{id}` instead of the website dashboard. Sign out honours a `next` field
and returns to `/app`.

Payment uses the existing `BookingPaymentPanel`, so Razorpay is opened and verified the
same way as on the website. The app never shows a card form and never holds a key.

## Slice 5: bookings, invoices, notifications

Bookings list, filters, detail, price breakdown, payment records, refunds, cancellation
request and withdraw, and status history all ship in the app. An invoice is still
emailed as `INV-{reference}` and has no in-app viewer. The notifications screen is the
existing `/dashboard/notifications` page, reachable from the Account tab.

## Slice 6: offline and release

`public/sw.js` caches only a versioned shell and the offline page. It never caches HTML
or API responses, so a stale venue can never be shown as if it were live. With the
server stopped, navigating to a venue page serves the offline screen.

The Android package is built with Bubblewrap as a Trusted Web Activity. Source is
`android/twa-manifest.json`; the build notes are in `android/README.md`.

| Artifact | Size | Notes |
| --- | --- | --- |
| `app-release-signed.apk` | 1,181,462 bytes | Sideload target, minSdk 24, targetSdk 36, versionCode 1, versionName 1.0.0. SHA-256 `8B4E54D13573E2EAEB9A51735BB52DEB67BF98804D7C5AC50CA8E54524CE6459` |
| `app-release-bundle.aab` | 1,248,434 bytes | For a future Play Console upload |

The APK is signed with the release key whose SHA-256 fingerprint is
`17:F0:5A:E8:4A:84:DC:7F:80:AA:35:CB:A3:58:C6:ED:2B:21:5F:77:46:FF:42:B8:74:92:49:C9:7D:97:3E:9E`.
The same fingerprint is served at `/.well-known/assetlinks.json`, which is what lets the
app run without a URL bar. Without it the app still works inside a Chrome tab.

## How slices 2 to 4 were checked

- Screens were captured at a true 390x844 viewport through the DevTools protocol. Body
  and page `scrollWidth` were 390 on the catalogue, venue, bookings and account screens,
  so there is no sideways scroll.
- A customer profile with two bookings showed both in the list, and a confirmed, paid
  booking opened with its Razorpay payment record.
- Offline was checked by stopping the server and navigating: the offline screen appeared.
- `npx tsc --noEmit`, `npm run lint`, `npm test` and `npm run build` all pass.

## Not in Phase 3

- A Play Store release. The bundle is built and signed but not uploaded.
- Push notifications. The manifest declares none, and the app does not ask for the
  permission.
- In-app invoice download.
- 3D model viewing on phones. The venue page names the published model and links to the
  desktop viewer, matching the requirements.
- Any change to the five product questions in `requirements.md`. The TWA answers the
  wrapper question for now: the app is the web app in Chrome, so a future native build
  is not blocked by this work.
