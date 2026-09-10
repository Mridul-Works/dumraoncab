"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const password = new FormData(e.currentTarget).get("password");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      router.refresh();
    } else {
      setError("Wrong password. Try again.");
    }
  }

  return (
    <section className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center px-5 py-16">
      <div className="rounded-2xl border border-line bg-white p-7 shadow-sm">
        <span className="grid size-11 place-items-center rounded-xl bg-night font-display text-lg font-semibold text-white">
          DC
        </span>
        <h1 className="mt-4 font-display text-xl font-semibold text-ink">Admin login</h1>
        <p className="mt-1 text-sm text-khaki">For Dumraon Cab Service staff only.</p>
        <form onSubmit={handleSubmit} className="mt-5">
          <label htmlFor="admin-pass" className="mb-1.5 block text-sm font-semibold text-ink">
            Password
          </label>
          <input
            id="admin-pass"
            name="password"
            type="password"
            required
            autoFocus
            autoComplete="current-password"
            className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-[15px] text-ink focus:border-amber focus:outline-none"
          />
          {error && (
            <p className="mt-2 text-sm font-semibold text-red-600" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="mt-4 w-full rounded-full bg-night px-6 py-3 font-bold text-white transition-colors hover:bg-coal disabled:opacity-60"
          >
            {busy ? "Checking…" : "Sign in"}
          </button>
        </form>
      </div>
    </section>
  );
}
