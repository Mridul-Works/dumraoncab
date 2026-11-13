// Changes waiting to send (Figma 2.10 / 2.12). When the browser is offline — or
// the request fails on the network — a change is kept in this device's
// storage and sent by itself once the connection is back (ConnectionBanner
// flushes it, and retries every 30 s while offline).
//
// Each change has a key ("status:<booking id>"): a newer change with the same
// key replaces the older one, so Undo while offline simply takes it back out.

export type PendingChange = {
  key: string;
  label: string; // "Manish Rai marked Contacted" — shown in the offline notice
  url: string;
  method: "PATCH";
  body: Record<string, unknown>;
  at: string; // ISO time it was made
};

const STORE = "dc-admin-outbox";
export const OUTBOX_EVENT = "admin:outbox"; // the queue changed
export const SENT_EVENT = "admin:outbox-sent"; // detail: PendingChange[] that just went out

const EMPTY: PendingChange[] = [];
let cacheRaw: string | null = null;
let cacheList: PendingChange[] = EMPTY;

export function readOutbox(): PendingChange[] {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORE);
  } catch {
    return EMPTY;
  }
  if (raw === cacheRaw) return cacheList;
  cacheRaw = raw;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    cacheList = Array.isArray(parsed) ? (parsed as PendingChange[]) : EMPTY;
  } catch {
    cacheList = EMPTY;
  }
  return cacheList;
}

function write(list: PendingChange[]) {
  try {
    if (list.length) window.localStorage.setItem(STORE, JSON.stringify(list));
    else window.localStorage.removeItem(STORE);
  } catch {
    // Storage full or blocked: the change still went out or will be lost with the tab.
  }
  window.dispatchEvent(new Event(OUTBOX_EVENT));
}

const queue = (change: PendingChange) => write([...readOutbox().filter((c) => c.key !== change.key), change]);

export function dropFromOutbox(key: string) {
  const list = readOutbox();
  if (list.some((c) => c.key === key)) write(list.filter((c) => c.key !== key));
}

export function subscribeOutbox(cb: () => void) {
  const onStorage = (e: StorageEvent) => e.key === STORE && cb();
  window.addEventListener(OUTBOX_EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(OUTBOX_EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

const request = (c: PendingChange) =>
  fetch(c.url, { method: c.method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(c.body), keepalive: true });

// Send now, or keep it for later when there is no connection.
// Resolves "sent" or "queued"; rejects when the server refused the change.
export async function sendChange(change: Omit<PendingChange, "at" | "method">): Promise<"sent" | "queued"> {
  const c: PendingChange = { ...change, method: "PATCH", at: new Date().toISOString() };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    queue(c);
    return "queued";
  }
  let res: Response;
  try {
    res = await request(c);
  } catch {
    queue(c); // network error: same as offline
    return "queued";
  }
  if (!res.ok) throw new Error(`Could not save (${res.status})`);
  dropFromOutbox(c.key); // an older queued version is now out of date
  return "sent";
}

let flushing: Promise<PendingChange[]> | null = null;

// Send everything waiting. Returns the changes that went out; anything that
// still can't reach the server stays queued. Changes the server refuses
// (deleted booking, signed out) are dropped so they don't block the queue.
export function flushOutbox(): Promise<PendingChange[]> {
  if (flushing) return flushing;
  flushing = (async () => {
    const sent: PendingChange[] = [];
    for (const c of readOutbox()) {
      try {
        const res = await request(c);
        dropFromOutbox(c.key);
        if (res.ok) sent.push(c);
      } catch {
        break; // still offline
      }
    }
    if (sent.length) window.dispatchEvent(new CustomEvent<PendingChange[]>(SENT_EVENT, { detail: sent }));
    return sent;
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

// Where a page wants the connection notice (see ConnectionBanner).
export const CONNECTION_SLOT_ID = "admin-connection-slot";
