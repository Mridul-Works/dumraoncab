import Link from "next/link";
import Icon from "@/components/admin/Icon";

// Driver app building blocks (server-safe: no hooks), from the Figma
// "Flow 10 · Driver app" screens on the Chinkara design system. The app is a
// 390-wide phone layout; on bigger screens it stays a centred phone column.

/* --------------------------------- layout --------------------------------- */

export function Screen({
  children,
  tone = "gray",
  tabs,
}: {
  children: React.ReactNode;
  tone?: "gray" | "white" | "dark";
  tabs?: "today" | "earnings" | "account";
}) {
  const bg = tone === "white" ? "bg-layer" : tone === "dark" ? "bg-gray-950" : "bg-gray-50";
  return (
    <div className={`mx-auto flex min-h-dvh w-full max-w-[430px] flex-col ${bg}`}>
      <div className="flex flex-1 flex-col">{children}</div>
      {tabs && <TabBar active={tabs} />}
    </div>
  );
}

// Body of a screen. `bottom` content (main button) is pushed to the bottom.
export function Body({ children, className = "gap-[14px] pt-[6px] pb-[24px]" }: { children: React.ReactNode; className?: string }) {
  return <main className={`flex flex-1 flex-col px-[20px] pt-[max(env(safe-area-inset-top),0px)] ${className}`}>{children}</main>;
}

export const Spacer = () => <div className="min-h-[12px] flex-1" aria-hidden="true" />;

export function TopBar({ title, back, right }: { title: string; back?: string; right?: React.ReactNode }) {
  return (
    <div className="flex min-h-[34px] items-center gap-[12px] pt-[10px]">
      {back && (
        <Link href={back} aria-label="Back" className="-m-[13px] grid size-[48px] shrink-0 place-items-center text-primary">
          <Icon name="arrow-left" size={22} />
        </Link>
      )}
      <h1 className="min-w-0 flex-1 type-h4 text-primary">{title}</h1>
      {right}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex flex-col rounded-lg border border-gray-100 bg-layer p-[18px] ${className}`}>{children}</div>;
}

export const Divider = () => <div className="h-px w-full bg-gray-100" />;

// Line-art illustration from the design (public/driver-art).
export function Art({ name, width = 240, height = 160, className = "" }: { name: string; width?: number; height?: number; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- static line-art SVG from the design
  return <img src={`/driver-art/${name}.svg`} alt="" width={width} height={height} className={`block max-w-full shrink-0 ${className}`} />;
}

/* --------------------------------- buttons --------------------------------- */

export type BtnVariant = "primary" | "secondary" | "ghost" | "danger";

export function btnClass(variant: BtnVariant = "primary", full = true) {
  const base = `inline-flex h-[48px] items-center justify-center gap-[8px] rounded-full px-[20px] type-ui transition-colors ${full ? "w-full" : ""}`;
  const look = {
    primary: "bg-button-primary text-on-color hover:bg-button-primary-hover disabled:opacity-40 disabled:hover:bg-button-primary",
    secondary: "border border-gray-200 bg-layer text-primary hover:bg-layer-hover disabled:opacity-50",
    ghost: "text-link hover:text-link-hover disabled:opacity-50",
    danger: "bg-tag-red text-tag-red hover:bg-tag-red-hover",
  }[variant];
  return `${base} ${look}`;
}

export function LinkBtn({
  href,
  children,
  variant = "primary",
  icon,
  full = true,
}: {
  href: string;
  children: React.ReactNode;
  variant?: BtnVariant;
  icon?: string;
  full?: boolean;
}) {
  const inner = (
    <>
      {icon && <Icon name={icon} size={16} />}
      {children}
    </>
  );
  // tel:, upi: and map links leave the app.
  if (!href.startsWith("/"))
    return (
      <a href={href} className={btnClass(variant, full)} {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>
        {inner}
      </a>
    );
  return (
    <Link href={href} className={btnClass(variant, full)}>
      {inner}
    </Link>
  );
}

export function SubmitBtn({
  children,
  variant = "primary",
  icon,
  disabled,
  name,
  value,
}: {
  children: React.ReactNode;
  variant?: BtnVariant;
  icon?: string;
  disabled?: boolean;
  name?: string;
  value?: string;
}) {
  return (
    <button type="submit" disabled={disabled} name={name} value={value} className={btnClass(variant)}>
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
}

/* ---------------------------------- bits ---------------------------------- */

export type TagTone = "green" | "amber" | "red" | "gray" | "white";

const tagTone: Record<TagTone, string> = {
  green: "bg-tag-green text-brand",
  amber: "bg-tag-amber text-tag-amber",
  red: "bg-tag-red text-tag-red",
  gray: "bg-tag-gray text-secondary",
  white: "bg-layer text-tag-amber",
};

export function Tag({ children, tone = "green", icon }: { children: React.ReactNode; tone?: TagTone; icon?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-[4px] whitespace-nowrap rounded-full px-[10px] py-[3px] type-body-sm ${tagTone[tone]}`}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </span>
  );
}

// Amber "needs action" notice (10.13, 10.35, 10.39).
export function Notice({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div role="status" className="flex w-full items-start gap-[10px] rounded-md bg-tag-amber px-[14px] py-[12px]">
      <Icon name="warning-circle" size={20} className="mt-px text-tag-amber" />
      <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <p className="type-body-sm text-tag-amber">{title}</p>
        <p className="type-ui text-primary">{children}</p>
      </div>
    </div>
  );
}

// Amber one-line banner (10.26, 10.38, 10.46).
export function Banner({ icon = "warning-circle", children, action }: { icon?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div role="status" className="flex w-full items-center gap-[10px] rounded-md bg-tag-amber p-[14px]">
      <Icon name={icon} size={18} className="text-tag-amber" />
      <p className="min-w-0 flex-1 type-body-sm text-primary">{children}</p>
      {action}
    </div>
  );
}

// Small "✓ text" line under fields.
export function CheckLine({ children, tone = "ok" }: { children: React.ReactNode; tone?: "ok" | "error" }) {
  return (
    <p className={`flex items-center gap-[8px] type-body-sm ${tone === "error" ? "text-negative" : "text-secondary"}`}>
      <Icon name={tone === "error" ? "warning-circle" : "check-circle"} size={16} className={tone === "error" ? "text-negative" : "text-brand"} />
      <span className="min-w-0 flex-1">{children}</span>
    </p>
  );
}

// Three dashes over a sign-up step (10.5–10.10).
export function Steps({ at, of = 3 }: { at: number; of?: number }) {
  return (
    <div className="flex w-full gap-[6px]" role="progressbar" aria-valuemin={1} aria-valuemax={of} aria-valuenow={at} aria-label={`Step ${at} of ${of}`}>
      {Array.from({ length: of }, (_, i) => (
        <div key={i} className={`h-[4px] flex-1 rounded-full ${i < at ? "bg-brand" : "bg-gray-200"}`} />
      ))}
    </div>
  );
}

// Pickup → drop with the dots from the design.
export function Route({ from, to, fromTime, toTime, fromLabel = "Pickup", toLabel = "Drop" }: { from: string; to: string; fromTime?: string; toTime?: string; fromLabel?: string; toLabel?: string }) {
  return (
    <div className="flex w-full flex-col">
      <div className="flex items-start gap-[12px]">
        <span className="mt-[5px] size-[10px] shrink-0 rounded-full bg-brand" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="type-body-sm text-secondary">{fromLabel}</span>
          <span className="type-ui text-primary">{from}</span>
        </div>
        {fromTime && <span className="type-body-sm text-secondary">{fromTime}</span>}
      </div>
      {to && (
        <>
          <div className="flex py-[2px] pl-[4px]">
            <div className="h-[18px] w-[2px] bg-gray-200" />
          </div>
          <div className="flex items-start gap-[12px]">
            <span className="mt-[5px] size-[10px] shrink-0 rounded-full border-2 border-brand bg-layer" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="type-body-sm text-secondary">{toLabel}</span>
              <span className="type-ui text-primary">{to}</span>
            </div>
            {toTime && <span className="type-body-sm text-secondary">{toTime}</span>}
          </div>
        </>
      )}
    </div>
  );
}

// Label / value / detail row with an optional Edit pencil (10.11, 10.36).
export function SummaryRow({ label, value, detail, edit, done }: { label: string; value: React.ReactNode; detail?: React.ReactNode; edit?: string; done?: boolean }) {
  const body = (
    <>
      <span className="w-[76px] shrink-0 type-body-sm text-secondary">{label}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <span className="type-ui text-primary">{value}</span>
        {detail && <span className="type-body-sm text-secondary">{detail}</span>}
      </span>
      {edit && <Icon name="pencil-simple" size={18} className="text-brand" />}
      {done && <Icon name="check-circle" size={18} className="text-brand" />}
    </>
  );
  const cls = "flex w-full items-start gap-[12px] px-[16px] py-[12px]";
  return edit ? (
    <Link href={edit} className={`${cls} hover:bg-layer-hover`} aria-label={`Change ${label.toLowerCase()}`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

// Icon tile + title + detail row used in lists (10.14, 10.44, 10.45).
export function ListRow({
  icon,
  title,
  detail,
  href,
  trailing,
  tile = false,
}: {
  icon: string;
  title: React.ReactNode;
  detail?: React.ReactNode;
  href?: string;
  trailing?: React.ReactNode;
  tile?: boolean;
}) {
  const body = (
    <>
      {tile ? (
        <span className="grid size-[40px] shrink-0 place-items-center rounded-md bg-gray-50 text-secondary">
          <Icon name={icon} size={20} />
        </span>
      ) : (
        <Icon name={icon} size={20} className="text-primary" />
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <span className="type-ui text-primary">{title}</span>
        {detail && <span className="type-body-sm text-secondary">{detail}</span>}
      </span>
      {trailing}
    </>
  );
  const cls = "flex w-full items-center gap-[12px] px-[16px] py-[12px]";
  if (!href) return <div className={cls}>{body}</div>;
  if (!href.startsWith("/"))
    return (
      <a href={href} className={`${cls} hover:bg-layer-hover`}>
        {body}
      </a>
    );
  return (
    <Link href={href} className={`${cls} hover:bg-layer-hover`}>
      {body}
    </Link>
  );
}

// Three label/value cells (10.18, 10.37).
export function Facts({ items, tone = "card" }: { items: { label: string; value: string; brand?: boolean }[]; tone?: "card" | "soft" }) {
  return (
    <div className={`flex w-full ${tone === "card" ? "rounded-lg border border-gray-100 bg-layer" : "rounded-md bg-gray-50"}`}>
      {items.map((it, i) => (
        <div key={it.label} className={`flex min-w-0 flex-1 flex-col gap-[2px] px-[12px] py-[14px] ${i ? "border-l border-gray-100" : ""}`}>
          <span className="type-body-sm text-secondary">{it.label}</span>
          <span className={`type-h4 ${it.brand ? "text-brand" : "text-primary"}`}>{it.value}</span>
        </div>
      ))}
    </div>
  );
}

// The app's own logo mark (10.1, 10.2).
export function Mark() {
  return <span className="grid size-[44px] place-items-center rounded-lg bg-brand type-h4 text-inverse">DC</span>;
}

/* --------------------------------- tab bar --------------------------------- */

const TABS = [
  { key: "today", label: "Today", icon: "calendar-check", href: "/driver/today" },
  { key: "earnings", label: "Earnings", icon: "currency-inr", href: "/driver/earnings" },
  { key: "account", label: "Account", icon: "user", href: "/driver/account" },
] as const;

export function TabBar({ active }: { active: "today" | "earnings" | "account" }) {
  return (
    <nav aria-label="Driver app" className="sticky bottom-0 flex border-t border-gray-100 bg-layer pt-[8px] pb-[max(14px,env(safe-area-inset-bottom))]">
      {TABS.map((t) => {
        const on = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={`flex min-h-[48px] flex-1 flex-col items-center gap-[4px] ${on ? "type-ui text-brand" : "type-body-sm text-secondary"}`}
          >
            <Icon name={t.icon} size={24} className={on ? "text-brand" : "text-primary"} />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
