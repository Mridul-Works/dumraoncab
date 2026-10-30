"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/admin/Icon";

export const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "squares-four" },
  { href: "/admin/bookings", label: "Bookings", icon: "calendar" },
  { href: "/admin/fleet", label: "Fleet", icon: "car-profile" },
  { href: "/admin/journal", label: "Daily journal", icon: "notebook" },
  { href: "/admin/fares", label: "Fares", icon: "currency-inr" },
];

// Figma "Nav item": 12×10 padding, 18px icon, ui text; selected = layer-selected fill.
export const navItemCls = "flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2.5 type-ui transition-colors";

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
