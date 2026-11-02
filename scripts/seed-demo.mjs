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
import { randomUUID } from "crypto";

const DATA = path.join(process.cwd(), "data");
const DOCS = path.join(DATA, "vendor-docs");
const force = process.argv.includes("--force");

// ---- time helpers (India time) ------------------------------------------------
const IST = 5.5 * 3600 * 1000;
const day = (n = 0) => new Date(Date.now() + IST + n * 864e5).toISOString().slice(0, 10);
// ISO timestamp `mins` minutes ago (or n days ago at HH:MM IST).
const ago = (mins) => new Date(Date.now() - mins * 60000).toISOString();
const at = (n, hhmm) => new Date(Date.parse(`${day(n)}T${hhmm}:00Z`) - IST).toISOString();

// ---- sample document files ---------------------------------------------------
// A one-page PDF that says "Sample document" — stands in for real uploads.
function samplePdf(title) {
  const text = `BT /F1 20 Tf 60 760 Td (${title}) Tj 0 -30 Td /F1 12 Tf (Sample document for the demo - not a real ID.) Tj ET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

const LABELS = { photo: "Profile photo", aadhaar: "Aadhaar card", licence: "Driving licence", pan: "PAN card", rc: "RC (registration)", insurance: "Insurance", permit: "Permit", puc: "PUC (pollution)" };
const pendingFiles = [];

// status: "verified" | "review" | "missing" | "reupload"
function doc(kind, status = "verified", extra = {}) {
  if (status === "missing") return { kind, status };
  const file = `${randomUUID()}.pdf`;
  pendingFiles.push({ file, title: `${LABELS[kind]} (sample)` });
  return {
    kind,
    status,
    file,
    fileName: `${kind}.pdf`,
    sizeKb: 1,
    uploadedAt: ago(60 * 24 * 3),
    ...(status === "verified" ? { reviewedAt: ago(60 * 24 * 2) } : {}),
    ...extra,
  };
}

const personDocs = (o = {}) => [
  doc("photo", o.photo),
  doc("aadhaar", o.aadhaar, { number: "XXXX XXXX 4821" }),
  doc("licence", o.licence, { number: "BR-19 2011 0012345", validTill: "2031-03-12" }),
  ...(o.pan === "missing" ? [] : [doc("pan", "verified", { number: "XXXXX 4821 F" })]),
];

const car = (model, number, type, fuel, seats, year, o = {}) => ({
  id: randomUUID(),
  model,
  number,
  type,
  fuel,
  seats,
  year,
  docs: [
    doc("rc", o.rc),
    doc("insurance", o.insurance, { note: "ICICI Lombard", validTill: o.insuranceTill ?? "2027-06-18" }),
    doc("permit", o.permit, { note: "All-India tourist permit", validTill: "2028-01-31" }),
    doc("puc", o.puc, { validTill: o.pucTill ?? "2027-03-02" }),
  ],
});

const address = (line, town, district, pin) => ({ line, town, district, state: "Bihar", pin });
const places = (...names) => names.map((n, i) => (i === 0 ? { name: n, home: true } : { name: n }));

// ---- vendors (names from the Figma "6.1 Vendors" frame) ------------------------
let code = 0;
function vendor(v) {
  code += 1;
  return {
    id: randomUUID(),
    code: `VN-${String(code).padStart(4, "0")}`,
    createdAt: ago(60 * 24 * (40 - code * 3)),
    source: "admin",
    whatsapp: true,
    radiusKm: 50,
    places: places("Dumraon", "Buxar", "Arrah"),
    history: [],
    ...v,
  };
}

const kishor = vendor({
  kind: "owner",
  status: "approved",
  approvedAt: ago(60 * 24 * 30),
  name: "Kishor Kumar",
  mobile: "+91 95256 66262",
  email: "kishorpowersolution@gmail.com",
  address: address("Near Bhojpur Kothi, Station Road", "Dumraon", "Buxar", "802119"),
  docs: personDocs(),
  cars: [car("Toyota Innova Crysta", "BR 44 EF 2210", "MUV", "Diesel", 7, 2020)],
  upi: "kishor@okaxis",
  rating: 4.8,
  trips: 18,
  earned: 21600,
});

const vendors = [
  vendor({
    kind: "owner",
    status: "pending",
    source: "driver-app",
    createdAt: ago(60 * 5),
    name: "Chandrachur Pathak",
    mobile: "+91 79922 95575",
    email: "chandrachurpathak71@gmail.com",
    address: address("Ward 7, near Rajgarh Chowk, Naya Bazar", "Dumraon", "Buxar", "802119"),
    places: [{ name: "Dumraon", home: true }, { name: "Buxar" }, { name: "Arrah" }, { name: "Patna Airport", onRequest: true }],
    docs: personDocs({ aadhaar: "review" }),
    cars: [
      car("Mahindra Scorpio N", "BR 44 AB 1234", "SUV", "Diesel", 7, 2022, { rc: "review", pucTill: day(15) }),
      car("Maruti Ertiga", "BR 44 CD 5678", "MUV", "CNG", 7, 2021, { insurance: "missing" }),
    ],
    upi: "chandrachur@okaxis",
    pan: "XXXXX 4821 F",
  }),
  vendor({
    kind: "owner",
    status: "approved",
    approvedAt: ago(60 * 24 * 20),
    name: "Rohit Bhai",
    mobile: "+91 97242 07446",
    email: "rohitraj015470@gmail.com",
    address: address("House 14, Station Road, near Railway Station", "Dumraon", "Buxar", "802119"),
    docs: personDocs(),
    cars: [car("Maruti Dzire", "BR 44 GH 3301", "Sedan", "CNG", 4, 2021)],
    upi: "rohitraj@ybl",
  }),
  kishor,
  vendor({
    kind: "driver",
    status: "suspended",
    name: "Kanhaiya Pandey",
    mobile: "+91 93047 38536",
    email: "kanhaiyapandey2232@gmail.com",
    address: address("Mathila Road", "Buxar", "Buxar", "802101"),
    docs: personDocs({ pan: "missing" }),
    cars: [],
    upi: "kanhaiya@paytm",
    statusReason: "Licence expired",
    statusMessage: "Your trips are paused until you upload a valid driving licence.",
    statusAt: ago(60 * 24 * 4),
    suspendedUntil: null,
  }),
  vendor({
    kind: "owner",
    status: "approved",
    approvedAt: ago(60 * 24 * 15),
    name: "Shivam Pathak",
    mobile: "+91 79922 95576",
    email: "shivampathak@gmail.com",
    address: address("Chaugain Road", "Dumraon", "Buxar", "802119"),
    docs: personDocs(),
    cars: [car("Maruti Swift", "BR 44 JK 7781", "Hatchback", "Petrol", 4, 2019)],
    upi: "shivam@ybl",
  }),
  vendor({
    kind: "owner",
    status: "approved",
    approvedAt: ago(60 * 24 * 12),
    name: "Abhishek Tulshyan",
    mobile: "+91 74888 28237",
    email: "abhishekkr05091993@gmail.com",
    address: address("Gola Road", "Buxar", "Buxar", "802101"),
    docs: personDocs(),
    cars: [car("Mahindra Bolero", "BR 44 LM 4410", "SUV", "Diesel", 7, 2020)],
    upi: "abhishek@okhdfcbank",
  }),
  vendor({
    kind: "owner",
    status: "approved",
    approvedAt: ago(60 * 24 * 26),
    name: "Dilip Kumar Ray",
    mobile: "+91 76545 97931",
    email: "kumardilipray@gmail.com",
    address: address("Nawanagar", "Arrah", "Bhojpur", "802301"),
    places: places("Arrah", "Dumraon", "Patna"),
    docs: personDocs(),
    cars: [car("Toyota Etios", "BR 03 PQ 2290", "Sedan", "Diesel", 4, 2018)],
    upi: "dilip@okicici",
    rating: 4.9,
    trips: 9,
    earned: 10800,
  }),
  vendor({
    kind: "owner",
    status: "approved",
    approvedAt: ago(60 * 24 * 33),
    name: "Nandan Mishra",
    mobile: "+91 70045 21890",
    email: "nandanmishrakbux@gmail.com",
    address: address("Sindhu Kala", "Buxar", "Buxar", "802101"),
    docs: personDocs(),
    cars: [car("Mahindra Scorpio", "BR 44 RS 9012", "SUV", "Diesel", 7, 2019)],
    upi: "nandan@ybl",
    rating: 4.6,
    trips: 14,
    earned: 16800,
  }),
];

// ---- bookings ------------------------------------------------------------------
const kCar = kishor.cars[0];
const people = [
  ["Sanjay Prasad", "98350 11234"],
  ["Priya Singh", "70040 55821"],
  ["Ramesh Tiwari", "94311 70922"],
  ["Anita Devi", "62005 18834"],
  ["Vikash Kumar", "99055 42117"],
  ["Neha Verma", "88733 60291"],
  ["Manoj Gupta", "93347 81256"],
  ["Sunita Mishra", "76678 02349"],
  ["Rahul Ojha", "90310 44528"],
  ["Pooja Rai", "82943 17760"],
];
let pi = 0;
function booking(b) {
  const [name, phone] = people[pi++ % people.length];
  return {
    id: randomUUID(),
    createdAt: ago(60 * 24),
    source: "admin",
    service: "Outstation Trips (One Way)",
    name,
    phone: `+91 ${phone}`,
    from: "Dumraon",
    to: "Patna Airport",
    date: day(0),
    time: "09:00",
    car: "Scorpio VLX",
    notes: "",
    adminNote: "Via phone call · Payment: Cash",
    people: 3,
    ...b,
  };
}

const done = (n) => ({ stage: "paid", startKm: 52410, endKm: 52668, startedAt: at(n, "05:10"), endedAt: at(n, "09:40"), sentAt: at(n, "10:05"), payment: "cash", collected: 2899 });

const bookings = [
  // New requests from the website (dashboard "Needs a call back").
  booking({ createdAt: ago(6), source: "hero-widget", status: "new", service: "Airport & Railway Transfers", to: "Patna Airport", date: day(1), time: "04:30", car: "Scorpio VLX", notes: "Flight/train: 6E 2134", adminNote: "" }),
  booking({ createdAt: ago(22), source: "booking-form", status: "new", service: "Outstation Trips (Round Trip)", to: "Varanasi", date: day(2), time: "06:00", car: "XL6", notes: "Round trip", adminNote: "" }),
  booking({ createdAt: ago(48), source: "hero-widget", status: "new", service: "Hourly Rental", to: "", date: day(0), time: "17:00", car: "Altroz", notes: "8 hr / 80 km in Buxar", adminNote: "" }),
  // Contacted (quote sent).
  booking({ createdAt: ago(60 * 3), source: "booking-form", status: "contacted", to: "Gaya", date: day(3), time: "07:00", car: "Scorpio Classic", quote: 4800 }),
  booking({ createdAt: ago(60 * 26), status: "contacted", service: "Wedding Cars", to: "Buxar", date: day(9), time: "15:00", car: "Scorpio VLX", quote: 6500, notes: "Decorated car for the groom" }),
  // Confirmed — our own fleet.
  booking({ createdAt: ago(60 * 30), status: "confirmed", to: "Patna Airport", date: day(0), time: "05:00", car: "Scorpio VLX", carId: "scorpio-vlx", quote: 3899, driverName: "Rakesh Yadav", driverMobile: "+91 99341 22018" }),
  booking({ createdAt: ago(60 * 20), status: "confirmed", service: "One-Way Drops", to: "Arrah", date: day(0), time: "16:30", car: "Nexon", carId: "nexon", quote: 1499, driverName: "Sonu Kumar", driverMobile: "+91 70707 31245" }),
  booking({ createdAt: ago(60 * 10), status: "confirmed", service: "Outstation Trips (Round Trip)", to: "Varanasi", date: day(1), time: "06:30", car: "XL6", carId: "xl6", quote: 5200, notes: "Round trip · 4 bags" }),
  // Confirmed — given to the demo vendor (driver app): one request, one accepted.
  booking({ createdAt: ago(60 * 2), status: "confirmed", to: "Buxar", date: day(0), time: "18:30", car: "Innova Crysta", quote: 1299, vendorId: kishor.id, vendorCarId: kCar.id, driverName: kishor.name, driverMobile: kishor.mobile, trip: { stage: "offered", offeredAt: ago(4), share: 900 } }),
  booking({ createdAt: ago(60 * 22), status: "confirmed", service: "Airport & Railway Transfers", to: "Patna Airport", date: day(1), time: "05:00", car: "Innova Crysta", quote: 3299, vendorId: kishor.id, vendorCarId: kCar.id, driverName: kishor.name, driverMobile: kishor.mobile, notes: "Flight/train: AI 410 · 3 bags", trip: { stage: "accepted", offeredAt: ago(60 * 21), share: 2300 } }),
  // Completed by the demo vendor: one waiting for the office check, one approved.
  booking({ createdAt: ago(60 * 24 * 3), status: "completed", to: "Patna Airport", date: day(-2), time: "05:00", car: "Innova Crysta", quote: 2899, vendorId: kishor.id, vendorCarId: kCar.id, driverName: kishor.name, driverMobile: kishor.mobile, trip: { ...done(-2), share: 2000 } }),
  booking({ createdAt: ago(60 * 24 * 6), status: "completed", to: "Buxar", date: day(-5), time: "10:00", car: "Innova Crysta", quote: 1299, vendorId: kishor.id, vendorCarId: kCar.id, driverName: kishor.name, driverMobile: kishor.mobile, trip: { ...done(-5), startKm: 51980, endKm: 52040, collected: 1299, share: 900, approved: true } }),
  // Completed — own fleet, spread over the last weeks (analytics).
  ...[
    [0, "Buxar", "Grand i10", "grand-i10", 999],
    [-1, "Buxar", "Nexon", "nexon", 1199],
    [-3, "Arrah", "Altroz", "altroz", 1299],
    [-4, "Patna Airport", "Scorpio VLX", "scorpio-vlx", 3899],
    [-8, "Varanasi", "XL6", "xl6", 5200],
    [-11, "Gaya", "Scorpio Classic", "scorpio-classic", 4800],
    [-15, "Patna Airport", "Scorpio", "scorpio", 3699],
    [-19, "Buxar", "Grand i10", "grand-i10", 999],
    [-24, "Arrah", "Tiber", "tiber", 1199],
    [-33, "Patna Airport", "Scorpio VLX", "scorpio-vlx", 3899],
  ].map(([n, to, carName, carId, quote]) => booking({ createdAt: at(n - 1, "11:00"), status: "completed", to, date: day(n), time: "07:00", car: carName, carId, quote })),
  // Cancelled.
  booking({ createdAt: ago(60 * 24 * 2), status: "cancelled", to: "Patna Airport", date: day(-1), time: "04:00", car: "Scorpio VLX", quote: 3899, cancelReason: "No car free at that time" }),
];
for (const b of bookings) b.updatedAt = b.createdAt;

// ---- trip log --------------------------------------------------------------------
const byId = (pred) => bookings.find(pred);
const entry = (e) => ({ id: randomUUID(), createdAt: at(0, "12:00"), note: "", source: "staff", ...e });
const journal = [];
// One staff entry per completed own-fleet booking.
for (const b of bookings.filter((x) => x.status === "completed" && x.carId)) {
  const km = { "Patna Airport": 270, Varanasi: 290, Gaya: 380, Arrah: 96, Buxar: 34 }[b.to] ?? 60;
  journal.push(
    entry({ date: b.date, carId: b.carId, bookingId: b.id, customer: b.name, from: b.from, to: b.to, km, fare: b.quote, fuel: Math.round(km * 7.5), driverCut: Math.round(b.quote * 0.18), createdAt: at(0, "20:00").replace(/^[\d-]+/, b.date) }),
  );
}
// Extra local trips without a booking (walk-ins).
journal.push(entry({ date: day(-6), carId: "nexon", customer: "Walk-in", from: "Dumraon", to: "Buxar", km: 34, fare: 900, fuel: 260, driverCut: 150 }));
journal.push(entry({ date: day(-9), carId: "altroz", customer: "Walk-in", from: "Dumraon", to: "Brahmpur", km: 40, fare: 800, fuel: 280, driverCut: 140 }));
// Driver-app entries from the demo vendor: one to check, one approved.
const waiting = byId((b) => b.vendorId === kishor.id && b.trip?.stage === "paid" && !b.trip.approved);
const approved = byId((b) => b.vendorId === kishor.id && b.trip?.approved);
for (const [b, status] of [[waiting, "submitted"], [approved, "approved"]]) {
  const e = entry({
    date: b.date,
    carId: kCar.id,
    bookingId: b.id,
    customer: b.name,
    phone: b.phone.replace(/\D/g, "").slice(-10),
    from: b.from,
    to: b.to,
    km: b.trip.endKm - b.trip.startKm,
    routeKm: status === "submitted" ? 270 : 34,
    odoStart: b.trip.startKm,
    odoEnd: b.trip.endKm,
    startedAt: b.trip.startedAt,
    endedAt: b.trip.endedAt,
    fare: b.quote,
    fuel: 0,
    driverCut: b.trip.share,
    expenses: status === "submitted" ? [{ kind: "Toll", place: "Koilwar plaza", amount: 120, at: b.trip.endedAt }] : [],
    payment: { method: "cash", amount: b.trip.collected, at: b.trip.endedAt, received: true },
    source: "driver",
    status,
    vendorId: kishor.id,
    submittedAt: b.trip.sentAt,
    ...(status === "approved" ? { reviewedAt: at(-4, "11:00") } : {}),
  });
  journal.push(e);
  b.trip.entryId = e.id;
}

// ---- write -----------------------------------------------------------------------
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
for (const { file, title } of pendingFiles) await store.writeDoc(file, samplePdf(title));
console.log(`wrote ${pendingFiles.length} sample documents`);
console.log("\nDemo driver for /driver: mobile 95256 66262 (Kishor Kumar).");
