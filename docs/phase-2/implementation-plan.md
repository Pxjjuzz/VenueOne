# Phase 2 implementation plan

Written after reading the Phase 1 codebase, not from assumptions. Anything marked
"verified" was checked in this repository or against the running toolchain.

## What Phase 1 actually is

| Area | Reality in this repository |
| --- | --- |
| Framework | Next.js 16.4.5 App Router, React 19.3.1, TypeScript strict |
| Styling | Tailwind CSS 4 with design tokens declared in `src/app/globals.css` |
| Database | `supabase/migrations/0001..0006`, PostgreSQL. Local dev uses PGlite through `src/lib/db/index.ts`; production uses `DATABASE_URL` |
| Auth | Supabase Auth, `getSessionUser` / `requireAdmin` in `src/lib/auth/session.ts` |
| Admin | `src/app/(app)/admin/**`, server actions in `src/app/actions/admin.ts` behind `requireAdmin` |
| Venue page | `src/app/(public)/venues/[slug]/page.tsx`, gallery in `src/components/venue-gallery.tsx` |
| Storage | `src/lib/storage.ts`, service-role client, bucket from `SUPABASE_STORAGE_BUCKET` (default `venue-photos`), local filesystem fallback under `.data/uploads` |
| Media route | `src/app/api/media/[...path]/route.ts`, serves only `venues/` paths |
| 3D today | None. The landing page sculptures are SVG plus Framer Motion, not WebGL |

`design.md` does not exist in this repository. The visual direction lives in the
token block in `src/app/globals.css` and in `README.md`: warm stone paper, charcoal
ink, deep forest green, Manrope headings, Inter body.

There are no `three`, `@react-three/fiber` or `@react-three/drei` dependencies and
no 3D columns on `venues`.

## Decisions

**One model per venue, versioned in place.** A second table for version history
would add scope without changing what the viewer does. Replacing a file increments
`version`, writes a new immutable storage path, and returns the row to `draft`.

**Reuse the existing bucket.** `venue-photos` already exists in Supabase Storage and
is already public. Models live under `venue-models/{venue_id}/{version}/model.glb`,
so no new bucket, no new storage policy surface, and the existing service-role
upload path keeps working. The trade-off is that an unpublished file is reachable
by anyone who knows the venue UUID and version; the database is the only place that
hands out the path, and it only hands it out when the row is published.

**Uploads go through a route handler, not a server action.** Server action request
bodies default to a 1 MB cap and the prototype GLB is already 1.2 MB. Metadata
changes (accuracy, notes, publish, reject) stay as server actions, matching the
Phase 1 admin patterns.

**The viewer loads a URL, never a path.** The customer page resolves the published
model to a public URL on the server. The component receives `url` and knows nothing
about the database. A second venue needs no viewer change.

**Desktop gating happens before the import.** The entry card checks viewport and
pointer type, then dynamically imports the Three.js bundle on click. A phone never
downloads the bundle or the GLB.

## Stages

### Stage 1: audit

Complete. Findings above, plus `docs/phase-2/venue-reference-sowbhagya.md`.

### Stage 2: Blender prototype

Complete. `scripts/blender/generate_sowbhagya.py` builds the hall from assumed
meter dimensions, writes `.blend`, `.glb`, and a Cycles clay render. Verified
output: 43 meshes, 8 materials, 24,588 triangles, 1.2 MB, bounds 16.5 x 6.34 x
24.5 m, valid glTF 2.0 with `KHR_materials_specular` only.

Two bugs were found by inspecting the first renders: the area lights were rotated
to shine at the ceiling instead of the floor, and the box face table produced two
diagonal faces per box while omitting the +X and -X faces. Both are fixed. The
second bug mattered beyond the render: with backface culling on, the exported GLB
would have shown holes.

### Stage 3: viewer

Complete. `three@0.187`, `@react-three/fiber@9`, `@react-three/drei@10`.

- `src/lib/viewer/device.ts`: desktop and WebGL gate, pure and unit tested.
- `venue-model-experience.tsx`: entry card, `useSyncExternalStore` device check,
  lazy import on click, back to photographs.
- `venue-model-viewer.tsx`: canvas, GLTF, OrbitControls with camera limits, reset,
  fullscreen, byte progress, error boundary, `useGLTF.clear` on unmount.

Evidence in `docs/phase-2/testing-report.md`: desktop viewer canvas 746 x 465 with
a real WebGL context, one model request, orbit drag changed the frame, reset and
back both worked, zero console or network errors. Fullscreen could not be verified
headlessly and is recorded as such.

### Stage 4: database and storage

Complete.

- `0007_venue_models.sql`: table, checks, RLS, updated-at trigger.
- `src/lib/models/glb.ts`: pure GLB validation (magic, version, declared length,
  JSON chunk, triangle ceiling) and the storage path builders.
- `src/lib/models/status.ts`: transition matrix, pure and unit tested.
- `src/lib/models/storage.ts`: server upload and WebP preview normalisation.
- `src/lib/models/queries.ts`: published lookup for the customer page, full lookup
  for admin.
- `src/lib/models/service.ts`: metadata and status writes plus audit rows.
- `/api/models/[...path]`: local-filesystem mirror of `/api/media`, restricted to
  `venue-models/` and `.glb` / `.webp`.

Evidence: upload returned `200` with version, triangle and byte counts; a cross-origin
POST was rejected with 403; the media route served the GLB with the right type and
cache header and returned 404 for a wrong prefix, traversal and a disallowed
extension. The production migration has not been run yet; that is an operator step
listed in `docs/phase-2/setup-and-maintenance.md`.

### Stage 5: admin

Complete. `src/components/admin/admin-model-manager.tsx` plus
`venueModelMetadataAction` and `venueModelStatusAction` in
`src/app/actions/admin.ts`, mounted on `admin/venues/[id]` with a status badge in
the venue list.

- Upload and replace through `POST /api/admin/venues/[id]/model` with XHR progress,
  a same-origin guard and a 40 MB early size check.
- Accuracy, notes and the review, publish, unpublish and reject transitions, with
  inline preview using the same viewer component.

Evidence: the real admin UI moved a draft to `under_review` and then `published`,
the public page gained the card only after publishing, and replacing the file
produced version 2, hid the card and served the new path after republishing.

### Stage 6: customer

Complete. `Explore in 3D` card above `#venue-gallery`, rendered only when
`getPublishedVenueModel` returns a row with a storage path, with an inline
expansion and a back to photographs control.

Evidence: desktop opened the viewer; at 390 x 844 the page showed the laptop
message, made zero `/api/models/` requests, loaded zero Three.js chunks and rendered
no canvas. A venue without a published model renders no card at all.

### Stage 7: testing

Complete.

- `glb.test.ts` (13), `status.test.ts` (11), `viewer/device.test.ts` (3) added;
  `npm test` reports 64 passed across 9 files.
- `npx tsc --noEmit`, `npm run lint` and `npm run build` are clean.
- Browser pass over CDP at 1440 x 900 and 390 x 844, covering upload, publication,
  the viewer, replacement, the media route and both failure states.

Full results, including what could not be verified and why, are in
`docs/phase-2/testing-report.md`. Operational steps are in
`docs/phase-2/setup-and-maintenance.md`.

## Risks

| Risk | Handling |
| --- | --- |
| Model is a conceptual reconstruction | `accuracy` is `conceptual` in the row, and the UI says so on the model whenever it is shown |
| No owner permission to publish Sowbhagya | Nothing is seeded or auto-published. Publishing is a deliberate admin action on a real venue row |
| Large GLB on slow connections | Lazy import, byte progress, and a 40 MB cap |
| WebGL unavailable | Feature check before mount, plus a text fallback that keeps the page usable |
| Replacing a published file | Status drops to `draft` on upload, so a new file can never appear to customers before review |
