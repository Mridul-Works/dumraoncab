"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Booking, BookingStatus } from "@/lib/bookingTypes";
import { BOOKING_STATUSES } from "@/lib/bookingTypes";

const statusStyle: Record<BookingStatus, string> = {
  new: "bg-amber/15 text-amberdeep",
  confirmed: "bg-cream text-ink",
  completed: "bg-leaf/15 text-leaf",
  cancelled: "bg-red-50 text-red-600",
};

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/admin/login", { method: "DELETE" }).catch(() => {});
        router.refresh();
      }}
      className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-amber hover:text-amberdeep"
    >
      Log out
    </button>
  );
}

export default function BookingsPanel({ bookings }: { bookings: Booking[] }) {
  const router = useRouter();
  const [savingId, setSavingId] = useState<string | null>(null);

  async function setStatus(id: string, status: string) {
    setSavingId(id);
    await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch(() => {});
    setSavingId(null);
    router.refresh();
  }

  if (bookings.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-line p-8 text-center">
        <p className="font-display text-base font-extrabold text-ink">No website bookings yet</p>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-khaki">
          Requests sent through the site&rsquo;s booking widget and form will appear here the moment
          a visitor submits one. Phone and direct-WhatsApp bookings are not captured.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="border-b border-line text-left font-mono text-[11px] uppercase tracking-wider text-khaki">
            <th className="px-4 py-3 font-semibold">Received</th>
            <th className="px-4 py-3 font-semibold">Customer</th>
            <th className="px-4 py-3 font-semibold">Trip</th>
            <th className="px-4 py-3 font-semibold">Travel date</th>
            <th className="px-4 py-3 font-semibold">Car</th>
            <th className="px-4 py-3 font-semibold">Source</th>
            <th className="px-4 py-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id} className="border-b border-line align-top last:border-b-0">
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-khaki">
                {new Date(b.createdAt).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td className="px-4 py-3">
                <p className="font-semibold text-ink">{b.name || "—"}</p>
                {b.phone ? (
                  <a href={`tel:+91${b.phone.replace(/\D/g, "").slice(-10)}`} className="font-mono text-xs text-amberdeep">
                    {b.phone}
                  </a>
                ) : (
                  <span className="text-xs text-sand">no phone given</span>
                )}
              </td>
              <td className="px-4 py-3">
                <p className="font-semibold text-ink">
                  {b.from} → {b.to || "—"}
                </p>
                <p className="text-xs text-khaki">
                  {b.service}
                  {b.notes ? ` · ${b.notes}` : ""}
                </p>
              </td>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink">
                {b.date || "—"}
                {b.time ? ` ${b.time}` : ""}
              </td>
              <td className="px-4 py-3 text-khaki">{b.car || "Any"}</td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-cream px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-khaki">
                  {b.source === "hero-widget" ? "Widget" : "Form"}
                </span>
              </td>
              <td className="px-4 py-3">
                <select
                  value={b.status}
                  disabled={savingId === b.id}
                  onChange={(e) => setStatus(b.id, e.target.value)}
                  aria-label={`Status for booking from ${b.name || b.from}`}
                  className={`rounded-full border-0 px-3 py-1.5 text-xs font-bold ${statusStyle[b.status]} disabled:opacity-50`}
                >
                  {BOOKING_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
