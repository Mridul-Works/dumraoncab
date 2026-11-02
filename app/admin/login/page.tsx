import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginForm from "@/components/admin/LoginForm";
import { isAuthed } from "@/lib/adminAuth";
import AuthShell from "./AuthShell";

export const metadata: Metadata = { title: "Sign in" };

// Figma "Flow 1 · Sign in" (1.1 default · 1.2 wrong password · 1.3 signing in).
export default async function AdminLoginPage() {
  if (await isAuthed()) redirect("/admin");

  return (
    <AuthShell>
      <div className="flex flex-col gap-1">
        <h1 className="type-h2 text-primary">Welcome back</h1>
        <p className="type-body-md text-secondary">Sign in to manage today’s bookings, cars and fares.</p>
      </div>
      <LoginForm />
    </AuthShell>
  );
}
