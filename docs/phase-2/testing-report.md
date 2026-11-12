# Phase 2 testing report

What was actually run, on what, and what it proved. Everything below is from this
machine, not from a plan.

## Environment

| Item | Value |
| --- | --- |
| OS | Windows 11 |
| Node | 22.18.0 |
| Next.js | 16.4.5, App Router, Turbopack dev |
| Database under test | PGlite 0.5.15 at `.data/pglite`, migrations applied by the app |
| Storage under test | local filesystem at `.data/uploads`, served by `/api/models` |
| Browser | Headless Edge 157.0.4341.42 over CDP, SwiftShader for WebGL |
| Viewports | 1440 x 900 desktop, 390 x 844 phone |

The verification run used a throwaway `.env.local` with no `DATABASE_URL`, no Supabase
keys and no mail credentials, so nothing touched the live database or bucket. The real
`.env.local` was restored afterwards. The venue used was a local-only row seeded into
PGlite under the slug `sowbhagya-kalyana-mantapa`.

## Automated checks

| Command | Result |
| --- | --- |
| `npm test` | 64 passed, 9 files |
| `npx tsc --noEmit` | clean |
| `npm run lint` | clean |
| `npm run build` | compiled successfully, both new routes emitted |

New tests added in this stage:

- `src/lib/models/glb.test.ts` (13): valid minimal GLB, bad magic, glTF 1.0,
  header/file length mismatch, JSON chunk past end of file, no JSON chunk, no meshes,
  file too small, triangle budget, missing index count, and the two path builders
  rejecting non-UUID ids and non-positive versions.
- `src/lib/models/status.test.ts` (11): the transition matrix, published reachable
  only from under review, replacing a file does not allow a direct publish, rejection
  needs a reason, publishing needs a file, same-status no-op, and the human-readable
  error text.
- `src/lib/viewer/device.test.ts` (3): no `window` means no device support and no
  WebGL, and the desktop breakpoint is at least 1024 px.

## End-to-end run

### Upload, through the real endpoint

The prototype GLB and preview PNG were posted to
`POST /api/admin/venues/{id}/model` with a real admin session cookie, the same request
the admin form sends.

| Check | Result |
| --- | --- |
| Response | `200 {"ok":true,"version":1,"triangles":24588,"bytes":1212008,"meshes":43}` |
| Stored path | `venue-models/33333333-.../1/model.glb` and `preview.webp` on disk |
| Cross-origin POST with `Origin: https://evil.example` | `403 This upload did not come from the admin panel.` |
| Unauthenticated POST | `403 Administrator access is required.` |

### Publication, through the real admin UI

| Step | Observed |
| --- | --- |
| After upload | badge `Draft`, `Conceptual reconstruction`, `v1`, `1.2 MB`, upload timestamp |
| Public page while draft | venue renders, no 3D card |
| Click `Submit for review`, then `Publish to customers` | badge `Published`, alert `Model published. Customers can now open it.` |
| Public page after publish | 3D card present |

### Desktop viewer

| Check | Result |
| --- | --- |
| Entry card | heading, accuracy line, `Explore in 3D` button |
| Click | viewer opens, canvas 746 x 465, WebGL context present |
| Model request | exactly one: `GET /api/models/venue-models/{venue}/1/model.glb` |
| Three.js chunks | loaded only after the click |
| Rendered frame | 181 distinct colours, luma 2 to 211, mean 133, so geometry and shading, not a flat canvas |
| Orbit drag | frame mean channel difference 21 after a 144 px drag, so the camera moved |
| Reset | control present, no error |
| Back to photographs | canvas removed, gallery present, `Explore in 3D` available again |
| Console and network errors | none |

### Phone

Viewport 390 x 844, `mobile: true`.

| Check | Result |
| --- | --- |
| `/api/models/` requests | 0 |
| Three.js chunks requested | 0 |
| `<canvas>` elements | 0 |
| Card | `Interactive 3D needs a laptop or desktop. It is not loaded on phones, to save data.` with `Back to photographs` |
| `Explore in 3D` button | not rendered |

The preview image still loads on a phone (43 KB WebP), which is intended: it is the
poster, not the model.

### Replacing a published model

A second upload through the same endpoint returned `version: 2` and left version 1
untouched on disk. The row dropped to `Draft`, the public page lost the 3D card, and
after going through review again the public page requested
`/api/models/venue-models/{venue}/2/model.glb`.

### Media route

| Request | Result |
| --- | --- |
| `/api/models/venue-models/{id}/2/model.glb` | `200`, `model/gltf-binary`, 1,212,008 bytes, `public, max-age=31536000, immutable` |
| `/api/models/venue-models/{id}/2/preview.webp` | `200`, `image/webp`, 43,316 bytes |
| `/api/models/venues/x.webp` | `404`, wrong prefix |
| `/api/models/venue-models/../../secret.glb` | `404`, traversal |
| `/api/models/venue-models/{id}/2/model.exe` | `404`, extension not allowed |

### Failure states

| Scenario | Result |
| --- | --- |
| WebGL removed before page load | button disabled and labelled `WebGL unavailable`, warning text shown, 0 canvases, 0 model requests |
| Model request blocked | `The 3D model did not load.` panel with `Try again`, gallery still present, 1 attempted request |
| No published model | no entry card at all, page unchanged |

## Not verified

| Item | Why |
| --- | --- |
| Fullscreen entering and leaving | Headless Edge refused `requestFullscreen` with `TypeError: not granted`, and this build has no CDP permission to grant it. The control is present and the failure is caught and logged; the fullscreen path needs a real browser window. |
| Upload to live Supabase Storage | Would write to the shared bucket and needs the production service-role key. The code path is the existing `supabaseStorageAdmin()` upload used by photographs. |
| `0007_venue_models.sql` against the production database | `npm run db:migrate` has not been run against the live database. The migration is additive and idempotent, but it is still an operator step. |
| Google sign-in and owner flows | Unchanged by Phase 2; dev auth was used to reach the admin panel. |
| Live Razorpay payment | Unrelated to this phase and still unverified from Phase 1. |

## Warnings seen in the browser console

`THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.` comes
from `three-stdlib` inside drei's OrbitControls, not from this code. React Three
Fiber's default soft shadow map was replaced with an explicit `shadows="percentage"`
because three 0.187 drops `PCFSoftShadowMap`; that warning is now gone.

## Local fixtures left behind

`.data/pglite` and `.data/uploads` are gitignored. The verification venue is still in
the local database, currently published with version 2, and can be removed with
`Remove-Item -Recurse .data` when it is no longer useful. Nothing from this run exists
in the repository or in production.
