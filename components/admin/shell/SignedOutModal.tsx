"use client";

/* eslint-disable @next/next/no-img-element -- static line-art SVG from the design */
import { useEffect, useRef, useState } from "react";
import { btnPrimary } from "@/components/admin/ui";

// Figma 1.6 "Signed out · draft kept": the moment the session ends, the page is
// covered by this dialog. Nothing on the page is lost (the New booking form keeps
// its draft in this browser); "Sign in again" opens 1.7 with ?next= so sign-in
// lands back on the same page.

// Same key as components/admin/NewBookingForm.tsx (DRAFT_KEY).
const NEW_BOOKING_DRAFT = "admin:new-booking-draft";
// setTimeout can't wait longer than ~24.8 days.
const MAX_WAIT = 2_147_000_000;

// "12 hours" / "7 days" and the matching ?after= value.
function length(ms: number): { words: string; code: string } | null {
  const h = Math.round(ms / 3_600_000);
  if (h <= 0) return null;
  if (h % 24 === 0) return { words: `${h / 24} day${h === 24 ? "" : "s"}`, code: `${h / 24}d` };
  return { words: `${h} hour${h === 1 ? "" : "s"}`, code: `${h}h` };
}

type Shown = { draftFor: string | null; href: string };

export default function SignedOutModal({ exp, iat }: { exp: number; iat: number }) {
  const [shown, setShown] = useState<Shown | null>(null);
  const button = useRef<HTMLAnchorElement>(null);
  const span = iat ? length(exp - iat) : null;

  useEffect(() => {
    const code = iat ? length(exp - iat)?.code : undefined;
    const open = () => {
      const path = window.location.pathname + window.location.search;
      // The draft only matters on New booking; "" = a draft without a name yet.
      let draftFor: string | null = null;
      if (window.location.pathname.replace(/\/+$/, "") === "/admin/bookings/new") {
        try {
          const raw = localStorage.getItem(NEW_BOOKING_DRAFT);
          if (raw) draftFor = String((JSON.parse(raw) as { f?: { name?: string } }).f?.name ?? "").trim();
        } catch {}
      }
      const q = new URLSearchParams({ next: path });
      if (code) q.set("after", code);
      if (draftFor !== null) q.set("draft", "1");
      setShown({ draftFor, href: `/admin/login?${q}` });
    };
    const check = () => {
      if (Date.now() >= exp) open();
    };
    // Fires on time while the tab is open; the focus/visibility checks cover a
    // sleeping laptop or a tab left in the background.
    const t = setTimeout(check, Math.min(Math.max(0, exp - Date.now()) + 1000, MAX_WAIT));
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearTimeout(t);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [exp, iat]);

  useEffect(() => {
    if (!shown) return;
    button.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [shown]);

  if (!shown) return null;

  const draft =
    shown.draftFor === null
      ? ""
      : shown.draftFor
        ? ` Your new booking for ${shown.draftFor} is kept on this computer.`
        : " Your new booking is kept on this computer.";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto p-4">
      <div aria-hidden="true" className="fixed inset-0 bg-scrim [animation:fade_.15s_ease-out]" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="signed-out-title"
        aria-describedby="signed-out-body"
        className="relative my-auto flex w-full max-w-[480px] flex-col items-center gap-2 rounded-lg bg-layer px-6 pb-7 pt-6 text-center shadow-[0_16px_48px_0_var(--shadow-md)] [animation:pop_.15s_ease-out] sm:px-8"
      >
        <img src="/admin-illustrations/signed-out.svg" alt="" width={192} height={128} className="max-w-full" />
        <h2 id="signed-out-title" className="type-h3 text-primary">
          You were signed out
        </h2>
        <p id="signed-out-body" className="type-body-sm text-secondary">
          For safety the admin signs you out{span ? ` after ${span.words}` : " after a while"}.{draft} Sign in and you come straight back here.
        </p>
        <div className="flex pt-4">
          <a ref={button} href={shown.href} className={btnPrimary}>
            Sign in again
          </a>
        </div>
      </div>
    </div>
  );
}
