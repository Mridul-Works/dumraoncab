import type { Booking } from "@/lib/bookingTypes";

// Browser-safe rules shared by driver app screens and their Server Actions.

// 10.19: three reasons, no typing.
export const declineReasons = ["Already on a trip", "Car not ready", "Not feeling well"];

// 10.30: three expense types only.
export const EXPENSE_KINDS = ["Toll", "Parking", "Fuel"];

// 10.24: a start reading below the last trip, or more than 300 km above it, needs a second look.
export const METER_JUMP_KM = 300;

// The last meter reading this driver recorded for the same car.
export function lastOdometer(bookings: Booking[], carId: string | undefined, excludeId?: string): number | undefined {
  let best: { at: string; km: number } | undefined;
  for (const b of bookings) {
    const t = b.trip;
    if (b.id === excludeId || !t || (carId && b.vendorCarId !== carId)) continue;
    const km = t.endKm ?? t.startKm;
    const at = t.endedAt ?? t.startedAt;
    if (km != null && at && (!best || at > best.at)) best = { at, km };
  }
  return best?.km;
}

export function meterProblem(km: number, last: number | undefined): string | null {
  if (last == null) return null;
  const show = last.toLocaleString("en-IN");
  if (km < last) return `Lower than your last trip, ${show} km. Check the meter again.`;
  if (km - last > METER_JUMP_KM) return `More than ${METER_JUMP_KM} km above your last trip, ${show} km. Check the meter again.`;
  return null;
}
