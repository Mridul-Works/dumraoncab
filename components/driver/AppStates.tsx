"use client";

import { useActionState, useState } from "react";
import { requestCode, type ActionState } from "@/app/driver/actions";
import { Field } from "./fields";
import { Busy, btnClass, Spacer } from "./ui";

// Client parts of the app-level screens: 10.54 Update the app and
// 10.55 Signed in on another phone.

// 10.54: load the newest version of the app (a fresh page load from the
// server), then carry on from the front door.
export function UpdateNowButton() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      className={btnClass("primary")}
      onClick={() => {
        setBusy(true);
        window.location.replace("/driver");
      }}
    >
      <Busy on={busy} text="Updating…">
        Update now
      </Busy>
    </button>
  );
}

// 10.55: the number is filled in; a new code is sent by SMS like a normal sign-in.
export function SignInAgainForm({ mobile, footer }: { mobile: string; footer: React.ReactNode }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(requestCode, undefined);
  return (
    <form action={action} className="flex flex-1 flex-col gap-[20px]">
      <Field
        label="Mobile number"
        icon="phone"
        name="mobile"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        defaultValue={mobile}
        required
        error={!!state?.error}
        aria-describedby={state?.error ? "mobile-error" : undefined}
      />
      {state?.error && (
        <p id="mobile-error" role="alert" className="-mt-[12px] type-body-sm text-negative">
          {state.error}
        </p>
      )}
      <Spacer />
      <button type="submit" disabled={pending} className={btnClass("primary")}>
        <Busy on={pending} text="Sending…">
          Sign in on this phone
        </Busy>
      </button>
      <p className="text-center type-body-sm text-secondary">{footer}</p>
    </form>
  );
}
