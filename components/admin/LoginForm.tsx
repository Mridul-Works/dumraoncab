"use client";

import { useActionState } from "react";
import { login } from "@/app/admin/actions";
import Icon from "@/components/admin/Icon";
import { btnPrimary, inputCls, labelCls } from "@/components/admin/ui";

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="flex flex-col gap-4 pt-5">
      <div>
        <label htmlFor="admin-email" className={labelCls}>
          Email
        </label>
        {/* React resets the form after each attempt; defaultValue keeps the email typed. */}
        <input
          id="admin-email"
          name="email"
          type="email"
          required
          autoFocus
          autoComplete="username"
          defaultValue={state?.email}
          aria-describedby={state?.error ? "admin-login-error" : undefined}
          className={inputCls}
        />
      </div>
      <div>
        <label htmlFor="admin-pass" className={labelCls}>
          Password
        </label>
        <input
          id="admin-pass"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          aria-describedby={state?.error ? "admin-login-error" : undefined}
          className={inputCls}
        />
      </div>
      {state?.error && (
        <p id="admin-login-error" className="flex items-center gap-2 rounded-md border-l-2 border-[var(--support-error)] bg-tag-red px-3 py-2.5 type-ui text-error" role="alert">
          <Icon name="warning-circle" size={16} />
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={`${btnPrimary} w-full py-3.25 disabled:opacity-60`}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
