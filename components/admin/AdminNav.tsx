"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/admin/Icon";
import { NAV_ITEMS, navItemCls } from "@/components/admin/navStyles";

export default function AdminNav({ newCount }: { newCount: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex gap-1 overflow-x-auto [scrollbar-width:none] md:flex-col md:overflow-visible">
      {NAV_ITEMS.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`${navItemCls} ${active ? "bg-layer-selected text-primary" : "text-secondary hover:bg-layer-hover hover:text-primary"}`}
          >
            <Icon name={item.icon} size={18} className={active ? "text-[var(--icon-primary)]" : "text-[var(--icon-secondary)]"} />
            <span className="md:flex-1">{item.label}</span>
            {item.href === "/admin/bookings" && newCount > 0 && (
              <span className="rounded-full bg-brand px-2 py-px type-body-sm text-on-color" title={`${newCount} new`}>
                {newCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

// Sidebar footer link (Company profile) — same look as a nav item, highlighted when open.
export function SideLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  const active = usePathname().startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`${navItemCls} ${active ? "bg-layer-selected text-primary" : "text-secondary hover:bg-layer-hover hover:text-primary"}`}
    >
      <Icon name={icon} size={18} className={active ? "text-[var(--icon-primary)]" : "text-[var(--icon-secondary)]"} />
      {label}
    </Link>
  );
}
