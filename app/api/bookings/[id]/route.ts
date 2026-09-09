import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/adminAuth";
import { BOOKING_STATUSES, type BookingStatus } from "@/lib/bookingTypes";
import { updateBookingStatus } from "@/lib/store";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  let status: BookingStatus;
  try {
    const body = await request.json();
    status = body?.status;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  if (!BOOKING_STATUSES.includes(status)) {
    return NextResponse.json({ ok: false, error: "Unknown status." }, { status: 400 });
  }

  const booking = await updateBookingStatus(id, status);
  if (!booking) {
    return NextResponse.json({ ok: false, error: "Booking not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, booking });
}
