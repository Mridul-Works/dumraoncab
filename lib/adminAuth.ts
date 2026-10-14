import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, createHmac, scryptSync, timingSafeEqual } from "crypto";

// Admin login works with no setup. This repo is public, so nothing here may let
// someone who reads the code sign in or forge a session:
//  - the built-in password is stored only as a slow scrypt hash ("salt:hash");
//  - without ADMIN_SESSION_SECRET, sessions are signed with a key derived from the
//    password at login, and only a SHA-256 check value of that key is committed.
// Environment variables override the built-ins (recommended in production):
//   ADMIN_EMAIL=admin@dumraoncab.com
//   ADMIN_PASSWORD=...          (plain password; takes priority over the hash)
//   ADMIN_SESSION_SECRET=...    (long random string)
const EMAIL = (process.env.ADMIN_EMAIL || "admin@dumraoncab.com").trim().toLowerCase();
const PASSWORD = process.env.ADMIN_PASSWORD || "";
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || "";

const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const BUILTIN_SALT = "897d05de121838175d16f4ef65f7fd84";
const BUILTIN_HASH = "e59489c8dc52866dbf593bcb7749ef85dcb1b52042e90151149de1d1115aafc4";
// sha256(scrypt(password, "session:" + salt)) — lets us recognise the session key without storing it.
const BUILTIN_KEY_CHECK = "1e312a7c63cbdb5971c5d6ef8d6e4c96d1c710655850734e1602c6452ad2ea62";

export const ADMIN_COOKIE = "dc_admin";
const SESSION_DAYS = 7;

export type AdminSession = { email: string };

// Constant-time compare for strings of any length.
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

function passwordOk(candidate: string): boolean {
  if (PASSWORD) return safeEqual(candidate, PASSWORD);
  const actual = scryptSync(candidate, BUILTIN_SALT, 32, SCRYPT);
  return timingSafeEqual(actual, Buffer.from(BUILTIN_HASH, "hex"));
}

export function credentialsMatch(email: string, password: string): boolean {
  const emailOk = safeEqual(email.trim().toLowerCase(), EMAIL);
  const passOk = passwordOk(password);
  return emailOk && passOk;
}

/* --------------------------------- sessions --------------------------------- */
// Token: payload.signature            when a server-side key exists (env secret or env password)
//        payload.signature.sessionKey when relying on the built-in hash (key checked against BUILTIN_KEY_CHECK)

// Signing key the server can produce on its own, or null if it has none.
function serverKey(): Buffer | null {
  if (SESSION_SECRET) return createHash("sha256").update(`dc-session:${SESSION_SECRET}`).digest();
  // Changing the password changes this key, signing every session out.
  if (PASSWORD) return createHash("sha256").update(`dc-session:${EMAIL}:${PASSWORD}`).digest();
  return null;
}

function sign(key: Buffer, payload: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

function sessionToken(email: string, password: string): string {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ email, exp })).toString("base64url");
  const key = serverKey();
  if (key) return `${payload}.${sign(key, payload)}`;
  const derived = scryptSync(password, `session:${BUILTIN_SALT}`, 32, SCRYPT);
  return `${payload}.${sign(derived, payload)}.${derived.toString("base64url")}`;
}

// Call only after credentialsMatch() succeeded.
export async function startSession(email: string, password: string): Promise<void> {
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, sessionToken(email.trim().toLowerCase(), password), {
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
  if (!token) return null;
  const [payload, sig, sessionKey] = token.split(".");
  if (!payload || !sig) return null;

  let key = serverKey();
  if (!key) {
    if (!sessionKey) return null;
    key = Buffer.from(sessionKey, "base64url");
    if (!safeEqual(createHash("sha256").update(key).digest("hex"), BUILTIN_KEY_CHECK)) return null;
  } else if (sessionKey) {
    return null;
  }
  if (!safeEqual(sig, sign(key, payload))) return null;

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
