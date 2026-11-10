import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
export const MAX_PHOTOS_PER_VENUE = 8;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

export type StoredImage = {
  storagePath: string;
  width: number;
  height: number;
};

function bucket(): string {
  return process.env.SUPABASE_STORAGE_BUCKET || "venue-photos";
}

function localRoot(): string {
  return path.join(process.cwd(), ".data", "uploads");
}

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function photoPublicUrl(storagePath: string): string {
  const encoded = storagePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return `${url.replace(/\/$/, "")}/storage/v1/object/public/${bucket()}/${encoded}`;
  }
  return `/api/media/${encoded}`;
}

export async function processVenueImage(
  input: Buffer,
): Promise<{ buffer: Buffer; width: number; height: number }> {
  if (input.byteLength > MAX_PHOTO_BYTES) {
    throw new Error("Each photograph must be 8 MB or smaller.");
  }

  const probe = sharp(input, {
    failOn: "error",
    limitInputPixels: 40_000_000,
  });
  const metadata = await probe.metadata();

  if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) {
    throw new Error("Use a JPEG, PNG or WebP photograph.");
  }
  if (!metadata.width || !metadata.height) {
    throw new Error("The image could not be read.");
  }
  if (metadata.width < 600 || metadata.height < 400) {
    throw new Error("Use an image at least 600 × 400 pixels.");
  }

  const result = await sharp(input, { failOn: "error", limitInputPixels: 40_000_000 })
    .rotate()
    .resize({
      width: 2000,
      height: 2000,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82, effort: 4 })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: result.data,
    width: result.info.width,
    height: result.info.height,
  };
}

export async function storeVenuePhoto(
  venueId: string,
  image: { buffer: Buffer; width: number; height: number },
): Promise<StoredImage> {
  const storagePath = `venues/${venueId}/${crypto.randomUUID()}.webp`;
  const client = supabaseAdmin();

  if (client) {
    const { error } = await client.storage
      .from(bucket())
      .upload(storagePath, image.buffer, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: false,
      });
    if (error) {
      console.error("Supabase Storage upload failed", error.message);
      throw new Error("The photograph could not be stored.");
    }
  } else {
    const destination = path.join(localRoot(), storagePath);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, image.buffer, { flag: "wx" });
  }

  return {
    storagePath,
    width: image.width,
    height: image.height,
  };
}

export async function deleteStoredPhoto(storagePath: string): Promise<void> {
  const client = supabaseAdmin();
  if (client) {
    const { error } = await client.storage.from(bucket()).remove([storagePath]);
    if (error) console.error("Supabase Storage delete failed", error.message);
    return;
  }

  try {
    await fs.unlink(path.join(localRoot(), storagePath));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") console.error("Local photo delete failed", error);
  }
}

export async function readLocalPhoto(storagePath: string): Promise<Buffer | null> {
  const root = path.resolve(localRoot());
  const target = path.resolve(root, storagePath);

  if (!target.startsWith(`${root}${path.sep}`)) return null;

  try {
    return await fs.readFile(target);
  } catch {
    return null;
  }
}
