import { isAuthed } from "@/lib/adminAuth";
import { SOURCE_LABELS, istDate } from "@/lib/bookingTypes";
import { listBookings } from "@/lib/store";

// Excel/Sheets would run a cell starting with = + - @ as a formula — neutralise it.
function cell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

// Admin: download every booking as CSV.
export async function GET() {
  if (!(await isAuthed())) return new Response("Unauthorized.", { status: 401 });

  const header = ["Received", "Status", "Source", "Service", "Name", "Phone", "From", "To", "Travel date", "Time", "Car", "Customer notes", "Internal note"];
  const rows = (await listBookings()).map((b) =>
    [b.createdAt, b.status, SOURCE_LABELS[b.source] ?? b.source, b.service, b.name, b.phone, b.from, b.to, b.date, b.time, b.car, b.notes, b.adminNote ?? ""].map(cell).join(","),
  );
  // BOM so Excel opens the file as UTF-8 (₹, Hindi names).
  const csv = "\uFEFF" + [header.map(cell).join(","), ...rows].join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dumraoncab-bookings-${istDate()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
