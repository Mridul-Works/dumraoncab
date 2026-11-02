"use client";

// Dropdowns for the New booking form (Figma 3B.8–3B.13): the suggestion
// combobox behind mobile number / pickup / drop / pickup time, the "Other date"
// calendar and the "Assign a car" picker. All share the Figma "Dropdown"
// surface: white, hairline, 12px radius, elevation/03, 8px vertical padding.

import { useEffect, useId, useRef, useState } from "react";
import Icon from "@/components/admin/Icon";
import { Box, bareInput } from "@/components/admin/NewBookingParts";
import { addDays, clock, fromMin, parseTime, SLOTS, toMin } from "./format";

export const menuCls =
  "absolute z-30 flex flex-col overflow-hidden rounded-lg border border-gray-100 bg-layer py-2 shadow-[0_16px_48px_var(--shadow-md)] [animation:pop_.12s_ease-out]";

const rowCls = (on: boolean, two: boolean) =>
  `flex w-full cursor-pointer items-center gap-3 px-3.5 text-left transition-colors ${two ? "py-[9px]" : "py-2.5"} ${on ? "bg-layer-selected" : ""}`;

/* ------------------------------ popover dismissal ------------------------------ */

// Open/close state for a button-triggered popover: closes on a click outside
// `ref` or on Escape.
export function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  return { open, setOpen, ref };
}

/* ------------------------------ suggestion combobox ----------------------------- */

export type Suggestion = { key: string; icon?: string; title: React.ReactNode; sub?: React.ReactNode; meta?: React.ReactNode };

// A Figma "Box" input with a suggestion list under it. Arrow keys move, Enter
// picks, Escape closes; options keep focus in the input (mousedown is cancelled).
export function SuggestField({
  id,
  value,
  onChange,
  placeholder,
  icon,
  prefix,
  trailing,
  error,
  items,
  onPick,
  footer,
  openOnFocus,
  preferKey,
  selectedKey,
  menuClassName = "inset-x-0",
  listClassName = "",
  inputProps,
  onFocus,
  onBlur,
}: {
  id: string;
  value: string;
  onChange: (text: string) => void;
  placeholder: string;
  icon?: string;
  prefix?: React.ReactNode;
  trailing?: React.ReactNode;
  error?: boolean;
  items: Suggestion[];
  onPick: (key: string) => void;
  footer?: React.ReactNode;
  openOnFocus?: boolean;
  preferKey?: string; // option highlighted when the list opens or the text changes
  selectedKey?: string; // option shown with a check (the current value)
  menuClassName?: string;
  listClassName?: string;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const list = useRef<HTMLUListElement>(null);
  const fallback = preferKey && items.some((i) => i.key === preferKey) ? preferKey : items[0]?.key;
  const active = activeKey && items.some((i) => i.key === activeKey) ? activeKey : fallback;
  const shown = open && (items.length > 0 || !!footer);
  const optId = (key: string) => `${listId}-${key.replace(/[^a-z0-9_-]/gi, "_")}`;

  // Keep the highlighted option in view (the time list is long).
  useEffect(() => {
    if (!shown || !active || !list.current) return;
    const el = document.getElementById(optId(active));
    if (!el) return;
    const box = list.current;
    if (el.offsetTop < box.scrollTop || el.offsetTop + el.offsetHeight > box.scrollTop + box.clientHeight) {
      box.scrollTop = el.offsetTop - box.clientHeight / 2 + el.offsetHeight / 2;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- optId is derived from listId
  }, [shown, active]);

  const pick = (key: string) => {
    onPick(key);
    setOpen(false);
    setActiveKey(null);
  };
  const move = (by: number) => {
    if (!items.length) return;
    const i = items.findIndex((x) => x.key === active);
    setActiveKey(items[(i + by + items.length) % items.length].key);
  };

  return (
    <div className="relative">
      <Box icon={icon} error={error} trailing={trailing}>
        {prefix}
        <input
          id={id}
          role="combobox"
          aria-expanded={shown}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={shown && active ? optId(active) : undefined}
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          aria-invalid={error}
          onChange={(e) => {
            onChange(e.target.value);
            setActiveKey(null);
            setOpen(true);
          }}
          onFocus={() => {
            onFocus?.();
            if (openOnFocus) setOpen(true);
          }}
          onClick={() => openOnFocus && setOpen(true)}
          onBlur={() => {
            setOpen(false);
            setActiveKey(null);
            onBlur?.();
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              if (!shown) setOpen(true);
              else move(e.key === "ArrowDown" ? 1 : -1);
            } else if (e.key === "Enter" && shown && active) {
              e.preventDefault();
              pick(active);
            } else if (e.key === "Escape" && shown) {
              e.preventDefault();
              setOpen(false);
            }
          }}
          className={bareInput}
          {...inputProps}
        />
      </Box>
      {shown && (
        <div className={`${menuCls} top-full mt-1.5 ${menuClassName}`}>
          <ul ref={list} id={listId} role="listbox" className={`overflow-y-auto ${listClassName}`}>
            {items.map((it) => {
              const on = it.key === active;
              return (
                <li
                  key={it.key}
                  id={optId(it.key)}
                  role="option"
                  aria-selected={it.key === selectedKey || on}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActiveKey(it.key)}
                  onClick={() => pick(it.key)}
                  className={rowCls(on || it.key === selectedKey, !!it.sub)}
                >
                  {it.icon && <Icon name={it.icon} size={18} className="text-[var(--icon-primary)]" />}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate type-ui text-primary">{it.title}</span>
                    {it.sub && <span className="truncate type-body-sm text-secondary">{it.sub}</span>}
                  </span>
                  {it.meta && <span className="shrink-0 whitespace-nowrap type-body-sm text-secondary">{it.meta}</span>}
                  {it.key === selectedKey && <Icon name="check" size={16} className="text-brand" />}
                </li>
              );
            })}
          </ul>
          {footer && (
            <div onMouseDown={(e) => e.preventDefault()}>
              {items.length > 0 && <div className="my-1 h-px bg-gray-100" />}
              {footer}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Typed text with the part that matched the query in brand green ("Pat|na Airport").
export function Highlight({ text, query }: { text: string; query: string }) {
  const i = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <span className="text-brand">{text.slice(i, i + query.length)}</span>
      {text.slice(i + query.length)}
    </>
  );
}

/* ---------------------------------- pickup time --------------------------------- */

// Figma 3B.11: a 15-minute list centred on the usual slot; typing a time
// ("4:20", "1630", "6 pm") also works.
export function TimeField({
  id,
  value,
  onChange,
  around,
  error,
}: {
  id: string;
  value: string; // "HH:MM" or ""
  onChange: (t: string) => void;
  around: string; // slot to centre the list on when nothing is chosen
  error?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");
  const typed = focused ? parseTime(draft) : "";
  const keys = [...new Set([...SLOTS, ...(typed ? [typed] : []), ...(value ? [value] : [])])].sort();
  const anchor = typed || value || around;
  // Nearest slot to the anchor, so "4:20" highlights itself and "" the usual slot.
  const prefer = keys.reduce((best, k) => (Math.abs(toMin(k) - toMin(anchor)) < Math.abs(toMin(best) - toMin(anchor)) ? k : best), keys[0]);

  return (
    <SuggestField
      id={id}
      icon="clock"
      error={error}
      placeholder="Choose a time"
      value={focused ? draft : value ? clock(value, true) : ""}
      onChange={setDraft}
      onFocus={() => {
        setFocused(true);
        setDraft(value ? clock(value) : "");
      }}
      onBlur={() => {
        setFocused(false);
        if (!draft.trim()) onChange("");
        else if (parseTime(draft)) onChange(parseTime(draft));
      }}
      openOnFocus
      items={keys.map((k) => ({ key: k, title: clock(k) }))}
      preferKey={prefer}
      selectedKey={value}
      onPick={(k) => {
        onChange(k);
        setDraft(clock(k));
      }}
      listClassName="max-h-[200px]"
      trailing={
        error ? (
          <Icon name="warning-circle" size={20} className="pointer-events-none text-[var(--support-error)]" />
        ) : (
          <Icon name="caret-down" size={18} className="pointer-events-none" />
        )
      }
    />
  );
}

// Next half hour after "HH:MM" — the default centre of the time list.
export const nextHalfHour = (t: string) => fromMin(Math.ceil(toMin(t) / 30) * 30);

/* ----------------------------------- other date --------------------------------- */

const WEEK = ["M", "T", "W", "T", "F", "S", "S"];

// Figma 3B.12: "Other" tile in the date strip. Opens a month calendar for
// dates past the next six days; fully booked days are faded.
export function OtherDate({
  value,
  inStrip,
  min,
  fullDays,
  onChange,
}: {
  value: string;
  inStrip: boolean;
  min: string;
  fullDays: Set<string>; // every car already promised that day
  onChange: (d: string) => void;
}) {
  const { open, setOpen, ref } = usePopover();
  const on = !inStrip && !!value;
  const [month, setMonth] = useState(() => (value && !inStrip ? value : addDays(min, 7)).slice(0, 7));
  const label = on ? new Date(`${value}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }) : "Other";

  const first = new Date(`${month}-01T00:00:00Z`);
  const lead = (first.getUTCDay() + 6) % 7; // Monday first
  const days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const cells = [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
  while (cells.length % 7) cells.push(null);
  const shift = (n: number) => {
    const d = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + n, 1));
    setMonth(d.toISOString().slice(0, 7));
  };
  const title = first.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
  const navBtn = "grid size-7 place-items-center rounded-full text-[var(--icon-primary)] transition-colors hover:bg-layer-hover disabled:opacity-30";

  return (
    <div ref={ref} className="min-w-0">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={on ? `Date ${label}. Pick another date` : "Pick another date"}
        onClick={() => setOpen(!open)}
        className={`flex size-full min-w-0 flex-col items-center justify-center gap-1 rounded-md border px-4 py-2.5 transition-colors ${
          on
            ? "border-transparent bg-brand text-on-color"
            : open
              ? "border-[1.5px] border-brand text-[var(--icon-secondary)]"
              : "border-gray-200 bg-layer text-[var(--icon-secondary)] hover:bg-layer-hover"
        }`}
      >
        <Icon name="calendar-blank" size={22} />
        <span className={`truncate type-body-sm ${on ? "" : "text-secondary"}`}>{label}</span>
      </button>
      {open && (
        <div role="dialog" aria-label="Pick a date" className={`${menuCls} right-0 top-full mt-1.5 w-80 max-w-[calc(100vw-2rem)] gap-3 p-4`}>
          <div className="flex items-center">
            <button type="button" aria-label="Previous month" disabled={month <= min.slice(0, 7)} onClick={() => shift(-1)} className={navBtn}>
              <Icon name="arrow-left" size={18} />
            </button>
            <p className="flex-1 text-center type-h4 text-primary">{title}</p>
            <button type="button" aria-label="Next month" onClick={() => shift(1)} className={navBtn}>
              <Icon name="arrow-right" size={18} />
            </button>
          </div>
          <div className="flex flex-col gap-1">
            <div className="grid grid-cols-7">
              {WEEK.map((w, i) => (
                <span key={i} className="text-center type-body-sm text-secondary">
                  {w}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
              {cells.map((d, i) => {
                if (!d) return <span key={i} className="h-9" />;
                const past = d < min;
                const full = fullDays.has(d);
                const chosen = d === value;
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={past}
                    aria-pressed={chosen}
                    title={full ? "Every car is booked this day" : undefined}
                    onClick={() => {
                      onChange(d);
                      setOpen(false);
                    }}
                    className={`grid h-9 place-items-center rounded-md type-ui transition-colors ${
                      chosen
                        ? "bg-brand text-on-color"
                        : past || full
                          ? "text-secondary opacity-45 enabled:hover:bg-layer-hover"
                          : "text-primary hover:bg-layer-hover"
                    }`}
                  >
                    {Number(d.slice(8))}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------- assign a car -------------------------------- */

export type CarChoice = { key: string; title: string; sub: string };

// Figma 3B.13: "Assign a car" opens upward over the class tiles and lists only
// free cars of the picked type (vendor cars when none of ours are free).
export function CarPicker({
  id,
  label,
  choices,
  value,
  empty,
  onChange,
}: {
  id: string;
  label: string; // closed field text, "Decide later" when nothing chosen
  choices: CarChoice[];
  value: string; // key of the chosen car, "" = decide later
  empty: string; // shown when no car is free
  onChange: (key: string) => void;
}) {
  const { open, setOpen, ref } = usePopover();
  const listId = useId();
  const options: CarChoice[] = value ? [{ key: "", title: "Decide later", sub: "Pick a car nearer the day" }, ...choices] : choices;

  return (
    <div ref={ref} className="relative">
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={`flex h-12 w-full items-center gap-2.5 rounded-md border bg-layer px-3.5 text-left text-secondary transition-colors ${
          open ? "border-focus ring-1 ring-focus" : "border-gray-200 hover:bg-layer-hover"
        }`}
      >
        <Icon name="car-simple" size={20} />
        <span className={`min-w-0 flex-1 truncate type-body-md ${value ? "text-primary" : "text-secondary"}`}>{label}</span>
        <Icon name="caret-down" size={18} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul id={listId} role="listbox" aria-label="Assign a car" className={`${menuCls} inset-x-0 bottom-full mb-1.5 max-h-[290px] overflow-y-auto`}>
          {options.length === 0 && <li className="px-3.5 py-2.5 type-body-sm text-secondary">{empty}</li>}
          {options.map((c) => {
            const on = c.key === value;
            return (
              <li key={c.key || "later"} role="option" aria-selected={on}>
                <button
                  type="button"
                  autoFocus={on || (!value && c === options[0])}
                  onClick={() => {
                    onChange(c.key);
                    setOpen(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
                    e.preventDefault();
                    const sib = (e.currentTarget.parentElement?.[e.key === "ArrowDown" ? "nextElementSibling" : "previousElementSibling"] as HTMLElement | null)?.querySelector("button");
                    sib?.focus();
                  }}
                  className={`${rowCls(on, true)} hover:bg-layer-hover focus:bg-layer-selected focus:outline-none`}
                >
                  <Icon name="car-simple" size={18} className="text-[var(--icon-primary)]" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate type-ui text-primary">{c.title}</span>
                    <span className="truncate type-body-sm text-secondary">{c.sub}</span>
                  </span>
                  {on && <Icon name="check" size={16} className="text-brand" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
