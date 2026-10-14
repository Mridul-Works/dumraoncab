import type { BookingStatus } from "@/lib/bookingTypes";

export const statusStyle: Record<BookingStatus, string> = {
  new: "bg-gold/20 text-[#8a5a12]",
  confirmed: "bg-tint text-amberdeep",
  completed: "bg-cream text-khaki",
  cancelled: "bg-red-50 text-red-600",
};

export function PageHeader({ title, intro, children }: { title: string; intro?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">{title}</h1>
        {intro && <p className="mt-1 max-w-2xl text-sm text-khaki">{intro}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function StatTile({ value, label, hint }: { value: string | number; label: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="font-display text-3xl font-semibold tabular-nums text-ink">{value}</p>
      <p className="mt-1 text-sm font-medium text-khaki">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-sand">{hint}</p>}
    </div>
  );
}

export function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5">
        <h2 className="font-display text-base font-semibold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${statusStyle[status]}`}>
      {status}
    </span>
  );
}

export function EditNote() {
  return (
    <p className="text-xs text-khaki">
      Read-only view of what&rsquo;s live on the site. To change it, edit{" "}
      <code className="rounded bg-cream px-1.5 py-0.5 font-mono">lib/site.ts</code> and redeploy.
    </p>
  );
}

export const btnPrimary =
  "inline-flex items-center justify-center rounded-full bg-night px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-coal disabled:opacity-60";
export const btnGhost =
  "inline-flex items-center justify-center rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-amber hover:text-amberdeep disabled:opacity-60";
