"use client";

import { useActionState } from "react";
import { saveService } from "@/app/admin/fleet-actions";
import { Field, FormError, btnPrimary, inputCls } from "@/components/admin/ui";
import type { Car, ServiceState } from "@/lib/catalogTypes";

// Odometer reading + next service (date and/or km) for one car.
export default function ServiceForm({ car, state: service, today }: { car: Car; state: ServiceState; today: string }) {
  const [state, action, pending] = useActionState(saveService, undefined);

  return (
    <form action={action} className="space-y-3 px-5 py-4">
      <input type="hidden" name="id" value={car.id} />
      <input type="hidden" name="today" value={today} />
      <p className="type-body-sm text-primary">
        {service.level === "unset" ? "Set a date or km reading so the journal can warn you before service is due." : service.label}
        {service.kmNow != null && <span className="block type-body-sm text-secondary">Odometer now ≈ {service.kmNow.toLocaleString("en-IN")} km (last reading + logged trips)</span>}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="New odometer reading" htmlFor="sv-odo" hint="Leave blank to keep the last one.">
          <input
            id="sv-odo"
            name="odometerKm"
            inputMode="numeric"
            placeholder={service.kmNow != null ? `≈ ${service.kmNow}` : "e.g. 48200"}
            className={inputCls}
          />
        </Field>
        <Field label="Next service at (km)" htmlFor="sv-km">
          <input id="sv-km" name="nextServiceKm" inputMode="numeric" defaultValue={car.nextServiceKm ?? ""} className={inputCls} />
        </Field>
        <Field label="…or by date" htmlFor="sv-date" className="col-span-2">
          <input id="sv-date" name="nextServiceDate" type="date" defaultValue={car.nextServiceDate ?? ""} className={inputCls} />
        </Field>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Saving…" : "Save service"}
        </button>
        {state?.ok && !pending && (
          <span className="type-ui text-brand" role="status">
            Saved
          </span>
        )}
      </div>
      <FormError error={state?.error} />
    </form>
  );
}
