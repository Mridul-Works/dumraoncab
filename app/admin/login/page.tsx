import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginForm from "@/components/admin/LoginForm";
import { adminPageName } from "@/components/admin/navStyles";
import { isAuthed, lockedUntil, pausedMessage, safeNext } from "@/lib/adminAuth";
import AuthShell from "./AuthShell";

export const metadata: Metadata = { title: "Sign in" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

// "12h" → "12 hours", "7d" → "7 days" (how long the session that just ended lasted).
function lasted(after: string | undefined): string {
  const m = after?.match(/^(\d{1,3})([hd])$/);
  if (!m) return "";
  const n = Number(m[1]);
  return `${n} ${m[2] === "h" ? "hour" : "day"}${n === 1 ? "" : "s"}`;
}

// Figma "Flow 1 · Sign in": 1.1 default · 1.2 wrong password · 1.3 signing in ·
// 1.7 sign in again (/admin/login?next=/admin/bookings/new) · 1.8 paused · 1.9 offline.
export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const next = safeNext(one(params.next));
  if (await isAuthed()) redirect(next || "/admin");

  let title = "Welcome back";
  let subtitle = "Sign in to manage today’s bookings, cars and fares.";
  if (next) {
    const page = adminPageName(next);
    const after = lasted(one(params.after));
    title = "Sign in again";
    subtitle = `You were signed out${after ? ` after ${after}` : ""}. After you sign in, you go back to ${
      one(params.draft) === "1" ? `${page} with your draft` : page
    }.`;
  }

  const until = await lockedUntil();

  return (
    <AuthShell>
      <LoginForm
        title={title}
        subtitle={subtitle}
        next={next}
        initial={until ? { error: pausedMessage(until), lockedUntil: until } : undefined}
      />
    </AuthShell>
  );
}
