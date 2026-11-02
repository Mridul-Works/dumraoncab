import { isAuthed } from "@/lib/adminAuth";
import { loadRangeRows, resolveRange } from "@/lib/analytics";
import { SOURCE_LABELS, STATUS_LABELS } from "@/lib/bookingTypes";

// Analytics → Export → Download CSV (Figma 7.3): every booking and trip-log
// entry in the range, one sheet, with a Type column.

// Excel/Sheets would run a cell starting with = + - @ as a formula — neutralise it.
function cell(value: string | number | undefined): string {
  const v = value == null ? "" : String(value);
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET(req: Request) {
  if (!(await isAuthed())) return new Response("Unauthorized.", { status: 401 });

  const p = new URL(req.url).searchParams;
  const range = resolveRange({ range: p.get("range") ?? (p.get("from") ? "custom" : undefined), from: p.get("from") ?? undefined, to: p.get("to") ?? undefined });
  const { bookings, entries, cars } = await loadRangeRows(range);
  const carName = (id?: string) => (id ? (cars.find((c) => c.id === id)?.name ?? "Removed car") : "");

  const header = ["Type", "Date", "Time", "Customer", "Phone", "From", "To", "Service", "Car", "Status", "Came from", "Km", "Fare (INR)", "Fuel (INR)", "Driver cut (INR)", "Net (INR)", "Note"];
  const rows: (string | number | undefined)[][] = [
    ...bookings.map((b) => [
      "Booking",
      b.date,
      b.time,
      b.name,
      b.phone,
      b.from,
      b.to,
      b.service,
      carName(b.carId) || b.car,
      STATUS_LABELS[b.status],
      SOURCE_LABELS[b.source],
      b.trip?.startKm != null && b.trip?.endKm != null ? b.trip.endKm - b.trip.startKm : "",
      b.trip?.collected ?? b.quote ?? "",
      "",
      "",
      "",
      b.status === "cancelled" ? b.cancelReason : b.notes,
    ]),
    ...entries.map((e) => [
      "Trip log",
      e.date,
      "",
      e.customer,
      e.phone ?? "",
      e.from,
      e.to,
      e.roundTrip ? "Round trip" : "",
      carName(e.carId),
      "",
      "",
      e.km ?? "",
      e.fare,
      e.fuel,
      e.driverCut,
      e.net,
      e.note,
    ]),
  ].sort((a, b) => String(a[1]).localeCompare(String(b[1])));

  // BOM so Excel opens the file as UTF-8 (₹, Hindi notes).
  const csv = "﻿" + [header.map(cell).join(","), ...rows.map((r) => r.map(cell).join(","))].join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dumraoncab-analytics-${range.from}-to-${range.to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
