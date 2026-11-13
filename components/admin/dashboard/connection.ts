"use client";

import { useSyncExternalStore } from "react";
import { readOutbox, subscribeOutbox } from "@/components/admin/dashboard/outbox";

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

// True while the browser has a connection (always true on the server).
export const useOnline = () =>
  useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );

const NONE: ReturnType<typeof readOutbox> = [];

// Changes waiting to send from this device (empty on the server).
export const useOutbox = () => useSyncExternalStore(subscribeOutbox, readOutbox, () => NONE);

// Date → "9:41 AM" in India time.
export function clockIST(at: Date | number | string = Date.now()) {
  const ms = typeof at === "number" ? at : typeof at === "string" ? Date.parse(at) : at.getTime();
  const hm = new Date(ms + 5.5 * 60 * 60 * 1000).toISOString().slice(11, 16);
  const h = Number(hm.slice(0, 2));
  return `${h % 12 === 0 ? 12 : h % 12}:${hm.slice(3, 5)} ${h < 12 ? "AM" : "PM"}`;
}
