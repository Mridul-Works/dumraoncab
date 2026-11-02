import type { CarSeed, Fares } from "./catalogTypes";

export const site = {
  name: "Dumraon Cab Service",
  legalName: "Dumraon Cab Service",
  url: "https://www.dumraoncab.com",
  tagline: "Anywhere in Bihar. Any hour.",
  description:
    "Chauffeur-driven cabs from Dumraon, Buxar — airport transfers, outstation trips, wedding cars, hourly rental and corporate travel across Bihar, 24/7 since 2014.",
  foundedYear: 2014,
  phone: "+919525802341",
  phoneDisplay: "95258 02341",
  altPhones: [
    { raw: "+917061617560", display: "70616 17560" },
    { raw: "+919507538143", display: "95075 38143" },
  ],
  whatsapp: "919525802341",
  email: "info@dumraoncab.com",
  address: {
    locality: "Dumraon",
    district: "Buxar",
    region: "Bihar",
    postalCode: "802136",
    country: "IN",
  },
  geo: { lat: 25.5526, lng: 84.1515 },
  serviceAreas: ["Dumraon", "Buxar", "Ara", "Patna", "Varanasi", "Gaya", "All Bihar"],
  stats: [
    { value: "10+", label: "Years on the road" },
    { value: "100+", label: "Vehicles in the fleet" },
    { value: "1000+", label: "Customers served" },
    { value: "24/7", label: "Booking & support" },
  ],
};

export function waLink(text: string) {
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;
}

export const defaultWaText = `Hello Dumraon Cab Service, I want to book a cab.`;

type CustomerTrip = { name: string; service: string; from: string; to: string; date: string; time: string; car: string; quote?: number };

const tripLine = (b: CustomerTrip) => {
  const trip = b.to ? `${b.from} → ${b.to}` : b.from;
  const when = [b.date, b.time].filter(Boolean).join(" at ");
  return `${trip}${when ? `, ${when}` : ""}${b.car ? ` (${b.car})` : ""}`;
};
const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

// Admin panel: WhatsApp message sent to a customer when staff confirm their trip.
export function customerConfirmText(b: CustomerTrip) {
  return [
    `Namaste${b.name ? ` ${b.name}` : ""}, this is ${site.name}.`,
    `Your ${b.service} booking is confirmed: ${tripLine(b)}.`,
    ...(b.quote ? [`Fixed fare: ${rupees(b.quote)} (tolls and parking at actuals).`] : []),
    `Driver details will be shared before pickup. For any change call ${site.phoneDisplay}.`,
  ].join("\n");
}

// Admin panel: WhatsApp message sending a fare quote for a new request.
export function customerQuoteText(b: CustomerTrip) {
  return [
    `Namaste${b.name ? ` ${b.name}` : ""}, this is ${site.name}.`,
    `Thank you for your ${b.service} request: ${tripLine(b)}.`,
    b.quote
      ? `Our fixed fare is ${rupees(b.quote)} (tolls and parking at actuals). Reply YES to confirm.`
      : `Please share a good time to call so we can confirm the fare.`,
  ].join("\n");
}

// Admin panel (Figma 3.6 + 9.3): WhatsApp message once a car and driver are
// assigned. `when` is "Sat 31 Oct, 4:30 AM"; `callAt` the time the driver calls.
export function customerDriverText(b: {
  name: string;
  from: string;
  to: string;
  when: string;
  driverName: string;
  driverMobile: string;
  callAt?: string;
  quote?: number;
  freeCancelUntil?: string;
  office: string; // "+91 95258 02341"
}) {
  const trip = b.to ? `${b.from} to ${b.to}` : b.from;
  return [
    `Namaste${b.name ? ` ${b.name.split(" ")[0]} ji` : ""}, your cab is booked.`,
    [
      `${[b.when, trip].filter(Boolean).join(" · ")}.`,
      `${b.driverName} will call you${b.callAt ? ` at ${b.callAt}` : ""} from ${b.driverMobile}.`,
      b.quote ? `Total ${rupees(b.quote)}, pay by UPI after the trip.` : "",
      b.freeCancelUntil ? `Free cancellation until ${b.freeCancelUntil}.` : "",
    ]
      .filter(Boolean)
      .join(" "),
    `Team Dumraon Cab · ${b.office}`,
  ].join("\n");
}

// Admin panel (Figma 3.7): reasons offered when staff cancel a booking, and
// the WhatsApp line sent to the customer. `day` is "Mon 2 Nov".
export const cancelReasons = ["Customer changed plans", "No car free at that time", "Could not reach customer", "Price too high"];
export const customerCancelText = (day: string) => `Your booking${day ? ` for ${day}` : ""} is cancelled. Call us to book again.`;

// Booking PDF (Figma 9.1): first term on the customer copy; `until` is "Sat 31 Oct, 2:30 AM".
export const freeCancelHours = 2;
export const freeCancelTerm = (until: string) => `Free cancellation up to ${freeCancelHours} hours before pickup, so until ${until}.`;

// Booking PDF (Figma 9.2): the driver's "Before you go" checklist.
export const driverChecklist = ["Car clean, water bottles inside", "Help the passengers with their bags", "Toll card or cash for tolls", "Keep toll and parking receipts"];

// Admin "Share menu" (Figma 3B.6): WhatsApp message sending a trip to the
// driver — pickup, route and note, never the fare. `when` is "Sat 31 Oct, 4:30 AM".
export function driverTripText(b: { ref: string; name: string; phone: string; from: string; to: string; when: string; car: string; people?: number; note?: string }) {
  return [
    `Trip ${b.ref} · ${site.name}`,
    `Pickup: ${b.from}${b.when ? `, ${b.when}` : ""}`,
    ...(b.to ? [`Drop: ${b.to}`] : []),
    `Customer: ${[b.name, b.phone].filter(Boolean).join(" · ") || "Walk-in"}${b.people ? ` · ${b.people} ${b.people === 1 ? "person" : "people"}` : ""}`,
    ...(b.car ? [`Car: ${b.car}`] : []),
    ...(b.note ? [`Note: ${b.note}`] : []),
    `Office: ${site.phoneDisplay}`,
  ].join("\n");
}

/* ---------------------------------- services ---------------------------------- */

export type Service = {
  slug: string;
  name: string;
  short: string;
  hero: string;
  body: string[];
  includes: string[];
  bestCars: string;
};

export const services: Service[] = [
  {
    slug: "hourly-rental",
    name: "Hourly Rental",
    short: "A car with driver by the hour — 4, 8, 12 or 24-hour packages for errands, functions and local travel.",
    hero: "Keep a car and driver with you for as long as the day needs.",
    body: [
      "Hourly rental keeps one car and one driver at your service for a fixed block of time — you decide where it goes and when it waits. It suits shopping runs, hospital visits, family functions, site visits and any day where one trip turns into five.",
      "Choose a 4, 8, 12 or 24-hour package. Kilometres are bundled into each package, and anything beyond is billed at the plain per-km rate for that car — the driver shares the running total whenever you ask.",
    ],
    includes: [
      "Driver, fuel and vehicle for the full booked duration",
      "4h / 40 km, 8h / 80 km, 12h / 120 km and 24h packages",
      "Extra hours and kilometres at published rates — no surprises",
      "Any car class: hatchback, sedan, SUV or MUV",
    ],
    bestCars: "Grand i10 or Altroz for city errands, XL6 or Scorpio for family days.",
  },
  {
    slug: "outstation-trips",
    name: "Outstation Trips",
    short: "Round trips and multi-day journeys from Dumraon to anywhere in Bihar, UP, Jharkhand and beyond.",
    hero: "Long roads are our home ground.",
    body: [
      "From a same-day Patna return to a week across Uttar Pradesh, outstation is the core of what we have done since 2014. Your driver knows the highways, the dhabas worth stopping at, and how to keep a schedule without rushing you.",
      "Round trips are billed on total kilometres with a fixed per-day driver allowance for overnight journeys. Tolls and state taxes are billed at actuals with receipts — the fare you agree on is the fare you pay.",
    ],
    includes: [
      "Any destination — Bihar, UP, Jharkhand, West Bengal and beyond",
      "Transparent per-km billing plus fixed night allowance",
      "Tolls and taxes at actuals, receipts shared",
      "Well-rested drivers on multi-day itineraries",
    ],
    bestCars: "Scorpio for rough stretches and hills, XL6 for six on the highway.",
  },
  {
    slug: "airport-transfers",
    name: "Airport & Railway Transfers",
    short: "On-time pickups and drops for Patna airport and Buxar, Ara and Dumraon railway stations.",
    hero: "The car is waiting before you walk out.",
    body: [
      "Flights and trains do not wait, so neither do we. For airport pickups we track your flight and adjust for delays; for drops we plan departure around real highway timings, not optimistic ones.",
      "Patna's Jay Prakash Narayan Airport is about 120 km from Dumraon — a comfortable three-hour run. We also cover railway pickups at Dumraon, Buxar and Ara stations at any hour, including late-night arrivals.",
    ],
    includes: [
      "Flight-tracked airport pickups — delays are our problem, not yours",
      "Late-night and early-morning transfers, every day of the year",
      "Meet at the gate with a name board on request",
      "Fixed fares quoted before the trip",
    ],
    bestCars: "Nexon or a sedan for solo flyers, Scorpio or XL6 for families with luggage.",
  },
  {
    slug: "one-way-drops",
    name: "One-Way Drops",
    short: "Pay for one direction only on point-to-point drops — the budget way to travel between cities.",
    hero: "Going one way? Pay one way.",
    body: [
      "On popular corridors you should not pay for the car's return. Our one-way drops price only the direction you travel, which makes short intercity hops — Dumraon to Buxar, Ara or Patna — genuinely affordable.",
      "Tell us the pickup point and destination, get a fixed quote on WhatsApp, and the car arrives at your door. No sharing, no waiting for other passengers.",
    ],
    includes: [
      "Fixed fare for your direction only",
      "Door-to-door — no pickup points or sharing",
      "Available on all major corridors out of Dumraon",
      "Instant quotes on WhatsApp",
    ],
    bestCars: "Grand i10 or Altroz keep one-way fares lowest.",
  },
  {
    slug: "wedding-cars",
    name: "Wedding Cars",
    short: "Decorated cars and full baraat convoys, coordinated to the minute for your functions.",
    hero: "The baraat arrives together, on time, looking right.",
    body: [
      "Weddings are convoy work: one decorated lead car for the groom, a line of SUVs for family, and pickups synchronised across town. We plan the vehicle list, decoration, timings and route with you days in advance, and a single coordinator manages every driver on the day.",
      "With 100+ vehicles we can field convoys of any size in peak season — book early for November–February dates.",
    ],
    includes: [
      "Decorated lead car with flowers and ribbons",
      "Convoys of 2 to 20+ vehicles, one point of contact",
      "Multi-day packages covering haldi, baraat and vidaai",
      "Uniformed drivers briefed on the schedule",
    ],
    bestCars: "Scorpio VLX as the lead car, XL6 and sedans for the family line.",
  },
  {
    slug: "corporate-rental",
    name: "Corporate Rental",
    short: "Monthly billing, dedicated cars and dependable drivers for businesses and site teams.",
    hero: "Your team moves. The paperwork stays simple.",
    body: [
      "For banks, contractors, survey teams and local offices we run cars on weekly or monthly arrangements — a dedicated vehicle and driver who learns your routes, with a single consolidated bill at month end.",
      "Trip logs are maintained per vehicle, and replacements are guaranteed: if a car goes for service, another arrives before your day starts.",
    ],
    includes: [
      "Weekly and monthly contracts with consolidated billing",
      "Dedicated driver and vehicle for your team",
      "Trip logs and usage reports on request",
      "Guaranteed replacement vehicle during maintenance",
    ],
    bestCars: "Nexon and sedans for executives, Magic pickup for site supplies.",
  },
];

/* ----------------------------------- fleet ------------------------------------ */
// SEED DATA: the fleet and fares below are the starting point only. Once staff
// save changes in the admin panel (Fleet, Fares), the saved copy in data/ is
// what the public site shows. Edit here for a fresh install or a reset.

// Photos are the operator's own fleet images (Cloudinary), reused from the live site.
// Transmission/fuel specs are typical for these models — confirm per vehicle before launch.
export const seedFleet: CarSeed[] = [
  {
    id: "scorpio-vlx",
    name: "Scorpio VLX",
    type: "SUV",
    fareClass: "suv-muv",
    seats: "7 seats",
    transmission: "Manual",
    fuel: "Diesel",
    image: "https://res.cloudinary.com/dwfe5swye/image/upload/v1785647370/dumraon-cab/ttkhocljeschqcjczj44.png",
    note: "The wedding lead car — commanding, comfortable, highway-ready.",
  },
  {
    id: "scorpio-classic",
    name: "Scorpio Classic",
    type: "SUV",
    fareClass: "suv-muv",
    seats: "7 seats",
    transmission: "Manual",
    fuel: "Diesel",
    image: "https://res.cloudinary.com/dwfe5swye/image/upload/v1785154016/dumraon-cab/bmbqy2oaiti61a1bgmx8.jpg",
    note: "Dependable workhorse for outstation and rough roads.",
  },
  {
    id: "scorpio",
    name: "Scorpio",
    type: "SUV",
    fareClass: "suv-muv",
    seats: "7 seats",
    transmission: "Manual",
    fuel: "Diesel",
    image: "https://res.cloudinary.com/dwfe5swye/image/upload/v1785149055/dumraon-cab/nshtormeysghbeifbdfg.png",
    note: "Family favourite for long trips and baraat convoys.",
  },
  {
    id: "xl6",
    name: "XL6",
    type: "MUV",
    fareClass: "suv-muv",
    seats: "6 seats",
    transmission: "Manual",
    fuel: "Petrol",
    image: "https://res.cloudinary.com/dwfe5swye/image/upload/v1785205332/dumraon-cab/wrf1qjrviliwgszyz4bt.jpg",
    note: "Captain seats in the middle row — the comfortable six-seater.",
  },
  {
    id: "nexon",
    name: "Nexon",
    type: "Compact SUV",
    fareClass: "compact-suv",
    seats: "5 seats",
    transmission: "Manual",
    fuel: "Petrol",
    image: "https://res.cloudinary.com/dwfe5swye/image/upload/v1785155050/dumraon-cab/hufsq4boet35fyd1rtw3.png",
    note: "5-star safety rating, ideal for airport runs.",
  },
  {
    id: "altroz",
    name: "Altroz",
    type: "Hatchback",
    fareClass: "hatchback",
    seats: "5 seats",
    transmission: "Manual",
    fuel: "Petrol",
    image: "https://res.cloudinary.com/dwfe5swye/image/upload/v1785205273/dumraon-cab/f8nzklvsrmi83oqs25o7.jpg",
    note: "Smooth city car for hourly hire and short drops.",
  },
  {
    id: "grand-i10",
    name: "Grand i10",
    type: "Hatchback",
    fareClass: "hatchback",
    seats: "5 seats",
    transmission: "Manual",
    fuel: "Petrol",
    image: "https://res.cloudinary.com/dwfe5swye/image/upload/v1785154030/dumraon-cab/orv0s99u8niu6cog06ud.jpg",
    note: "Our most economical ride — lowest per-km rate.",
  },
  {
    id: "tiber",
    name: "Tiber",
    type: "Hatchback",
    fareClass: "hatchback",
    seats: "5 seats",
    transmission: "Manual",
    fuel: "Petrol",
    image: "https://res.cloudinary.com/dwfe5swye/image/upload/v1785642606/dumraon-cab/wbdi3kz2guagghqywguv.png",
    note: "Compact and nimble for narrow-lane pickups.",
  },
  {
    id: "magic-pickup",
    name: "Magic Pickup",
    type: "Utility",
    fareClass: "",
    seats: "Cargo",
    transmission: "Manual",
    fuel: "Diesel",
    image: "https://res.cloudinary.com/dwfe5swye/image/upload/v1785203654/dumraon-cab/mfdkitorba3xcfxpzdx8.png",
    note: "Goods, luggage and event supplies moved alongside your convoy.",
  },
];

/* ----------------------------------- fares ------------------------------------ */
// NOTE: Indicative fares. Confirm every figure with the operator before launch (see README).

export const seedFares: Fares = {
  perKm: [
    { id: "hatchback", name: "Hatchback", rate: 11 },
    { id: "compact-suv", name: "Compact SUV", rate: 13 },
    { id: "suv-muv", name: "SUV / MUV", rate: 17 },
  ],
  hourly: [
    { id: "4h", name: "4 hr / 40 km", for: "Errands & local visits", price: 1199 },
    { id: "8h", name: "8 hr / 80 km", for: "Full-day city use", price: 2199 },
    { id: "12h", name: "12 hr / 120 km", for: "Functions & long days", price: 3199 },
    { id: "24h", name: "24 hr / 250 km", for: "Round-the-clock standby", price: 4999 },
  ],
  // "From" fare per route slug (indicative sedan/compact fare)
  routes: {
    "dumraon-to-patna-airport": 2799,
    "dumraon-to-buxar": 799,
    "dumraon-to-ara": 1299,
    "dumraon-to-varanasi": 2999,
    "dumraon-to-gaya": 4199,
  },
  nightAllowance: 300,
  rules: [
    "Tolls, parking and state taxes at actuals — receipts shared.",
    "Round trips billed on total kilometres travelled.",
    "Pay by cash or UPI at the end of the trip. No advance needed for regular bookings.",
  ],
};

/* ----------------------------------- routes ----------------------------------- */

// Route content. The "from" fare for each route lives in seedFares.routes / the admin Fares page.
export type CabRoute = {
  slug: string;
  from: string;
  to: string;
  distance: string;
  duration: string;
  blurb: string;
  detail: string[];
};

export const routes: CabRoute[] = [
  {
    slug: "dumraon-to-patna-airport",
    from: "Dumraon",
    to: "Patna Airport",
    distance: "120 km",
    duration: "≈ 3 hr",
    blurb: "Flight-tracked drops and pickups at Jay Prakash Narayan Airport.",
    detail: [
      "The Dumraon–Patna airport run is our most-booked route. We plan departure around real NH-922 and NH-30 timings and track your flight, so an early landing or a two-hour delay changes nothing for you.",
      "For drops we recommend leaving 4.5 hours before domestic departures. For pickups the driver is at the arrivals gate with a name board before you clear the terminal.",
    ],
  },
  {
    slug: "dumraon-to-buxar",
    from: "Dumraon",
    to: "Buxar",
    distance: "32 km",
    duration: "≈ 50 min",
    blurb: "Quick hops to the district headquarters — court, hospital and station runs.",
    detail: [
      "Buxar is the short hop we run many times a day: court dates, hospital visits, the railway station and government offices. Book one-way and pay for one direction only.",
      "Early-morning trains from Buxar station? We do pickups from Dumraon at any hour, including 3 AM departures.",
    ],
  },
  {
    slug: "dumraon-to-ara",
    from: "Dumraon",
    to: "Ara",
    distance: "52 km",
    duration: "≈ 1.5 hr",
    blurb: "Comfortable one-way and return trips to Ara on NH-922.",
    detail: [
      "A straightforward run along NH-922 for business, family visits and connecting trains at Ara Junction.",
      "Same-day returns work well as an 8-hour hourly package — the car waits while you finish your work.",
    ],
  },
  {
    slug: "dumraon-to-varanasi",
    from: "Dumraon",
    to: "Varanasi",
    distance: "125 km",
    duration: "≈ 3 hr",
    blurb: "Temple visits, Ganga aarti and Lal Bahadur Shastri Airport connections.",
    detail: [
      "Varanasi trips are usually day returns — leave Dumraon early, attend darshan at Kashi Vishwanath, catch the evening Ganga aarti and be home by night. Your driver knows where to park near the ghats, which saves an hour of circling.",
      "We also drop to Lal Bahadur Shastri Airport (Babatpur) for flights not served from Patna.",
    ],
  },
  {
    slug: "dumraon-to-gaya",
    from: "Dumraon",
    to: "Gaya",
    distance: "185 km",
    duration: "≈ 4.5 hr",
    blurb: "Pind daan at Gaya ji and Bodh Gaya visits, with waiting included on request.",
    detail: [
      "Gaya trips are often for pind daan and family rituals, so we plan them differently: the car and driver stay with you through the day, and timing follows your pandit's schedule, not ours.",
      "Combine with Bodh Gaya (15 km further) for a full-day itinerary — ask for the combined quote.",
    ],
  },
];

/* -------------------------------- testimonials --------------------------------- */
// SAMPLE CONTENT — replace with real customer reviews (with permission) before launch.
// Collect from WhatsApp chats and Google reviews. See README launch checklist.

export const testimonials = [
  {
    quote:
      "Booked a 12-car baraat convoy for my brother's wedding. Every car reached the gate together, decorated and on time. One phone number handled everything.",
    name: "Wedding convoy, Dumraon",
    trip: "Wedding Cars · 12 vehicles",
  },
  {
    quote:
      "My flight landed 90 minutes late at Patna and the driver was still waiting at arrivals with my name board. Fare stayed exactly as quoted.",
    name: "Airport pickup, Patna",
    trip: "Airport Transfer · Nexon",
  },
  {
    quote:
      "We keep a Scorpio on monthly contract for our field team. Replacement car arrives the same morning whenever one goes for service.",
    name: "Site office, Buxar district",
    trip: "Corporate Rental · Monthly",
  },
  {
    quote:
      "Took the family to Varanasi for the day — clean car, careful driver, and he knew exactly where to park near the ghats. Home by 10 PM as promised.",
    name: "Family day trip, Dumraon",
    trip: "Outstation · XL6",
  },
];

/* ------------------------------------ FAQs ------------------------------------- */

export const faqs = [
  {
    q: "How are fares calculated?",
    a: "Local hire uses fixed hourly packages (4, 8, 12 or 24 hours with bundled kilometres). Outstation trips are billed per kilometre by car class, plus a fixed night allowance for the driver on overnight journeys (see the fare table). Tolls and taxes are at actuals with receipts. You get the full quote on WhatsApp before the car leaves.",
  },
  {
    q: "Do I need to pay in advance?",
    a: "No advance for regular bookings — pay by cash or UPI at the end of the trip. Large wedding convoys and multi-day outstation itineraries may need a small token to block vehicles on peak dates.",
  },
  {
    q: "What if I cancel?",
    a: "Cancel any regular booking free of charge up to 2 hours before pickup by phone or WhatsApp. Wedding and convoy bookings follow the terms agreed at the time of the token payment.",
  },
  {
    q: "Are your drivers verified?",
    a: "Yes. Every driver joins with police verification and a checked driving record, and our vehicles are comprehensively insured. Drivers on night and highway duty are rotated so nobody drives tired.",
  },
  {
    q: "Can I book for late night or early morning?",
    a: "Yes — we operate 24/7, including 3 AM railway pickups and pre-dawn airport departures. Book a few hours ahead for odd-hour trips so we can position the car.",
  },
  {
    q: "How is a round trip billed?",
    a: "On total kilometres travelled from garage to garage, at the per-km rate of the car you choose, plus night allowance if the driver stays out overnight. The driver keeps a trip log you can check at any time.",
  },
  {
    q: "Which car should I choose?",
    a: "Grand i10 or Altroz for the lowest fares around town, Nexon for airport runs, XL6 when six people travel with luggage, and Scorpio for rough roads, hills and wedding lead cars. Tell us the trip on WhatsApp and we will suggest honestly.",
  },
  {
    q: "Do you serve areas outside Dumraon?",
    a: "Yes. We pick up across Buxar district — Dumraon, Buxar town, Brahmpur, Itarhi and nearby villages — and run trips anywhere in Bihar, eastern UP and Jharkhand.",
  },
];

/* --------------------------------- how it works -------------------------------- */

export const steps = [
  {
    title: "Tell us the trip",
    text: "Call or WhatsApp with pickup point, destination and date — or use the booking form.",
  },
  {
    title: "Get a fixed quote",
    text: "We reply with the fare, car options and driver details. No hidden charges, ever.",
  },
  {
    title: "Car at your door",
    text: "A clean, insured car with a verified driver arrives at the agreed time.",
  },
  {
    title: "Pay after the trip",
    text: "Cash or UPI when the trip ends. Receipts for tolls and taxes included.",
  },
];

/* ------------------------------- vendors (admin) ------------------------------- */
// Copy and reference lists for the admin Vendors section (Figma Flow 6) and the
// WhatsApp messages staff send to vendors from it.

// Places a vendor can work around ("Works around" chips + the Add place search).
export const vendorPlaces: { name: string; lat: number; lng: number }[] = [
  { name: "Dumraon", lat: 25.553, lng: 84.151 },
  { name: "Buxar", lat: 25.564, lng: 83.978 },
  { name: "Arrah", lat: 25.556, lng: 84.663 },
  { name: "Patna", lat: 25.594, lng: 85.137 },
  { name: "Patna Airport", lat: 25.591, lng: 85.088 },
  { name: "Brahmpur", lat: 25.648, lng: 84.31 },
  { name: "Nawanagar", lat: 25.412, lng: 84.203 },
  { name: "Itarhi", lat: 25.43, lng: 84.02 },
  { name: "Chausa", lat: 25.52, lng: 83.9 },
  { name: "Rajpur", lat: 25.4, lng: 83.93 },
  { name: "Simri", lat: 25.66, lng: 84.07 },
  { name: "Bihiya", lat: 25.55, lng: 84.46 },
  { name: "Jagdishpur", lat: 25.47, lng: 84.42 },
  { name: "Bikramganj", lat: 25.21, lng: 84.25 },
  { name: "Sasaram", lat: 24.95, lng: 84.03 },
  { name: "Bihta", lat: 25.56, lng: 84.87 },
  { name: "Danapur", lat: 25.63, lng: 85.05 },
  { name: "Ballia", lat: 25.76, lng: 84.15 },
  { name: "Ghazipur", lat: 25.58, lng: 83.58 },
  { name: "Varanasi", lat: 25.32, lng: 82.97 },
  { name: "Varanasi Airport", lat: 25.45, lng: 82.86 },
  { name: "Pt. DDU Junction", lat: 25.28, lng: 83.12 },
  { name: "Gaya", lat: 24.79, lng: 85.0 },
  { name: "Bodh Gaya", lat: 24.7, lng: 84.99 },
];

// States and districts offered in the vendor address form.
export const vendorRegions: Record<string, string[]> = {
  Bihar: [
    "Araria", "Arwal", "Aurangabad", "Banka", "Begusarai", "Bhagalpur", "Bhojpur", "Buxar", "Darbhanga", "East Champaran",
    "Gaya", "Gopalganj", "Jamui", "Jehanabad", "Kaimur", "Katihar", "Khagaria", "Kishanganj", "Lakhisarai", "Madhepura",
    "Madhubani", "Munger", "Muzaffarpur", "Nalanda", "Nawada", "Patna", "Purnia", "Rohtas", "Saharsa", "Samastipur",
    "Saran", "Sheikhpura", "Sheohar", "Sitamarhi", "Siwan", "Supaul", "Vaishali", "West Champaran",
  ],
  "Uttar Pradesh": ["Ballia", "Chandauli", "Deoria", "Ghazipur", "Gorakhpur", "Jaunpur", "Mau", "Mirzapur", "Prayagraj", "Varanasi"],
  Jharkhand: ["Bokaro", "Dhanbad", "Garhwa", "Hazaribagh", "Palamu", "Ranchi"],
};

// PIN code → town, district, state and map pin (fills the address form).
export const vendorPins: Record<string, { town: string; district: string; state: string; lat: number; lng: number; spot: string }> = {
  "802119": { town: "Dumraon", district: "Buxar", state: "Bihar", lat: 25.5533, lng: 84.1513, spot: "Dumraon Railway Station" },
  "802136": { town: "Dumraon", district: "Buxar", state: "Bihar", lat: 25.5526, lng: 84.1515, spot: "Dumraon" },
  "802101": { town: "Buxar", district: "Buxar", state: "Bihar", lat: 25.5647, lng: 83.9777, spot: "Buxar Railway Station" },
  "802301": { town: "Arrah", district: "Bhojpur", state: "Bihar", lat: 25.5541, lng: 84.6631, spot: "Arrah Junction" },
  "800001": { town: "Patna", district: "Patna", state: "Bihar", lat: 25.6029, lng: 85.1376, spot: "Patna GPO" },
  "821115": { town: "Sasaram", district: "Rohtas", state: "Bihar", lat: 24.9497, lng: 84.0315, spot: "Sasaram" },
  "277001": { town: "Ballia", district: "Ballia", state: "Uttar Pradesh", lat: 25.7584, lng: 84.1487, spot: "Ballia" },
  "233001": { town: "Ghazipur", district: "Ghazipur", state: "Uttar Pradesh", lat: 25.5839, lng: 83.5784, spot: "Ghazipur" },
  "221001": { town: "Varanasi", district: "Varanasi", state: "Uttar Pradesh", lat: 25.3176, lng: 82.9739, spot: "Varanasi" },
};

export const vendorCarModels = [
  "Toyota Innova Crysta", "Toyota Innova", "Mahindra Scorpio N", "Mahindra Scorpio", "Mahindra Bolero", "Mahindra XUV700",
  "Maruti Ertiga", "Maruti Swift Dzire", "Maruti WagonR", "Hyundai Aura", "Honda Amaze", "Kia Carens", "Tata Nexon", "Force Tempo Traveller",
];
export const vendorCarTypes = ["Hatchback", "Sedan", "SUV", "MUV", "Tempo Traveller"];
export const vendorFuels = ["Diesel", "Petrol", "CNG", "EV"];

export const vendorRejectReasons = [
  { id: "docs", label: "Documents don’t match", hint: "Names or numbers differ between Aadhaar, licence and RC" },
  { id: "car", label: "Car doesn’t meet our standard", hint: "Too old, damaged or not the type we run" },
  { id: "duplicate", label: "Already a vendor", hint: "Same person under another number" },
  { id: "other", label: "Something else", hint: "Write it in the message" },
];

export const vendorSuspendReasons = ["Customer complaint", "Late pickups", "Car not clean or in poor condition", "Documents expired", "Payment dispute", "Something else"];

export const vendorReuploadReasons = ["Photo is blurry", "Part of the document is cut off", "Wrong document", "Document has expired", "Name doesn’t match the profile"];

// WhatsApp messages to vendors. `first` = first name.
export const vendorMessages = {
  welcome: (first: string) =>
    [
      `Namaste ${first} ji, welcome to ${site.name}!`,
      `You are approved and can take trips from today. Open the driver app to see trips: ${site.url}/driver`,
      `Payouts go to your UPI every Monday.`,
    ].join("\n"),
  added: (first: string) =>
    [
      `Namaste ${first} ji, you are now registered with ${site.name}.`,
      `We are checking your documents. Sign in to the driver app with this mobile number: ${site.url}/driver`,
    ].join("\n"),
  reject: (first: string, reasonId: string, detail: string) => {
    const why: Record<string, string> = {
      docs: detail ? `the owner name on the RC of ${detail} does not match your Aadhaar` : "the names on your documents do not match",
      car: "your car does not meet our standard right now",
      duplicate: "you are already registered with us under another number",
    };
    return why[reasonId] ? `Namaste ${first} ji, ${why[reasonId]}. Please apply again with matching documents.` : `Namaste ${first} ji, `;
  },
  suspend: (first: string, until: string) =>
    `Namaste ${first} ji, your trips with ${site.name} are paused ${until ? `till ${until}` : "for now"}. Please call us on ${site.phoneDisplay} to talk about it.`,
  reactivate: (first: string) => `Namaste ${first} ji, you are back on trips with ${site.name} from today.`,
  reupload: (first: string, doc: string, reason: string) =>
    `Namaste ${first} ji, please upload your ${doc} again in the driver app${reason ? ` — ${reason.toLowerCase()}` : ""}. ${site.url}/driver`,
  askDoc: (first: string, doc: string) => `Namaste ${first} ji, please send your ${doc} in the driver app so you can start trips: ${site.url}/driver`,
};

// Link vendors use to sign up themselves (driver app).
export const vendorPartnerPath = "/driver";
