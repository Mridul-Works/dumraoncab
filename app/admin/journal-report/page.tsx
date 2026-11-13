import type { Metadata } from "next";
import Link from "next/link";
import PrintButton from "@/components/admin/analytics/PrintButton";
import { rangeLabel } from "@/components/admin/JournalFormat";
import { routeText } from "@/components/admin/JournalParts";
import { requireAdmin } from "@/lib/adminAuth";
import { istDate } from "@/lib/bookingTypes";
import { entryNet, inr, shortDate } from "@/lib/catalogTypes";
import { getCompany } from "@/lib/company";
import { listCars } from "@/lib/fleet";
import { listEntries } from "@/lib/journal";
import { listVendors } from "@/lib/vendors";

export const metadata: Metadata = { title: "Daily Diary summary" };

type Search = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const validDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const signed = (n: number) => (n < 0 ? `−${inr(-n)}` : inr(n));

// Daily Diary → Export → Download PDF summary (Figma 4B.10): totals, by car
// and every trip for the range (and car) on screen, for the accountant.
// Opens with ?print=1 so the browser offers "Save as PDF".
export default async function JournalReportPage({ searchParams }: { searchParams: Search }) {
  await requireAdmin();
  const sp = await searchParams;
  const today = istDate();
  let from = validDate(one(sp.from)) ? one(sp.from) : `${today.slice(0, 8)}01`;
  let to = validDate(one(sp.to)) ? one(sp.to) : today;
  if (from > to) [from, to] = [to, from];
  const carId = one(sp.car);

  const [entries, cars, vendors, company] = await Promise.all([listEntries(), listCars(), listVendors(), getCompany()]);
  const carById = new Map<string, { name: string; number: string }>([
    ...vendors.flatMap((v) => v.cars.map((c) => [c.id, { name: c.model, number: c.number }] as const)),
    ...cars.map((c) => [c.id, c] as const),
  ]);
  const car = carId ? carById.get(carId) : undefined;
  const list = entries.filter((e) => e.date >= from && e.date <= to && (!carId || e.carId === carId)).reverse();

  const sum = (xs: typeof list) => ({
    trips: xs.length,
    km: xs.reduce((s, e) => s + (e.km ?? 0), 0),
    fare: xs.reduce((s, e) => s + e.fare, 0),
    fuel: xs.reduce((s, e) => s + e.fuel, 0),
    driver: xs.reduce((s, e) => s + e.driverCut, 0),
    net: xs.reduce((s, e) => s + entryNet(e), 0),
  });
  const t = sum(list);
  const byCar = [...new Set(list.map((e) => e.carId))]
    .map((id) => ({ id, name: carById.get(id)?.name ?? "Removed car", t: sum(list.filter((e) => e.carId === id)) }))
    .sort((a, b) => b.t.net - a.t.net);

  const cell = "border-b border-gray-100 py-1.5";
  const generated = new Date().toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
  const back = `/admin/journal?from=${from}&to=${to}${carId ? `&car=${encodeURIComponent(carId)}` : ""}`;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 print:bg-layer print:p-0">
      <div className="mx-auto mb-4 flex max-w-[794px] items-center justify-between gap-3 print:hidden">
        <Link href={back} className="type-body-sm text-secondary hover:text-link-hover">
          ← Back to the Daily Diary
        </Link>
        <PrintButton auto={one(sp.print) === "1"} />
      </div>

      <article className="mx-auto flex max-w-[794px] flex-col gap-6 rounded-lg border border-gray-100 bg-layer p-10 print:max-w-none print:rounded-none print:border-0 print:p-0">
        <header className="flex items-start gap-3 border-b border-gray-100 pb-5">
          {company.logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- uploaded logo, printed
            <img src={company.logo} alt="" className="size-11 rounded-md object-cover" />
          ) : (
            <span className="grid size-11 place-items-center rounded-md bg-brand type-ui text-on-color">DC</span>
          )}
          <div className="min-w-0 flex-1">
            <p className="type-h4 text-primary">{company.name}</p>
            <p className="type-body-sm text-secondary">
              {[`+91 ${company.phoneDisplay}`, company.gstin && `GSTIN ${company.gstin}`, company.email].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="text-right">
            <p className="type-ui text-primary">Daily Diary summary</p>
            <p className="type-body-sm text-secondary">
              {rangeLabel(from, to)} · {car ? car.name : "all cars"}
            </p>
          </div>
        </header>

        <section className="grid grid-cols-5 gap-3">
          {[
            ["Kilometres", `${t.km.toLocaleString("en-IN")} km`, `${t.trips} trip${t.trips === 1 ? "" : "s"}`],
            ["Fare collected", inr(t.fare), ""],
            ["Fuel", inr(t.fuel), ""],
            ["Driver cut", inr(t.driver), ""],
            ["Net earnings", signed(t.net), ""],
          ].map(([label, value, sub]) => (
            <div key={label} className="rounded-md bg-gray-50 p-3 print:border print:border-gray-100 print:bg-layer">
              <p className="type-body-sm text-secondary">{label}</p>
              <p className="type-h4 tabular-nums text-primary">{value}</p>
              {sub && <p className="type-body-sm text-secondary">{sub}</p>}
            </div>
          ))}
        </section>
        <p className="-mt-3 type-body-sm text-secondary">Net is fare less fuel and driver cut. Tolls and parking go on the customer’s bill.</p>

        {!car && (
          <ReportTable
            title="By car"
            head={["Car", "Trips", "Km", "Fare", "Net"]}
            rows={byCar.map((c) => [c.name, String(c.t.trips), c.t.km.toLocaleString("en-IN"), inr(c.t.fare), signed(c.t.net)])}
            cell={cell}
          />
        )}

        <ReportTable
          title="Every trip"
          head={["Date", ...(car ? [] : ["Car"]), "Trip", "Km", "Fare", "Fuel", "Driver", "Net"]}
          rows={list.map((e) => [
            shortDate(e.date),
            ...(car ? [] : [carById.get(e.carId)?.name ?? "Removed car"]),
            [e.customer, routeText(e)].filter(Boolean).join(" · ") || e.note || "Trip",
            e.km != null ? String(e.km) : "—",
            inr(e.fare),
            inr(e.fuel),
            inr(e.driverCut),
            signed(entryNet(e)),
          ])}
          cell={cell}
          textCols={car ? 2 : 3}
        />

        <footer className="mt-auto border-t border-gray-100 pt-3 type-body-sm text-secondary">
          Generated {generated} from the Daily Diary · {company.website}
        </footer>
      </article>
    </div>
  );
}

function ReportTable({ title, head, rows, cell, textCols = 1 }: { title: string; head: string[]; rows: string[][]; cell: string; textCols?: number }) {
  return (
    <section>
      <h2 className="mb-2 type-ui text-primary">{title}</h2>
      {rows.length ? (
        <table className="w-full type-body-sm">
          <thead>
            <tr className="text-secondary">
              {head.map((h, i) => (
                <th key={h} className={`${cell} pr-2 font-normal ${i < textCols ? "text-left" : "text-right"}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-primary">
            {rows.map((row, ri) => (
              <tr key={ri} className="break-inside-avoid">
                {row.map((v, i) => (
                  <td key={i} className={`${cell} pr-2 tabular-nums ${i < textCols ? "" : "text-right"}`}>
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="type-body-sm text-secondary">Nothing in this range.</p>
      )}
    </section>
  );
}
