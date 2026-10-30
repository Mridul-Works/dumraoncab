import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import LoginForm from "@/components/admin/LoginForm";
import { isAuthed } from "@/lib/adminAuth";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Sign in" };

// Figma "Flow 1 · Sign in" (1.1 default · 1.2 wrong password · 1.3 signing in).
export default async function AdminLoginPage() {
  if (await isAuthed()) redirect("/admin");

  return (
    <section className="flex min-h-screen flex-col items-center justify-center gap-5 bg-gray-50 px-4 py-16">
      <div className="w-full max-w-[440px] rounded-xl border border-gray-100 bg-layer p-6 shadow-[0_8px_24px_0_var(--shadow-sm)] sm:p-9">
        <span className="grid size-11 place-items-center rounded-lg bg-brand type-h4 text-inverse">DC</span>
        <h1 className="mt-5 type-h3 text-primary">Admin sign in</h1>
        <p className="type-body-sm text-secondary">{site.name} staff only.</p>
        <LoginForm />
      </div>
      <Link href="/" className="type-ui text-secondary hover:text-link-hover">
        ← Back to {site.name}
      </Link>
    </section>
  );
}
