# VenueOne roadmap

Status as of 14 November 2026. Each phase is called done only when the work is
merged, deployed and described honestly in `docs/`.

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | Booking web application | Shipped |
| 2 | 3D venue viewer | Shipped 14 November 2026 |
| 3 | Android app | Planned, not started |

## Phase 1: booking web application

Shipped before this roadmap was written. The live site is
<https://venueone-team.vercel.app>.

- Public catalogue for halls and grounds with city, capacity, price and facility
  filters.
- Venue pages with photographs, approved pricing, opening hours, policies and live
  availability from the booking engine.
- Server side quote with platform fee and tax, instant or approval booking policies,
  and Razorpay payment confirmed only by signature or webhook.
- Customer, owner and admin dashboards, invoices by email, cancellation and refund
  queues, audit log and editable legal pages.
- No seeded venues, ratings or bookings. Empty states say so.

## Phase 2: 3D venue viewer

Shipped on 14 November 2026. Every stage in
`docs/phase-2/implementation-plan.md` is complete.

### What was delivered

| Area | Delivered |
| --- | --- |
| Model pipeline | GLB header and triangle validation, 40 MB cap, WebP preview normalisation, immutable `venue-models/{venue_id}/{version}/` paths |
| Database | `0007_venue_models.sql` with checks, RLS and an updated-at trigger, applied to the production Supabase database |
| Status flow | `draft` to `under_review` to `published`, plus unpublish and reject, enforced by a pure transition matrix |
| Admin | Upload, replace and metadata editing behind Super Admin, with inline preview and a status badge on the venue list |
| Customer viewer | Entry card, desktop and WebGL gate, lazy Three.js import, orbit controls, reset, fullscreen, byte progress, error boundary, back to photographs |
| Mobile | Phones show a laptop note and download neither the Three.js bundle nor the GLB |
| Live listing | Sowbhagya Kalyana Mantapa published with a conceptual interior, one GLB and a preview |
| Documentation | Implementation plan, setup and maintenance runbook, testing report, venue reference |

### Verified on the live deployment

- Venue page returns 200 and the 3D card appears.
- `Explore in 3D` opens a 746 x 465 WebGL canvas that paints real geometry.
- The browser requests the Supabase hosted GLB and receives 200 with 1,212,008 bytes.
- Reset and back to photographs work, with no console or network errors.
- At 390 x 844 the page shows the laptop note and makes zero model requests.
- CSP allows the GLTF loader's WebAssembly decoder without enabling general eval.

### Known limits

- The interior is a conceptual reconstruction. No floor plan, ceiling height or
  measurement was available, and the page labels it as such.
- Fullscreen cannot be verified in headless Edge; the control is present and failures
  are caught.
- Upload through the admin form was exercised locally, not against live Supabase
  Storage. The live bucket was exercised by the provisioning script, which uses the
  same SDK and options.
- The demo venue has no owner account, so prices, hours, contact details and photos
  cannot yet be edited from an owner dashboard.

## Phase 3: Android app

Planned, not started. No code exists for it.

- Wrap the existing domain services in a versioned API. Business rules stay in
  `src/lib` and are not duplicated in the client.
- Customer sign in, catalogue, venue pages with availability, booking and a payment
  handoff.
- Owner and admin tools only if they are needed on a phone; the responsive web
  dashboards already work for most of that.
- Reuse the same policies, cancellation rules and invoices so a booking made on a
  phone matches one made on the web.

## Next work

These are open items from Phase 2, not a new phase.

1. Attach the Sowbhagya listing to a real owner account so the owner dashboard can
   maintain it.
2. Confirm the real half-day price and opening hours, both of which are provisional.
3. Replace the conceptual interior after a measured survey.
4. Verify a live payment end to end with a domestic test card. International cards are
   disabled on the test account, so `4111 1111 1111 1111` is rejected.
5. Decide whether owner and admin tools need a dedicated mobile app or the responsive
   web dashboards are enough.

## Phase 2 commit trail

| Commit | Change |
| --- | --- |
| `2cf60c4` | Sowbhagya interior prototype and Stage 1 findings |
| `1ab3e80` | Viewer, storage, status flow and admin publishing |
| `34d0443` | WebAssembly allowed in CSP, live setup recorded |
| `c8f5814` | Unpublished hours shown as unknown, not closed |
| `c190494` | Live pricing and hours recorded for the demo listing |
| `9fc5477` | Razorpay popups allowed to post back instead of blanking |
