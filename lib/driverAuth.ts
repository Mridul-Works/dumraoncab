import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { promises as fs } from "fs";
import path from "path";
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "crypto";
import { DATA_DIR, jsonFile } from "./db";

// Driver app sign-in (Figma 10.2–10.4): mobile number + 6-digit one-time code.
//
// There is no SMS provider in this project, so the code is delivered honestly:
//  - development: printed to the server console and shown on the code screen
//    in a small "Dev only" note;
//  - production: POSTed as JSON { mobile, code } to DRIVER_OTP_WEBHOOK (your SMS
//    gateway or a small relay). Without it, sign-in shows "SMS is not set up".
// Only a hash of the code is stored (data/driver-otp.json), with an expiry.
// Sessions are an HMAC-signed httpOnly cookie. The key is DRIVER_SESSION_SECRET,
// or a random key created once and kept in data/driver-secret.key.

export const DRIVER_COOKIE = "dc_driver";
const SESSION_DAYS = 30;
const CODE_MINUTES = 10;
const RESEND_SECONDS = 30;
export const MAX_TRIES = 3; // Figma 10.4: after 3 wrong tries a new code is needed
const MAX_SENDS_PER_HOUR = 5;

const isDev = process.env.NODE_ENV !== "production";
const WEBHOOK = process.env.DRIVER_OTP_WEBHOOK || "";

// Last 10 digits of an Indian mobile number, or "" when it isn't one.
export function mobileDigits(input: string): string {
  const d = input.replace(/\D/g, "");
  const ten = d.length === 12 && d.startsWith("91") ? d.slice(2) : d.length === 11 && d.startsWith("0") ? d.slice(1) : d;
  return /^[6-9]\d{9}$/.test(ten) ? ten : "";
}

// "9835122408" → "+91 98351 22408"
export const showMobile = (ten: string) => `+91 ${ten.slice(0, 5)} ${ten.slice(5)}`;

/* ------------------------------- secrets ------------------------------- */

let cachedKey: Buffer | null = null;

async function sessionKey(): Promise<Buffer> {
  if (cachedKey) return cachedKey;
  const env = process.env.DRIVER_SESSION_SECRET;
  if (env) {
    cachedKey = createHash("sha256").update(`dc-driver:${env}`).digest();
    return cachedKey;
  }
  const file = path.join(DATA_DIR, "driver-secret.key");
  try {
    const saved = (await fs.readFile(file, "utf8")).trim();
    if (saved.length >= 64) cachedKey = Buffer.from(saved, "hex");
  } catch {
    // first run
  }
  if (!cachedKey) {
    const fresh = randomBytes(32);
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      // "wx": never overwrite a key another request just wrote.
      await fs.writeFile(file, fresh.toString("hex"), { encoding: "utf8", flag: "wx", mode: 0o600 });
      cachedKey = fresh;
    } catch {
      cachedKey = Buffer.from((await fs.readFile(file, "utf8")).trim(), "hex");
    }
  }
  return cachedKey;
}

const hmac = (key: Buffer, s: string) => createHmac("sha256", key).update(s).digest("base64url");

function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

/* --------------------------------- codes --------------------------------- */

type OtpRecord = {
  hash: string; // HMAC of mobile:code
  expires: number; // ms
  tries: number; // wrong tries so far
  sentAt: number; // ms, for the resend timer
  sends: number[]; // ms of recent sends (rate limit)
};

const otpDb = jsonFile<Record<string, OtpRecord>>("driver-otp.json", () => ({}));

export type SendResult =
  | { ok: true; devCode?: string; resendIn: number }
  | { ok: false; error: string; resendIn?: number };

async function deliver(mobile: string, code: string): Promise<string | null> {
  if (WEBHOOK) {
    try {
      const res = await fetch(WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: `+91${mobile}`, code }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return "We could not send the SMS. Try again in a minute.";
      return null;
    } catch {
      return "We could not send the SMS. Try again in a minute.";
    }
  }
  if (isDev) {
    console.log(`[driver-app] Sign-in code for +91 ${mobile}: ${code} (dev only — set DRIVER_OTP_WEBHOOK to send real SMS)`);
    return null;
  }
  return "SMS is not set up yet, so we can't send a code. Please call the office.";
}

export async function sendCode(input: string): Promise<SendResult> {
  const mobile = mobileDigits(input);
  if (!mobile) return { ok: false, error: "Enter a 10-digit Indian mobile number." };

  const now = Date.now();
  const prev = (await otpDb.read())[mobile];
  if (prev && now - prev.sentAt < RESEND_SECONDS * 1000) {
    return { ok: false, error: "A code was just sent. Wait a few seconds.", resendIn: Math.ceil((prev.sentAt + RESEND_SECONDS * 1000 - now) / 1000) };
  }
  const recent = (prev?.sends ?? []).filter((t) => now - t < 60 * 60 * 1000);
  if (recent.length >= MAX_SENDS_PER_HOUR) return { ok: false, error: "Too many codes asked for this number. Try again in an hour." };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const failed = await deliver(mobile, code);
  if (failed) return { ok: false, error: failed };

  const key = await sessionKey();
  await otpDb.mutate((all) => {
    // Drop long-expired records so the file stays small.
    for (const [m, r] of Object.entries(all)) if (r.expires < now - 24 * 60 * 60 * 1000) delete all[m];
    all[mobile] = { hash: hmac(key, `${mobile}:${code}`), expires: now + CODE_MINUTES * 60 * 1000, tries: 0, sentAt: now, sends: [...recent, now] };
  });
  return { ok: true, resendIn: RESEND_SECONDS, ...(isDev && !WEBHOOK ? { devCode: code } : {}) };
}

export type VerifyResult = { ok: true } | { ok: false; error: string; triesLeft: number };

export async function verifyCode(input: string, code: string): Promise<VerifyResult> {
  const mobile = mobileDigits(input);
  if (!mobile || !/^\d{6}$/.test(code)) return { ok: false, error: "Enter the 6-digit code.", triesLeft: MAX_TRIES };
  const key = await sessionKey();
  const now = Date.now();

  const result = await otpDb.mutate((all): VerifyResult => {
    const r = all[mobile];
    if (!r || r.tries >= MAX_TRIES) return { ok: false, error: "This code can’t be used any more. Send a new code.", triesLeft: 0 };
    if (r.expires < now) return { ok: false, error: "This code has expired. Send a new code.", triesLeft: 0 };
    if (!safeEqual(r.hash, hmac(key, `${mobile}:${code}`))) {
      r.tries += 1;
      const left = MAX_TRIES - r.tries;
      return {
        ok: false,
        error: left > 0 ? `Code did not match. ${left} ${left === 1 ? "try" : "tries"} left.` : "Code did not match. Send a new code.",
        triesLeft: left,
      };
    }
    delete all[mobile];
    return { ok: true };
  });
  // Slow down guessing a little.
  if (!result.ok) await new Promise((r) => setTimeout(r, 600));
  return result;
}

// Seconds until another code may be sent (code screen timer).
export async function resendWait(input: string): Promise<number> {
  const r = (await otpDb.read())[mobileDigits(input)];
  return r ? Math.max(0, Math.ceil((r.sentAt + RESEND_SECONDS * 1000 - Date.now()) / 1000)) : 0;
}

/* -------------------------------- sessions -------------------------------- */

export type DriverSession = { mobile: string }; // 10 digits

export async function startDriverSession(mobile: string): Promise<void> {
  const payload = Buffer.from(JSON.stringify({ m: mobile, exp: Date.now() + SESSION_DAYS * 86400000 })).toString("base64url");
  const token = `${payload}.${hmac(await sessionKey(), payload)}`;
  (await cookies()).set(DRIVER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function endDriverSession(): Promise<void> {
  (await cookies()).delete(DRIVER_COOKIE);
}

export async function getDriverSession(): Promise<DriverSession | null> {
  const token = (await cookies()).get(DRIVER_COOKIE)?.value;
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig || !safeEqual(sig, hmac(await sessionKey(), payload))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof data?.exp !== "number" || data.exp < Date.now() || !mobileDigits(String(data.m))) return null;
    return { mobile: mobileDigits(String(data.m)) };
  } catch {
    return null;
  }
}

// Driver pages and actions: bounce to Welcome when signed out.
export async function requireDriverSession(): Promise<DriverSession> {
  const s = await getDriverSession();
  if (!s) redirect("/driver/welcome");
  return s;
}
