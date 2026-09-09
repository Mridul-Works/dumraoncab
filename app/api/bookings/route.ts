import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/adminAuth";
import { addBooking, listBookings } from "@/lib/store";

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Public: the site's forms post here (alongside opening WhatsApp) so the
// admin panel has a record of every request made through the website.
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const from = str(body.from);
  const service = str(body.service, 60);
  if (!from || !service) {
    return NextResponse.json({ ok: false, error: "Missing trip details." }, { status: 400 });
  }

  const booking = await addBooking({
    source: body.source === "booking-form" ? "booking-form" : "hero-widget",
    service,
    name: str(body.name, 80),
    phone: str(body.phone, 20),
    from,
    to: str(body.to),
    date: str(body.date, 20),
    time: str(body.time, 20),
    car: str(body.car, 60),
    notes: str(body.notes, 500),
  });

  return NextResponse.json({ ok: true, id: booking.id }, { status: 201 });
}

// Admin only: full list, newest first.
export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  return NextResponse.json({ ok: true, bookings: await listBookings() });
}
