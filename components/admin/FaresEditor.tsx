"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useTransition } from "react";
import { publishFares } from "@/app/admin/fares-actions";
import Icon from "@/components/admin/Icon";
import { btnGhost, btnPrimary, inputCls } from "@/components/admin/ui";
import { inr, type Fares } from "@/lib/catalogTypes";

// Figma "Flow 5 · Fares": 5.1 overview · 5.2 editing · 5.3 published.

type RouteRow = { slug: string; from: string; to: string; distance: string };
type PriceKind = "perKm" | "hourly" | "routes";

// Prices are edited as strings so a field can be empty mid-typing.
type Draft = {
  perKm: Record<string, string>;
  hourly: Record<string, string>;
  routes: Record<string, string>;
  nightAllowance: string;
  rules: string;
};

// One edited value, for the unsaved bar and the published toast.
type Change = { key: string; label: string; before: string; after: string };

// Fields show Indian digit grouping ("2,799"); toNumber strips it again.
const grouped = (n: number) => n.toLocaleString("en-IN");

const toDraft = (f: Fares): Draft => ({
  perKm: Object.fromEntries(f.perKm.map((c) => [c.id, grouped(c.rate)])),
  hourly: Object.fromEntries(f.hourly.map((p) => [p.id, grouped(p.price)])),
  routes: Object.fromEntries(
    Object.entries(f.routes).map(([k, v]) => [k, grouped(v)]),
  ),
  nightAllowance: grouped(f.nightAllowance),
  rules: f.rules.join("\n"),
});

const toNumber = (s: string) => {
  const n = Number(s.replace(/[,\s₹]/g, ""));
  return s.trim() !== "" && Number.isInteger(n) && n >= 0 ? n : NaN;
};

const shownPrice = (s: string, suffix = "") => {
  const n = toNumber(s);
  return Number.isNaN(n) ? s : `${inr(n)}${suffix}`;
};

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

// ---- Layout pieces ------------------------------------------------------------

function FareCard({
  title,
  sub,
  head,
  children,
}: {
  title: string;
  sub: string;
  head: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="w-full overflow-hidden rounded-xl border border-gray-100 bg-layer">
      <div className="flex flex-col gap-0.5 border-b border-gray-100 px-5 pb-3.5 pt-4">
        <h2 className="type-h4 text-primary">{title}</h2>
        <p className="type-body-sm text-secondary">{sub}</p>
      </div>
      <div className="flex gap-4 bg-layer-accent px-5 py-2 type-body-sm text-secondary">
        {head}
      </div>
      <div className="divide-y divide-gray-100">{children}</div>
    </section>
  );
}

const rowCls = (editing: boolean) =>
  `flex items-center gap-4 px-5 ${editing ? "py-2" : "py-3"}`;
const firstCol = "w-24 shrink-0 sm:w-[130px]";
const priceCol = "w-[110px] shrink-0";

export default function FaresEditor({
  fares,
  carsByClass,
  routes,
  servicePages,
  startInEdit,
}: {
  fares: Fares;
  carsByClass: Record<string, string[]>;
  routes: RouteRow[];
  servicePages: number;
  startInEdit: boolean;
}) {
  const [editing, setEditing] = useState(startInEdit);
  const saved = useMemo(() => toDraft(fares), [fares]);
  const [draft, setDraft] = useState<Draft>(saved);
  const [error, setError] = useState("");
  // After "Save and publish": what changed (for the toast and green values).
  const [published, setPublished] = useState<Change[] | null>(null);
  const [toast, setToast] = useState(false);
  const [pending, startTransition] = useTransition();

  const changes = useMemo<Change[]>(() => {
    const list: Change[] = [];
    for (const c of fares.perKm)
      if (draft.perKm[c.id] !== saved.perKm[c.id])
        list.push({
          key: `perKm:${c.id}`,
          label: c.name,
          before: shownPrice(saved.perKm[c.id]),
          after: `${shownPrice(draft.perKm[c.id])} per km`,
        });
    for (const p of fares.hourly)
      if (draft.hourly[p.id] !== saved.hourly[p.id])
        list.push({
          key: `hourly:${p.id}`,
          label: p.name,
          before: shownPrice(saved.hourly[p.id]),
          after: shownPrice(draft.hourly[p.id]),
        });
    for (const r of routes)
      if (draft.routes[r.slug] !== saved.routes[r.slug])
        list.push({
          key: `routes:${r.slug}`,
          label: `${r.from} → ${r.to}`,
          before: shownPrice(saved.routes[r.slug]),
          after: shownPrice(draft.routes[r.slug]),
        });
    if (draft.nightAllowance !== saved.nightAllowance)
      list.push({
        key: "night",
        label: "Night allowance",
        before: shownPrice(saved.nightAllowance),
        after: `${shownPrice(draft.nightAllowance)}/night`,
      });
    if (draft.rules.trim() !== saved.rules.trim())
      list.push({
        key: "rules",
        label: "Fare rules",
        before: "",
        after: "edited",
      });
    return list;
  }, [draft, saved, fares, routes]);

  const invalid = useMemo(() => {
    const bad = new Set<string>();
    for (const k of ["perKm", "hourly", "routes"] as const)
      for (const [id, v] of Object.entries(draft[k])) {
        const n = toNumber(v);
        if (Number.isNaN(n) || n === 0) bad.add(`${k}:${id}`);
      }
    if (Number.isNaN(toNumber(draft.nightAllowance))) bad.add("night");
    return bad;
  }, [draft]);

  // Warn before leaving with unpublished edits.
  useEffect(() => {
    if (!editing || changes.length === 0) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [editing, changes.length]);

  // The published toast hides itself after a while.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(false), 8000);
    return () => clearTimeout(t);
  }, [toast]);

  function startEdit() {
    setDraft(saved);
    setPublished(null);
    setToast(false);
    setError("");
    setEditing(true);
  }

  function discard() {
    const n = changes.length;
    if (n > 0 && !confirm(`Discard ${n} unsaved change${n === 1 ? "" : "s"}?`))
      return;
    setDraft(saved);
    setError("");
    setEditing(false);
  }

  function publish() {
    if (invalid.size) {
      setError(
        "Fix the highlighted prices — each needs a whole number above ₹0.",
      );
      return;
    }
    setError("");
    const done = changes;
    const next: Fares = {
      perKm: fares.perKm.map((c) => ({
        ...c,
        rate: toNumber(draft.perKm[c.id]),
      })),
      hourly: fares.hourly.map((p) => ({
        ...p,
        price: toNumber(draft.hourly[p.id]),
      })),
      routes: Object.fromEntries(
        Object.keys(fares.routes).map((s) => [s, toNumber(draft.routes[s])]),
      ),
      nightAllowance: toNumber(draft.nightAllowance),
      rules: draft.rules
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean),
    };
    startTransition(async () => {
      const res = await publishFares(next).catch(
        () =>
          ({
            error: "Couldn't publish — check your connection and try again.",
          }) as { error: string },
      );
      if ("error" in res && res.error) setError(res.error);
      else {
        setEditing(false);
        setPublished(done);
        setToast(true);
      }
    });
  }

  const justPublished = new Set(published?.map((c) => c.key));

  // A price: plain text when viewing (green if just published), a ₹ field when editing.
  const price = (
    k: PriceKind | "night",
    id: string,
    label: string,
    suffix = "",
  ) => {
    const key = k === "night" ? "night" : `${k}:${id}`;
    const value = k === "night" ? draft.nightAllowance : draft[k][id];
    const original = k === "night" ? saved.nightAllowance : saved[k][id];
    if (!editing)
      return (
        <p
          className={`${priceCol} type-ui ${justPublished.has(key) ? "text-brand" : "text-primary"}`}
        >
          {shownPrice(original, suffix)}
        </p>
      );
    const changed = value !== original;
    const bad = invalid.has(key);
    return (
      <label
        className={`${priceCol} flex items-center gap-1 rounded-md px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-focus/20 ${
          bad
            ? "border-[1.5px] border-negative bg-negative-subtle"
            : changed
              ? "border-[1.5px] border-brand bg-hover"
              : "border border-gray-200 bg-layer"
        }`}
      >
        <span className="type-body-sm text-secondary">₹</span>
        <input
          value={value}
          onChange={(e) =>
            setDraft((d) =>
              k === "night"
                ? { ...d, nightAllowance: e.target.value }
                : { ...d, [k]: { ...d[k], [id]: e.target.value } },
            )
          }
          inputMode="numeric"
          aria-label={label}
          aria-invalid={bad}
          style={{ outline: "none" }}
          className="w-full min-w-0 bg-transparent type-ui text-primary"
        />
      </label>
    );
  };

  const updatedAt = fares.updatedAt
    ? `Last published ${dateLabel(fares.updatedAt)}`
    : "Starting fares — not yet published from the admin";
  const where = `/fleet, /booking, /routes and ${servicePages} service pages`;
  const status = published
    ? `Published just now · live on ${where}`
    : `${updatedAt} · shown on ${where}`;
  const lead = changes[changes.length - 1];

  return (
    <div className={editing ? "pb-28" : ""}>
      {/* Header composed here (not PageHeader) so the long status line wraps
          under the buttons on phones instead of squeezing into a sliver. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-[min(100%,20rem)] flex-1">
          <h1 className="type-h2 text-primary">
            {editing ? "Fares · editing" : "Fares"}
          </h1>
          <p className="mt-1 flex items-start gap-1.5 type-body-sm text-secondary">
            <Icon name="clock" size={14} className="mt-0.75 shrink-0" />
            {status}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {editing ? (
            <>
              <button
                type="button"
                onClick={discard}
                disabled={pending}
                className={btnGhost}
              >
                Discard
              </button>
              <button
                type="button"
                onClick={publish}
                disabled={pending || changes.length === 0}
                className={btnPrimary}
              >
                <Icon name="check" size={16} />
                {pending ? "Publishing…" : "Save and publish"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={startEdit}
              className={published ? btnGhost : btnPrimary}
            >
              <Icon name="pencil-simple" size={16} />
              Edit fares
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <FareCard
            title="Outstation · per kilometre"
            sub="Billed garage to garage on total km."
            head={
              <>
                <p className={`${firstCol} max-sm:flex-1`}>Class</p>
                <p className="hidden min-w-0 flex-1 sm:block">Cars</p>
                <p className={priceCol}>Rate</p>
              </>
            }
          >
            {fares.perKm.map((c) => (
              <div key={c.id} className={rowCls(editing)}>
                <div className={`${firstCol} max-sm:flex-1`}>
                  <p className="type-ui text-primary">{c.name}</p>
                  <p className="type-body-sm text-secondary sm:hidden">
                    {carsByClass[c.id]?.join(" · ") || "No cars in this class"}
                  </p>
                </div>
                <p className="hidden min-w-0 flex-1 type-body-sm text-secondary sm:block">
                  {carsByClass[c.id]?.join(" · ") || "No cars in this class"}
                </p>
                {price("perKm", c.id, `${c.name} rate per km`, "/km")}
              </div>
            ))}
          </FareCard>

          <FareCard
            title="Local · hourly packages"
            sub="Car with driver, kilometres bundled."
            head={
              <>
                <p className={`${firstCol} max-sm:flex-1`}>Package</p>
                <p className="hidden min-w-0 flex-1 sm:block">Good for</p>
                <p className={priceCol}>From</p>
              </>
            }
          >
            {fares.hourly.map((p) => (
              <div key={p.id} className={rowCls(editing)}>
                <div className={`${firstCol} max-sm:flex-1`}>
                  <p className="type-ui text-primary">{p.name}</p>
                  <p className="type-body-sm text-secondary sm:hidden">
                    {p.for}
                  </p>
                </div>
                <p className="hidden min-w-0 flex-1 type-body-sm text-secondary sm:block">
                  {p.for}
                </p>
                {price("hourly", p.id, `${p.name} price`)}
              </div>
            ))}
          </FareCard>
        </div>

        <div className="flex flex-col gap-5">
          <FareCard
            title="Route starting fares"
            sub="Shown on /routes and the home page “Popular” chips."
            head={
              <>
                <p className="min-w-0 flex-1">Route</p>
                <p className="hidden w-[120px] shrink-0 sm:block">Distance</p>
                <p className={priceCol}>From</p>
              </>
            }
          >
            {routes.map((r) => (
              <div key={r.slug} className={rowCls(editing)}>
                <div className="min-w-0 flex-1">
                  <a
                    href={`/routes/${r.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="type-ui text-primary hover:text-link-hover"
                  >
                    {r.from} → {r.to}
                  </a>
                  <p className="type-body-sm text-secondary sm:hidden">
                    {r.distance}
                  </p>
                </div>
                <p className="hidden w-[120px] shrink-0 type-body-sm text-secondary sm:block">
                  {r.distance}
                </p>
                {price("routes", r.slug, `${r.from} to ${r.to} fare`)}
              </div>
            ))}
          </FareCard>

          <FareCard
            title="Extras and rules"
            sub="Printed under every fare table."
            head={
              <>
                <p className="min-w-0 flex-1">Item</p>
                <p className={priceCol}>Value</p>
              </>
            }
          >
            <div className={rowCls(editing)}>
              <p className="min-w-0 flex-1 type-ui text-primary">
                Night driver allowance (outstation)
              </p>
              {price("night", "night", "Night allowance per night", "/night")}
            </div>
            {editing ? (
              <div className="px-5 py-3">
                <label
                  htmlFor="fare-rules"
                  className="mb-1.5 block type-ui text-primary"
                >
                  Fare rules
                </label>
                <textarea
                  id="fare-rules"
                  value={draft.rules}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, rules: e.target.value }))
                  }
                  rows={4}
                  className={`${inputCls} ${draft.rules.trim() !== saved.rules.trim() ? "border-[1.5px] border-brand bg-hover" : ""}`}
                />
                <p className="mt-1.5 type-body-sm text-helper">
                  One rule per line. The night allowance line is added
                  automatically.
                </p>
              </div>
            ) : (
              fares.rules.map((r) => (
                <p key={r} className="px-5 py-3 type-ui text-primary">
                  {r}
                </p>
              ))
            )}
          </FareCard>
        </div>
      </div>

      {/* 5.2 — floating unsaved-changes bar */}
      {editing && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-4 z-30 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border border-gray-100 bg-layer py-3 pl-5 pr-3 shadow-[0_16px_48px_0_var(--shadow-md)] sm:inset-x-auto sm:bottom-6 sm:left-1/2 sm:w-max sm:-translate-x-1/2 sm:flex-nowrap md:left-[calc(50%+124px)]"
        >
          {changes.length > 0 && (
            <Image
              src="/admin-icons/unsaved-marker.svg"
              alt=""
              width={32}
              height={32}
              unoptimized
            />
          )}
          <div className="min-w-0 flex-1 sm:flex-none">
            <p className="type-ui text-primary">
              {changes.length === 0
                ? "No changes yet"
                : `${changes.length} unsaved change${changes.length === 1 ? "" : "s"}`}
            </p>
            {error ? (
              <p className="type-body-sm text-error" role="alert">
                {error}
              </p>
            ) : (
              lead && (
                <p className="flex flex-wrap items-center gap-1.5 type-body-sm text-secondary sm:flex-nowrap sm:whitespace-nowrap">
                  {lead.label}
                  {lead.before && (
                    <span className="line-through">{lead.before}</span>
                  )}
                  <Icon name="arrow-right" size={14} />
                  <span className="type-ui text-brand">{lead.after}</span>
                  {changes.length > 1 && (
                    <span>+{changes.length - 1} more</span>
                  )}
                </p>
              )
            )}
          </div>
          <div className="flex items-center gap-4 sm:pl-6">
            <button
              type="button"
              onClick={discard}
              disabled={pending}
              className={btnGhost}
            >
              {changes.length ? "Discard" : "Done"}
            </button>
            <button
              type="button"
              onClick={publish}
              disabled={pending || changes.length === 0}
              className={btnPrimary}
            >
              <Icon name="check" size={16} />
              {pending ? "Publishing…" : "Save and publish"}
            </button>
          </div>
        </div>
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
            {published.length === 1 && published[0].key !== "rules"
              ? ` · ${published[0].label} now ${published[0].after.replace(" per km", "/km")} on the site`
              : published.length > 1
                ? ` · ${published.length} changes live on the site`
                : ""}
          </p>
          <a
            href="/fleet"
            target="_blank"
            rel="noreferrer"
            className="shrink-0 type-ui text-link hover:text-link-hover"
          >
            View on site
          </a>
          <span className="h-5 w-px shrink-0 bg-gray-200" aria-hidden="true" />
          <button
            type="button"
            onClick={() => setToast(false)}
            aria-label="Dismiss"
            className="shrink-0 text-[var(--icon-secondary)] hover:text-primary"
          >
            <Icon name="x" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
