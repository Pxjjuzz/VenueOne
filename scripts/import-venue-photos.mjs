// Imports venue photographs from a local folder into Supabase Storage and the
// venue_photos table. Run with the service role key in the environment:
//
//   node --env-file=.env.local scripts/import-venue-photos.mjs \
//     --slug sowbhagya-kalyana-mantapa --dir images --cover main.avif
//
// The cover is stored first so it becomes the public cover image. Add
// --replace to clear the venue's existing photographs first.

import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

const MAX_PHOTOS = 8;
const MAX_BYTES = 8 * 1024 * 1024;
const MIN_WIDTH = 600;
const MIN_HEIGHT = 320;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "venue-photos";

const ALT_TEXT = {
  "main.avif": "Main function hall with a planted aisle and seating",
  "cdf6e600-1508-4809-a434-0cb5fe23ae5e.webp":
    "Function hall set with blue and white chairs and a red carpet aisle",
  "sowbhagya-kalyana-mantapa-anekal-taluk-bangalore-4zri569kq8.avif":
    "Wide view of the hall with a red carpet aisle",
  "images.jpg": "Rows of chairs arranged for a gathering",
  "profile_pic_2025-08-11.webp":
    "Decorated stage with a floral backdrop and a ceremonial sofa",
  "sowbhagya-kalyana-mantapa-anekal-bangalore-wedding-venues-ovvi24u9nl.jpg":
    "Ceiling lighting and stage decoration during a ceremony",
};

const ORDER = Object.keys(ALT_TEXT);

function arg(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`);
  if (index < 0) return fallback;
  const value = process.argv[index + 1];
  return value && !value.startsWith("--") ? value : true;
}

const slug = arg("slug");
const dir = arg("dir", "images");
const cover = arg("cover");
const replace = Boolean(arg("replace", false));

if (!slug) {
  console.error("Pass --slug <venue-slug>.");
  process.exit(1);
}
if (!process.env.DATABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("DATABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const supported = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
const files = (await fs.readdir(dir))
  .filter((file) => supported.has(path.extname(file).toLowerCase()))
  .filter((file) => (cover ? file !== cover : true));

if (cover) files.unshift(cover);

const rank = (file) => {
  const index = ORDER.indexOf(file);
  return index < 0 ? ORDER.length : index;
};
files.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));

if (files.length === 0) {
  console.error(`No supported images found in ${dir}.`);
  process.exit(1);
}
if (files.length > MAX_PHOTOS) {
  console.error(`Found ${files.length} images. A venue holds ${MAX_PHOTOS}.`);
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, {
  ssl: "require",
  max: 1,
  prepare: false,
  fetch_types: false,
});

const storage = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const venues = await sql`select id, name, slug from venues where slug = ${slug} limit 1`;
const venue = venues[0];
if (!venue) {
  console.error(`No venue with slug ${slug}.`);
  await sql.end();
  process.exit(1);
}

if (replace) {
  const existing = await sql`
    select id, storage_path from venue_photos where venue_id = ${venue.id}
  `;
  if (existing.length > 0) {
    const removed = await storage.storage
      .from(BUCKET)
      .remove(existing.map((row) => row.storage_path));
    if (removed.error) {
      console.error("Storage cleanup failed:", removed.error.message);
    }
    await sql`delete from venue_photos where venue_id = ${venue.id}`;
    console.log(`Removed ${existing.length} existing photographs.`);
  }
}

const imported = [];
let order = 0;

for (const file of files) {
  const source = path.join(dir, file);
  const bytes = await fs.readFile(source);
  if (bytes.byteLength > MAX_BYTES) {
    throw new Error(`${file} is larger than 8 MB.`);
  }

  const metadata = await sharp(bytes).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`${file} could not be read.`);
  }
  if (metadata.width < MIN_WIDTH || metadata.height < MIN_HEIGHT) {
    throw new Error(`${file} is ${metadata.width} × ${metadata.height}, below ${MIN_WIDTH} × ${MIN_HEIGHT}.`);
  }

  const processed = await sharp(bytes)
    .rotate()
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toBuffer({ resolveWithObject: true });

  const storagePath = `venues/${venue.id}/${randomUUID()}.webp`;
  const upload = await storage.storage.from(BUCKET).upload(storagePath, processed.data, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (upload.error) {
    throw new Error(`${file}: ${upload.error.message}`);
  }

  const altText = ALT_TEXT[file] || `${venue.name} photograph`;
  const rows = await sql`
    insert into venue_photos (venue_id, storage_path, alt_text, sort_order, width, height)
    values (${venue.id}, ${storagePath}, ${altText}, ${order}, ${processed.info.width}, ${processed.info.height})
    returning id, sort_order, width, height
  `;

  imported.push({ file, id: rows[0].id, sortOrder: rows[0].sort_order, width: rows[0].width, height: rows[0].height, bytes: processed.data.byteLength });
  order += 1;
}

await sql`
  insert into audit_logs (action, entity_type, entity_id, metadata)
  values ('venue.photos.imported', 'venue', ${venue.id},
    ${JSON.stringify({ count: imported.length, files: imported.map((item) => item.file), source: dir })}::jsonb)
`;

await sql.end();

console.log(JSON.stringify({ venue: venue.slug, imported }, null, 2));
