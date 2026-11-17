"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import Icon from "@/components/admin/Icon";
import { confirmCode, requestCode, resendCode, type ActionState } from "@/app/driver/actions";
import { Field } from "./fields";
import { Busy, btnClass, Spacer } from "./ui";

// Figma 10.2 Sign in
export function SignInForm() {
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
        placeholder="+91 98351 22408"
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
        <Busy on={pending} text="Sending…">Send code</Busy>
      </button>
      <p className="text-center type-body-sm text-secondary">New here? You set up your profile right after the code.</p>
    </form>
  );
}

const LEN = 6;

// Figma 10.3 Enter the code / 10.4 Wrong code / 10.5 Too many codes asked
export function CodeForm({
  mobile,
  resendIn,
  blockedMin = 0,
  office,
  devCode,
}: {
  mobile: string;
  resendIn: number;
  blockedMin?: number;
  office: { tel: string; display: string };
  devCode?: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(confirmCode, undefined);
  const [digits, setDigits] = useState<string[]>(Array(LEN).fill(""));
  const [wait, setWait] = useState(resendIn);
  const [blocked, setBlocked] = useState(blockedMin);
  const [dev, setDev] = useState(devCode);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resending, startResend] = useTransition();
  const [dismissed, setDismissed] = useState<ActionState>(undefined);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const form = useRef<HTMLFormElement>(null);

  // A wrong code shows red boxes until the next tap (10.4).
  const wrong = !!state?.error && state !== dismissed && !pending;
  const used = !!state?.error && state.triesLeft === 0 && state !== dismissed;

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  // Android Chrome can read the SMS for us (WebOTP).
  useEffect(() => {
    if (!("OTPCredential" in window)) return;
    const ac = new AbortController();
    (navigator.credentials as unknown as { get(o: object): Promise<{ code?: string } | null> })
      .get({ otp: { transport: ["sms"] }, signal: ac.signal })
      .then((otp) => {
        if (otp?.code && /^\d{6}$/.test(otp.code)) {
          setDigits(otp.code.split(""));
          setTimeout(() => form.current?.requestSubmit(), 50);
        }
      })
      .catch(() => {});
    return () => ac.abort();
  }, []);

  function clearIfWrong() {
    if (wrong) {
      setDismissed(state);
      setDigits(Array(LEN).fill(""));
      boxes.current[0]?.focus();
      return true;
    }
    return false;
  }

  function put(i: number, raw: string) {
    const v = raw.replace(/\D/g, "");
    if (!v) return;
    const next = [...digits];
    // Pasted or auto-filled: spread the digits across the boxes.
    v.slice(0, LEN - i)
      .split("")
      .forEach((d, k) => (next[i + k] = d));
    setDigits(next);
    const to = Math.min(i + v.length, LEN - 1);
    boxes.current[to]?.focus();
    if (next.every(Boolean)) setTimeout(() => form.current?.requestSubmit(), 30);
  }

  function key(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...digits];
      if (next[i]) next[i] = "";
      else if (i > 0) {
        next[i - 1] = "";
        boxes.current[i - 1]?.focus();
      }
      setDigits(next);
    }
  }

  function resend() {
    startResend(async () => {
      const res = await resendCode();
      if (res?.blockedMin) {
        setBlocked(res.blockedMin);
        setResendMsg(null);
      } else if (res?.error) setResendMsg(res.error);
      else {
        setResendMsg("A new code is on its way.");
        setDismissed(state);
        setDigits(Array(LEN).fill(""));
        setDev(res?.devCode);
      }
      setWait(res?.resendIn ?? 30);
    });
  }

  const code = digits.join("");
  const firstEmpty = digits.findIndex((d) => !d);

  return (
    <form ref={form} action={action} className="flex flex-1 flex-col gap-[20px]">
      <Link href="/driver/sign-in" aria-label="Back" className="-m-[12px] grid size-[48px] place-items-center text-primary">
        <Icon name="arrow-left" size={24} />
      </Link>
      <h1 className="type-h2 text-primary">Enter the code</h1>
      <p className="type-body-md text-secondary">Sent by SMS to {mobile}</p>
      <input type="hidden" name="code" value={code} />
      <div className="flex gap-[10px]" role="group" aria-label="6-digit code">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              boxes.current[i] = el;
            }}
            value={d}
            onChange={(e) => put(i, e.target.value)}
            onKeyDown={(e) => key(i, e)}
            onFocus={() => clearIfWrong()}
            onPointerDown={() => clearIfWrong()}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            autoFocus={i === 0}
            aria-label={`Digit ${i + 1}`}
            aria-invalid={wrong}
            maxLength={LEN}
            className={`h-[56px] w-0 min-w-0 flex-1 rounded-md bg-layer text-center type-h3 text-primary outline-none ${
              wrong ? "border-[1.5px] border-tag-red" : i === firstEmpty ? "border-2 border-brand" : "border border-gray-200"
            } focus:border-2 focus:border-brand`}
          />
        ))}
      </div>
      {wrong && (blocked > 0 ? (
        <p role="alert" className="type-body-sm text-tag-red">
          {state?.error}
        </p>
      ) : (
        <div className="flex items-center justify-between gap-[12px]">
          <p role="alert" className="type-body-sm text-tag-red">
            {state?.error}
          </p>
          <button type="button" onClick={resend} disabled={resending || wait > 0} className="min-h-[44px] shrink-0 type-body-sm text-link disabled:opacity-50">
            {wait > 0 ? `Send a new code in 0:${String(wait).padStart(2, "0")}` : "Send a new code"}
          </button>
        </div>
      ))}
      {blocked > 0 ? (
        // 10.5: the hourly code limit is used up for this number.
        <div role="status" className="flex flex-col gap-[4px] type-body-sm text-secondary">
          <p>Too many codes asked.</p>
          <p>
            Ask again in {blocked} {blocked === 1 ? "minute" : "minutes"}, or call the office on{" "}
            <a href={office.tel} className="underline-offset-2 hover:underline">
              {office.display}
            </a>
            .
          </p>
        </div>
      ) : wrong ? null : (
        <p className="flex flex-wrap items-center gap-x-[6px] type-body-sm text-secondary">
          Didn’t get it?
          {wait > 0 ? (
            <span>Send again in 0:{String(wait).padStart(2, "0")}</span>
          ) : (
            <button type="button" onClick={resend} disabled={resending} className="min-h-[44px] text-link">
              Send again
            </button>
          )}
        </p>
      )}
      {resendMsg && <p className="type-body-sm text-secondary">{resendMsg}</p>}
      {dev && (
        <p className="rounded-md border border-dashed border-gray-200 px-[12px] py-[8px] type-body-sm text-secondary">
          Demo — SMS isn’t set up yet. Your code is <span className="type-mono-md text-primary">{dev}</span>.
        </p>
      )}
      <Spacer />
      <button type="submit" disabled={pending || code.length !== LEN || used} className={btnClass("primary")}>
        <Busy on={pending} text="Checking…">Verify</Busy>
      </button>
    </form>
  );
}
