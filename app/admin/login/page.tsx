import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import LoginForm from "@/components/admin/LoginForm";
import { isAuthed } from "@/lib/adminAuth";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Sign in" };

export default async function AdminLoginPage() {
  if (await isAuthed()) redirect("/admin");

  return (
    <section className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-line bg-white p-7 shadow-card">
          <span className="grid size-11 place-items-center rounded-xl bg-night font-display text-lg font-semibold text-white">
            DC
          </span>
          <h1 className="mt-4 font-display text-xl font-semibold text-ink">Admin sign in</h1>
          <p className="mt-1 text-sm text-khaki">{site.name} staff only.</p>
          <LoginForm />
        </div>
        <p className="mt-4 text-center text-xs text-sand">
          <Link href="/" className="hover:text-amberdeep">
            ← Back to {site.name}
          </Link>
        </p>
      </div>
    </section>
  );
}
