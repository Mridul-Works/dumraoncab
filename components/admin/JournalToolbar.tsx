"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/admin/Icon";
import { rangeLabel } from "@/components/admin/JournalFormat";
import { inputCls } from "@/components/admin/ui";

const shift = (d: string, days: number) => {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
};
// Figma "Filters": segmented date presets, the range pill (opens a custom
// range), the car pill (opens that car's view), and the attention count.
export default function JournalToolbar({
  from,
  to,
  today,
  carId,
  carName,
  cars,
  attention,
}: {
  from: string;
  to: string;
  today: string;
  carId: string;
  carName?: string;
  cars: { id: string; label: string }[];
  attention?: number;
}) {
  const router = useRouter();
  const go = (next: { from?: string; to?: string; car?: string | null }) => {
    const q = new URLSearchParams();
    q.set("from", next.from ?? from);
    q.set("to", next.to ?? to);
    const car = next.car === null ? "" : (next.car ?? carId);
    if (car) q.set("car", car);
    router.push(`/admin/journal?${q}`);
  };

  const dow = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
  const monthStart = `${today.slice(0, 8)}01`;
  const presets = carId
    ? [
        { label: "This week", from: shift(today, -dow), to: today },
        { label: "This month", from: monthStart, to: today },
        { label: "Last 3 months", from: shift(today, -89), to: today },
      ]
    : [
        { label: "Today", from: today, to: today },
        { label: "This week", from: shift(today, -dow), to: today },
        { label: "This month", from: monthStart, to: today },
      ];
  const presetOn = presets.some((p) => p.from === from && p.to === to);
  const [custom, setCustom] = useState(false);
  const customOn = custom || !presetOn;

  const seg = (on: boolean) =>
    `whitespace-nowrap rounded-sm px-3.5 py-[7px] type-ui transition-colors ${
      on ? "border border-gray-200 bg-gray-50 text-primary" : "border border-transparent text-secondary hover:text-primary"
    }`;
  const pillCls = "flex items-center gap-2 rounded-md border border-gray-200 bg-layer px-3 py-[9px] type-ui text-primary";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div role="group" aria-label="Date range" className="flex max-w-full gap-1 overflow-x-auto rounded-md border border-gray-200 bg-layer p-1 [scrollbar-width:none]">
        {presets.map((p) => {
          const on = !custom && p.from === from && p.to === to;
          return (
            <button
              key={p.label}
              type="button"
              aria-pressed={on}
              onClick={() => {
                setCustom(false);
                go({ from: p.from, to: p.to });
              }}
              className={seg(on)}
            >
              {p.label}
            </button>
          );
        })}
        {!carId && (
          <button type="button" aria-pressed={customOn} onClick={() => setCustom((c) => !c)} className={seg(customOn)}>
            Custom
          </button>
        )}
      </div>

      {!carId && (
        <div className="relative">
          <button type="button" aria-expanded={custom} onClick={() => setCustom((c) => !c)} className={`${pillCls} hover:bg-layer-hover`}>
            <Icon name="calendar-blank" size={18} className="text-[var(--icon-secondary)]" />
            {rangeLabel(from, to)}
          </button>
          {custom && (
            <div className="absolute left-0 top-full z-20 mt-2 flex gap-3 rounded-lg border border-gray-100 bg-layer p-3 shadow-lg">
              <label className="type-body-sm text-secondary">
                From
                <input type="date" value={from} max={to} onChange={(e) => e.target.value && go({ from: e.target.value })} className={`${inputCls} mt-1 w-auto`} />
              </label>
              <label className="type-body-sm text-secondary">
                To
                <input type="date" value={to} min={from} max={today} onChange={(e) => e.target.value && go({ to: e.target.value })} className={`${inputCls} mt-1 w-auto`} />
              </label>
            </div>
          )}
        </div>
      )}

      {carId ? (
        <span className="flex items-center gap-2 rounded-md border-[1.5px] border-brand bg-layer py-[9px] pl-3 pr-2.5 type-ui text-primary">
          <Icon name="car-simple" size={18} className="text-[var(--icon-secondary)]" />
          {carName}
          <button type="button" aria-label="Show all cars" onClick={() => go({ car: null })} className="rounded-full p-0.5 text-secondary hover:bg-layer-hover hover:text-primary">
            <Icon name="x" size={14} />
          </button>
        </span>
      ) : (
        <label className={`relative ${pillCls} hover:bg-layer-hover`}>
          <Icon name="car-simple" size={18} className="text-[var(--icon-secondary)]" />
          All cars
          <Icon name="caret-down" size={16} className="text-[var(--icon-secondary)]" />
          <select
            value=""
            aria-label="Open one car"
            onChange={(e) => e.target.value && go({ car: e.target.value })}
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            <option value="">All cars</option>
            {cars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {!!attention && (
        <Link href="#attention" className="ml-auto flex items-center gap-2 rounded-md bg-tag-amber px-3 py-[9px] type-ui text-tag-amber">
          <Icon name="warning-circle" size={18} />
          {attention} need{attention === 1 ? "s" : ""} attention
        </Link>
      )}
    </div>
  );
}
