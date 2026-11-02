import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Page not found" };

// Any /admin/* address that matches no admin page (an old bookmark or a typo
// like /admin/dashbord) shows Figma 1.4 inside the admin shell. Real routes
// always win over this catch-all; signed-out visitors are sent to sign in first
// by the panel layout.
export default function MissingAdminPage() {
  notFound();
}
