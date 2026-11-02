"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/admin/Icon";
import { acceptTrip, declineTrip, setAvailable, type ActionState } from "@/app/driver/actions";
import { RadioRow } from "./fields";
import { declineReasons } from "./rules";
import { Sheet } from "./Sheet";
import { btnClass, Facts, Route, Tag } from "./ui";

// Figma 10.17 / 10.21 / 10.47: the Available switch card.
export function AvailableSwitch({ on, paused, pausedNote }: { on: boolean; paused?: boolean; pausedNote?: string }) {
  const [value, setValue] = useState(on);
  const [pending, start] = useTransition();
  const shown = paused ? false : value;
  return (
    <div className={`flex items-center gap-[12px] rounded-lg border border-gray-100 bg-layer p-[16px] ${paused ? "opacity-50" : ""}`}>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="type-ui text-primary">{paused || shown ? "Available for trips" : "Off duty"}</span>
        <span className="type-body-sm text-secondary">
          {paused ? pausedNote : shown ? "The office can send you trips" : "No new trips. Booked trips stay."}
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={shown}
        aria-label="Available for trips"
        disabled={paused || pending}
        onClick={() => {
          const next = !value;
          setValue(next);
          start(() => setAvailable(next));
        }}
        className="-m-[12px] grid min-h-[44px] min-w-[60px] place-items-center"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- toggle art from the design */}
        <img src={`/admin-icons/${shown ? "toggle-on" : "toggle-off"}.svg`} alt="" width={36} height={20} />
      </button>
    </div>
  );
}

// Looks for new trips while Today is open (no push service in this app).
export function AutoRefresh({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine) router.refresh();
    }, seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}

// Short alert sound + notification, once per trip request.
export function useAlertOnce(key: string, text: string) {
  useEffect(() => {
    const seen = `dc-alert-${key}`;
    try {
      if (sessionStorage.getItem(seen)) return;
      sessionStorage.setItem(seen, "1");
    } catch {
      // private mode: alert anyway
    }
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      [0, 0.35, 0.7].forEach((at) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = 880;
        g.gain.setValueAtTime(0.25, ctx.currentTime + at);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + at + 0.3);
        o.connect(g).connect(ctx.destination);
        o.start(ctx.currentTime + at);
        o.stop(ctx.currentTime + at + 0.3);
      });
    } catch {
      // sound blocked until the driver taps the page
    }
    try {
      if (document.visibilityState !== "visible" && Notification.permission === "granted") new Notification("Dumraon Cab", { body: text });
    } catch {
      // no notifications here
    }
    navigator.vibrate?.([300, 150, 300]);
  }, [key, text]);
}

function Countdown({ until }: { until: number }) {
  const [now, setNow] = useState(() => until - 1);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, Math.round((until - now) / 1000));
  return <Tag tone="amber">{left > 0 ? `Answer in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}` : "Answer now"}</Tag>;
}

export type OfferView = {
  id: string;
  when: string; // "Sat 31 Oct · 4:30 AM"
  from: string;
  to: string;
  fromTime?: string;
  toTime?: string;
  distance: string;
  passengers: string;
  share: string;
  deadline: number; // ms
};

// Figma 10.18 New trip request → 10.19 Can't take it.
export function OfferSheet({ offer }: { offer: OfferView }) {
  const [step, setStep] = useState<"ask" | "decline">("ask");
  const [accepting, start] = useTransition();
  const [state, action, declining] = useActionState<ActionState, FormData>(declineTrip, undefined);
  useAlertOnce(offer.id, `New trip from the office: ${offer.when}`);

  if (step === "decline")
    return (
      <Sheet open label="Why can’t you take it?" handle onClose={() => setStep("ask")}>
        <form action={action} className="flex flex-col gap-[16px]">
          <input type="hidden" name="id" value={offer.id} />
          <h2 className="type-h3 text-primary">Why can’t you take it?</h2>
          <div className="flex flex-col gap-[12px]" role="radiogroup">
            {declineReasons.map((r, i) => (
              <RadioRow key={r} name="reason" value={r} label={r} defaultChecked={i === 0} />
            ))}
          </div>
          <p className="type-body-sm text-secondary">The office gets your answer and gives the trip to another driver.</p>
          {state?.error && <p className="type-body-sm text-negative">{state.error}</p>}
          <button type="submit" disabled={declining} className={btnClass("primary")}>
            Send to office
          </button>
        </form>
      </Sheet>
    );

  return (
    <Sheet open label="New trip from the office" handle>
      <div className="flex items-center gap-[8px]">
        <span className="flex-1 type-ui text-primary">New trip from the office</span>
        <Countdown until={offer.deadline} />
      </div>
      <p className="type-h2 text-primary">{offer.when}</p>
      <Route from={offer.from} to={offer.to} fromTime={offer.fromTime} toTime={offer.toTime} />
      <Facts
        tone="soft"
        items={[
          { label: "Distance", value: offer.distance },
          { label: "Passengers", value: offer.passengers },
          { label: "Your share", value: offer.share, brand: true },
        ]}
      />
      <div className="flex flex-col gap-[4px]">
        <button type="button" disabled={accepting} onClick={() => start(() => acceptTrip(offer.id))} className={btnClass("primary")}>
          <Icon name="check" size={16} />
          Take this trip
        </button>
        <button type="button" disabled={accepting} onClick={() => setStep("decline")} className={btnClass("ghost")}>
          I can’t take it
        </button>
      </div>
    </Sheet>
  );
}

// 10.40 is shown "with a sound, so it is not missed".
export function CancelAlert({ id }: { id: string }) {
  useAlertOnce(`cancel-${id}`, "The office cancelled a trip.");
  return null;
}
