"use client";

import { useEffect, useState, useTransition } from "react";
import Icon from "@/components/admin/Icon";
import { finishSettings } from "@/app/driver/actions";
import { btnClass, Divider, Spacer } from "./ui";

type Perm = "on" | "off" | "unknown";

async function query(name: string): Promise<Perm> {
  try {
    const s = await navigator.permissions.query({ name: name as PermissionName });
    return s.state === "granted" ? "on" : "off";
  } catch {
    return "unknown";
  }
}

const ROWS = [
  { key: "alerts", icon: "bell-ringing", title: "Trip alerts", sub: "Loud sound, even on silent", ask: "Turn on trip alerts" },
  { key: "location", icon: "crosshair", title: "Location", sub: "Only while you are on a trip", ask: "Turn on location" },
  { key: "camera", icon: "camera", title: "Camera", sub: "For documents and receipts", ask: "Turn on camera" },
] as const;

type Key = (typeof ROWS)[number]["key"];

// Figma 10.15: asks only for what is still off, using the browser's own prompts.
export function QuickSettings() {
  const [state, setState] = useState<Record<Key, Perm>>({ alerts: "unknown", location: "unknown", camera: "unknown" });
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const alerts: Perm = typeof Notification === "undefined" ? "unknown" : Notification.permission === "granted" ? "on" : "off";
      const [location, camera] = await Promise.all([query("geolocation"), query("camera")]);
      if (live) setState({ alerts, location, camera });
    })();
    return () => {
      live = false;
    };
  }, []);

  const next = ROWS.find((r) => state[r.key] !== "on");

  async function ask(key: Key) {
    setNote(null);
    if (key === "alerts") {
      if (typeof Notification === "undefined") return setNote("This browser can’t show alerts. Keep the app open on Today to hear new trips.");
      const p = await Notification.requestPermission();
      setState((s) => ({ ...s, alerts: p === "granted" ? "on" : "off" }));
      if (p !== "granted") setNote("Alerts are blocked. Allow notifications for this site in your browser settings.");
    } else if (key === "location") {
      if (!navigator.geolocation) return setNote("This browser can’t share location.");
      navigator.geolocation.getCurrentPosition(
        () => setState((s) => ({ ...s, location: "on" })),
        () => {
          setState((s) => ({ ...s, location: "off" }));
          setNote("Location is blocked. Allow it for this site in your browser settings.");
        },
      );
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((t) => t.stop());
        setState((s) => ({ ...s, camera: "on" }));
      } catch {
        setState((s) => ({ ...s, camera: "off" }));
        setNote("Camera is blocked. Allow it for this site in your browser settings.");
      }
    }
  }

  const done = () => start(() => finishSettings());

  return (
    <>
      <div className="flex flex-col rounded-md border border-gray-200 bg-layer">
        {ROWS.map((r, i) => {
          const on = state[r.key] === "on";
          return (
            <div key={r.key}>
              {i > 0 && <Divider />}
              <div className="flex items-center gap-[12px] px-[16px] py-[14px]">
                <span className={`grid size-[40px] shrink-0 place-items-center rounded-sm ${on ? "bg-tag-green text-brand" : "bg-gray-50 text-primary"}`}>
                  <Icon name={r.icon} size={20} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                  <span className="type-ui text-primary">{r.title}</span>
                  <span className="type-body-sm text-secondary">{r.sub}</span>
                </span>
                {on ? (
                  <span className="flex items-center gap-[4px] type-ui text-brand">
                    <Icon name="check-circle" size={16} />
                    On
                  </span>
                ) : (
                  <button type="button" onClick={() => ask(r.key)} className="min-h-[44px] type-ui text-secondary">
                    Off
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {note && <p className="type-body-sm text-secondary">{note}</p>}
      <Spacer />
      {next ? (
        <div className="flex flex-col gap-[4px]">
          <button type="button" className={btnClass("primary")} onClick={() => ask(next.key)}>
            {next.ask}
          </button>
          <button type="button" className={btnClass("ghost")} disabled={pending} onClick={done}>
            Not now
          </button>
        </div>
      ) : (
        <button type="button" className={btnClass("primary")} disabled={pending} onClick={done}>
          Go to Today
        </button>
      )}
    </>
  );
}
