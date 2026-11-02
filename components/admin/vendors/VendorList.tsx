"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Icon from "@/components/admin/Icon";
import { btnDanger, btnGhost, btnPrimary } from "@/components/admin/ui";
import { reactivateVendor, undoVendorChange } from "@/app/admin/vendor-actions";
import type { Vendor, VendorStatus } from "@/lib/vendorTypes";
import { EmptyBlock, KindTag, Notice, VendorStatusBadge } from "./parts";
import { ApproveDialog, RejectDialog, SuspendDialog, type Upcoming } from "./VendorDialogs";
import VendorToast, { type ToastMsg } from "./VendorToast";

// Figma 6.1 Vendors list + 6.12–6.15 empty / no results / caught up / error.
// Status tab and search live in the URL (?status=pending&q=…).

type Tab = "all" | VendorStatus;
const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "suspended", label: "Suspended" },
  { id: "rejected", label: "Rejected" },
];

// Column widths from the Figma table (230 / 280 / 80 / 50 / 110 / fill).
const COLS = "lg:grid-cols-[minmax(0,230fr)_minmax(0,280fr)_80px_50px_110px_minmax(240px,1fr)]";

function matches(v: Vendor, q: string) {
  if (!q) return true;
  const hay = [v.name, v.email ?? "", v.mobile, v.mobile.replace(/\D/g, ""), v.altMobile ?? "", v.code ?? "", v.address?.town ?? "", ...v.cars.flatMap((c) => [c.number, c.number.replace(/\s/g, ""), c.model])]
    .join(" ")
    .toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .every((w) => hay.includes(w));
}

type Dialog = { kind: "approve" | "reject" | "suspend"; vendor: Vendor } | null;

export default function VendorList({
  vendors,
  upcoming,
  today,
  failed = false,
  partnerUrl,
}: {
  vendors: Vendor[];
  upcoming: Record<string, Upcoming[]>;
  today: string;
  failed?: boolean;
  partnerUrl: string;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const raw = params.get("status");
  const tab: Tab = TABS.some((t) => t.id === raw) ? (raw as Tab) : "all";
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const [, start] = useTransition();
  const [copied, setCopied] = useState(false);

  const setParams = useCallback((patch: Record<string, string | null>) => {
    const next = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(patch)) {
      if (!v || v === "all") next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, []);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { all: vendors.length, pending: 0, approved: 0, suspended: 0, rejected: 0 };
    for (const v of vendors) c[v.status]++;
    return c;
  }, [vendors]);

  const q = query.trim();
  const visible = vendors.filter((v) => (tab === "all" || v.status === tab) && matches(v, q));
  const pending = vendors.filter((v) => v.status === "pending");
  const done = (text: string, undo?: () => void) => setToast((t) => ({ text, undo, key: (t?.key ?? 0) + 1 }));

  function copyPartnerLink() {
    navigator.clipboard?.writeText(partnerUrl).then(
      () => {
        setCopied(true);
        done("Partner link copied");
      },
      () => done(partnerUrl),
    );
  }

  const intro = failed || !vendors.length ? "Car owners and drivers who run trips with us" : `${vendors.length} registered vendor${vendors.length === 1 ? "" : "s"} · car owners and drivers`;

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-[min(100%,20rem)] flex-1">
        <h1 className="type-h2 text-primary">Vendors</h1>
        <p className="mt-1 type-body-sm text-secondary">{intro}</p>
      </div>
      <Link href="/admin/vendors/new" className={btnPrimary}>
        <Icon name="plus" size={16} />
        Add vendor
      </Link>
    </div>
  );

  // 6.12 — nobody has signed up or been added yet.
  if (!failed && !vendors.length) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <div className="rounded-lg border border-gray-100 bg-layer">
          <EmptyBlock
            art="vendors"
            title="No vendors yet"
            actions={
              <>
                <Link href="/admin/vendors/new" className={btnPrimary}>
                  <Icon name="plus" size={16} />
                  Add vendor
                </Link>
                <button type="button" onClick={copyPartnerLink} className={btnGhost}>
                  {copied ? "Link copied" : "Copy partner link"}
                </button>
              </>
            }
          >
            Add an owner who called or walked in, or share the partner link so they can sign up on the website.
          </EmptyBlock>
        </div>
        <VendorToast toast={toast} onClose={() => setToast(null)} />
      </div>
    );
  }

  const first = pending[0];
  return (
    <div className="flex flex-col gap-6">
      {header}

      {!failed && pending.length > 0 && tab !== "pending" && (
        <Notice
          title={`${pending.length} vendor${pending.length > 1 ? "s are" : " is"} waiting for approval`}
          action={
            <button type="button" className={btnGhost} onClick={() => setParams({ status: "pending" })}>
              Show pending
            </button>
          }
        >
          {pending.length === 1
            ? `${first.name} ${first.source === "admin" ? "was added" : "signed up"} as ${first.kind === "owner" ? "an owner" : "a driver"}. Check their details, then approve or reject.`
            : `${first.name} and ${pending.length - 1} other${pending.length > 2 ? "s" : ""} signed up. Check their details, then approve or reject.`}
        </Notice>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div role="tablist" aria-label="Status" className="flex shrink-0 gap-1 overflow-x-auto rounded-full border border-gray-100 bg-layer p-1">
          {TABS.map((t) => {
            const on = t.id === tab;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setParams({ status: t.id })}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-[7px] transition-colors ${on ? "bg-inverse" : "hover:bg-layer-hover"}`}
              >
                <span className={`type-ui ${on ? "text-inverse" : "text-primary"}`}>{t.label}</span>
                <span className={`type-body-sm tabular-nums ${on ? "text-secondary-inverse" : "text-secondary"}`}>{failed ? "–" : counts[t.id]}</span>
              </button>
            );
          })}
        </div>
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-gray-200 bg-layer px-3.5 py-2.5 focus-within:border-focus">
          <Icon name="magnifying-glass" size={16} className="text-[var(--icon-secondary)]" />
          <span className="sr-only">Search vendors</span>
          <input
            type="search"
            value={query}
            disabled={failed}
            onChange={(e) => {
              setQuery(e.target.value);
              setParams({ q: e.target.value.trim() || null });
            }}
            placeholder="Search business, owner or email"
            className="min-w-0 flex-1 bg-transparent type-body-sm text-primary placeholder:text-secondary focus:outline-none"
          />
        </label>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-100 bg-layer">
        <div className={`hidden gap-4 bg-layer-accent px-5 py-2.5 type-body-sm text-secondary lg:grid ${COLS}`}>
          <span>Business</span>
          <span>Contact</span>
          <span>Rating</span>
          <span>Trips</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>

        {failed ? (
          // 6.15
          <EmptyBlock
            art="something-went-wrong"
            title="Couldn’t load vendors"
            actions={
              <button type="button" className={btnPrimary} onClick={() => start(() => router.refresh())}>
                Try again
              </button>
            }
          >
            Check the internet connection and try again. Nothing you saved is lost.
          </EmptyBlock>
        ) : visible.length === 0 ? (
          q ? (
            // 6.13
            <EmptyBlock
              art="no-results"
              title={`No vendors match “${q}”`}
              actions={
                <button
                  type="button"
                  className={btnGhost}
                  onClick={() => {
                    setQuery("");
                    setParams({ q: null });
                  }}
                >
                  Clear search
                </button>
              }
            >
              Check the spelling, or search by mobile number or car number instead.
            </EmptyBlock>
          ) : tab === "pending" ? (
            // 6.14
            <EmptyBlock
              art="all-caught-up"
              title="No vendors waiting"
              actions={
                <button type="button" className={btnGhost} onClick={() => setParams({ status: null })}>
                  See all vendors
                </button>
              }
            >
              New sign-ups from the driver app and the website show up here. You get a WhatsApp when one arrives.
            </EmptyBlock>
          ) : (
            <EmptyBlock
              art="all-caught-up"
              title={`No ${TABS.find((t) => t.id === tab)?.label.toLowerCase()} vendors`}
              actions={
                <button type="button" className={btnGhost} onClick={() => setParams({ status: null })}>
                  See all vendors
                </button>
              }
            />
          )
        ) : (
          <ul>
            {visible.map((v) => (
              <li key={v.id} className={`grid grid-cols-1 gap-x-4 gap-y-2 border-b border-gray-100 px-5 py-3.5 last:border-b-0 lg:items-center ${COLS}`}>
                <div className="flex min-w-0 items-center gap-2">
                  <Link href={`/admin/vendors/${v.id}`} className="truncate type-body-md text-primary hover:text-link-hover">
                    {v.name}
                  </Link>
                  <KindTag kind={v.kind} />
                  <span className="ml-auto lg:hidden">
                    <VendorStatusBadge status={v.status} />
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="truncate type-body-md text-primary">{v.email || <span className="text-secondary">No email</span>}</p>
                  <p className="type-body-sm text-secondary">{v.mobile}</p>
                </div>
                <p className="type-body-sm text-secondary">
                  <span className="lg:hidden">Rating </span>
                  {v.rating ? v.rating.toFixed(1) : "No rating"}
                </p>
                <p className="type-body-md tabular-nums text-primary">
                  {v.trips ?? 0}
                  <span className="type-body-sm text-secondary lg:hidden"> trips</span>
                </p>
                <div className="hidden lg:block">
                  <VendorStatusBadge status={v.status} />
                </div>
                <div className="flex items-center gap-2 lg:justify-end">
                  {v.status === "pending" && (
                    <>
                      <button type="button" className={btnPrimary} onClick={() => setDialog({ kind: "approve", vendor: v })}>
                        Approve
                      </button>
                      <button type="button" className={btnDanger} onClick={() => setDialog({ kind: "reject", vendor: v })}>
                        Reject
                      </button>
                    </>
                  )}
                  {v.status === "approved" && (
                    <button type="button" className={btnGhost} onClick={() => setDialog({ kind: "suspend", vendor: v })}>
                      Suspend
                    </button>
                  )}
                  {v.status === "suspended" && (
                    <button
                      type="button"
                      className={btnGhost}
                      onClick={() =>
                        start(async () => {
                          const res = await reactivateVendor(v.id);
                          if (!res.error) done(`${v.name} is back on trips`, () => void undoVendorChange(v.id));
                        })
                      }
                    >
                      Reactivate
                    </button>
                  )}
                  <Link
                    href={`/admin/vendors/${v.id}`}
                    aria-label={`View ${v.name}`}
                    title="View vendor"
                    className="ml-auto grid size-9 shrink-0 place-items-center rounded-md text-[var(--icon-primary)] hover:bg-layer-hover lg:ml-0"
                  >
                    <Icon name="eye-18" size={18} />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {dialog?.kind === "approve" && <ApproveDialog vendor={dialog.vendor} today={today} onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.kind === "reject" && <RejectDialog vendor={dialog.vendor} onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.kind === "suspend" && (
        <SuspendDialog vendor={dialog.vendor} upcoming={upcoming[dialog.vendor.id] ?? []} today={today} onClose={() => setDialog(null)} onDone={done} />
      )}
      <VendorToast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
