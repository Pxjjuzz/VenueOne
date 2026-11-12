import { describe, expect, it } from "vitest";
import {
  MAX_MODEL_TRIANGLES,
  ModelValidationError,
  inspectGlb,
  modelPreviewPath,
  modelStoragePath,
} from "@/lib/models/glb";

const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;

const VENUE_ID = "3f1b4c2a-8d5e-4a7b-9c6d-2e0f1a3b5c7d";

const VALID_SCENE = {
  asset: { version: "2.0", generator: "Unit test" },
  meshes: [
    {
      primitives: [
        { attributes: { POSITION: 0 }, indices: 1 },
      ],
    },
  ],
  accessors: [{ count: 8 }, { count: 36 }],
  materials: [{ name: "Clay_Floor" }],
};

/** Build a GLB with one JSON chunk. Overrides exist to produce broken files. */
function buildGlb(
  json: unknown = VALID_SCENE,
  overrides: { magic?: number; version?: number; declaredLength?: number } = {},
): Buffer {
  const raw = Buffer.from(JSON.stringify(json), "utf8");
  const padding = (4 - (raw.length % 4)) % 4;
  const jsonChunk = Buffer.concat([raw, Buffer.alloc(padding, 0x20)]);
  const total = 12 + 8 + jsonChunk.length;

  const header = Buffer.alloc(12);
  header.writeUInt32LE(overrides.magic ?? GLB_MAGIC, 0);
  header.writeUInt32LE(overrides.version ?? 2, 4);
  header.writeUInt32LE(overrides.declaredLength ?? total, 8);

  const chunkHeader = Buffer.alloc(8);
  chunkHeader.writeUInt32LE(jsonChunk.length, 0);
  chunkHeader.writeUInt32LE(JSON_CHUNK, 4);

  return Buffer.concat([header, chunkHeader, jsonChunk]);
}

describe("inspectGlb", () => {
  it("accepts a minimal glTF 2.0 binary and reports its contents", () => {
    const glb = buildGlb();
    const summary = inspectGlb(glb);

    expect(summary.bytes).toBe(glb.byteLength);
    expect(summary.meshes).toBe(1);
    expect(summary.materials).toBe(1);
    expect(summary.triangles).toBe(12);
    expect(summary.generator).toBe("Unit test");
  });

  it("rejects a file that is not a GLB at all", () => {
    expect(() => inspectGlb(buildGlb(VALID_SCENE, { magic: 0x04034b50 }))).toThrow(
      ModelValidationError,
    );
  });

  it("rejects glTF 1.0 binaries", () => {
    expect(() => inspectGlb(buildGlb(VALID_SCENE, { version: 1 }))).toThrow(
      /Only glTF 2.0/,
    );
  });

  it("rejects a file whose header length does not match its size", () => {
    const glb = buildGlb(VALID_SCENE, { declaredLength: 9_999 });
    expect(() => inspectGlb(glb)).toThrow(/truncated or was modified/);
  });

  it("rejects a JSON chunk that runs past the end of the file", () => {
    const glb = buildGlb();
    // Chunk length lives at byte 12, immediately after the 12-byte header.
    glb.writeUInt32LE(glb.byteLength, 12);
    expect(() => inspectGlb(glb)).toThrow(/truncated/);
  });

  it("rejects a model with no meshes", () => {
    const glb = buildGlb({ asset: { version: "2.0" }, meshes: [] });
    expect(() => inspectGlb(glb)).toThrow(/no meshes/);
  });

  it("rejects a model with no JSON chunk", () => {
    const empty = Buffer.alloc(20);
    empty.writeUInt32LE(GLB_MAGIC, 0);
    empty.writeUInt32LE(2, 4);
    empty.writeUInt32LE(20, 8);
    empty.writeUInt32LE(0, 12);
    empty.writeUInt32LE(0x004e4942, 16);
    expect(() => inspectGlb(empty)).toThrow(/no glTF metadata chunk/);
  });

  it("rejects a file too small to be a GLB", () => {
    expect(() => inspectGlb(Buffer.from("glTF"))).toThrow(/too small/);
  });

  it("rejects a model above the triangle budget", () => {
    const heavy = {
      asset: { version: "2.0" },
      meshes: [{ primitives: [{ indices: 0 }] }],
      accessors: [{ count: (MAX_MODEL_TRIANGLES + 1) * 3 }],
    };
    expect(() => inspectGlb(buildGlb(heavy))).toThrow(/triangles/);
  });

  it("treats a missing triangle count as zero rather than failing", () => {
    const glb = buildGlb({
      asset: { version: "2.0" },
      meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    });
    expect(inspectGlb(glb).triangles).toBe(0);
  });
});

describe("model storage paths", () => {
  it("puts the file under the venue and version", () => {
    expect(modelStoragePath(VENUE_ID, 3)).toBe(`venue-models/${VENUE_ID}/3/model.glb`);
    expect(modelPreviewPath(VENUE_ID, 3)).toBe(`venue-models/${VENUE_ID}/3/preview.webp`);
  });

  it("rejects anything that is not a UUID as a venue id", () => {
    expect(() => modelStoragePath("../../etc", 1)).toThrow(ModelValidationError);
    expect(() => modelStoragePath("not-a-venue", 1)).toThrow(/Unknown venue/);
    expect(() => modelPreviewPath("", 1)).toThrow(/Unknown venue/);
  });

  it("rejects versions that are not positive integers", () => {
    for (const version of [0, -1, 1.5, Number.NaN]) {
      expect(() => modelStoragePath(VENUE_ID, version)).toThrow(/Invalid model version/);
    }
  });
});
