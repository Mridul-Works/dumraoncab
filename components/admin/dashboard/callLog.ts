"use client";

import { useSyncExternalStore } from "react";

// What happened on the last call to each new request (Figma 2.7 / 2.11),
// remembered on this device so the row still asks "how did it go?" after the
// phone app hands back to the browser or the page reloads.
export type CallMark = {
  calledAt?: string; // ISO — Call tapped, waiting for No answer / Mark contacted
  tries: number; // calls that got no answer
  lastTry?: string; // ISO time of the last no-answer
};
export type CallLog = Record<string, CallMark>;

export const MAX_TRIES = 3;
const STORE = "dc-admin-calls";
const EVENT = "admin:calls";
const EMPTY: CallLog = {};
let cacheRaw: string | null = null;
let cacheLog: CallLog = EMPTY;

function read(): CallLog {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORE);
  } catch {
    return EMPTY;
  }
  if (raw === cacheRaw) return cacheLog;
  cacheRaw = raw;
  try {
    cacheLog = raw ? (JSON.parse(raw) as CallLog) : EMPTY;
  } catch {
    cacheLog = EMPTY;
  }
  return cacheLog;
}

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => e.key === STORE && cb();
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

export const useCallLog = () => useSyncExternalStore(subscribe, read, () => EMPTY);

// Update one request's mark (undefined clears it). `keep` prunes marks for
// requests that are no longer waiting.
export function setCallMark(id: string, mark: CallMark | undefined, keep?: string[]) {
  const next: CallLog = { ...read() };
  if (mark) next[id] = mark;
  else delete next[id];
  if (keep) for (const k of Object.keys(next)) if (k !== id && !keep.includes(k)) delete next[k];
  try {
    if (Object.keys(next).length) window.localStorage.setItem(STORE, JSON.stringify(next));
    else window.localStorage.removeItem(STORE);
  } catch {
    // Storage blocked: the state only lasts until reload.
  }
  window.dispatchEvent(new Event(EVENT));
}
