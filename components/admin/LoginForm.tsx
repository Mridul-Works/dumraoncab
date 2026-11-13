"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { login } from "@/app/admin/actions";
import Icon from "@/components/admin/Icon";
import { btnPrimary } from "@/components/admin/ui";
import type { LoginState } from "@/lib/adminAuth";

// Figma "Flow 1 · Sign in": 1.1 default · 1.2 wrong password · 1.3 signing in ·
// 1.7 sign in again (title/subtitle from the page) · 1.8 too many tries, paused ·
// 1.9 no connection.
// Field: 1px Gray/200 border, 8px radius, 18px leading icon (Figma "Input").
const fieldCls =
  "flex w-full items-center gap-2 rounded-md border border-gray-200 bg-layer px-3.5 py-2.5 focus-within:border-focus focus-within:ring-2 focus-within:ring-focus/20 has-[[aria-invalid=true]]:border-negative";
const inputCls = "min-w-0 flex-1 bg-transparent type-body-sm text-primary placeholder:text-placeholder focus:outline-none";
// Primary button without its own disabled fade: 1.3 "Signing in…" sits at 85%, 1.8 paused at 50%.
const submitCls = `${btnPrimary.replace("disabled:opacity-40", "")} w-full`;

// "10:05 AM" in office time, the same on the server and in the browser.
const clock = (ms: number) =>
  new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });

export default function LoginForm({
  title,
  subtitle,
  next = "",
  initial,
}: {
  title: string;
  subtitle: string;
  next?: string;
  initial?: LoginState; // 1.8 on page load when this address is already paused
}) {
  const [offline, setOffline] = useState(false);
  const [state, action, pending] = useActionState(async (prev: LoginState, fd: FormData): Promise<LoginState> => {
    try {
      return await login(prev, fd);
    } catch (e) {
      // 1.9: the request never reached the server — nothing checked, no try used up.
      if (e instanceof TypeError) {
        setOffline(true);
        return { email: String(fd.get("email") ?? "") };
      }
      throw e;
    }
  }, initial);
  const [show, setShow] = useState(false);

  // 1.8: paused until `until`; the button wakes up by itself when the time comes.
  const until = state?.lockedUntil ?? 0;
  const [woke, setWoke] = useState(0);
  useEffect(() => {
    if (!until) return;
    const t = setTimeout(() => setWoke(until), Math.max(0, until - Date.now()));
    return () => clearTimeout(t);
  }, [until]);
  const paused = until > 0 && woke !== until;
  const error = offline || (until && !paused) ? undefined : state?.error;

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="type-h2 text-primary">{title}</h1>
        <p className="type-body-md text-secondary">{paused ? "For safety, sign-in is paused after 5 wrong passwords." : subtitle}</p>
      </div>

      {offline && (
        // Figma "Notice", amber.
        <div role="alert" className="flex items-start gap-2.5 rounded-md bg-tag-amber px-3.5 py-3">
          <Icon name="warning-circle" size={20} className="text-tag-amber" />
          <div className="min-w-0 flex-1">
            <p className="type-body-sm text-tag-amber">No connection</p>
            <p className="type-ui text-primary">Check your internet and press Sign in again. Your email is kept.</p>
          </div>
        </div>
      )}

      <form
        action={action}
        onSubmit={(e) => {
          // 1.9: offline — keep everything typed and send nothing.
          if (typeof navigator !== "undefined" && navigator.onLine === false) {
            e.preventDefault();
            setOffline(true);
            return;
          }
          setOffline(false);
        }}
        className="flex flex-col gap-5"
      >
        {next && <input type="hidden" name="next" value={next} />}
        {/* 1.3: fields fade and lock while the server checks the details. */}
        <fieldset disabled={pending} className="flex flex-col gap-5 disabled:opacity-60">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="admin-email" className="type-ui text-primary">
              Email
            </label>
            <div className={fieldCls}>
              <Icon name="envelope-simple" size={18} className="text-[var(--icon-secondary)]" />
              {/* React resets the form after each attempt; defaultValue keeps the email typed (1.2). */}
              <input
                id="admin-email"
                name="email"
                type="email"
                required
                autoFocus
                autoComplete="username"
                placeholder="you@dumraoncab.com"
                defaultValue={state?.email}
                className={inputCls}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="admin-pass" className="type-ui text-primary">
              Password
            </label>
            <div className={fieldCls}>
              <Icon name="lock" size={18} className="text-[var(--icon-secondary)]" />
              <input
                id="admin-pass"
                name="password"
                type={show ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="Your password"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "admin-login-error" : undefined}
                className={inputCls}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide password" : "Show password"}
                aria-pressed={show}
                className="grid shrink-0 place-items-center rounded-sm text-[var(--icon-primary)]"
              >
                <Icon name={show ? "eye" : "eye-slash"} size={18} />
              </button>
            </div>
            {error && (
              <p id="admin-login-error" role="alert" className="type-body-sm text-error">
                {error}
              </p>
            )}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 type-body-sm text-primary">
            <input type="checkbox" name="remember" defaultChecked className="peer sr-only" />
            {/* Figma Checkbox: Background/Brand fill + white check; unchecked = Layer/01 with Gray/200 border. */}
            <span className="grid size-[18px] shrink-0 place-items-center rounded-sm border border-gray-200 bg-layer text-on-color peer-checked:border-brand peer-checked:bg-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus peer-checked:[&>span]:opacity-100">
              <Icon name="check-12" size={12} className="opacity-0" />
            </span>
            Keep me signed in
          </label>
          <Link href="/admin/login/forgot" className="type-body-sm text-link hover:text-link-hover">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={pending || paused}
          className={`${submitCls} ${pending ? "disabled:cursor-wait disabled:opacity-85" : "disabled:opacity-50"}`}
        >
          {pending ? "Signing in…" : paused ? `Try again at ${clock(until)}` : "Sign in"}
        </button>
      </form>
    </>
  );
}
