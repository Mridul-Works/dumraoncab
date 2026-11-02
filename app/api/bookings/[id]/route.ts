import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/adminAuth";
import { BOOKING_STATUSES, type Booking, type BookingPatch } from "@/lib/bookingTypes";
import { deleteBooking, updateBooking } from "@/lib/store";

type Ctx = { params: Promise<{ id: string }> };

const unauthorized = () => NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

// Admin: change status, the internal note, the cancel reason (Figma 3.7) or
// who drives it (Figma 3.6). Empty strings clear the driver/vendor fields.
export async function PATCH(request: Request, { params }: Ctx) {
  if (!(await isAuthed())) return unauthorized();

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const patch: BookingPatch = {};
  if (body.status !== undefined) {
    if (!BOOKING_STATUSES.includes(body.status as Booking["status"])) {
      return NextResponse.json({ ok: false, error: "Unknown status." }, { status: 400 });
    }
    patch.status = body.status as Booking["status"];
  }
  if (typeof body.adminNote === "string") patch.adminNote = body.adminNote.trim().slice(0, 1000);
  const text = (key: "cancelReason" | "driverName" | "driverMobile" | "vendorId" | "vendorCarId", max: number) => {
    const v = body[key];
    if (typeof v === "string") patch[key] = v.trim().slice(0, max) || undefined;
  };
  text("cancelReason", 200);
  text("driverName", 80);
  text("driverMobile", 20);
  text("vendorId", 64);
  text("vendorCarId", 64);
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "Nothing to update." }, { status: 400 });
  }

  const booking = await updateBooking(id, patch);
  if (!booking) return NextResponse.json({ ok: false, error: "Booking not found." }, { status: 404 });
  return NextResponse.json({ ok: true, booking });
}

// Admin: remove a booking (spam, duplicates, tests).
export async function DELETE(_request: Request, { params }: Ctx) {
  if (!(await isAuthed())) return unauthorized();
  const { id } = await params;
  if (!(await deleteBooking(id))) {
    return NextResponse.json({ ok: false, error: "Booking not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
