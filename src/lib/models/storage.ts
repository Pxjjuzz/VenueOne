import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { localUploadRoot, publicStorageUrl, storageBucket, supabaseStorageAdmin } from "@/lib/storage";

export {
  MAX_MODEL_BYTES,
  MAX_MODEL_TRIANGLES,
  ModelValidationError,
  inspectGlb,
  modelPreviewPath,
  modelStoragePath,
  type GlbSummary,
} from "@/lib/models/glb";

export function modelPublicUrl(storagePath: string): string {
  return publicStorageUrl(storagePath, "/api/models");
}

async function writeObject(storagePath: string, body: Buffer, contentType: string): Promise<void> {
  const client = supabaseStorageAdmin();
  if (client) {
    const { error } = await client.storage.from(storageBucket()).upload(storagePath, body, {
      contentType,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) {
      console.error("Supabase model upload failed", error.message);
      throw new Error("The model could not be stored.");
    }
    return;
  }

  const destination = path.join(localUploadRoot(), storagePath);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, body, { flag: "wx" });
}

export async function storeModelFile(storagePath: string, buffer: Buffer): Promise<void> {
  await writeObject(storagePath, buffer, "model/gltf-binary");
}

export async function storeModelPreview(storagePath: string, buffer: Buffer): Promise<void> {
  await writeObject(storagePath, buffer, "image/webp");
}
