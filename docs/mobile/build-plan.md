# Phase 3 mobile app: build plan

Status: slice 1 of 6 complete, 16 November 2026. This is an estimate, not a
certified percentage. No app binary exists yet. What exists is the server contract the
app will read.

The five open questions in `requirements.md` are still unanswered. Slice 1 was chosen
because it is useful whichever answer wins: native app or WebView shell both need the
same JSON.

## Milestones

| Slice | Work | Weight | State |
| --- | --- | --- | --- |
| 1 | Public v1 API: catalogue, venue detail, availability | 15% | Done |
| 2 | App shell, navigation, catalogue list and filters | 20% | Not started |
| 3 | Venue page: gallery, price, hours, policies, availability | 15% | Not started |
| 4 | Accounts, booking creation, payment handoff | 25% | Not started |
| 5 | Bookings list, invoice access, notifications | 15% | Not started |
| 6 | Offline handling, performance budget, release build | 10% | Not started |

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

## Not in slice 1

- No app project, no screens, no store listing.
- No sign in or booking write endpoints. Those need the answer to the native wrapper
  question, because the token flow differs.
- No CORS headers. A native client does not need them. A WebView shell would, and that
  is a deliberate later decision.
- No push notification registration.

## Slice 2 needs

1. The five answers in `requirements.md`, especially native or WebView.
2. A decision on the minimum Android version.
3. Confirmation that phone OTP is the only sign in method for the first release.
