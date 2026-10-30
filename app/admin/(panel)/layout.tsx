import Link from "next/link";
import AdminNav, { navItemCls } from "@/components/admin/AdminNav";
import CommandPalette from "@/components/admin/CommandPalette";
import Icon from "@/components/admin/Icon";
import { logout } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/adminAuth";
import { listBookings } from "@/lib/store";

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-2.5 md:pl-2">
      <span className="grid size-9 place-items-center rounded-md bg-brand type-h4 text-on-color">DC</span>
      <span>
        <span className="block type-ui text-primary">Dumraon Cab</span>
        <span className="block type-body-sm text-secondary">Admin · staff only</span>
      </span>
    </Link>
  );
}

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  const newCount = (await listBookings()).filter((b) => b.status === "new").length;

  return (
    <div className="min-h-screen bg-gray-50 md:flex">
      <aside className="border-b border-gray-100 bg-layer px-4 pb-3 pt-4 md:sticky md:top-0 md:flex md:h-screen md:w-62 md:shrink-0 md:flex-col md:gap-7 md:border-b-0 md:border-r md:pb-5 md:pt-6">
        <div className="flex items-center justify-between gap-3">
          <Brand />
          <div className="flex items-center gap-2 md:hidden">
            <CommandPalette variant="icon" />
            <form action={logout}>
              <button type="submit" aria-label="Sign out" className="grid size-10 place-items-center rounded-full border border-gray-200 bg-layer text-secondary">
                <Icon name="sign-out" size={18} />
              </button>
            </form>
          </div>
        </div>
        <div className="mt-3 md:mt-0 md:flex-1">
          <AdminNav newCount={newCount} />
        </div>
        <div className="hidden flex-col gap-3 border-t border-gray-100 pt-4 md:flex">
          <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-2 pl-3 type-body-sm text-secondary hover:text-primary">
            <Icon name="eye" size={16} />
            View live site
          </a>
          <p className="flex min-w-0 items-center gap-2.5 pl-3 type-body-sm text-primary" title={session.email}>
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-layer-selected">
              <Icon name="user" size={16} />
            </span>
            <span className="truncate">{session.email}</span>
          </p>
          <form action={logout}>
            <button type="submit" className={`${navItemCls} w-full justify-start text-left text-secondary hover:bg-layer-hover hover:text-primary`}>
              <Icon name="sign-out" size={18} className="text-[var(--icon-secondary)]" />
              Sign out
            </button>
          </form>
        </div>
      </aside>
      {/* Owns ⌘K and the search dialog; page headers render triggers. */}
      <CommandPalette variant="listener" />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-8">
        <div className="mx-auto max-w-[1200px]">{children}</div>
      </main>
    </div>
  );
}
