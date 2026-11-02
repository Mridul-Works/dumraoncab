"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { login } from "@/app/admin/actions";
import Icon from "@/components/admin/Icon";
import { btnPrimary } from "@/components/admin/ui";

// Figma 1.1 Sign in · 1.2 wrong password · 1.3 signing in.
// Field: 1px Gray/200 border, 8px radius, 18px leading icon (Figma "Input").
const fieldCls =
  "flex w-full items-center gap-2 rounded-md border border-gray-200 bg-layer px-3.5 py-2.5 focus-within:border-focus focus-within:ring-2 focus-within:ring-focus/20 has-[[aria-invalid=true]]:border-negative";
const inputCls = "min-w-0 flex-1 bg-transparent type-body-sm text-primary placeholder:text-placeholder focus:outline-none";

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  const [show, setShow] = useState(false);
  const error = state?.error;

  return (
    <form action={action} className="flex flex-col gap-5">
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

      <button type="submit" disabled={pending} className={`${btnPrimary.replace("disabled:opacity-40", "disabled:opacity-85")} w-full disabled:cursor-wait`}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
