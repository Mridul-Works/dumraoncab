"use client";

import { useActionState } from "react";
import { login } from "@/app/admin/actions";

const input =
  "w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-[15px] text-ink focus:border-amber focus:outline-none";

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="mt-5 space-y-4">
      <div>
        <label htmlFor="admin-email" className="mb-1.5 block text-sm font-semibold text-ink">
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
          className={input}
        />
      </div>
      <div>
        <label htmlFor="admin-pass" className="mb-1.5 block text-sm font-semibold text-ink">
          Password
        </label>
        <input id="admin-pass" name="password" type="password" required autoComplete="current-password" className={input} />
      </div>
      {state?.error && (
        <p className="text-sm font-semibold text-red-600" role="alert">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-night px-6 py-3 font-bold text-white transition-colors hover:bg-coal disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
