# Phase 2 setup and maintenance

How the interior model feature is wired, how to turn it on for a real venue, and what
to check when it misbehaves.

## What was added

| Path | Role |
| --- | --- |
| `supabase/migrations/0007_venue_models.sql` | `venue_models` table, constraints, RLS, updated-at trigger |
| `src/lib/models/glb.ts` | Pure GLB validation and storage path builders, unit tested |
| `src/lib/models/status.ts` | Pure publication transition rules, unit tested |
| `src/lib/models/storage.ts` | Server-only upload, preview normalisation, public URL |
| `src/lib/models/queries.ts` | Published lookup for customers, full lookup for admins |
| `src/lib/models/service.ts` | Metadata and status writes plus audit entries |
| `src/app/api/admin/venues/[id]/model/route.ts` | Multipart upload endpoint, admin only |
| `src/app/api/models/[...path]/route.ts` | Serves local GLB and WebP during development |
| `src/lib/viewer/device.ts` | Desktop gate, WebGL probe, reduced-motion check |
| `src/components/venue-3d/venue-model-experience.tsx` | Entry card, lazy import, phone message |
| `src/components/venue-3d/venue-model-viewer.tsx` | Three.js canvas, controls, loading/error states |
| `src/components/admin/admin-model-manager.tsx` | Admin upload, metadata and publication panel |
| `src/app/actions/admin.ts` | `venueModelMetadataAction`, `venueModelStatusAction` |
| `assets/3d/sowbhagya/` | Prototype `.blend`, `.glb`, preview render, model notes |
| `scripts/blender/generate_sowbhagya.py` | Headless Blender generator |

## Environment

The feature reuses the existing upload path, so there are no new environment variables.

- `SUPABASE_STORAGE_BUCKET` (optional, default `venue-photos`) is the bucket that holds
  both photographs and models. Models live under `venue-models/`.
- `SUPABASE_SERVICE_ROLE_KEY` is used on the server only. It is never sent to the
  browser and must not be given a `NEXT_PUBLIC_` name.
- `DATABASE_URL` selects the production database. Without it, local development uses
  PGlite in `.data/pglite` and local uploads in `.data/uploads`.

## Database migration

The local PGlite database applies `0007_venue_models.sql` automatically the next time
the app opens it. For the hosted database, run the existing migration command once:

```
npm run db:migrate
```

The migration only creates the table, its constraints, one index, its trigger and its
policies. It does not alter `venues`, `venue_photos` or any existing row, and every
statement is guarded with `if not exists` or `drop ... if exists`, so it is safe to
re-run.

Policies:

- `select`: admins, plus customers only when `status = 'published'` and the venue is
  `approved`.
- `insert`, `update`, `delete`: admins only. There is no owner write path by design.

## Publication lifecycle

```
upload ──> draft ──> under_review ──> published
              ^            │              │
              │            v              v
              └──────── rejected <────────┘
```

Rules enforced in `src/lib/models/status.ts` and repeated in the database:

| Rule | Reason |
| --- | --- |
| `published` is reachable only from `under_review` | A fresh upload cannot appear to customers |
| Replacing a file always sets `draft` | A new model is reviewed like a new one |
| Publishing requires a stored file | No empty rows claiming to be published |
| Rejection requires a reason | The reason is stored with the row and shown in admin |
| `published_at` is required while published | Timeline survives unpublish and republish |

Every upload, metadata change and status change writes an `audit_logs` row.

## Storage contract

```
venue-models/{venue_id}/{version}/model.glb
venue-models/{venue_id}/{version}/preview.webp
```

- One row per venue in `venue_models`. Replacing a file increments `version` and writes
  a new path, so a published version is never overwritten in place.
- Files are served with `Cache-Control: public, max-age=31536000, immutable`. That is
  only safe because paths are immutable. Never reuse a version number.
- Old versions stay in the bucket after a replacement. They cost storage, not
  correctness. Delete them in the Supabase dashboard when they are no longer needed,
  and never delete the version currently referenced by `storage_path`.
- The bucket is public. An unpublished model is not handed out by the application, but
  anyone who knows the venue UUID and version can fetch the file. Do not treat the
  storage path as a secret.

## Adding a model for another venue

1. Model the interior in Blender. Keep it clay: flat materials, no textures, no
   photographs mapped onto walls. Match the room proportions you can defend.
2. Export glTF 2.0 binary (`.glb`) with Y up, applied transforms, and no cameras or
   lights. Keep it under 40 MB and 400,000 triangles.
3. Render a 16:10 preview image. The upload converts it to WebP automatically.
4. Open `Admin -> Venue review -> {venue} -> 3D model`.
5. Upload the GLB and the preview. Choose the honest accuracy level: `conceptual` for a
   reconstruction from public descriptions, `approximate` for a measured but simplified
   model, `verified` only for something checked against the real room.
6. Write internal notes: sources, assumptions, what still needs measuring.
7. Submit for review, then publish.

No application code changes are needed for a new venue. The customer page resolves the
published row to a URL and passes it to the same viewer component.

## What the viewer receives

`VenueModelExperience` takes `modelUrl`, `posterUrl`, `accuracyLabel` and a name. It
never sees a storage path or the database. That separation is what makes the viewer
reusable.

The customer page only renders the card when `getPublishedVenueModel` returns a row
with a `storage_path`, and that query joins `venues` and requires `approved`. Admin
pages use `getVenueModelForAdmin`, so draft and rejected files can be previewed by an
administrator but not by the public.

## Desktop-only behaviour

The gate is checked before the Three.js bundle is imported:

- viewport width below 1024 px means no import and no model request.
- a coarse pointer with no fine pointer is treated as a phone.
- a touch laptop with both pointer types is allowed.
- the device check runs through `useSyncExternalStore`, so the server render stays
  identical for every device and the decision is made after hydration.
- if WebGL is unavailable, the button is disabled and labelled, with a short
  explanation and a link to the photographs.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Card missing on the venue page | Row status is `published`, `storage_path` is set, and the venue is `approved` |
| `404` from `/api/models/...` | File is missing from `.data/uploads` locally, or the path does not start with `venue-models/` |
| Upload rejected | File must be a real GLB, under 40 MB, under 400,000 triangles, with at least one mesh |
| Upload returns `403 Administrator access is required` | Session is not an admin, or the dev session cookie is stale |
| Upload returns `403 This upload did not come from the admin panel` | The request carried a foreign `Origin`; the origin guard rejected it |
| Viewer opens but the room is black | Model has no lights by design; the viewer supplies ambient, hemisphere and directional lights. Check that the GLB contains meshes and that the camera bounds are not tiny |
| Fullscreen does nothing | Browser denied `requestFullscreen`. The rejection is caught and logged; the rest of the viewer keeps working |
| Model loads twice slowly | `useGLTF.clear(url)` runs on unmount, so a second open re-parses. That is intentional to release GPU memory |

## Security notes

- The upload route checks the session role, rejects cross-site `Origin`, refuses a
  declared body over 49 MB before parsing it, caps the model at 40 MB and the preview
  at 8 MB, and validates the GLB container before writing anything.
- The service-role key stays in server modules; no `NEXT_PUBLIC_` alias exists.
- Model writes are admin-only at both the application and the RLS layer.
- Status changes are server actions, so they get Next.js's built-in origin protection
  on top of the admin check.
