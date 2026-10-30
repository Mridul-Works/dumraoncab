import Link from "next/link";
import Icon from "@/components/admin/Icon";
import { STATUS_LABELS, type BookingStatus } from "@/lib/bookingTypes";
import type { ServiceState } from "@/lib/catalogTypes";

// Shared admin building blocks (server-safe: no hooks), styled to the
// "Cab Service Admin" Figma file on the Chinkara design system.

// ---- Booking status --------------------------------------------------------

// Badge colours from the Figma StatusBadge component.
export const statusStyle: Record<BookingStatus, string> = {
  new: "bg-inverse text-inverse",
  contacted: "bg-tag-amber text-tag-amber",
  confirmed: "bg-tag-green text-brand",
  completed: "bg-tag-gray text-secondary",
  cancelled: "bg-tag-red text-error",
};

// Small status dots (timelines, chart bars, lists).
export const statusDot: Record<BookingStatus, string> = {
  new: "bg-inverse",
  contacted: "bg-warning-500",
  confirmed: "bg-brand",
  completed: "bg-gray-400",
  cancelled: "bg-negative",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 type-body-sm ${statusStyle[status]}`}>
      <Icon name="dot" size={6} />
      {STATUS_LABELS[status]}
    </span>
  );
}

// ---- Page structure --------------------------------------------------------

export function PageHeader({
  title,
  intro,
  back,
  children,
}: {
  title: React.ReactNode;
  intro?: React.ReactNode;
  back?: { href: string; label: string };
  children?: React.ReactNode;
}) {
  return (
    <div>
      {back && (
        <Link href={back.href} className="mb-2 inline-flex items-center gap-1 type-body-sm text-secondary hover:text-link-hover">
          <span aria-hidden="true">←</span> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-[min(100%,20rem)] flex-1">
          <h1 className="type-h2 text-primary">{title}</h1>
          {intro && <div className="mt-1 type-body-sm text-secondary">{intro}</div>}
        </div>
        {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
      </div>
    </div>
  );
}

// White card with a hairline border — the base container on every admin screen.
export const cardCls = "rounded-lg border border-gray-100 bg-layer";

export function Panel({
  title,
  count,
  action,
  children,
  className = "",
}: {
  title: React.ReactNode;
  count?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`overflow-hidden ${cardCls} ${className}`}>
      <div className="flex items-center justify-between gap-4 px-5 pb-2 pt-5">
        <h2 className="flex items-baseline gap-2 type-h4 text-primary">
          {title}
          {count !== undefined && <span className="type-body-sm text-secondary">{count}</span>}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export type Stat = { label: string; value: string | number; hint?: string; tone?: "default" | "alert" | "good" | "bad"; href?: string };

const hintTone: Record<NonNullable<Stat["tone"]>, string> = {
  default: "text-secondary",
  alert: "text-tag-amber",
  good: "text-brand",
  bad: "text-error",
};

// The KPI strip: one row of key figures, divided by hairlines.
export function NumberStrip({ stats }: { stats: Stat[] }) {
  return (
    <dl className={`grid grid-cols-2 overflow-hidden md:grid-flow-col md:auto-cols-fr md:grid-cols-none ${cardCls}`}>
      {stats.map((s, i) => {
        const body = (
          <>
            <dt className="type-body-sm text-secondary">{s.label}</dt>
            <dd className="mt-1 flex flex-wrap items-baseline gap-x-2.5">
              <span className="type-h2 tabular-nums text-primary">{s.value}</span>
              {s.hint && <span className={`type-body-sm ${hintTone[s.tone ?? "default"]}`}>{s.hint}</span>}
            </dd>
          </>
        );
        const cls = `min-w-0 border-gray-100 px-5 py-4 ${i < stats.length - 1 ? "md:border-r" : ""} ${i % 2 === 0 ? "border-r md:border-r" : ""} ${
          i < stats.length - 2 ? "border-b md:border-b-0" : ""
        }`;
        return s.href ? (
          <Link key={s.label} href={s.href} className={`${cls} transition-colors hover:bg-layer-hover`}>
            {body}
          </Link>
        ) : (
          <div key={s.label} className={cls}>
            {body}
          </div>
        );
      })}
    </dl>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="type-h4 text-primary">{title}</p>
      {children && <div className="mx-auto mt-1.5 max-w-md type-body-sm text-secondary">{children}</div>}
    </div>
  );
}

// ---- Fleet badges ------------------------------------------------------------

const serviceCls: Record<ServiceState["level"], string> = {
  ok: "bg-tag-green text-brand",
  soon: "bg-tag-amber text-tag-amber",
  due: "bg-tag-red text-error",
  unset: "bg-tag-gray text-secondary",
};

export function ServiceBadge({ state }: { state: ServiceState }) {
  const word = { ok: "Service OK", soon: "Service soon", due: "Service due", unset: "No service set" }[state.level];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 type-body-sm ${serviceCls[state.level]}`} title={state.label}>
      <Icon name="dot" size={6} />
      {word}
    </span>
  );
}

export function NumberPlate({ number }: { number: string }) {
  if (!number) return <span className="type-body-sm text-helper">No number yet</span>;
  return (
    <span className="inline-block whitespace-nowrap rounded-sm border border-gray-200 bg-gray-50 px-1.5 py-0.5 type-mono-sm text-primary">{number}</span>
  );
}

// ---- Buttons (Figma "Button": pill, 20×10 padding, ui text) -----------------------

const btnBase =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 type-ui transition-colors disabled:cursor-not-allowed disabled:opacity-40";

export const btnPrimary = `${btnBase} bg-button-primary text-on-color hover:bg-button-primary-hover active:bg-button-primary-active`;
// Secondary: white with a hairline (Call, Export CSV, Mark contacted…)
export const btnGhost = `${btnBase} border border-gray-200 bg-layer text-primary hover:bg-layer-hover active:bg-layer-selected`;
// Accent: WhatsApp actions
export const btnAccent = `${btnBase} bg-button-accent text-on-accent hover:bg-button-accent-hover active:bg-button-accent-active`;
export const btnDanger = `${btnBase} bg-tag-red text-tag-red hover:bg-tag-red-hover`;
// Text-only link button ("See all 6 new requests", "Open fleet")
export const btnText = "inline-flex items-center gap-1.5 rounded-full type-ui text-link transition-colors hover:text-link-hover";

// Filter chip (rounded, small)
export const pill =
  "rounded-full border border-gray-200 bg-layer px-3.5 py-1.5 type-ui text-primary transition-colors hover:bg-layer-hover";

// ---- Forms (Figma "Input": label 6px above a 14×10 field) ----------------------

export const inputCls =
  "w-full rounded-md border border-gray-200 bg-layer px-3.5 py-2.5 type-body-sm text-primary placeholder:text-placeholder focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/20 disabled:bg-disabled disabled:text-disabled aria-[invalid=true]:border-negative";
export const labelCls = "mb-1.5 block type-ui text-primary";
export const hintCls = "mt-1.5 type-body-sm text-helper";

export function Field({
  label,
  htmlFor,
  hint,
  children,
  className = "",
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className={labelCls}>
        {label}
      </label>
      {children}
      {hint && <p className={hintCls}>{hint}</p>}
    </div>
  );
}

export function FormError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p className="rounded-md border border-negative-subtle bg-negative-subtle px-3.5 py-2.5 type-ui text-negative-bold" role="alert">
      {error}
    </p>
  );
}
