import { promises as fs } from "fs";
import path from "path";
import { DATA_DIR } from "@/lib/db";

// Serves car photos uploaded in the admin panel (saved under data/uploads).
// Files are named by random UUID and never change, so they cache forever.

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const match = /^[a-f0-9-]{36}\.(jpg|png|webp)$/.exec(file);
  if (!match) return new Response("Not found", { status: 404 });

  try {
    const bytes = await fs.readFile(path.join(DATA_DIR, "uploads", file));
    return new Response(bytes, {
      headers: {
        "Content-Type": TYPES[match[1]],
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
