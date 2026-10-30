"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSearchIndex, type SearchItem } from "@/app/admin/search-actions";
import Icon from "@/components/admin/Icon";

type Result = { group: string; title: string; detail?: string; href: string };

// Pages and actions are always available; bookings and cars load on first open.
const COMMANDS: (Result & { keywords: string })[] = [
  { group: "Go to", title: "Dashboard", href: "/admin", keywords: "home overview" },
  { group: "Go to", title: "Bookings", href: "/admin/bookings", keywords: "requests trips list" },
  { group: "Go to", title: "Website requests", detail: "New bookings from the site", href: "/admin/bookings?source=website&status=new", keywords: "web widget form new" },
  { group: "Go to", title: "Fleet", href: "/admin/fleet", keywords: "cars vehicles" },
  { group: "Go to", title: "Daily journal", href: "/admin/journal", keywords: "earnings fuel driver net" },
  { group: "Go to", title: "Fares", href: "/admin/fares", keywords: "prices rates" },
  { group: "Actions", title: "New booking", href: "/admin/bookings/new", keywords: "add log phone create" },
  { group: "Actions", title: "Add car", href: "/admin/fleet/new", keywords: "new vehicle create" },
  { group: "Actions", title: "New journal entry", href: "/admin/journal?new=1", keywords: "log trip add" },
  { group: "Actions", title: "Edit fares", href: "/admin/fares?edit=1", keywords: "change prices" },
];

const words = (q: string) => q.toLowerCase().split(/\s+/).filter(Boolean);

// "listener" is mounted once in the admin layout: it owns ⌘K and the dialog.
// "header" (Figma search pill) and "icon" (mobile) only open it.
export default function CommandPalette({ variant, label = "Search name, phone or place" }: { variant: "listener" | "header" | "icon"; label?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [index, setIndex] = useState<SearchItem[] | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const show = useCallback(() => {
    setQuery("");
    setActive(0);
    setOpen(true);
    requestAnimationFrame(() => input.current?.focus());
    // Refresh the index each time so new bookings show up.
    getSearchIndex()
      .then(setIndex)
      .catch(() => setIndex((prev) => prev ?? []));
  }, []);

  // ⌘K / Ctrl+K anywhere in the admin. Only the listener instance listens.
  useEffect(() => {
    if (variant !== "listener") return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (openRef.current) setOpen(false);
        else show();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("admin:search", show);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("admin:search", show);
    };
  }, [variant, show]);

  const results = useMemo<Result[]>(() => {
    const q = words(query);
    const cmds = COMMANDS.filter((c) => q.every((w) => `${c.title} ${c.keywords}`.toLowerCase().includes(w)));
    if (q.length === 0) return cmds;
    const data = (index ?? []).filter((i) => q.every((w) => i.haystack.includes(w)));
    return [
      ...cmds,
      ...data.filter((d) => d.group === "Bookings").slice(0, 6),
      ...data.filter((d) => d.group === "Cars").slice(0, 5),
    ];
  }, [query, index]);

  useEffect(() => {
    list.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function go(r: Result | undefined) {
    if (!r) return;
    setOpen(false);
    router.push(r.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  const open$ = () => window.dispatchEvent(new Event("admin:search"));
  const trigger =
    variant === "listener" ? null : variant === "header" ? (
      <button
        type="button"
        onClick={open$}
        className="flex w-full items-center gap-2 rounded-full border border-gray-200 bg-layer py-2 pl-3.5 pr-2 text-left text-secondary transition-colors hover:bg-layer-hover md:w-80"
      >
        <Icon name="magnifying-glass" size={18} />
        <span className="min-w-0 flex-1 truncate type-body-sm">{label}</span>
        <kbd className="rounded-sm border border-gray-200 bg-gray-50 px-1.5 py-0.5 type-mono-sm text-secondary">⌘K</kbd>
      </button>
    ) : (
      <button
        type="button"
        onClick={open$}
        aria-label="Search"
        className="grid size-10 place-items-center rounded-full border border-gray-200 bg-layer text-secondary"
      >
        <Icon name="magnifying-glass" size={18} />
      </button>
    );

  if (variant !== "listener") return trigger;

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]" data-palette-open>
          <button type="button" aria-label="Close search" className="absolute inset-0 cursor-default bg-scrim [animation:fade_.12s_ease-out]" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Search the admin"
            className="relative w-full max-w-xl overflow-hidden rounded-xl border border-gray-100 bg-layer text-primary shadow-xl [animation:pop_.15s_ease-out]"
          >
            <div className="flex items-center gap-3 border-b border-gray-100 px-4 text-secondary">
              <Icon name="magnifying-glass" size={18} />
              <input
                ref={input}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
                placeholder="Search bookings, customers, phone numbers, cars…"
                aria-label="Search"
                role="combobox"
                aria-expanded="true"
                aria-controls="palette-results"
                aria-activedescendant={results[active] ? `palette-${active}` : undefined}
                className="h-13 flex-1 bg-transparent py-4 type-body-md text-primary placeholder:text-placeholder focus:outline-none"
              />
              <kbd className="rounded-sm border border-gray-200 bg-gray-50 px-1.5 py-0.5 type-mono-sm text-secondary">Esc</kbd>
            </div>
            <ul ref={list} id="palette-results" role="listbox" className="max-h-[55vh] overflow-y-auto py-2">
              {results.length === 0 && (
                <li className="px-4 py-6 text-center type-body-sm text-secondary">{index === null ? "Loading…" : `Nothing matches “${query}”.`}</li>
              )}
              {results.map((r, i) => {
                const header = r.group !== results[i - 1]?.group ? r.group : null;
                return (
                  <li key={`${r.href}-${i}`} role="presentation">
                    {header && <p className="px-4 pb-1 pt-2 type-label text-helper">{header}</p>}
                    <button
                      type="button"
                      id={`palette-${i}`}
                      data-i={i}
                      role="option"
                      aria-selected={i === active}
                      onMouseMove={() => setActive(i)}
                      onClick={() => go(r)}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left ${i === active ? "bg-layer-selected" : ""}`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate type-ui">{r.title}</span>
                        {r.detail && <span className="block truncate type-body-sm text-secondary">{r.detail}</span>}
                      </span>
                      {i === active && <span className="shrink-0 type-body-sm text-brand">↵</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

