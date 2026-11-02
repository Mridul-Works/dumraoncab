"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ToggleArt } from "@/components/admin/FleetCard";
import { btnPrimary, inputCls, labelCls } from "@/components/admin/ui";
import { rangeText, spanDays } from "./rangeFormat";

// Analytics range switch (Figma 7.1 header) and the Custom menu (7.2): quick
// ranges, From / To, and "Compare with the N days before". The range lives in
// the URL (?range=…&from=…&to=…&cmp=0).

type Key = "today" | "yesterday" | "7d" | "month" | "last-month" | "year" | "custom";

const PILLS: { key: Key; label: string }[] = [
  { key: "7d", label: "7 days" },
  { key: "month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "year", label: "This year" },
];

const QUICK: { key: Key; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "Last 7 days" },
  { key: "month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "year", label: "This year" },
];

const href = (key: Key) => (key === "month" ? "/admin/analytics" : `/admin/analytics?range=${key}`);

export default function RangeSwitch({ current, from, to, compare, today }: { current: Key; from: string; to: string; compare: boolean; today: string }) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(from);
  const [end, setEnd] = useState(to);
  const [cmp, setCmp] = useState(compare);
  const box = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const ok = /^\d{4}-\d{2}-\d{2}$/.test(start) && /^\d{4}-\d{2}-\d{2}$/.test(end);
  const [a, b] = ok && start > end ? [end, start] : [start, end];
  const days = ok ? spanDays(a, b) : 0;

  function apply() {
    if (!ok) return;
    setOpen(false);
    router.push(`/admin/analytics?range=custom&from=${a}&to=${b}${cmp ? "" : "&cmp=0"}`);
  }

  const pill = (active: boolean) =>
    `whitespace-nowrap rounded-full border px-3.5 py-[7px] type-ui transition-colors ${
      active ? "border-gray-100 bg-gray-50 text-primary" : "border-transparent text-secondary hover:text-primary"
    }`;

  return (
    <div ref={box} className="relative max-w-full">
      <div className="flex gap-0.5 overflow-x-auto rounded-full border border-gray-100 bg-layer p-1">
        {PILLS.map((p) => (
          <Link key={p.key} href={href(p.key)} className={pill(current === p.key)} aria-current={current === p.key ? "page" : undefined}>
            {p.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="dialog"
          className={pill(open || !PILLS.some((p) => p.key === current))}
        >
          Custom
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-label="Pick a date range"
          className="absolute right-0 top-[calc(100%+8px)] z-30 flex w-[min(340px,calc(100vw-2rem))] flex-col gap-0.5 rounded-lg border border-gray-100 bg-layer p-2 shadow-[0_16px_48px_0_var(--shadow-md)] [animation:pop_.15s_ease-out]"
        >
          {QUICK.map((q) => (
            <Link
              key={q.key}
              href={href(q.key)}
              onClick={() => setOpen(false)}
              className={`rounded-md px-3 py-[9px] type-ui text-primary hover:bg-layer-hover ${current === q.key ? "bg-gray-50" : ""}`}
            >
              {q.label}
            </Link>
          ))}
          <span className="my-px h-px bg-gray-100" aria-hidden="true" />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              apply();
            }}
            className="flex flex-col gap-3 px-3 pb-1.5 pt-2.5"
          >
            <p className="type-ui text-primary">Custom range</p>
            <div className="flex gap-2.5">
              <div className="min-w-0 flex-1">
                <label htmlFor="range-from" className={labelCls}>
                  From
                </label>
                <input id="range-from" type="date" value={start} max={today} onChange={(e) => setStart(e.target.value)} className={inputCls} required />
              </div>
              <div className="min-w-0 flex-1">
                <label htmlFor="range-to" className={labelCls}>
                  To
                </label>
                <input id="range-to" type="date" value={end} max={today} onChange={(e) => setEnd(e.target.value)} className={inputCls} required />
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2.5">
              <span className="min-w-0 flex-1 type-body-sm text-primary">
                Compare with the {days === 1 ? "day" : `${days || "same"} days`} before
              </span>
              <input type="checkbox" role="switch" checked={cmp} onChange={(e) => setCmp(e.target.checked)} className="peer sr-only" />
              <span className="shrink-0 rounded-full peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--border-focus)]">
                <ToggleArt on={cmp} />
              </span>
            </label>
            <button type="submit" disabled={!ok} className={`${btnPrimary} w-full`}>
              {ok ? `Show ${rangeText(a, b, today)}` : "Pick both dates"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
