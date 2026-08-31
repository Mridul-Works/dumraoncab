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

export type Vehicle = {
  name: string;
  category: "SUV" | "MUV" | "Compact SUV" | "Hatchback" | "Utility";
  seats: string;
  transmission: string;
  fuel: string;
  rate: string; // indicative per-km rate — confirm with operator (see README)
  image: string;
  note: string;
};

// Photos are the operator's own fleet images (Cloudinary), reused from the live site.
// Transmission/fuel specs are typical for these models — confirm per vehicle before launch.
export const fleet: Vehicle[] = [
  {
    name: "Scorpio VLX",
    category: "SUV",
    seats: "7 seats",
    transmission: "Manual",
    fuel: "Diesel",
    rate: "₹17/km",
    image: "https://res.cloudinary.com/dwfe5swye/image/upload/v1785647370/dumraon-cab/ttkhocljeschqcjczj44.png",
    note: "The wedding lead car — commanding, comfortable, highway-ready.",
  },
  {
    name: "Scorpio Classic",
    category: "SUV",
    seats: "7 seats",
    transmission: "Manual",
    fuel: "Diesel",
    rate: "₹17/km",
    image: "https://res.cloudinary.com/dwfe5swye/image/upload/v1785154016/dumraon-cab/bmbqy2oaiti61a1bgmx8.jpg",
    note: "Dependable workhorse for outstation and rough roads.",
  },
  {
    name: "Scorpio",
    category: "SUV",
    seats: "7 seats",
    transmission: "Manual",
    fuel: "Diesel",
    rate: "₹17/km",
    image: "https://res.cloudinary.com/dwfe5swye/image/upload/v1785149055/dumraon-cab/nshtormeysghbeifbdfg.png",
    note: "Family favourite for long trips and baraat convoys.",
  },
  {
    name: "XL6",
    category: "MUV",
    seats: "6 seats",
    transmission: "Manual",
    fuel: "Petrol",
    rate: "₹17/km",
    image: "https://res.cloudinary.com/dwfe5swye/image/upload/v1785205332/dumraon-cab/wrf1qjrviliwgszyz4bt.jpg",
    note: "Captain seats in the middle row — the comfortable six-seater.",
  },
  {
    name: "Nexon",
    category: "Compact SUV",
    seats: "5 seats",
    transmission: "Manual",
    fuel: "Petrol",
    rate: "₹13/km",
    image: "https://res.cloudinary.com/dwfe5swye/image/upload/v1785155050/dumraon-cab/hufsq4boet35fyd1rtw3.png",
    note: "5-star safety rating, ideal for airport runs.",
  },
  {
    name: "Altroz",
    category: "Hatchback",
    seats: "5 seats",
    transmission: "Manual",
    fuel: "Petrol",
    rate: "₹11/km",
    image: "https://res.cloudinary.com/dwfe5swye/image/upload/v1785205273/dumraon-cab/f8nzklvsrmi83oqs25o7.jpg",
    note: "Smooth city car for hourly hire and short drops.",
  },
  {
    name: "Grand i10",
    category: "Hatchback",
    seats: "5 seats",
    transmission: "Manual",
    fuel: "Petrol",
    rate: "₹11/km",
    image: "https://res.cloudinary.com/dwfe5swye/image/upload/v1785154030/dumraon-cab/orv0s99u8niu6cog06ud.jpg",
    note: "Our most economical ride — lowest per-km rate.",
  },
  {
    name: "Tiber",
    category: "Hatchback",
    seats: "5 seats",
    transmission: "Manual",
    fuel: "Petrol",
    rate: "₹11/km",
    image: "https://res.cloudinary.com/dwfe5swye/image/upload/v1785642606/dumraon-cab/wbdi3kz2guagghqywguv.png",
    note: "Compact and nimble for narrow-lane pickups.",
  },
  {
    name: "Magic Pickup",
    category: "Utility",
    seats: "Cargo",
    transmission: "Manual",
    fuel: "Diesel",
    rate: "On request",
    image: "https://res.cloudinary.com/dwfe5swye/image/upload/v1785203654/dumraon-cab/mfdkitorba3xcfxpzdx8.png",
    note: "Goods, luggage and event supplies moved alongside your convoy.",
  },
];

/* ----------------------------------- fares ------------------------------------ */
// NOTE: Indicative fares. Confirm every figure with the operator before launch (see README).

export const perKmRates = [
  { category: "Hatchback", cars: "Grand i10 · Altroz · Tiber", rate: "₹11/km" },
  { category: "Compact SUV", cars: "Nexon", rate: "₹13/km" },
  { category: "SUV / MUV", cars: "Scorpio · XL6", rate: "₹17/km" },
];

export const hourlyPackages = [
  { name: "4 hr / 40 km", price: "₹1,199", for: "Errands & local visits" },
  { name: "8 hr / 80 km", price: "₹2,199", for: "Full-day city use" },
  { name: "12 hr / 120 km", price: "₹3,199", for: "Functions & long days" },
  { name: "24 hr / 250 km", price: "₹4,999", for: "Round-the-clock standby" },
];

export const fareNotes = [
  "Night driver allowance ₹300 per night on outstation trips.",
  "Tolls, parking and state taxes at actuals — receipts shared.",
  "Round trips billed on total kilometres travelled.",
  "Pay by cash or UPI at the end of the trip. No advance needed for regular bookings.",
];

/* ----------------------------------- routes ----------------------------------- */

export type CabRoute = {
  slug: string;
  from: string;
  to: string;
  distance: string;
  duration: string;
  fareFrom: string; // indicative sedan/compact fare — confirm before launch
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
    fareFrom: "₹2,799",
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
    fareFrom: "₹799",
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
    fareFrom: "₹1,299",
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
    fareFrom: "₹2,999",
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
    fareFrom: "₹4,199",
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
    a: "Local hire uses fixed hourly packages (4, 8, 12 or 24 hours with bundled kilometres). Outstation trips are billed per kilometre by car class, plus a ₹300 night allowance for the driver on overnight journeys. Tolls and taxes are at actuals with receipts. You get the full quote on WhatsApp before the car leaves.",
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
