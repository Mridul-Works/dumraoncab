"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/adminAuth";
import { BOOKING_STATUSES, phoneDigits, type BookingStatus } from "@/lib/bookingTypes";
import { getCar } from "@/lib/fleet";
import { addEntry, deleteEntry, updateEntry } from "@/lib/journal";
import { getBooking, updateBooking } from "@/lib/store";
import { field, isDate, money, refreshAdmin, type FormState } from "./form";

// Only ever send people back into the journal (no open redirects).
const safeReturn = (to: string) => (/^\/admin\/journal(\?[\w=&%.-]*)?$/.test(to) ? to : "/admin/journal");

// returnTo with extra query params (drops any stale toast params first).
function withParams(to: string, params: Record<string, string>) {
  const url = new URL(safeReturn(to), "http://x");
  for (const k of ["saved", "added", "was", "new", "entry", "booking", "date"]) url.searchParams.delete(k);
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
  return `${url.pathname}${url.search}`;
}

export async function saveEntry(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = field(formData, "id", 64);
  const date = field(formData, "date", 10);
  const carId = field(formData, "carId", 64);
  const bookingId = field(formData, "bookingId", 64);

  if (!isDate(date)) return { error: "Pick the date of the trip." };
  if (!carId) return { error: "Choose the car that did this trip." };
  if (field(formData, "fare", 20) === "") return { error: "Enter the fare received. Use 0 for own use." };
  if (!(await getCar(carId))) return { error: "That car is no longer in the fleet." };
  const booking = bookingId ? await getBooking(bookingId) : undefined;

  const input = {
    date,
    carId,
    bookingId: booking?.id,
    customer: field(formData, "customer", 80),
    phone: phoneDigits(field(formData, "phone", 20)) || undefined,
    from: field(formData, "from"),
    to: field(formData, "to"),
    roundTrip: field(formData, "roundTrip", 1) === "1" || undefined,
    km: field(formData, "km", 12) === "" ? undefined : money(formData, "km", 5000),
    fare: money(formData, "fare"),
    fuel: money(formData, "fuel"),
    driverCut: money(formData, "driverCut"),
    note: field(formData, "note", 500),
  };
  if (!input.from && !input.customer && !input.note) return { error: "Add the customer, the route or a note." };

  let savedId = id;
  if (id) {
    if (!(await updateEntry(id, input))) return { error: "This entry was deleted." };
  } else {
    savedId = (await addEntry(input)).id;
  }
  // A logged trip has happened: close out its booking (remembering how it was, for Undo).
  let was = "";
  if (booking && (booking.status === "new" || booking.status === "contacted" || booking.status === "confirmed")) {
    was = booking.status;
    await updateBooking(booking.id, { status: "completed" });
  }
  refreshAdmin();
  redirect(withParams(field(formData, "returnTo", 300), { saved: savedId, added: id ? "" : "1", was: id ? "" : was }));
}

export async function removeEntry(id: string, returnTo: string) {
  await requireAdmin();
  await deleteEntry(id);
  refreshAdmin();
  redirect(withParams(String(returnTo), {}));
}

// Undo a just-saved new entry: delete it and put its booking back the way it was.
export async function undoEntry(id: string, returnTo: string, bookingId?: string, was?: string) {
  await requireAdmin();
  await deleteEntry(String(id));
  if (bookingId && was && BOOKING_STATUSES.includes(was as BookingStatus)) {
    const booking = await getBooking(String(bookingId));
    if (booking?.status === "completed") await updateBooking(booking.id, { status: was as BookingStatus });
  }
  refreshAdmin();
  redirect(withParams(String(returnTo), {}));
}
