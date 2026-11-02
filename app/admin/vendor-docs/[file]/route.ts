import { getUpload } from "@/lib/db";
import { getAdminSession } from "@/lib/adminAuth";
import { VENDOR_DOC_MIME, VENDOR_DOC_NAME } from "@/lib/vendorDocs";

// Private vendor documents (Aadhaar, licence, RC …). Staff only: signed-out
// requests get 404 so the URL doesn't even confirm a file exists.

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  if (!(await getAdminSession())) return new Response("Not found", { status: 404 });
  const { file } = await params;
  const match = VENDOR_DOC_NAME.exec(file);
  if (!match) return new Response("Not found", { status: 404 });

  const bytes = await getUpload("vendor-docs", file);
  if (!bytes) return new Response("Not found", { status: 404 });
  {
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": VENDOR_DOC_MIME[match[1]],
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      },
    });
  }
}
