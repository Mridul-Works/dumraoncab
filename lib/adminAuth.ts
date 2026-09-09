import { cookies } from "next/headers";
import { createHash } from "crypto";

// Set ADMIN_PASSWORD in .env.local (or the host's env) before going live.
// The default below exists only so local development works out of the box.
const PASSWORD = process.env.ADMIN_PASSWORD || "dumraon123";

export const ADMIN_COOKIE = "dc_admin";

export function adminToken(): string {
  return createHash("sha256").update(`dumraon-cab:${PASSWORD}`).digest("hex");
}

export function passwordMatches(candidate: string): boolean {
  return typeof candidate === "string" && candidate === PASSWORD;
}

export async function isAuthed(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(ADMIN_COOKIE)?.value === adminToken();
}
