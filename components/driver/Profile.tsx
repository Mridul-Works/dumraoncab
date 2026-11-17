import Link from "next/link";
import Icon from "@/components/admin/Icon";
import type { CarStatus } from "@/lib/driverTrips";
import { daysUntil, fmtShort, num } from "./format";

// Pieces of the Profile screens (Figma 10.51 Profile, 10.52 Your car).
// Server-safe, no hooks.

// "Service due in 1,200 km" / "Service 300 km overdue" / "Service due 14 Nov".
export function serviceLine(s: CarStatus): string | undefined {
  if (s.nextServiceKm != null && s.km != null) {
    const left = s.nextServiceKm - s.km;
    return left > 0 ? `Service due in ${num(left)} km` : left === 0 ? "Service due now" : `Service ${num(-left)} km overdue`;
  }
  if (s.nextServiceDate) {
    const days = daysUntil(s.nextServiceDate);
    return days > 0 ? `Service due ${fmtShort(s.nextServiceDate)}` : days === 0 ? "Service due today" : `Service was due ${fmtShort(s.nextServiceDate)}`;
  }
  if (s.nextServiceKm != null) return `Service due at ${num(s.nextServiceKm)} km`;
  return undefined;
}

// "Last service 12 Sep at 44,400 km"
export function lastServiceLine(s: CarStatus): string | undefined {
  if (!s.lastServiceDate) return undefined;
  return `Last service ${fmtShort(s.lastServiceDate)}${s.lastServiceKm != null ? ` at ${num(s.lastServiceKm)} km` : ""}`;
}

// White card holding rows split by thin lines (10.51 menu).
export function MenuCard({ children }: { children: React.ReactNode }) {
  return <div className="flex w-full flex-col rounded-lg border border-gray-100 bg-layer p-[18px] [&>*+*]:border-t [&>*+*]:border-gray-100">{children}</div>;
}

// Icon + title + detail row of the Profile menu; a link when `href` is given.
export function MenuRow({ icon, title, detail, href, trailing }: { icon: string; title: string; detail?: string; href?: string; trailing?: React.ReactNode }) {
  const body = (
    <>
      <Icon name={icon} size={20} className="text-primary" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="type-ui text-primary">{title}</span>
        {detail && <span className="type-body-sm text-secondary">{detail}</span>}
      </span>
      {trailing}
    </>
  );
  const cls = "flex w-full items-center gap-[12px] py-[12px]";
  if (!href) return <div className={cls}>{body}</div>;
  if (!href.startsWith("/"))
    return (
      <a href={href} className={cls}>
        {body}
      </a>
    );
  return (
    <Link href={href} className={cls}>
      {body}
    </Link>
  );
}
