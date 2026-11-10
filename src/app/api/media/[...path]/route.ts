import { readLocalPhoto } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const storagePath = segments.map((segment) => decodeURIComponent(segment)).join("/");

  if (
    !storagePath.startsWith("venues/") ||
    storagePath.includes("..") ||
    storagePath.includes("\\") ||
    storagePath.length > 500
  ) {
    return new Response("Not found", { status: 404 });
  }

  const buffer = await readLocalPhoto(storagePath);
  if (!buffer) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
