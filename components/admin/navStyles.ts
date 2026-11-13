// Figma "Nav item": 12×10 padding, 18px icon, ui text; selected = layer-selected fill.
// Kept out of AdminNav.tsx ("use client") so server components get the real values.
export const navItemCls = "flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2.5 type-ui transition-colors";

// Figma "Overview · Admin map" sidebar, in its order.
export const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "squares-four" },
  { href: "/admin/bookings", label: "Bookings", icon: "calendar-check" },
  { href: "/admin/fleet", label: "Fleet", icon: "car-simple-18" },
  { href: "/admin/vendors", label: "Vendors", icon: "storefront" },
  { href: "/admin/journal", label: "Daily Diary", icon: "notebook-18" },
  { href: "/admin/fares", label: "Fares", icon: "currency-inr" },
  { href: "/admin/analytics", label: "Analytics", icon: "chart-bar" },
];

// Name of the admin page at `path`, for "After you sign in, you go back to …" (Figma 1.7).
export function adminPageName(path: string): string {
  const p = path.split(/[?#]/)[0].replace(/\/+$/, "") || "/admin";
  if (p === "/admin/bookings/new") return "New booking";
  if (p.startsWith("/admin/company")) return "Company profile";
  const item = [...NAV_ITEMS].reverse().find((i) => (i.href === "/admin" ? p === "/admin" : p.startsWith(i.href)));
  return item?.label ?? "the page you were on";
}
