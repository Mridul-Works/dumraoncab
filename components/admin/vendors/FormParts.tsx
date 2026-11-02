"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Icon from "@/components/admin/Icon";
import { uploadVendorFile, type VendorFormDoc } from "@/app/admin/vendor-actions";
import { vendorPlaces } from "@/lib/site";
import type { WorkPlace } from "@/lib/vendorTypes";
import { distanceKm } from "./format";

// Pieces of the Add / Edit vendor form (Figma 6.3, 6.4, 6.18).

const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

export const sizeText = (kb: number) => (kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`);

// Figma "Upload box": dashed + Upload when empty, solid + check when uploaded,
// red when a required file is missing on save. Aadhaar takes front and back.
export function UploadBox({
  label,
  doc,
  error,
  twoSides = false,
  onChange,
  onError,
}: {
  label: string;
  doc?: VendorFormDoc;
  error?: string;
  twoSides?: boolean;
  onChange: (doc: VendorFormDoc | undefined) => void;
  onError: (msg: string) => void;
}) {
  const [pending, start] = useTransition();
  const [sizes, setSizes] = useState<number[]>([]);
  const uploaded = !!doc?.file;

  function pick(files: FileList | null) {
    const list = Array.from(files ?? []).slice(0, twoSides ? 2 : 1);
    if (!list.length) return;
    start(async () => {
      const saved = [];
      for (const f of list) {
        const fd = new FormData();
        fd.set("file", f);
        const res = await uploadVendorFile(fd);
        if ("error" in res) return onError(`${label}: ${res.error}`);
        saved.push(res);
      }
      const [front, back] = saved;
      setSizes(saved.map((s) => s.sizeKb));
      onChange({ kind: doc?.kind ?? ("photo" as const), file: front.file, fileName: front.fileName, sizeKb: front.sizeKb, fileBack: back?.file, fileBackName: back?.fileName });
    });
  }

  const totalKb = sizes.length ? sizes.reduce((a, b) => a + b, 0) : (doc?.sizeKb ?? 0);
  const hint = pending
    ? "Uploading…"
    : uploaded
      ? doc?.fileBack
        ? `Front and back${totalKb ? ` · ${sizeText(totalKb)}` : ""}`
        : [doc?.fileName, doc?.sizeKb ? sizeText(doc.sizeKb) : ""].filter(Boolean).join(" · ") || "Uploaded"
      : error
        ? error
        : twoSides
          ? "Front and back · photo or PDF"
          : "Photo or PDF";

  return (
    <label
      className={`flex min-h-16 min-w-0 cursor-pointer items-center gap-3 rounded-md border bg-layer py-3 pl-3 pr-4 transition-colors hover:bg-layer-hover ${
        uploaded ? "border-solid border-gray-100" : error ? "border-dashed border-negative" : "border-dashed border-gray-200"
      }`}
    >
      <input type="file" accept={ACCEPT} multiple={twoSides} className="sr-only" disabled={pending} onChange={(e) => (pick(e.target.files), (e.target.value = ""))} />
      <span className="grid size-10 shrink-0 place-items-center rounded-md bg-gray-50 text-[var(--icon-primary)]">
        <Icon name={uploaded ? "file-text" : "upload-simple"} size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate type-ui text-primary">{label}</span>
        <span className={`block truncate type-body-sm ${error && !uploaded ? "text-error" : "text-secondary"}`}>{hint}</span>
      </span>
      {uploaded ? <Icon name="check-circle-14" size={20} className="text-brand" /> : <span className="type-ui text-link">Upload</span>}
    </label>
  );
}

// "Works around" chips + Add place search (Figma 6.18).
export function PlacesField({
  home,
  pin,
  radius,
  places,
  onChange,
}: {
  home: string;
  pin: { lat: number; lng: number } | null;
  radius: number | null;
  places: WorkPlace[];
  onChange: (places: WorkPlace[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!adding) return;
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setAdding(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [adding]);

  const kmTo = (name: string) => {
    const p = vendorPlaces.find((x) => x.name.toLowerCase() === name.toLowerCase());
    return p && pin ? Math.round(distanceKm(pin, p)) : undefined;
  };
  const taken = new Set([home.toLowerCase(), ...places.map((p) => p.name.toLowerCase())]);
  const query = q.trim().toLowerCase();
  const matches = vendorPlaces
    .filter((p) => !taken.has(p.name.toLowerCase()) && (!query || p.name.toLowerCase().includes(query)))
    .map((p) => ({ ...p, km: pin ? Math.round(distanceKm(pin, p)) : undefined }))
    .sort((a, b) => Number(!a.name.toLowerCase().startsWith(query)) - Number(!b.name.toLowerCase().startsWith(query)) || (a.km ?? 0) - (b.km ?? 0))
    .slice(0, 6);

  function add(name: string) {
    const clean = name.trim();
    if (!clean || taken.has(clean.toLowerCase())) return;
    const km = kmTo(clean);
    onChange([...places, { name: clean, km, onRequest: radius !== null && km !== undefined && km > radius }]);
    setQ("");
    setAdding(false);
  }

  const chip = "flex items-center gap-2 rounded-full border border-gray-200 bg-layer py-[7px] pl-2.5 pr-2 type-body-sm";
  return (
    <div className="flex flex-wrap items-start gap-2">
      {home && (
        <span className={chip}>
          <Icon name="map-pin-14" size={14} className="text-brand" />
          <span className="text-primary">{home}</span>
          <span className="pr-1 text-brand">Home</span>
        </span>
      )}
      {places.map((p) => (
        <span key={p.name} className={chip}>
          <Icon name="map-pin-14" size={14} className="text-[var(--icon-primary)]" />
          <span className="text-primary">{p.name}</span>
          {p.km !== undefined && (
            <span className="text-secondary">
              {p.km} km{p.onRequest ? " · on request" : ""}
            </span>
          )}
          <button type="button" aria-label={`Remove ${p.name}`} onClick={() => onChange(places.filter((x) => x !== p))} className="grid place-items-center rounded-full text-[var(--icon-primary)] hover:text-error">
            <Icon name="x-14" size={14} />
          </button>
        </span>
      ))}
      <div ref={box} className="relative">
        <button
          type="button"
          onClick={() => setAdding(!adding)}
          aria-expanded={adding}
          className={`flex items-center gap-1.5 rounded-full border py-[7px] pl-3 pr-3.5 type-body-sm text-link hover:text-link-hover ${adding ? "border-solid border-brand" : "border-dashed border-gray-200"}`}
        >
          <Icon name="plus" size={14} />
          Add place
        </button>
        {adding && (
          <div className="absolute left-0 top-full z-20 mt-1.5 w-72 overflow-hidden rounded-lg border border-gray-100 bg-layer p-1.5 shadow-[0_16px_48px_var(--shadow-md)]">
            <label className="flex items-center gap-2 rounded-md border border-brand px-2.5 py-2">
              <Icon name="map-pin-14" size={14} className="text-[var(--icon-secondary)]" />
              <span className="sr-only">Search a place</span>
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    add(matches[0]?.name ?? q);
                  }
                  if (e.key === "Escape") setAdding(false);
                }}
                placeholder="Town, station or airport"
                className="min-w-0 flex-1 bg-transparent type-body-sm text-primary placeholder:text-placeholder focus:outline-none"
              />
            </label>
            <ul className="mt-1">
              {matches.map((m) => {
                const i = query ? m.name.toLowerCase().indexOf(query) : -1;
                return (
                  <li key={m.name}>
                    <button type="button" onClick={() => add(m.name)} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left type-body-sm hover:bg-layer-hover">
                      <Icon name="map-pin-14" size={14} className="text-[var(--icon-secondary)]" />
                      <span className="min-w-0 flex-1 truncate text-primary">
                        {i >= 0 ? (
                          <>
                            {m.name.slice(0, i)}
                            <span className="text-brand">{m.name.slice(i, i + query.length)}</span>
                            {m.name.slice(i + query.length)}
                          </>
                        ) : (
                          m.name
                        )}
                      </span>
                      {m.km !== undefined && <span className="text-secondary">{m.km} km</span>}
                    </button>
                  </li>
                );
              })}
              {query && !matches.some((m) => m.name.toLowerCase() === query) && (
                <li>
                  <button type="button" onClick={() => add(q)} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left type-body-sm text-link hover:bg-layer-hover">
                    <Icon name="plus" size={14} />
                    Add “{q.trim()}”
                  </button>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
