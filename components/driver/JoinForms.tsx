"use client";

import { useActionState, useState, useTransition } from "react";
import Icon from "@/components/admin/Icon";
import { saveCar, saveDetails, setCarCount, submitForChecking, uploadDoc, type ActionState } from "@/app/driver/actions";
import { UploadBox } from "./camera";
import { CheckRow, Field, RadioRow } from "./fields";
import { Busy, btnClass, Spacer } from "./ui";

const ErrorLine = ({ state }: { state: ActionState }) =>
  state?.error ? (
    <p role="alert" className="type-body-sm text-negative">
      {state.error}
    </p>
  ) : null;

// Figma 10.6 Your details (the fields under the photo).
export function DetailsForm({ draft }: { draft: { name: string; carChoice: "own" | "company"; place: string; upi: string } }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveDetails, undefined);
  return (
    <form action={action} className="flex flex-1 flex-col gap-[14px]">
      <Field label="Full name, as on your licence" name="name" defaultValue={draft.name} autoComplete="name" required minLength={3} maxLength={80} />
      <fieldset className="flex flex-col gap-[8px]">
        <legend className="mb-[8px] type-ui text-primary">Which car will you drive?</legend>
        <RadioRow name="car" value="own" label="My own car" description="Add your cars and their papers next" defaultChecked={draft.carChoice !== "company"} />
        <RadioRow name="car" value="company" label="A Dumraon Cab car" description="The office gives you one after checking" defaultChecked={draft.carChoice === "company"} />
      </fieldset>
      <Field label="Where you live" name="place" defaultValue={draft.place} autoComplete="street-address" required maxLength={160} />
      <Field label="UPI ID for payouts" name="upi" defaultValue={draft.upi} autoComplete="off" autoCapitalize="none" required maxLength={60} placeholder="name@ybl" />
      <ErrorLine state={state} />
      <Spacer />
      <button type="submit" disabled={pending} className={btnClass("primary")}>
        <Busy on={pending}>Next: documents</Busy>
      </button>
    </form>
  );
}

// Figma 10.11 "How many cars will you drive?" stepper.
export function CarStepper({ count }: { count: number }) {
  const [pending, start] = useTransition();
  const step = (n: number) => start(() => setCarCount(n));
  return (
    <div className="flex items-center rounded-full border border-gray-200 bg-layer" role="group" aria-label="Number of cars">
      <button type="button" onClick={() => step(count - 1)} disabled={pending || count <= 1} aria-label="One car less" className="grid h-[40px] w-[44px] place-items-center type-h4 text-secondary disabled:opacity-40">
        −
      </button>
      <span className="grid h-[40px] w-[44px] place-items-center type-h4 text-primary" aria-live="polite">
        {count}
      </span>
      <button type="button" onClick={() => step(count + 1)} disabled={pending || count >= 10} aria-label="One car more" className="grid h-[40px] w-[44px] place-items-center type-h4 text-brand disabled:opacity-40">
        +
      </button>
    </div>
  );
}

export function AddCarButton({ count }: { count: number }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" onClick={() => start(() => setCarCount(count + 1))} disabled={pending} className="-my-[12px] flex min-h-[44px] items-center gap-[6px] self-start type-ui text-link hover:text-link-hover">
      <Icon name="plus" size={16} />
      Add another car
    </button>
  );
}

const TYPES = ["SUV", "MUV", "Sedan", "Hatchback", "Tempo Traveller", "Bus"];
const FUELS = ["Diesel", "Petrol", "CNG", "EV"];

// Car details for a car added on 10.11 (shown on 10.12 until filled in).
export function CarDetailsForm({ car }: { car: { id: string; model: string; number: string; type: string; fuel: string; seats: number; year: number } }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveCar, undefined);
  const select = "w-full rounded-md border border-gray-200 bg-layer px-[14px] py-[10px] type-body-sm text-primary outline-none focus:border-brand";
  return (
    <form action={action} className="flex flex-col gap-[14px] rounded-md border border-gray-200 bg-layer p-[14px]">
      <input type="hidden" name="id" value={car.id} />
      <Field label="Car model" name="model" defaultValue={car.model} placeholder="Maruti Ertiga" required />
      <Field label="Number plate" name="number" defaultValue={car.number} placeholder="BR 44 CD 5678" autoCapitalize="characters" required />
      <div className="flex gap-[10px]">
        <label className="flex flex-1 flex-col gap-[6px] type-ui text-primary">
          Type
          <select name="type" defaultValue={car.type} className={`${select} select-caret`}>
            {TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-[6px] type-ui text-primary">
          Fuel
          <select name="fuel" defaultValue={car.fuel} className={`${select} select-caret`}>
            {FUELS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex gap-[10px]">
        <Field label="Seats" name="seats" defaultValue={car.seats} inputMode="numeric" required />
        <Field label="Year" name="year" defaultValue={car.year} inputMode="numeric" required />
      </div>
      <ErrorLine state={state} />
      <button type="submit" disabled={pending} className={btnClass("secondary")}>
        <Busy on={pending}>Save car details</Busy>
      </button>
    </form>
  );
}

// Figma 10.13 Check and submit (checkbox + button).
export function SubmitForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(submitForChecking, undefined);
  const [agree, setAgree] = useState(false);
  return (
    <form action={action} className="flex flex-1 flex-col gap-[14px]">
      <CheckRow name="agree" label="These are my documents and they are correct" checked={agree} onChange={setAgree} />
      <ErrorLine state={state} />
      <Spacer />
      <button type="submit" disabled={pending || !agree} className={btnClass("primary")}>
        <Busy on={pending} text="Sending…">Submit for checking</Busy>
      </button>
    </form>
  );
}

// Figma 10.15 Asked to re-upload: only the flagged document, then "Send again"
// sends the new photo and the driver is back on Waiting for checking (10.14).
async function sendAgain(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    return await uploadDoc(fd);
  } catch {
    return { error: "The photo didn’t upload. Check the signal and tap Send again." };
  }
}

export function ReuploadForm({
  kind,
  car,
  label,
  hint,
  camera,
  children,
}: {
  kind: string;
  car?: string;
  label: string;
  hint: string;
  camera: { title: string; guide: string; sides?: number; pdf?: boolean; page?: string; check?: boolean };
  children?: React.ReactNode; // what is fine already, under the box
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(sendAgain, undefined);
  const [photo, setPhoto] = useState(false);
  return (
    <form action={action} className="flex flex-1 flex-col gap-[14px]">
      <input type="hidden" name="kind" value={kind} />
      {car && <input type="hidden" name="car" value={car} />}
      <UploadBox label={label} hint={hint} name="file" camera={camera} onPhoto={setPhoto} />
      {children}
      <ErrorLine state={state} />
      <Spacer />
      <button type="submit" disabled={pending || !photo} className={btnClass("primary")}>
        <Busy on={pending} text="Sending…">Send again</Busy>
      </button>
    </form>
  );
}
