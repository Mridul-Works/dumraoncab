import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

export const metadata: Metadata = { title: "Page not found" };

// Addresses the Figma admin map uses for a page that lives under another path.
// "/admin/daily-diary" is the Daily Diary (4B), served at /admin/journal.
const ALIASES: Record<string, string> = {
  "daily-diary": "/admin/journal",
};

// Any /admin/* address that matches no admin page (an old bookmark or a typo
// like /admin/dashbord) shows Figma 1.4 inside the admin shell. Real routes
// always win over this catch-all; signed-out visitors are sent to sign in first
// by the panel layout.
export default async function MissingAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ missing: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { missing } = await params;
  const target = missing.length === 1 ? ALIASES[missing[0].toLowerCase()] : undefined;
  if (target) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(await searchParams)) {
      for (const one of Array.isArray(v) ? v : v === undefined ? [] : [v]) q.append(k, one);
    }
    const query = q.toString();
    redirect(query ? `${target}?${query}` : target);
  }
  notFound();
}
