import { readLocalUpload } from "@/lib/storage";

export const runtime = "nodejs";

const TYPES: Record<string, string> = {
  glb: "model/gltf-binary",
  webp: "image/webp",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const storagePath = segments.map((segment) => decodeURIComponent(segment)).join("/");

  if (
    !storagePath.startsWith("venue-models/") ||
    storagePath.includes("..") ||
    storagePath.includes("\\") ||
    storagePath.length > 500
  ) {
    return new Response("Not found", { status: 404 });
  }

  const extension = storagePath.split(".").pop()?.toLowerCase() ?? "";
  const contentType = TYPES[extension];
  if (!contentType) return new Response("Not found", { status: 404 });

  const buffer = await readLocalUpload(storagePath);
  if (!buffer) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
