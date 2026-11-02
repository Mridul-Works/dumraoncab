// Demo data so every admin and driver-app screen has something to show.
//
//   npm run seed           fills empty data files (keeps anything already saved)
//   npm run seed -- --force  replaces bookings, vendors and the trip log with the
//                            demo set (all three or none — they point at each other)
//
// Writes bookings, vendors, the trip log and sample vendor documents — to data/
// locally, or to the Redis database when its env vars are set (the script reads
// .env.local, so put Vercel's KV_REST_API_URL / KV_REST_API_TOKEN there to seed
// the live site). Dates are relative to today (India time),
// so the dashboard always has "today" and "this week" activity.
//
// Demo driver for the driver app (/driver): mobile 95256 66262 (Kishor Kumar).
// Sign in with the code shown on screen (dev) or DRIVER_DEMO_CODE (preview).

import { promises as fs } from "fs";
import path from "path";
import { buildDemoData } from "../lib/demoData.mjs";

const DATA = path.join(process.cwd(), "data");
const DOCS = path.join(DATA, "vendor-docs");
const force = process.argv.includes("--force");

const { vendors, bookings, journal, docs } = buildDemoData();

// Same storage choice as lib/db.ts: Redis when its env vars are set (Vercel),
// otherwise JSON files in data/.
const REDIS_URL = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "").replace(/\/$/, "");
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
const useRedis = !!(REDIS_URL && REDIS_TOKEN);

async function redis(...command) {
  const res = await fetch(REDIS_URL, { method: "POST", headers: { Authorization: `Bearer ${REDIS_TOKEN}` }, body: JSON.stringify(command) });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || data.error) throw new Error(`Redis ${command[0]} failed: ${data?.error ?? res.status}`);
  return data.result;
}

const store = useRedis
  ? {
      where: "the Redis database (live site)",
      exists: async (name) => (await redis("EXISTS", `dc:json:${name}`)) === 1,
      writeJson: (name, value) => redis("SET", `dc:json:${name}`, JSON.stringify(value)),
      writeDoc: (name, bytes) => redis("SET", `dc:file:vendor-docs:${name}`, bytes.toString("base64")),
    }
  : {
      where: "data/",
      exists: (name) => fs.access(path.join(DATA, name)).then(
        () => true,
        () => false,
      ),
      writeJson: (name, value) => fs.writeFile(path.join(DATA, name), JSON.stringify(value, null, 2), "utf8"),
      writeDoc: async (name, bytes) => {
        await fs.mkdir(DOCS, { recursive: true });
        await fs.writeFile(path.join(DOCS, name), bytes);
      },
    };

const files = { "vendors.json": vendors, "bookings.json": bookings, "journal.json": journal };
// All or nothing: bookings, vendors and trip entries point at each other by id.
const existing = [];
for (const name of Object.keys(files)) if (await store.exists(name)) existing.push(name);
if (existing.length && !force) {
  console.log(`Nothing written: ${existing.join(", ")} already has data in ${store.where}.`);
  console.log("Run `npm run seed -- --force` to replace bookings, vendors and the trip log with the demo set.");
  process.exit(0);
}
console.log(`Writing demo data to ${store.where}`);
await fs.mkdir(DATA, { recursive: true });
for (const [name, value] of Object.entries(files)) {
  await store.writeJson(name, value);
  console.log(`wrote ${name} (${value.length})`);
}
for (const { name, bytes } of docs) await store.writeDoc(name, bytes);
console.log(`wrote ${docs.length} sample documents`);
console.log("\nDemo driver for /driver: mobile 95256 66262 (Kishor Kumar).");
