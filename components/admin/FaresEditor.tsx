"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { publishFares, type FaresInput } from "@/app/admin/fares-actions";
import CarPicker, { type FleetCar } from "@/components/admin/fares/CarPicker";
import FaresDialog from "@/components/admin/fares/FaresDialog";
import Icon from "@/components/admin/Icon";
import { btnDanger, btnGhost, btnPrimary } from "@/components/admin/ui";
import { inr, type Fares } from "@/lib/catalogTypes";
import type { FareExtra, RouteFare } from "@/lib/fares";

// Figma "Flow 5 · Fares": 5.1 overview · 5.2 editing · 5.3 published · 5.4 couldn't
// publish · 5.5 leave without publishing · 5.6 published elsewhere · 5.7 adding a
// route · 5.8 new row missing a price · 5.9 removing an entry (Undo) · 5.10
// publishing (locked) · 5.12 class still in use · 5.13 adding a car class ·
// 5.14 route already exists. (5.11 "Fares didn't load" is fares/FaresLoadFailed.)

// ---- Draft rows ---------------------------------------------------------------
// Prices are edited as strings so a field can be empty mid-typing. A row with no
// id/slug is new; `removed` marks an existing row that goes on publish (Undo).

type ClassRow = { key: string; id?: string; name: string; rate: string; cars: string[]; removed?: boolean };
type PkgRow = { key: string; id?: string; name: string; for: string; price: string; removed?: boolean };
type RouteRow = { key: string; slug?: string; label: string; distance: string; km: string; price: string; custom?: boolean; removed?: boolean };
type ExtraRow = { key: string; id?: string; label: string; value: string; removed?: boolean };
type Draft = { classes: ClassRow[]; packages: PkgRow[]; routes: RouteRow[]; night: string; extras: ExtraRow[] };

// One edit, for the unsaved bar and the published toast.
// `subject` names the change in the published toast (5.3: "Nexon now ₹14/km").
type Change = { key: string; label: string; subject?: string; before?: string; after?: string };
// Something that keeps Save and publish off (5.8, 5.14). `field` is the input to focus.
type Problem = { key: string; field: string; message: string; isNew: boolean; hint?: string };

const grouped = (n: number) => n.toLocaleString("en-IN");
const toNumber = (s: string) => {
  const n = Number(s.replace(/[,\s₹]/g, ""));
  return s.trim() !== "" && Number.isInteger(n) && n >= 0 ? n : NaN;
};
const shownPrice = (s: string, suffix = "") => {
  const n = toNumber(s);
  return Number.isNaN(n) ? s : `${inr(n)}${suffix}`;
};
const goodPrice = (s: string) => {
  const n = toNumber(s);
  return !Number.isNaN(n) && n > 0;
};
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
// "Dumraon → Bodh Gaya" (also "->" or " to ") → ["Dumraon", "Bodh Gaya"]
const splitRoute = (s: string): [string, string] | null => {
  const parts = s.split(/\s*(?:→|->|—|–)\s*|\s+to\s+/i).map((p) => p.trim());
  return parts.length === 2 && parts[0] && parts[1] ? [parts[0], parts[1]] : null;
};
const andList = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const timeLabel = (iso: string) =>
  iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).toUpperCase() : "just now";

function toDraft(fares: Fares, routes: RouteFare[], extras: FareExtra[], cars: FleetCar[]): Draft {
  return {
    classes: fares.perKm.map((c) => ({ key: `c:${c.id}`, id: c.id, name: c.name, rate: grouped(c.rate), cars: cars.filter((car) => car.fareClass === c.id).map((car) => car.id) })),
    packages: fares.hourly.map((p) => ({ key: `p:${p.id}`, id: p.id, name: p.name, for: p.for, price: grouped(p.price) })),
    routes: routes.map((r) => ({ key: `r:${r.slug}`, slug: r.slug, label: `${r.from} → ${r.to}`, distance: r.distance, km: "", price: grouped(r.price), custom: r.custom })),
    night: grouped(fares.nightAllowance),
    extras: extras.map((e) => ({ key: `x:${e.id}`, id: e.id, label: e.label, value: e.value })),
  };
}

// ---- Layout pieces --------------------------------------------------------------

function FareCard({ title, sub, head, children, add }: { title: string; sub: string; head: React.ReactNode; children: React.ReactNode; add?: React.ReactNode }) {
  return (
    <section className="w-full overflow-hidden rounded-xl border border-gray-100 bg-layer">
      <div className="flex flex-col gap-0.5 border-b border-gray-100 px-5 pb-3.5 pt-4">
        <h2 className="type-h4 text-primary">{title}</h2>
        <p className="type-body-sm text-secondary">{sub}</p>
      </div>
      <div className="flex gap-4 bg-layer-accent px-5 py-2 type-body-sm text-secondary">{head}</div>
      <div className="divide-y divide-gray-100">{children}</div>
      {add}
    </section>
  );
}

// "+ Add route" link at the foot of a table in edit mode.
function AddRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="border-t border-gray-100 px-5 py-3">
      <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 rounded-full type-ui text-link transition-colors hover:text-link-hover disabled:cursor-not-allowed disabled:opacity-40">
        <Icon name="plus" size={16} />
        {label}
      </button>
    </div>
  );
}

// Grey hint line under a row (removed / new class) or a red one for a problem (5.14).
const Hint = ({ children, bad }: { children: React.ReactNode; bad?: boolean }) => (
  <p className={`!border-t-0 px-5 pb-2.5 type-body-sm ${bad ? "text-tag-red" : "text-secondary"}`}>{children}</p>
);

const firstCol = (editing: boolean) => (editing ? "w-24 shrink-0" : "w-24 shrink-0 sm:w-[130px]");
const priceCol = "w-[110px] shrink-0";
const rowCls = (editing: boolean, wrap = false) =>
  `flex items-center gap-x-4 gap-y-2 px-5 ${editing ? "py-2" : "py-3"} ${wrap ? "flex-wrap sm:flex-nowrap" : ""}`;
const RemoveSpacer = () => <span className="w-[18px] shrink-0" aria-hidden="true" />;

type Tone = "plain" | "changed" | "new" | "bad";
const toneCls: Record<Tone, string> = {
  plain: "border border-gray-200 bg-layer",
  changed: "border-[1.5px] border-brand bg-hover",
  new: "border-[1.5px] border-brand bg-hover",
  bad: "border-[1.5px] border-negative bg-negative-subtle",
};

// A field cell: optional prefix ("₹", "km"), input, optional suffix ("/night").
function Cell({
  id,
  value,
  onChange,
  label,
  tone,
  prefix,
  suffix,
  numeric,
  placeholder,
  className = "",
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  label: string;
  tone: Tone;
  prefix?: string;
  suffix?: string;
  numeric?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`flex min-w-0 items-center gap-1 rounded-md px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-focus/20 ${toneCls[tone]} ${className}`}>
      {prefix && <span className="shrink-0 type-body-sm text-secondary">{prefix}</span>}
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={numeric ? "numeric" : undefined}
        aria-label={label}
        aria-invalid={tone === "bad"}
        placeholder={placeholder}
        style={{ outline: "none" }}
        className="w-full min-w-0 bg-transparent type-ui text-primary placeholder:text-placeholder disabled:cursor-not-allowed"
      />
      {suffix && <span className="shrink-0 type-body-sm text-secondary">{suffix}</span>}
    </label>
  );
}

// Trash (remove) or the green Undo arrow for a row marked to go (5.9).
function RowAction({ removed, label, onRemove, onUndo }: { removed?: boolean; label: string; onRemove: () => void; onUndo: () => void }) {
  return removed ? (
    <button type="button" onClick={onUndo} aria-label={`Undo remove ${label}`} title="Undo" className="grid size-[18px] shrink-0 place-items-center text-brand hover:text-link-hover disabled:opacity-40">
      <Icon name="arrow-counter-clockwise" size={18} />
    </button>
  ) : (
    <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} title="Remove" className="grid size-[18px] shrink-0 place-items-center text-[var(--icon-secondary)] hover:text-error disabled:opacity-40">
      <Icon name="trash" size={18} />
    </button>
  );
}

const struck = "line-through opacity-45";

// ---- Editor ---------------------------------------------------------------------

export default function FaresEditor({
  fares,
  routes,
  extras,
  cars,
  servicePages,
  startInEdit,
}: {
  fares: Fares;
  routes: RouteFare[];
  extras: FareExtra[];
  cars: FleetCar[];
  servicePages: number;
  startInEdit: boolean;
}) {
  const router = useRouter();
  const saved = useMemo(() => toDraft(fares, routes, extras, cars), [fares, routes, extras, cars]);
  const [editing, setEditing] = useState(startInEdit);
  const [draft, setDraft] = useState<Draft>(saved);
  // updatedAt the edit started from — the server refuses to overwrite a newer publish (5.6).
  const [base, setBase] = useState(fares.updatedAt ?? "");
  const [error, setError] = useState("");
  const [tried, setTried] = useState(false); // a publish was attempted: show every problem in red
  const [published, setPublished] = useState<Change[] | null>(null);
  const [toast, setToast] = useState(false);
  const [failed, setFailed] = useState(false); // 5.4
  const [conflict, setConflict] = useState<string | null>(null); // 5.6: when the other publish happened
  const [reloading, setReloading] = useState(false);
  const [leaveTo, setLeaveTo] = useState<string | null>(null); // 5.5
  const [discarding, setDiscarding] = useState(false);
  const [inUse, setInUse] = useState<{ name: string; cars: string[] } | null>(null); // 5.12
  const [pending, startTransition] = useTransition();
  const nextKey = useRef(0);
  const newKey = () => `n${++nextKey.current}`;

  // "Load the latest" (5.6): once the fresh fares arrive, start editing from them.
  if (reloading && (fares.updatedAt ?? "") !== base) {
    setReloading(false);
    setBase(fares.updatedAt ?? "");
    setDraft(saved);
    setError("");
  }

  const classNames = useMemo(() => Object.fromEntries(fares.perKm.map((c) => [c.id, c.name])), [fares.perKm]);
  const carsText = (ids: string[]) => [...new Set(cars.filter((c) => ids.includes(c.id)).map((c) => c.name))].join(" · ");
  // Cars picked for a new class leave their old class on publish.
  const movingCars = new Set(draft.classes.filter((c) => !c.id).flatMap((c) => c.cars));

  // ---- What changed ----
  const changes = useMemo<Change[]>(() => {
    const list: Change[] = [];
    const was = <T extends { key: string }>(rows: T[], key: string) => rows.find((r) => r.key === key);
    for (const c of draft.classes) {
      const old = was(saved.classes, c.key);
      if (!old) list.push({ key: c.key, label: `New car class ${c.name || "…"}`, after: goodPrice(c.rate) ? `${shownPrice(c.rate)} per km` : undefined });
      else if (c.removed) list.push({ key: c.key, label: `Remove ${old.name}` });
      else if (c.rate !== old.rate)
        list.push({ key: c.key, label: old.name, subject: carsText(old.cars) || old.name, before: shownPrice(old.rate), after: `${shownPrice(c.rate)} per km` });
    }
    for (const p of draft.packages) {
      const old = was(saved.packages, p.key);
      if (!old) list.push({ key: p.key, label: `New package ${p.name || "…"}`, after: goodPrice(p.price) ? shownPrice(p.price) : undefined });
      else if (p.removed) list.push({ key: p.key, label: `Remove ${old.name}` });
      else if (p.price !== old.price) list.push({ key: p.key, label: old.name, before: shownPrice(old.price), after: shownPrice(p.price) });
    }
    for (const r of draft.routes) {
      const old = was(saved.routes, r.key);
      if (!old) list.push({ key: r.key, label: `New route ${r.label || "…"}`, after: goodPrice(r.price) ? shownPrice(r.price) : undefined });
      else if (r.removed) list.push({ key: r.key, label: `Remove ${old.label}` });
      else if (r.price !== old.price) list.push({ key: r.key, label: old.label, before: shownPrice(old.price), after: shownPrice(r.price) });
    }
    if (draft.night !== saved.night) list.push({ key: "night", label: "Night allowance", before: shownPrice(saved.night), after: `${shownPrice(draft.night)}/night` });
    for (const x of draft.extras) {
      const old = was(saved.extras, x.key);
      if (!old) list.push({ key: x.key, label: `New extra ${x.label || "…"}`, after: x.value || undefined });
      else if (x.removed) list.push({ key: x.key, label: `Remove ${old.label}` });
      else if (x.value.trim() !== old.value) list.push({ key: x.key, label: old.label, before: old.value || "—", after: x.value.trim() || "—" });
    }
    return list;
    // carsText reads `cars`, already a dependency of `saved`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, saved]);

  // ---- What blocks publishing ----
  const problems = useMemo<Problem[]>(() => {
    const out: Problem[] = [];
    const seenClass = new Map<string, ClassRow>();
    for (const c of draft.classes) if (!c.removed) seenClass.set(norm(c.name), seenClass.get(norm(c.name)) ?? c);
    for (const c of draft.classes) {
      if (c.removed) continue;
      const isNew = !c.id;
      const name = c.name.trim();
      if (isNew && !name) out.push({ key: c.key, field: "name", message: "New car class needs a name", isNew });
      else if (isNew && seenClass.get(norm(name)) !== c) out.push({ key: c.key, field: "name", message: `${name} is already listed`, isNew, hint: `${name} is already a car class. Change that row instead.` });
      if (!goodPrice(c.rate)) out.push({ key: c.key, field: "price", message: `${name || "New car class"} needs a rate`, isNew });
    }
    for (const p of draft.packages) {
      if (p.removed) continue;
      const isNew = !p.id;
      if (isNew && (!p.name.trim() || !p.for.trim())) out.push({ key: p.key, field: p.name.trim() ? "for" : "name", message: `${p.name.trim() || "New package"} needs a name and what it is good for`, isNew });
      if (!goodPrice(p.price)) out.push({ key: p.key, field: "price", message: `${p.name.trim() || "New package"} needs a price`, isNew });
    }
    const pairs = new Map<string, RouteRow>();
    for (const r of draft.routes) {
      const pr = splitRoute(r.label);
      if (r.removed || !pr) continue;
      const k = `${norm(pr[0])}→${norm(pr[1])}`;
      if (!pairs.has(k) || (pairs.get(k)!.slug === undefined && r.slug)) pairs.set(k, r);
    }
    for (const r of draft.routes) {
      if (r.removed) continue;
      const isNew = !r.slug;
      const pr = splitRoute(r.label);
      const name = r.label.trim() || "New route";
      if (isNew) {
        if (!pr) out.push({ key: r.key, field: "name", message: `${name} needs a pickup and a drop`, isNew, hint: r.label.trim() ? "Write it as pickup → drop, like Dumraon → Gaya." : undefined });
        else {
          const first = pairs.get(`${norm(pr[0])}→${norm(pr[1])}`);
          if (first && first !== r) {
            out.push({
              key: r.key,
              field: "price",
              message: `${pr[0]} → ${pr[1]} is already listed`,
              isNew,
              hint: first.slug ? `${pr[0]} → ${pr[1]} is already a route at ${shownPrice(first.price)}. Change that row instead.` : `${pr[0]} → ${pr[1]} is already in the table.`,
            });
            continue;
          }
        }
        if (!goodPrice(r.km)) out.push({ key: r.key, field: "km", message: `${name} needs a distance`, isNew });
      }
      if (!goodPrice(r.price)) out.push({ key: r.key, field: "price", message: `${name} needs a price`, isNew });
    }
    if (Number.isNaN(toNumber(draft.night))) out.push({ key: "night", field: "price", message: "Night allowance needs a whole number", isNew: false });
    for (const x of draft.extras) {
      if (x.removed || x.id) continue;
      if (!x.label.trim()) out.push({ key: x.key, field: "name", message: "New extra needs a name", isNew: true });
      else if (!x.value.trim()) out.push({ key: x.key, field: "value", message: `${x.label.trim()} needs a value`, isNew: true });
    }
    return out;
  }, [draft]);

  const problemAt = (key: string, field: string) => problems.find((p) => p.key === key && p.field === field);
  // Empty new fields wait for a publish attempt before turning red; wrong ones show at once.
  const isBad = (key: string, field: string, value: string) => {
    const p = problemAt(key, field);
    return !!p && (tried || value.trim() !== "" || !!p.hint);
  };

  const dirty = editing && changes.length > 0;

  // Warn before closing the tab with unpublished edits.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // 5.5 — in-app links (sidebar etc.) ask first. Capture phase runs before Next's <Link>.
  useEffect(() => {
    if (!dirty) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!(a instanceof HTMLAnchorElement) || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
      e.preventDefault();
      e.stopPropagation();
      setLeaveTo(url.pathname + url.search + url.hash);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [dirty]);

  // The published toast hides itself after a while.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(false), 8000);
    return () => clearTimeout(t);
  }, [toast]);

  function startEdit() {
    setDraft(saved);
    setBase(fares.updatedAt ?? "");
    setPublished(null);
    setToast(false);
    setError("");
    setTried(false);
    setEditing(true);
  }

  function discardNow() {
    setDraft(saved);
    setError("");
    setTried(false);
    setDiscarding(false);
    setEditing(false);
  }

  function focusProblem(p: Problem) {
    const el = document.getElementById(`fare-${p.key}-${p.field}`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    el?.focus({ preventScroll: true });
  }

  function publish(force = false) {
    if (problems.length) {
      setTried(true);
      focusProblem(problems[0]);
      return;
    }
    setError("");
    const done = changes;
    const live = <T extends { removed?: boolean }>(rows: T[]) => rows.filter((r) => !r.removed);
    const input: FaresInput = {
      base,
      force,
      perKm: live(draft.classes).map((c) => ({ id: c.id, name: c.name.trim(), rate: toNumber(c.rate), cars: c.id ? undefined : c.cars })),
      hourly: live(draft.packages).map((p) => ({ id: p.id, name: p.name.trim(), for: p.for.trim(), price: toNumber(p.price) })),
      routes: live(draft.routes).map((r) => {
        const [from, to] = splitRoute(r.label) ?? ["", ""];
        return { slug: r.slug, from, to, km: r.slug ? 0 : toNumber(r.km), price: toNumber(r.price) };
      }),
      nightAllowance: toNumber(draft.night),
      extras: live(draft.extras).map((x) => ({ id: x.id, label: x.label.trim(), value: x.value.trim() })),
    };
    startTransition(async () => {
      const res = await publishFares(input).catch(() => null);
      setFailed(!res);
      if (!res) return;
      if (res.conflict !== undefined) {
        setConflict(res.conflict);
        return;
      }
      setConflict(null);
      if (res.error) setError(res.error);
      else {
        setEditing(false);
        setPublished(done);
        setToast(true);
      }
    });
  }

  function loadLatest() {
    setConflict(null);
    setReloading(true);
    router.refresh();
  }

  // ---- Row edits ----
  type ListKey = "classes" | "packages" | "routes" | "extras";
  const patch = <K extends ListKey>(list: K, key: string, p: Partial<Draft[K][number]>) =>
    setDraft((d) => ({ ...d, [list]: (d[list] as Draft[K][number][]).map((r) => (r.key === key ? { ...r, ...p } : r)) }));
  const removeRow = (list: ListKey, key: string) =>
    setDraft((d) => ({
      ...d,
      [list]: (d[list] as { key: string; id?: string; slug?: string; removed?: boolean }[])
        .map((r) => (r.key === key ? (r.id || r.slug ? { ...r, removed: true } : null) : r))
        .filter(Boolean),
    }));
  const add = (list: ListKey, row: object) => {
    const key = newKey();
    setDraft((d) => ({ ...d, [list]: [...d[list], { key, ...row }] }));
    setTimeout(() => document.getElementById(`fare-${key}-name`)?.focus(), 0);
  };

  function removeClass(c: ClassRow) {
    if (c.id) {
      const users = cars.filter((car) => car.fareClass === c.id && !movingCars.has(car.id));
      if (users.length) {
        setInUse({ name: c.name, cars: [...new Set(users.map((u) => u.name))] });
        return;
      }
    }
    removeRow("classes", c.key);
  }

  function pickCars(key: string, ids: string[]) {
    // Each car sits in one class: picking it here takes it out of other new rows.
    setDraft((d) => ({
      ...d,
      classes: d.classes.map((c) => (c.key === key ? { ...c, cars: ids } : c.id ? c : { ...c, cars: c.cars.filter((x) => !ids.includes(x)) })),
    }));
  }

  const justPublished = new Set(published?.map((c) => c.key));
  const shown = editing ? draft : saved;

  // A price: plain text when viewing (green if just published), a ₹ field when editing.
  const priceCell = (key: string, value: string, original: string | undefined, label: string, set: (v: string) => void, opts: { suffix?: string; removed?: boolean } = {}) => {
    if (!editing)
      return <p className={`${priceCol} type-ui ${justPublished.has(key) ? "text-brand" : "text-primary"}`}>{shownPrice(value, opts.suffix)}</p>;
    const tone: Tone = isBad(key, "price", value) ? "bad" : original === undefined ? "new" : value !== original ? "changed" : "plain";
    return (
      <Cell
        id={`fare-${key}-price`}
        value={value}
        onChange={set}
        label={label}
        tone={opts.removed ? "plain" : tone}
        prefix="₹"
        suffix={opts.suffix && editing ? opts.suffix : undefined}
        numeric
        className={`${priceCol} ${opts.removed ? struck : ""}`}
      />
    );
  };

  const updatedAt = fares.updatedAt ? `Last published ${dateLabel(fares.updatedAt)}` : "Starting fares — not yet published from the admin";
  const where = `/fleet, /booking, /routes and ${servicePages} service pages`;
  const status = published ? `Published just now · live on ${where}` : `${updatedAt} · shown on ${where}`;

  const savedKeys = (rows: { key: string }[]) => new Set(rows.map((r) => r.key));
  const savedClassKeys = savedKeys(saved.classes);
  const savedPkgKeys = savedKeys(saved.packages);
  const savedRouteKeys = savedKeys(saved.routes);
  const savedExtraKeys = savedKeys(saved.extras);
  const old = <T extends { key: string }>(rows: T[], key: string) => rows.find((r) => r.key === key);

  // Bar copy.
  const badRows = new Set(problems.map((p) => p.key)).size;
  const fixTitle = problems.length
    ? `Fix ${badRows} ${problems.every((p) => p.isNew) ? "new " : ""}entr${badRows === 1 ? "y" : "ies"} to publish`
    : "";
  const priced = changes.filter((c) => c.before !== undefined);
  const lead = priced[priced.length - 1] ?? changes[changes.length - 1];
  const others = changes.filter((c) => c !== lead).map((c) => c.label);

  return (
    <div className={editing ? "pb-28" : ""}>
      {/* Header composed here (not PageHeader) so the long status line wraps
          under the buttons on phones instead of squeezing into a sliver. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-[min(100%,20rem)] flex-1">
          <h1 className="type-h2 text-primary">{editing ? "Fares · editing" : "Fares"}</h1>
          <p className="mt-1 flex items-start gap-1.5 type-body-sm text-secondary">
            <Icon name="clock" size={14} className="mt-0.75 shrink-0" />
            {status}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {editing ? (
            <>
              <button type="button" onClick={() => (changes.length ? setDiscarding(true) : discardNow())} disabled={pending} className={btnGhost}>
                Discard
              </button>
              <button type="button" onClick={() => publish()} disabled={pending || changes.length === 0 || problems.length > 0} className={btnPrimary}>
                {!pending && <Icon name="check" size={16} />}
                {pending ? "Publishing…" : "Save and publish"}
              </button>
            </>
          ) : (
            <button type="button" onClick={startEdit} className={published ? btnGhost : btnPrimary}>
              <Icon name="pencil-simple" size={16} />
              Edit fares
            </button>
          )}
        </div>
      </div>

      {/* 5.10 — everything is locked while the publish is on its way. */}
      <fieldset disabled={editing && pending} className="mt-5 grid min-w-0 items-start gap-5 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-5">
          {/* ---- Outstation per km ---- */}
          <FareCard
            title="Outstation · per kilometre"
            sub="Billed garage to garage on total km."
            head={
              <>
                <p className={`${firstCol(editing)} max-sm:flex-1`}>Class</p>
                <p className="hidden min-w-0 flex-1 sm:block">Cars</p>
                <p className={priceCol}>Rate</p>
                {editing && <RemoveSpacer />}
              </>
            }
            add={editing && <AddRow label="Add car class" onClick={() => add("classes", { name: "", rate: "", cars: [] })} />}
          >
            {shown.classes.map((c) => {
              const isNew = editing && !savedClassKeys.has(c.key);
              const was = old(saved.classes, c.key);
              const names = carsText(c.cars) || "No cars in this class";
              return (
                <div key={c.key}>
                  <div className={rowCls(editing, isNew)}>
                    {isNew ? (
                      <Cell id={`fare-${c.key}-name`} value={c.name} onChange={(v) => patch("classes", c.key, { name: v })} label="Class name" tone={isBad(c.key, "name", c.name) ? "bad" : "new"} placeholder="Class" className={`${firstCol(true)} max-sm:flex-1`} />
                    ) : (
                      <div className={`${firstCol(editing)} max-sm:flex-1 ${c.removed ? struck : ""}`}>
                        <p className="type-ui text-primary">{c.name}</p>
                        <p className="type-body-sm text-secondary sm:hidden">{names}</p>
                      </div>
                    )}
                    {isNew ? (
                      <CarPicker cars={cars} classNames={classNames} value={c.cars} onChange={(ids) => pickCars(c.key, ids)} label={`Cars in ${c.name || "the new class"}`} className="order-last basis-full sm:order-none sm:min-w-0 sm:flex-1 sm:basis-auto" />
                    ) : (
                      <p className={`hidden min-w-0 flex-1 type-body-sm text-secondary sm:block ${c.removed ? struck : ""}`}>{names}</p>
                    )}
                    {priceCell(c.key, c.rate, was?.rate, `${c.name || "New class"} rate per km`, (v) => patch("classes", c.key, { rate: v }), { suffix: editing ? undefined : "/km", removed: c.removed })}
                    {editing && <RowAction removed={c.removed} label={c.name || "new class"} onRemove={() => removeClass(c)} onUndo={() => patch("classes", c.key, { removed: false })} />}
                  </div>
                  {c.removed && <Hint>Comes off /fleet and the booking form when you publish. Undo to keep it.</Hint>}
                  {problemAt(c.key, "name")?.hint && <Hint bad>{problemAt(c.key, "name")!.hint}</Hint>}
                </div>
              );
            })}
            {editing && draft.classes.some((c) => !c.id) && <Hint>Cars come from Fleet. Each car sits in one class.</Hint>}
          </FareCard>

          {/* ---- Hourly packages ---- */}
          <FareCard
            title="Local · hourly packages"
            sub="Car with driver, kilometres bundled."
            head={
              <>
                <p className={`${firstCol(editing)} max-sm:flex-1`}>Package</p>
                <p className="hidden min-w-0 flex-1 sm:block">Good for</p>
                <p className={priceCol}>From</p>
                {editing && <RemoveSpacer />}
              </>
            }
            add={editing && <AddRow label="Add package" onClick={() => add("packages", { name: "", for: "", price: "" })} />}
          >
            {shown.packages.map((p) => {
              const isNew = editing && !savedPkgKeys.has(p.key);
              const was = old(saved.packages, p.key);
              return (
                <div key={p.key}>
                  <div className={rowCls(editing, isNew)}>
                    {isNew ? (
                      <>
                        <Cell id={`fare-${p.key}-name`} value={p.name} onChange={(v) => patch("packages", p.key, { name: v })} label="Package name" tone={isBad(p.key, "name", p.name) ? "bad" : "new"} placeholder="6 hr / 60 km" className={`${firstCol(true)} max-sm:flex-1`} />
                        <Cell id={`fare-${p.key}-for`} value={p.for} onChange={(v) => patch("packages", p.key, { for: v })} label="Good for" tone={isBad(p.key, "for", p.for) ? "bad" : "new"} placeholder="Good for" className="order-last basis-full sm:order-none sm:flex-1 sm:basis-auto" />
                      </>
                    ) : (
                      <>
                        <div className={`${firstCol(editing)} max-sm:flex-1 ${p.removed ? struck : ""}`}>
                          <p className="type-ui text-primary">{p.name}</p>
                          <p className="type-body-sm text-secondary sm:hidden">{p.for}</p>
                        </div>
                        <p className={`hidden min-w-0 flex-1 type-body-sm text-secondary sm:block ${p.removed ? struck : ""}`}>{p.for}</p>
                      </>
                    )}
                    {priceCell(p.key, p.price, was?.price, `${p.name || "New package"} price`, (v) => patch("packages", p.key, { price: v }), { removed: p.removed })}
                    {editing && <RowAction removed={p.removed} label={p.name || "new package"} onRemove={() => removeRow("packages", p.key)} onUndo={() => patch("packages", p.key, { removed: false })} />}
                  </div>
                  {p.removed && <Hint>Comes off /booking when you publish. Undo to keep it.</Hint>}
                </div>
              );
            })}
            {!editing && shown.packages.length === 0 && <p className="px-5 py-3 type-body-sm text-secondary">No hourly packages.</p>}
          </FareCard>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          {/* ---- Routes ---- */}
          <FareCard
            title="Route starting fares"
            sub="Shown on /routes and the home page “Popular” chips."
            head={
              <>
                <p className="min-w-0 flex-1">Route</p>
                <p className="hidden w-[120px] shrink-0 sm:block">Distance</p>
                <p className={priceCol}>From</p>
                {editing && <RemoveSpacer />}
              </>
            }
            add={
              editing && (
                <AddRow label="Add route" onClick={() => add("routes", { label: saved.routes[0] ? `${saved.routes[0].label.split(" → ")[0]} → ` : "", distance: "", km: "", price: "" })} />
              )
            }
          >
            {shown.routes.map((r) => {
              const isNew = editing && !savedRouteKeys.has(r.key);
              const was = old(saved.routes, r.key);
              const hint = problems.find((p) => p.key === r.key && p.hint)?.hint;
              return (
                <div key={r.key}>
                  <div className={rowCls(editing, isNew)}>
                    {isNew ? (
                      <>
                        <Cell id={`fare-${r.key}-name`} value={r.label} onChange={(v) => patch("routes", r.key, { label: v })} label="Route, pickup → drop" tone={isBad(r.key, "name", r.label) ? "bad" : "new"} placeholder="Dumraon → Bodh Gaya" className="max-sm:basis-full flex-1" />
                        <Cell id={`fare-${r.key}-km`} value={r.km} onChange={(v) => patch("routes", r.key, { km: v })} label="Distance in km" tone={isBad(r.key, "km", r.km) ? "bad" : "new"} prefix="km" numeric className="w-[120px] shrink-0" />
                      </>
                    ) : (
                      <>
                        <div className={`min-w-0 flex-1 ${r.removed ? struck : ""}`}>
                          {r.custom || editing ? (
                            <p className="type-ui text-primary">{r.label}</p>
                          ) : (
                            <a href={`/routes/${r.slug}`} target="_blank" rel="noreferrer" className="type-ui text-primary hover:text-link-hover">
                              {r.label}
                            </a>
                          )}
                          <p className="type-body-sm text-secondary sm:hidden">{r.distance}</p>
                        </div>
                        <p className={`hidden w-[120px] shrink-0 type-body-sm text-secondary sm:block ${r.removed ? struck : ""}`}>{r.distance}</p>
                      </>
                    )}
                    {priceCell(r.key, r.price, was?.price, `${r.label || "New route"} fare`, (v) => patch("routes", r.key, { price: v }), { removed: r.removed })}
                    {editing && <RowAction removed={r.removed} label={r.label || "new route"} onRemove={() => removeRow("routes", r.key)} onUndo={() => patch("routes", r.key, { removed: false })} />}
                  </div>
                  {r.removed && <Hint>Comes off /routes and the home page chips when you publish. Undo to keep it.</Hint>}
                  {hint && <Hint bad>{hint}</Hint>}
                </div>
              );
            })}
            {!editing && shown.routes.length === 0 && <p className="px-5 py-3 type-body-sm text-secondary">No routes listed.</p>}
          </FareCard>

          {/* ---- Extras and rules ---- */}
          <FareCard
            title="Extras and rules"
            sub="Printed under every fare table."
            head={
              <>
                <p className="min-w-0 flex-1">Item</p>
                <p className={priceCol}>Value</p>
                {editing && <RemoveSpacer />}
              </>
            }
            add={editing && <AddRow label="Add extra or rule" onClick={() => add("extras", { label: "", value: "" })} />}
          >
            <div className={rowCls(editing)}>
              <p className="min-w-0 flex-1 type-ui text-primary">Night driver allowance (outstation)</p>
              {priceCell("night", shown.night, saved.night, "Night allowance per night", (v) => setDraft((d) => ({ ...d, night: v })), { suffix: "/night" })}
              {/* Bookings and the booking slip use this number, so it stays. */}
              {editing && <RemoveSpacer />}
            </div>
            {shown.extras.map((x) => {
              const isNew = editing && !savedExtraKeys.has(x.key);
              const was = old(saved.extras, x.key);
              return (
                <div key={x.key}>
                  <div className={rowCls(editing)}>
                    {isNew ? (
                      <Cell id={`fare-${x.key}-name`} value={x.label} onChange={(v) => patch("extras", x.key, { label: v })} label="Extra or rule" tone={isBad(x.key, "name", x.label) ? "bad" : "new"} placeholder="Extra or rule" className="flex-1" />
                    ) : (
                      <p className={`min-w-0 flex-1 type-ui text-primary ${x.removed ? struck : ""}`}>{x.label}</p>
                    )}
                    {editing ? (
                      <Cell
                        id={`fare-${x.key}-value`}
                        value={x.value}
                        onChange={(v) => patch("extras", x.key, { value: v })}
                        label={`${x.label || "New extra"} value`}
                        tone={x.removed ? "plain" : isBad(x.key, "value", x.value) ? "bad" : isNew ? "new" : x.value.trim() !== was?.value ? "changed" : "plain"}
                        className={`${priceCol} ${x.removed ? struck : ""}`}
                      />
                    ) : (
                      x.value && <p className={`${priceCol} type-ui ${justPublished.has(x.key) ? "text-brand" : "text-primary"}`}>{x.value}</p>
                    )}
                    {editing && <RowAction removed={x.removed} label={x.label || "new extra"} onRemove={() => removeRow("extras", x.key)} onUndo={() => patch("extras", x.key, { removed: false })} />}
                  </div>
                  {x.removed && <Hint>Comes off the fare notes when you publish. Undo to keep it.</Hint>}
                </div>
              );
            })}
          </FareCard>
        </div>
      </fieldset>

      {/* 5.2 / 5.8 / 5.10 — floating unsaved-changes bar */}
      {editing && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-4 z-30 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border border-gray-100 bg-layer py-3 pl-5 pr-3 shadow-[0_16px_48px_0_var(--shadow-md)] sm:inset-x-auto sm:bottom-6 sm:left-1/2 sm:w-max sm:max-w-[calc(100%-3rem)] sm:-translate-x-1/2 sm:flex-nowrap md:left-[calc(50%+124px)] md:max-w-[calc(100%-248px-3rem)]"
        >
          {changes.length > 0 && <Image src="/admin-icons/unsaved-marker.svg" alt="" width={32} height={32} unoptimized />}
          <div className="min-w-0 flex-1 sm:flex-none">
            <p className="type-ui text-primary">
              {pending
                ? `Publishing ${changes.length} change${changes.length === 1 ? "" : "s"}…`
                : problems.length && changes.length
                  ? fixTitle
                  : changes.length === 0
                    ? "No changes yet"
                    : `${changes.length} unsaved change${changes.length === 1 ? "" : "s"}`}
            </p>
            {error && !pending ? (
              <p className="type-body-sm text-error" role="alert">
                {error}
              </p>
            ) : problems.length && changes.length && !pending ? (
              <button type="button" onClick={() => focusProblem(problems[0])} className="flex items-center gap-1.5 text-left type-body-sm text-secondary hover:text-primary">
                {problems[0].message}
                <Icon name="arrow-right" size={14} />
              </button>
            ) : (
              lead && (
                <p className="flex flex-wrap items-center gap-x-1.5 type-body-sm text-secondary sm:flex-nowrap sm:whitespace-nowrap">
                  {others.length > 0 && (
                    <span>
                      {others.slice(0, 2).join(" · ")}
                      {others.length > 2 ? ` +${others.length - 2} more` : ""} ·
                    </span>
                  )}
                  {lead.label}
                  {lead.before !== undefined && <span className="line-through">{lead.before}</span>}
                  {lead.after !== undefined && (
                    <>
                      <Icon name="arrow-right" size={14} />
                      <span className="type-ui text-brand">{lead.after}</span>
                    </>
                  )}
                </p>
              )
            )}
          </div>
          <div className="flex items-center gap-4 sm:pl-6">
            <button type="button" onClick={() => (changes.length ? setDiscarding(true) : discardNow())} disabled={pending} className={btnGhost}>
              {changes.length ? "Discard" : "Done"}
            </button>
            <button type="button" onClick={() => publish()} disabled={pending || changes.length === 0 || problems.length > 0} className={btnPrimary}>
              {!pending && <Icon name="check" size={16} />}
              {pending ? "Publishing…" : "Save and publish"}
            </button>
          </div>
        </div>
      )}

      {/* 5.4 — couldn't publish */}
      {failed && (
        <FaresDialog art="publish-failed" title="Couldn’t publish fares" body="Your changes are still here. Check the internet and try again. The website keeps the old rates until then." onCancel={() => setFailed(false)}>
          <button type="button" onClick={() => setFailed(false)} disabled={pending} className={btnGhost}>
            Keep editing
          </button>
          <button type="button" onClick={() => publish()} disabled={pending} className={btnPrimary}>
            {pending ? "Publishing…" : "Try again"}
          </button>
        </FaresDialog>
      )}

      {/* 5.6 — someone else published since this edit started */}
      {conflict !== null && (
        <FaresDialog
          art="fares-price-tag"
          title="Fares were just published"
          body={`Someone on another computer published new fares at ${timeLabel(conflict)}. Your ${changes.length} change${changes.length === 1 ? " is" : "s are"} still here. Load theirs first so nothing gets overwritten by mistake.`}
          onCancel={() => setConflict(null)}
        >
          <button type="button" onClick={() => publish(true)} disabled={pending} className={btnGhost}>
            {pending ? "Publishing…" : "Publish mine over it"}
          </button>
          <button type="button" onClick={loadLatest} disabled={pending} className={btnPrimary}>
            Load the latest
          </button>
        </FaresDialog>
      )}

      {/* 5.5 — leaving mid-edit */}
      {leaveTo !== null && (
        <FaresDialog
          art="fares-price-tag"
          title="Leave without publishing?"
          body={`You changed ${changes.length} fare${changes.length === 1 ? "" : "s"}. If you leave now the ${changes.length === 1 ? "change is" : "changes are"} lost and the website keeps the old rates.`}
          onCancel={() => setLeaveTo(null)}
        >
          <button type="button" onClick={() => setLeaveTo(null)} className={btnGhost}>
            Keep editing
          </button>
          <button
            type="button"
            onClick={() => {
              const to = leaveTo;
              setLeaveTo(null);
              discardNow();
              router.push(to);
            }}
            className={btnDanger}
          >
            Leave and discard
          </button>
        </FaresDialog>
      )}

      {/* Discard from the header or the bar — same question, staying on the page. */}
      {discarding && (
        <FaresDialog
          art="fares-price-tag"
          title="Discard your changes?"
          body={`You changed ${changes.length} fare${changes.length === 1 ? "" : "s"}. Discarding goes back to the published fares; the website keeps the old rates.`}
          onCancel={() => setDiscarding(false)}
        >
          <button type="button" onClick={() => setDiscarding(false)} className={btnGhost}>
            Keep editing
          </button>
          <button type="button" onClick={discardNow} className={btnDanger}>
            Discard
          </button>
        </FaresDialog>
      )}

      {/* 5.12 — a class with cars in Fleet can't be removed */}
      {inUse && (
        <FaresDialog
          art="fare-class-in-use"
          title="Move the cars first"
          body={`${inUse.name} is used by the ${andList(inUse.cars)} car${inUse.cars.length === 1 ? "" : "s"} in Fleet. Move ${inUse.cars.length === 1 ? "it" : "them"} to another class, then remove it.`}
          onCancel={() => setInUse(null)}
        >
          <button type="button" onClick={() => setInUse(null)} className={btnGhost}>
            Keep the class
          </button>
          <Link href="/admin/fleet" onClick={() => setInUse(null)} className={btnPrimary}>
            Open Fleet
          </Link>
        </FaresDialog>
      )}

      {/* 5.3 — published toast */}
      {toast && published && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-4 z-30 flex items-center gap-3 rounded-lg border border-gray-100 bg-layer py-3 pl-3.5 pr-3 drop-shadow-[0_16px_24px_var(--shadow-md)] sm:inset-x-auto sm:bottom-6 sm:right-10"
        >
          <span className="grid size-6.5 shrink-0 place-items-center rounded-full bg-brand text-on-color">
            <Icon name="check" size={14} />
          </span>
          <p className="min-w-0 flex-1 type-ui text-primary">
            Fares published
            {published.length === 1 && published[0].before !== undefined && published[0].after !== undefined
              ? ` · ${published[0].subject ?? published[0].label} now ${published[0].after.replace(" per km", "/km")} on the site`
              : published.length > 1
                ? ` · ${published.length} changes live on the site`
                : ""}
          </p>
          <a href="/fleet" target="_blank" rel="noreferrer" className="shrink-0 type-ui text-link hover:text-link-hover">
            View on site
          </a>
          <span className="h-5 w-px shrink-0 bg-gray-200" aria-hidden="true" />
          <button type="button" onClick={() => setToast(false)} aria-label="Dismiss" className="shrink-0 text-[var(--icon-secondary)] hover:text-primary">
            <Icon name="x" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
