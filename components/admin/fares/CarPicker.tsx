"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import Icon from "@/components/admin/Icon";

export type FleetCar = { id: string; name: string; number: string; type: string; fareClass: string };

// Figma 5.13 "Adding a car class": the Cars cell of a new class row. Opens a
// list of the cars in Fleet — ones with no class first, then ones that would
// move from another class (their rate changes) — plus a link to add a car.
export default function CarPicker({
  cars,
  classNames,
  value,
  onChange,
  label,
  className = "",
}: {
  cars: FleetCar[];
  classNames: Record<string, string>; // class id → name
  value: string[]; // picked car ids
  onChange: (next: string[]) => void;
  label: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const picked = cars.filter((c) => value.includes(c.id));
  const names = [...new Set(picked.map((c) => c.name))].join(" · ");
  const sorted = [...cars].sort((a, b) => Number(!!a.fareClass) - Number(!!b.fareClass) || a.name.localeCompare(b.name));

  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <div ref={box} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={label}
        className="flex w-full min-w-0 items-center gap-1 rounded-md border-[1.5px] border-brand bg-hover px-2.5 py-1.5 text-left focus:outline-none focus:ring-2 focus:ring-focus/20 disabled:cursor-not-allowed"
      >
        {picked.length ? (
          <>
            <span className="min-w-0 truncate type-body-sm text-secondary">{names}</span>
            <span className="shrink-0 type-ui text-primary">
              {picked.length} car{picked.length === 1 ? "" : "s"}
            </span>
          </>
        ) : (
          <span className="min-w-0 truncate type-body-sm text-placeholder">Pick cars from Fleet</span>
        )}
      </button>

      {open && (
        <div
          id={listId}
          role="listbox"
          aria-multiselectable="true"
          aria-label={label}
          className="absolute left-0 top-[calc(100%+6px)] z-30 flex max-h-80 w-[min(320px,calc(100vw-3rem))] flex-col overflow-y-auto rounded-lg border border-gray-100 bg-layer py-2 shadow-[0_16px_48px_0_var(--shadow-md)] [animation:pop_.15s_ease-out]"
        >
          {sorted.map((c) => {
            const on = value.includes(c.id);
            const from = c.fareClass ? classNames[c.fareClass] : "";
            return (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => toggle(c.id)}
                className={`flex w-full items-center gap-3 px-3.5 py-2.25 text-left transition-colors ${on ? "bg-layer-selected" : "hover:bg-layer-hover"}`}
              >
                <Icon name="car-simple" size={18} className="text-[var(--icon-secondary)]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate type-ui text-primary">{c.number ? `${c.name} · ${c.number}` : c.name}</span>
                  <span className="block truncate type-body-sm text-secondary">
                    {from ? `In ${from} · moving it changes its rate` : `${c.type} · no class yet`}
                  </span>
                </span>
                {on && <Icon name="check" size={16} className="text-brand" />}
              </button>
            );
          })}
          <Link href="/admin/fleet/new" className="flex w-full items-center gap-3 px-3.5 py-2.25 text-left transition-colors hover:bg-layer-hover">
            <Icon name="plus" size={18} className="text-[var(--icon-secondary)]" />
            <span className="min-w-0 flex-1">
              <span className="block type-ui text-primary">Add a car in Fleet</span>
              <span className="block type-body-sm text-secondary">Opens Add car</span>
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}
