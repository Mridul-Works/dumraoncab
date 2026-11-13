import { isAuthed } from "@/lib/adminAuth";
import { istDate } from "@/lib/bookingTypes";
import { entryNet } from "@/lib/catalogTypes";
import { listCars } from "@/lib/fleet";
import { expensesTotal, listEntries } from "@/lib/journal";
import { listVendors } from "@/lib/vendors";

// Excel/Sheets would run a cell starting with = + - @ as a formula — neutralise it.
function cell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

const isDate = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

// Admin: download the Daily Diary (entries that count) for a date range — and
// optionally one car — as CSV (Export → Download CSV, Figma 4B.10).
export async function GET(req: Request) {
  if (!(await isAuthed())) return new Response("Unauthorized.", { status: 401 });

  const params = new URL(req.url).searchParams;
  const from = isDate(params.get("from")) ? (params.get("from") as string) : "0000-00-00";
  const to = isDate(params.get("to")) ? (params.get("to") as string) : "9999-99-99";
  const carId = params.get("car") ?? "";
  const [entries, cars, vendors] = await Promise.all([listEntries(), listCars(), listVendors()]);
  // Fleet cars, plus vendors' own cars for approved driver entries.
  const carById = new Map<string, { name: string; number: string }>([
    ...vendors.flatMap((v) => v.cars.map((c) => [c.id, { name: c.model, number: c.number }] as const)),
    ...cars.map((c) => [c.id, c] as const),
  ]);

  const header = [
    "Date",
    "Pickup time",
    "Car",
    "Number",
    "Driver",
    "Customer",
    "Mobile",
    "From",
    "To",
    "Round trip",
    "Km",
    "Fare (INR)",
    "Fuel (INR)",
    "Driver cut (INR)",
    "Net (INR)",
    "Tolls and parking (INR)",
    "Paid by",
    "Note",
  ];
  const paidBy = (e: (typeof entries)[number]) => (!e.payment ? "" : !e.payment.received ? "Not yet" : e.payment.method === "upi" ? "UPI" : "Cash");
  const rows = entries
    .filter((e) => e.date >= from && e.date <= to && (!carId || e.carId === carId))
    .reverse()
    .map((e) => {
      const car = carById.get(e.carId);
      return [
        e.date,
        e.time ?? "",
        car?.name ?? "Removed car",
        car?.number ?? "",
        e.driver ?? "",
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
        e.expenses?.length ? String(expensesTotal(e)) : "",
        paidBy(e),
        e.note,
      ]
        .map(cell)
        .join(",");
    });
  // BOM so Excel opens the file as UTF-8 (₹, Hindi notes).
  const csv = "﻿" + [header.map(cell).join(","), ...rows].join("\r\n");
  const carName = carId ? (carById.get(carId)?.name ?? "car").toLowerCase().replace(/[^a-z0-9]+/g, "-") : "";
  const name = [from === "0000-00-00" ? istDate() : `${from}-to-${to}`, carName].filter(Boolean).join("-");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dumraoncab-daily-diary-${name}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
