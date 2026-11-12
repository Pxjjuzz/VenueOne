/**
 * Pure GLB container checks. No database, no filesystem, so this module can be
 * unit tested and imported anywhere.
 */

export const MAX_MODEL_BYTES = 40 * 1024 * 1024;
export const MAX_MODEL_TRIANGLES = 400_000;

const GLB_MAGIC = 0x46546c67;
const CHUNK_JSON = 0x4e4f534a;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type GlbSummary = {
  bytes: number;
  triangles: number;
  meshes: number;
  materials: number;
  generator: string | null;
};

export class ModelValidationError extends Error {}

export function modelStoragePath(venueId: string, version: number): string {
  if (!UUID.test(venueId)) throw new ModelValidationError("Unknown venue.");
  if (!Number.isInteger(version) || version < 1) {
    throw new ModelValidationError("Invalid model version.");
  }
  return `venue-models/${venueId}/${version}/model.glb`;
}

export function modelPreviewPath(venueId: string, version: number): string {
  if (!UUID.test(venueId)) throw new ModelValidationError("Unknown venue.");
  if (!Number.isInteger(version) || version < 1) {
    throw new ModelValidationError("Invalid model version.");
  }
  return `venue-models/${venueId}/${version}/preview.webp`;
}

/**
 * Parse a GLB container far enough to prove it is a real glTF 2.0 binary with
 * geometry in it. A renamed ZIP or a truncated download fails here, before the
 * file reaches storage or the database.
 */
export function inspectGlb(buffer: Buffer): GlbSummary {
  if (buffer.byteLength > MAX_MODEL_BYTES) {
    throw new ModelValidationError("The model must be 40 MB or smaller.");
  }
  if (buffer.byteLength < 20) {
    throw new ModelValidationError("That file is too small to be a GLB model.");
  }
  if (buffer.readUInt32LE(0) !== GLB_MAGIC) {
    throw new ModelValidationError("That file is not a GLB model. Export a .glb from Blender.");
  }
  if (buffer.readUInt32LE(4) !== 2) {
    throw new ModelValidationError("Only glTF 2.0 binary models are supported.");
  }
  if (buffer.readUInt32LE(8) !== buffer.byteLength) {
    throw new ModelValidationError("The model file is truncated or was modified after export.");
  }

  let offset = 12;
  let json: Record<string, unknown> | null = null;
  while (offset + 8 <= buffer.byteLength) {
    const chunkLength = buffer.readUInt32LE(offset);
    const chunkType = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    const end = start + chunkLength;
    if (end > buffer.byteLength) {
      throw new ModelValidationError("The model file is truncated.");
    }
    if (chunkType === CHUNK_JSON && !json) {
      try {
        json = JSON.parse(buffer.subarray(start, end).toString("utf8")) as Record<string, unknown>;
      } catch {
        throw new ModelValidationError("The model metadata could not be read.");
      }
    }
    offset = end;
  }

  if (!json) throw new ModelValidationError("The model has no glTF metadata chunk.");

  const meshes = Array.isArray(json.meshes) ? json.meshes : [];
  if (meshes.length === 0) {
    throw new ModelValidationError("The model contains no meshes.");
  }

  const accessors = Array.isArray(json.accessors) ? json.accessors : [];
  let triangles = 0;
  for (const mesh of meshes as Array<{ primitives?: Array<{ indices?: number }> }>) {
    for (const primitive of mesh.primitives ?? []) {
      if (typeof primitive.indices !== "number") continue;
      const accessor = accessors[primitive.indices] as { count?: number } | undefined;
      if (typeof accessor?.count === "number") triangles += accessor.count / 3;
    }
  }

  if (triangles > MAX_MODEL_TRIANGLES) {
    throw new ModelValidationError(
      `The model has ${Math.round(triangles).toLocaleString("en-IN")} triangles. Reduce it below ${MAX_MODEL_TRIANGLES.toLocaleString("en-IN")} before uploading.`,
    );
  }

  const asset = (json.asset ?? {}) as { generator?: unknown };

  return {
    bytes: buffer.byteLength,
    triangles: Math.round(triangles),
    meshes: meshes.length,
    materials: Array.isArray(json.materials) ? json.materials.length : 0,
    generator: typeof asset.generator === "string" ? asset.generator : null,
  };
}
