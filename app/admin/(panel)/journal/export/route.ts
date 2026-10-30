import { isAuthed } from "@/lib/adminAuth";
import { istDate } from "@/lib/bookingTypes";
import { entryNet } from "@/lib/catalogTypes";
import { listCars } from "@/lib/fleet";
import { listEntries } from "@/lib/journal";

// Excel/Sheets would run a cell starting with = + - @ as a formula — neutralise it.
function cell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

const isDate = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

// Admin: download the journal for a date range as CSV (the page's "Export").
export async function GET(req: Request) {
  if (!(await isAuthed())) return new Response("Unauthorized.", { status: 401 });

  const params = new URL(req.url).searchParams;
  const from = isDate(params.get("from")) ? (params.get("from") as string) : "0000-00-00";
  const to = isDate(params.get("to")) ? (params.get("to") as string) : "9999-99-99";
  const [entries, cars] = await Promise.all([listEntries(), listCars()]);
  const carById = new Map(cars.map((c) => [c.id, c]));

  const header = ["Date", "Car", "Number", "Customer", "Mobile", "From", "To", "Round trip", "Km", "Fare (INR)", "Fuel (INR)", "Driver cut (INR)", "Net (INR)", "Note"];
  const rows = entries
    .filter((e) => e.date >= from && e.date <= to)
    .reverse()
    .map((e) => {
      const car = carById.get(e.carId);
      return [
        e.date,
        car?.name ?? "Removed car",
        car?.number ?? "",
        e.customer,
        e.phone ?? "",
        e.from,
        e.to,
        e.roundTrip ? "yes" : "",
        e.km != null ? String(e.km) : "",
        String(e.fare),
        String(e.fuel),
        String(e.driverCut),
        String(entryNet(e)),
        e.note,
      ]
        .map(cell)
        .join(",");
    });
  // BOM so Excel opens the file as UTF-8 (₹, Hindi notes).
  const csv = "﻿" + [header.map(cell).join(","), ...rows].join("\r\n");
  const name = from === "0000-00-00" ? istDate() : `${from}-to-${to}`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dumraoncab-journal-${name}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
