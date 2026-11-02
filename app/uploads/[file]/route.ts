import { getUpload } from "@/lib/db";

// Serves photos uploaded in the admin panel and the driver app (car photos,
// company logo, meter and receipt photos) from the "uploads" store (data/uploads
// locally, Redis on Vercel). Files are named by random UUID and never change,
// so they cache forever.

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const match = /^[a-f0-9-]{36}\.(jpg|png|webp)$/.exec(file);
  if (!match) return new Response("Not found", { status: 404 });

  const bytes = await getUpload("uploads", file);
  if (!bytes) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": TYPES[match[1]],
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
