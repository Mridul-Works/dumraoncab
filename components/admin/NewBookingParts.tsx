// Building blocks for the New booking screen (Figma "Flow 3B · New booking").
// Presentational only; state lives in NewBookingForm.

import Icon from "@/components/admin/Icon";

export type CustomerInfo = {
  digits: string; // last 10 digits of the phone
  name: string;
  trips: number;
  since: string; // ISO date of their first booking
  last: { date: string; from: string; to: string; car: string };
  usualPickup: string;
  payment: string;
};
export type ServiceOption = { slug: string; name: string; label: string; icon: string };
export type RouteOption = { slug: string; from: string; to: string; fare: number; km: number; minutes: number };
export type CarClassOption = { id: string; name: string; rate: number; seats: number; carIds: string[] };
export type CarOption = { id: string; name: string; number: string; fareClass: string };

// Figma "Card · …": white, hairline, 24px sides.
export function Card({ title, aside, extra, children }: { title: string; aside?: React.ReactNode; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4.5 rounded-lg border border-gray-100 bg-layer px-4 pb-6 pt-5 sm:px-6">
      <div className="flex flex-wrap items-center gap-2.5">
        <h2 className="type-h4 text-primary">{title}</h2>
        {aside && <span className="type-body-sm text-secondary">{aside}</span>}
        <span className="flex-1" />
        {extra}
      </div>
      {children}
    </section>
  );
}

// Label row above a field: "Pickup", optional tag ("Usual") or "optional".
export function Label({ htmlFor, children, optional, tag }: { htmlFor?: string; children: React.ReactNode; optional?: boolean; tag?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <label htmlFor={htmlFor} className="type-ui text-primary">
        {children}
      </label>
      {optional && <span className="type-body-sm text-secondary">optional</span>}
      {tag && <span className="rounded-full bg-gray-50 px-2 py-px type-body-sm text-secondary">{tag}</span>}
    </div>
  );
}

// Figma "Box": 48px field shell with optional leading icon and trailing slot.
// Focus = brand ring, error = red ring (both 2px like the design).
export function Box({
  icon,
  error,
  trailing,
  className = "",
  children,
}: {
  icon?: string;
  error?: boolean;
  trailing?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex h-12 w-full items-center gap-2.5 rounded-md border bg-layer px-3.5 text-secondary transition-colors ${
        error
          ? "border-[var(--support-error)] ring-1 ring-[var(--support-error)]"
          : "border-gray-200 focus-within:border-focus focus-within:ring-1 focus-within:ring-focus"
      } ${className}`}
    >
      {icon && <Icon name={icon} size={20} />}
      {children}
      {trailing}
    </div>
  );
}

// Input with no chrome, for use inside <Box>.
export const bareInput = "h-full min-w-0 flex-1 bg-transparent type-body-md text-primary placeholder:text-secondary focus:outline-none focus-visible:outline-none!";

export function FieldError({ id, children }: { id: string; children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} className="type-body-sm text-error">
      {children}
    </p>
  );
}

// Figma "Segmented": grey track, the chosen option raised in white.
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  full,
  className = "",
}: {
  label: string;
  options: { value: T; label: React.ReactNode; icon?: string }[];
  value: T;
  onChange: (v: T) => void;
  full?: boolean;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`flex gap-1 rounded-md border border-gray-100 bg-gray-50 p-1 ${full ? "w-full" : ""} ${className}`}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`flex items-center justify-center gap-1.5 whitespace-nowrap rounded-sm border py-[9px] type-ui transition-colors ${full ? "min-w-0 flex-1 px-2" : "px-3.5"} ${
              on
                ? "border-gray-200 bg-layer text-primary shadow-[0_1px_0_0_var(--border-tertiary)]"
                : "border-transparent text-secondary hover:text-primary"
            }`}
          >
            {o.icon && <Icon name={o.icon} size={18} className={on ? "text-[var(--icon-interactive)]" : "text-[var(--icon-secondary)]"} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// Figma "Chip": pill; chosen = brand fill with a check.
export function Chip({ on, onClick, children, meta }: { on: boolean; onClick: () => void; children: React.ReactNode; meta?: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border py-2 pl-3 pr-3.5 transition-colors ${
        on ? "border-transparent bg-brand text-on-color" : "border-gray-200 bg-layer text-primary hover:bg-layer-hover"
      }`}
    >
      {on && <Icon name="check" size={16} />}
      <span className="type-ui">{children}</span>
      {meta && <span className={`type-body-sm ${on ? "text-on-color" : "text-secondary"}`}>{meta}</span>}
    </button>
  );
}

// Figma "Stepper": label + hint, round − / + buttons around the count.
export function Stepper({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  const btn = "grid size-8 place-items-center rounded-full bg-gray-50 text-[var(--icon-primary)] transition-colors hover:bg-layer-selected disabled:opacity-40";
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3 rounded-md border border-gray-200 py-2 pl-3.5 pr-2">
      <div className="min-w-0 flex-1">
        <p className="type-ui text-primary">{label}</p>
        <p className="type-body-sm text-secondary">{hint}</p>
      </div>
      <button type="button" className={btn} aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
        <span className="h-0.5 w-3 bg-current" />
      </button>
      <output className="w-5 text-center type-h4 tabular-nums text-primary" aria-live="polite">
        {value}
      </output>
      <button type="button" className={btn} aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
        <Icon name="plus" size={16} />
      </button>
    </div>
  );
}

// Figma "Toggle": 36×20 switch.
export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? "bg-brand" : "bg-gray-300"}`}
    >
      <span className={`absolute top-0.5 size-4 rounded-full bg-layer shadow-sm transition-[left] ${on ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );
}

// Right-aligned summary row: "Route fare · SUV ......... ₹3,199"
export function SummaryRow({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="type-body-sm text-secondary">{label}</span>
      <span className="flex-1" />
      <span className="text-right type-ui text-primary">{children}</span>
    </div>
  );
}

// Grey "fact" pill in the summary: "120 km", "4 people", "SUV / MUV".
export function Fact({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-2.5 py-[5px] type-body-sm text-secondary">
      <Icon name={icon} size={16} />
      {children}
    </span>
  );
}
