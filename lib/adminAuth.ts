import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, createHmac, timingSafeEqual } from "crypto";

// Admin credentials come from the environment — set them in .env.local locally
// and in the host's environment in production:
//   ADMIN_EMAIL=admin@dumraoncab.com
//   ADMIN_PASSWORD=...
//   ADMIN_SESSION_SECRET=...   (optional; long random string)
// With no ADMIN_PASSWORD set, login is disabled rather than falling back to a default.
const EMAIL = (process.env.ADMIN_EMAIL || "admin@dumraoncab.com").trim().toLowerCase();
const PASSWORD = process.env.ADMIN_PASSWORD || "";
// Derived from the credentials when no explicit secret is set, so changing the
// password also signs every existing session out.
const SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  createHash("sha256").update(`dumraon-cab-session:${EMAIL}:${PASSWORD}`).digest("hex");

export const ADMIN_COOKIE = "dc_admin";
const SESSION_DAYS = 7;

export type AdminSession = { email: string };

export function adminConfigured(): boolean {
  return PASSWORD.length > 0;
}

// Constant-time compare for strings of any length.
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function credentialsMatch(email: string, password: string): boolean {
  if (!adminConfigured()) return false;
  const emailOk = safeEqual(email.trim().toLowerCase(), EMAIL);
  const passwordOk = safeEqual(password, PASSWORD);
  return emailOk && passwordOk;
}

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

function sessionToken(email: string): string {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ email, exp })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export async function startSession(email: string): Promise<void> {
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, sessionToken(email.trim().toLowerCase()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token || !adminConfigured()) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof data?.exp !== "number" || data.exp < Date.now() || data.email !== EMAIL) return null;
    return { email: data.email };
  } catch {
    return null;
  }
}

export async function isAuthed(): Promise<boolean> {
  return (await getAdminSession()) !== null;
}

// For admin pages and Server Actions: bounce to the login screen when signed out.
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}
