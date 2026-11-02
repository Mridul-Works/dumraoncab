import { promises as fs } from "fs";
import path from "path";
import { getAdminSession } from "@/lib/adminAuth";
import { VENDOR_DOC_DIR, VENDOR_DOC_MIME, VENDOR_DOC_NAME } from "@/lib/vendorDocs";

// Private vendor documents (Aadhaar, licence, RC …). Staff only: signed-out
// requests get 404 so the URL doesn't even confirm a file exists.

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  if (!(await getAdminSession())) return new Response("Not found", { status: 404 });
  const { file } = await params;
  const match = VENDOR_DOC_NAME.exec(file);
  if (!match) return new Response("Not found", { status: 404 });

  try {
    const bytes = await fs.readFile(path.join(VENDOR_DOC_DIR, file));
    return new Response(bytes, {
      headers: {
        "Content-Type": VENDOR_DOC_MIME[match[1]],
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
