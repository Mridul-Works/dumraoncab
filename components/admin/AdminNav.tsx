"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/fleet", label: "Fleet" },
  { href: "/admin/fares", label: "Routes & fares" },
  { href: "/admin/content", label: "Site content" },
];

export default function AdminNav({ newCount }: { newCount: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {items.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center justify-between gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              active ? "bg-white/12 text-white" : "text-white/65 hover:bg-white/6 hover:text-white"
            }`}
          >
            {item.label}
            {item.href === "/admin/bookings" && newCount > 0 && (
              <span className="rounded-full bg-gold px-2 py-0.5 font-mono text-[10px] font-semibold text-night">
                {newCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
