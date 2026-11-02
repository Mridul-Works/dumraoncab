import Link from "next/link";
import { btnGhost, btnPrimary } from "@/components/admin/ui";

// Figma 1.4 Page not found — a wrong or old /admin link while signed in.
export default function AdminNotFound() {
  return (
    <section className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center rounded-lg border border-gray-100 bg-layer px-4 py-18">
      <div className="flex w-full max-w-[520px] flex-col items-center gap-2 px-6 py-10 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- static line-art SVG from the design */}
        <img src="/admin-illustrations/page-not-found.svg" alt="" width={240} height={160} className="max-w-full" />
        <span className="h-3" aria-hidden="true" />
        <h1 className="type-h3 text-primary">This page doesn’t exist</h1>
        <p className="type-body-md text-secondary">
          The link may be old or mistyped, like /admin/dashbord. Everything else in the admin is where you left it.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-4">
          <Link href="/admin" className={btnPrimary}>
            Go to dashboard
          </Link>
          <Link href="/admin/bookings" className={btnGhost}>
            Go to bookings
          </Link>
        </div>
      </div>
    </section>
  );
}
