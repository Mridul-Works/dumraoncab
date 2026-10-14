import Link from "next/link";
import AdminNav from "@/components/admin/AdminNav";
import { logout } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/adminAuth";
import { listBookings } from "@/lib/store";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  const newCount = (await listBookings()).filter((b) => b.status === "new").length;

  return (
    <div className="md:flex">
      <aside className="bg-night text-white md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col">
        <div className="flex items-center justify-between gap-3 px-4 pt-4 md:px-5 md:pt-6">
          <Link href="/admin" className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-lg bg-white/10 font-display text-sm font-semibold">
              DC
            </span>
            <span className="leading-tight">
              <span className="block font-display text-sm font-semibold">Dumraon Cab</span>
              <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-white/50">Admin</span>
            </span>
          </Link>
          <form action={logout} className="md:hidden">
            <button type="submit" className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/80">
              Log out
            </button>
          </form>
        </div>
        <div className="px-3 py-3 md:mt-6 md:flex-1">
          <AdminNav newCount={newCount} />
        </div>
        <div className="hidden border-t border-white/10 px-5 py-4 md:block">
          <p className="truncate text-xs text-white/55" title={session.email}>
            {session.email}
          </p>
          <div className="mt-2 flex items-center justify-between">
            <a href="/" target="_blank" rel="noreferrer" className="text-xs font-semibold text-white/70 hover:text-white">
              View site ↗
            </a>
            <form action={logout}>
              <button type="submit" className="text-xs font-semibold text-white/70 hover:text-white">
                Log out
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
