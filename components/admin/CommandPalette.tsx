"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSearchIndex, type SearchItem } from "@/app/admin/search-actions";
import Icon from "@/components/admin/Icon";
import { StatusBadge } from "@/components/admin/ui";

type Result = Pick<SearchItem, "title" | "href" | "status"> & { group: string; detail?: string; icon?: string };

// Pages and actions are always available; bookings, drivers, cars and the Trip
// log load when the search opens.
const COMMANDS: (Result & { keywords: string })[] = [
  { group: "Go to", title: "Dashboard", href: "/admin", keywords: "home overview" },
  { group: "Go to", title: "Bookings", href: "/admin/bookings", keywords: "requests trips list" },
  { group: "Go to", title: "Website requests", detail: "New bookings from the site", href: "/admin/bookings?source=website&status=new", keywords: "web widget form new" },
  { group: "Go to", title: "Fleet", href: "/admin/fleet", keywords: "cars vehicles" },
  { group: "Go to", title: "Vendors", href: "/admin/vendors", keywords: "owners drivers partners approve" },
  { group: "Go to", title: "Trip log", href: "/admin/journal", keywords: "journal earnings fuel driver net" },
  { group: "Go to", title: "Fares", href: "/admin/fares", keywords: "prices rates" },
  { group: "Go to", title: "Analytics", href: "/admin/analytics", keywords: "revenue report stats charts" },
  { group: "Go to", title: "Company profile", href: "/admin/company", keywords: "business details logo terms gst" },
  { group: "Actions", title: "New booking", href: "/admin/bookings/new", keywords: "add log phone create" },
  { group: "Actions", title: "Add car", href: "/admin/fleet/new", keywords: "new vehicle create" },
  { group: "Actions", title: "New trip entry", href: "/admin/journal?new=1", keywords: "log trip add" },
  { group: "Actions", title: "Add vendor", href: "/admin/vendors/new", keywords: "new owner driver partner" },
  { group: "Actions", title: "Edit fares", href: "/admin/fares?edit=1", keywords: "change prices" },
];
const commandIcon = (r: Result) => r.icon ?? (r.group === "Actions" ? "plus" : "arrow-up-right");

const words = (q: string) => q.toLowerCase().split(/\s+/).filter(Boolean);

// Figma 2.4: data groups first (Bookings · Drivers and cars · Trip log), then
// matching pages and actions. An empty query lists the pages and actions.
function useResults(query: string, index: SearchItem[] | null): Result[] {
  return useMemo(() => {
    const q = words(query);
    const cmds = COMMANDS.filter((c) => q.every((w) => `${c.title} ${c.keywords}`.toLowerCase().includes(w)));
    if (q.length === 0) return cmds;
    const data = (index ?? []).filter((i) => q.every((w) => i.haystack.includes(w)));
    const take = (group: SearchItem["group"], n: number) => data.filter((d) => d.group === group).slice(0, n);
    return [...take("Bookings", 6), ...take("Drivers and cars", 5), ...take("Trip log", 4), ...cmds];
  }, [query, index]);
}

// Brand-green the parts of the text that match the query ("Rak|esh Kumar").
function Highlight({ text, query }: { text: string; query: string }) {
  const q = words(query).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (q.length === 0) return <>{text}</>;
  const parts = text.split(new RegExp(`(${q.join("|")})`, "gi"));
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <span key={i} className="text-brand">
            {p}
          </span>
        ) : (
          p
        ),
      )}
    </>
  );
}

// The result list shared by the Dashboard dropdown and the ⌘K dialog.
function ResultList({
  id,
  results,
  active,
  setActive,
  go,
  query,
  loading,
  className = "",
}: {
  id: string;
  results: Result[];
  active: number;
  setActive: (i: number) => void;
  go: (r: Result | undefined) => void;
  query: string;
  loading: boolean;
  className?: string;
}) {
  const list = useRef<HTMLUListElement>(null);
  useEffect(() => {
    list.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <ul ref={list} id={id} role="listbox" aria-label="Search results" className={`flex flex-col gap-0.5 overflow-y-auto py-2 ${className}`}>
      {results.length === 0 && (
        <li className="px-4 py-6 text-center type-body-sm text-secondary">{loading ? "Loading…" : `Nothing matches “${query}”.`}</li>
      )}
      {results.map((r, i) => {
        const header = r.group !== results[i - 1]?.group ? r.group : null;
        return (
          <li key={`${r.href}-${i}`} role="presentation">
            {header && <p className="px-4 pb-1 pt-2 type-body-sm text-secondary">{header}</p>}
            <button
              type="button"
              id={`${id}-${i}`}
              data-i={i}
              role="option"
              aria-selected={i === active}
              tabIndex={-1}
              // Keep focus in the search box so typing carries on.
              onMouseDown={(e) => e.preventDefault()}
              onMouseMove={() => setActive(i)}
              onClick={() => go(r)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${i === active ? "bg-layer-selected" : ""}`}
            >
              <Icon name={commandIcon(r)} size={18} className="text-[var(--icon-secondary)]" />
              <span className="min-w-0 flex-1">
                <span className="block truncate type-ui text-primary">
                  <Highlight text={r.title} query={query} />
                </span>
                {r.detail && <span className="block truncate type-body-sm text-secondary">{r.detail}</span>}
              </span>
              {r.status && <StatusBadge status={r.status} />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// Search state + keyboard handling shared by both search surfaces.
function useSearch(onClose: () => void) {
  const router = useRouter();
  const [query, setQueryState] = useState("");
  const [active, setActive] = useState(0);
  const [index, setIndex] = useState<SearchItem[] | null>(null);
  const results = useResults(query, index);

  const load = useCallback(() => {
    // Refresh the index on every open so new bookings and entries show up.
    getSearchIndex()
      .then(setIndex)
      .catch(() => setIndex((prev) => prev ?? []));
  }, []);

  const setQuery = useCallback((q: string) => {
    setQueryState(q);
    setActive(0);
  }, []);

  const go = (r: Result | undefined) => {
    if (!r) return;
    onClose();
    router.push(r.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(Math.min(active + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(Math.max(active - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return { query, setQuery, active, setActive, results, go, onKeyDown, load, loading: index === null };
}

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd className="shrink-0 rounded-sm border border-gray-200 bg-gray-50 px-1.5 py-0.5 type-mono-sm text-secondary">{children}</kbd>
);

// Figma 2.1/2.4 Dashboard search: a pill you type into, results drop below it.
function InlineSearch({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const s = useSearch(() => {
    setOpen(false);
    input.current?.blur();
  });
  const showList = open && s.query.trim() !== "";

  return (
    <div
      className="relative w-full md:w-80"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <label className="flex items-center gap-2 rounded-full border border-gray-200 bg-layer py-[9px] pl-3.5 pr-2 text-secondary transition-colors focus-within:border-brand focus-within:ring-[0.5px] focus-within:ring-brand">
        <Icon name="magnifying-glass" size={18} />
        <input
          ref={input}
          data-search-inline
          value={s.query}
          onChange={(e) => {
            s.setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            s.load();
          }}
          onKeyDown={s.onKeyDown}
          placeholder={label}
          aria-label="Search bookings, drivers, cars and Trip log"
          role="combobox"
          aria-expanded={showList}
          aria-controls="dashboard-search-results"
          aria-activedescendant={showList && s.results[s.active] ? `dashboard-search-results-${s.active}` : undefined}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent type-body-sm text-primary placeholder:text-secondary focus:outline-none"
        />
        <Kbd>⌘K</Kbd>
      </label>
      {showList && (
        <div className="absolute left-0 top-full z-40 mt-2 w-[520px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-gray-100 bg-layer shadow-[0_16px_48px_0_var(--shadow-md)] [animation:pop_.15s_ease-out]">
          <ResultList
            id="dashboard-search-results"
            results={s.results}
            active={s.active}
            setActive={s.setActive}
            go={s.go}
            query={s.query}
            loading={s.loading}
            className="max-h-[60vh]"
          />
        </div>
      )}
    </div>
  );
}

// ⌘K anywhere else: the same results in a dialog.
function SearchDialog() {
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const s = useSearch(() => setOpen(false));
  const { setQuery, load } = s;

  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const show = useCallback(() => {
    setQuery("");
    setOpen(true);
    requestAnimationFrame(() => input.current?.focus());
    load();
  }, [setQuery, load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (openRef.current) return setOpen(false);
        // On the Dashboard, ⌘K jumps into the header search instead (Figma 2.4).
        const inline = document.querySelector<HTMLInputElement>("[data-search-inline]");
        if (inline && inline.offsetParent !== null) {
          inline.focus();
          inline.select();
        } else show();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("admin:search", show);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("admin:search", show);
    };
  }, [show]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]" data-palette-open>
      <button type="button" aria-label="Close search" className="absolute inset-0 cursor-default bg-scrim [animation:fade_.12s_ease-out]" onClick={() => setOpen(false)} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search the admin"
        className="relative w-full max-w-[520px] overflow-hidden rounded-lg border border-gray-100 bg-layer text-primary shadow-[0_16px_48px_0_var(--shadow-md)] [animation:pop_.15s_ease-out]"
      >
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 text-secondary">
          <Icon name="magnifying-glass" size={18} />
          <input
            ref={input}
            value={s.query}
            onChange={(e) => s.setQuery(e.target.value)}
            onKeyDown={s.onKeyDown}
            placeholder="Search name, phone or place"
            aria-label="Search bookings, drivers, cars and Trip log"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-results"
            aria-activedescendant={s.results[s.active] ? `palette-results-${s.active}` : undefined}
            autoComplete="off"
            className="h-13 flex-1 bg-transparent py-4 type-body-md text-primary placeholder:text-placeholder focus:outline-none"
          />
          <Kbd>Esc</Kbd>
        </div>
        <ResultList
          id="palette-results"
          results={s.results}
          active={s.active}
          setActive={s.setActive}
          go={s.go}
          query={s.query}
          loading={s.loading}
          className="max-h-[55vh]"
        />
      </div>
    </div>
  );
}

// "listener" is mounted once in the admin layout: it owns ⌘K and the dialog.
// "header" is the Dashboard search pill (type to search in place); "icon" (mobile)
// opens the dialog.
export default function CommandPalette({ variant, label = "Search name, phone or place" }: { variant: "listener" | "header" | "icon"; label?: string }) {
  if (variant === "listener") return <SearchDialog />;
  if (variant === "header") return <InlineSearch label={label} />;
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("admin:search"))}
      aria-label="Search"
      className="grid size-10 place-items-center rounded-full border border-gray-200 bg-layer text-secondary"
    >
      <Icon name="magnifying-glass" size={18} />
    </button>
  );
}
