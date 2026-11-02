import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

// Storage used by every store (bookings, fleet, fares, trip log, vendors,
// company, driver app) and every upload (car photos, logo, vendor documents,
// meter and receipt photos). Two backends, picked automatically:
//
//  - Redis (Upstash REST) when KV_REST_API_URL + KV_REST_API_TOKEN (set by
//    Vercel's "Upstash for Redis" integration) or UPSTASH_REDIS_REST_URL +
//    UPSTASH_REDIS_REST_TOKEN are present. Needed on Vercel/serverless, where
//    the filesystem can't be written.
//  - JSON files in data/ otherwise (local development, VPS, Docker).

export const DATA_DIR = path.join(process.cwd(), "data");

const REDIS_URL = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "").replace(/\/$/, "");
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
export const usingRedis = !!(REDIS_URL && REDIS_TOKEN);
const PREFIX = "dc:"; // keeps this app's keys apart if the database is shared

async function redis<T = unknown>(...command: (string | number)[]): Promise<T> {
  const res = await fetch(REDIS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => null)) as { result?: T; error?: string } | null;
  if (!res.ok || !data || data.error) throw new Error(`Redis ${command[0]} failed: ${data?.error ?? res.status}`);
  return data.result as T;
}

// One write queue per file, shared across module copies (Next can load a module
// more than once — pages, actions and route handlers are bundled separately).
const queues: Map<string, Promise<unknown>> = ((globalThis as Record<string, unknown>).__dcQueues ??= new Map()) as Map<
  string,
  Promise<unknown>
>;

function queued<R>(key: string, run: () => Promise<R>): Promise<R> {
  const prev = queues.get(key) ?? Promise.resolve();
  const next = prev.then(run);
  queues.set(
    key,
    next.catch(() => {}),
  );
  return next;
}

// Serverless instances don't share memory, so Redis writes also take a short
// lock in Redis itself (released when done, expires after 10 s if a crash).
async function withRedisLock<R>(key: string, run: () => Promise<R>): Promise<R> {
  const lock = `${PREFIX}lock:${key}`;
  const id = randomUUID();
  for (let i = 0; ; i++) {
    if ((await redis("SET", lock, id, "NX", "PX", 10000)) === "OK") break;
    if (i > 100) throw new Error("The data is busy. Try again in a moment.");
    await new Promise((r) => setTimeout(r, 50 + Math.random() * 100));
  }
  try {
    return await run();
  } finally {
    if ((await redis("GET", lock).catch(() => null)) === id) await redis("DEL", lock).catch(() => {});
  }
}

export function jsonFile<T>(name: string, fallback: () => T) {
  const file = path.join(DATA_DIR, name);
  const key = `${PREFIX}json:${name}`;

  async function read(): Promise<T> {
    if (usingRedis) {
      const raw = await redis<string | null>("GET", key);
      return raw == null ? fallback() : (JSON.parse(raw) as T);
    }
    try {
      return JSON.parse(await fs.readFile(file, "utf8")) as T;
    } catch (err) {
      // Missing file = nothing saved yet. A corrupt file must NOT read as empty,
      // or the next write would silently wipe the data.
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return fallback();
      throw err;
    }
  }

  async function write(data: T): Promise<void> {
    if (usingRedis) {
      await redis("SET", key, JSON.stringify(data));
      return;
    }
    await fs.mkdir(DATA_DIR, { recursive: true });
    // Write-then-rename so a crash mid-write never leaves a truncated file.
    const tmp = `${file}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
    await fs.rename(tmp, file);
  }

  const locked = <R>(run: () => Promise<R>) => queued(file, () => (usingRedis ? withRedisLock(name, run) : run()));

  // Serialised read-modify-write: `fn` edits the data in place and the result
  // is saved atomically.
  function mutate<R>(fn: (data: T) => R | Promise<R>): Promise<R> {
    return locked(async () => {
      const data = await read();
      const result = await fn(data);
      await write(data);
      return result;
    });
  }

  function replace(next: T): Promise<void> {
    return locked(() => write(next));
  }

  return { read, mutate, replace };
}

/* --------------------------------- uploads --------------------------------- */
// Uploaded files by folder: "uploads" (public photos, served by /uploads/[file])
// and "vendor-docs" (private, served to staff by /admin/vendor-docs/[file]).
// Names are random UUIDs chosen by the caller.

export type UploadFolder = "uploads" | "vendor-docs";

export async function putUpload(folder: UploadFolder, name: string, bytes: Buffer): Promise<void> {
  if (usingRedis) {
    await redis("SET", `${PREFIX}file:${folder}:${name}`, bytes.toString("base64"));
    return;
  }
  await fs.mkdir(path.join(DATA_DIR, folder), { recursive: true });
  await fs.writeFile(path.join(DATA_DIR, folder, name), bytes);
}

// The file's bytes, or null when it doesn't exist.
export async function getUpload(folder: UploadFolder, name: string): Promise<Buffer | null> {
  if (usingRedis) {
    const b64 = await redis<string | null>("GET", `${PREFIX}file:${folder}:${name}`);
    return b64 == null ? null : Buffer.from(b64, "base64");
  }
  try {
    return await fs.readFile(path.join(DATA_DIR, folder, name));
  } catch {
    return null;
  }
}

export async function removeUpload(folder: UploadFolder, name: string): Promise<void> {
  if (usingRedis) {
    await redis("DEL", `${PREFIX}file:${folder}:${name}`).catch(() => {});
    return;
  }
  await fs.rm(path.join(DATA_DIR, folder, name), { force: true }).catch(() => {});
}
