# Dumraon Cab Service — Website

Rebuilt Next.js site for [dumraoncab.com](https://www.dumraoncab.com) — cab & car rental in Dumraon, Buxar, Bihar.
Fixes every issue from the site audit (see `docs-audit.txt`): real static stats, filled FAQs and
testimonial slots, published fares, per-service and per-route SEO pages, structured data, and a
server-rendered booking page.

## Stack

- Next.js 16 (App Router; public pages statically generated, admin/API dynamic)
- Tailwind CSS v4, next/font (Google Sans Flex · Google Sans Code), Chinkara design tokens (`npm run tokens`)
- Booking flow: forms compose a WhatsApp message AND record the request via `/api/bookings`
- Fleet photos load from the operator's existing Cloudinary account
- `FEATURES.txt` is the living feature inventory — update it with every feature change

## Admin panel

`/admin` (sign in at `/admin/login`) has five sections, plus ⌘K / Ctrl+K search:

- **Dashboard** — act now (requests needing a call back, next confirmed trips) and
  at a glance (numbers, today's pickups, fleet right now, this week's bookings).
- **Bookings** — list with status tabs, search, source and date filters; a booking
  panel to quote, assign a car, confirm/complete/cancel and WhatsApp the customer;
  `/admin/bookings/new` for phone bookings (with past-customer lookup); CSV export.
- **Fleet** — car grid, add/edit/delete cars, photo upload, "shown on site" switch.
- **Daily journal** — one entry per trip (fare, fuel, driver cut → net), totals,
  needs-attention list, per-car view with km per day and service reminders.
- **Fares** — every price on the site; edit mode publishes straight to the live site.

- Login works with no setup: the built-in password is committed only as a scrypt hash
  (`lib/adminAuth.ts`), and without a server secret the session key is derived from the
  password at login — nothing in this public repo lets anyone sign in or forge a session.
- Recommended on the host (Vercel → Settings → Environment Variables, then redeploy);
  these override the built-ins:

  ```
  ADMIN_EMAIL=admin@dumraoncab.com
  ADMIN_PASSWORD=...          # a new password replaces the built-in one
  ADMIN_SESSION_SECRET=...    # long random string
  ```
- Session: HMAC-signed httpOnly cookie, 7 days; changing the password signs everyone out.
  `/admin` is noindex and blocked in robots.txt.
- Storage: JSON files in `data/` (gitignored) — `bookings.json`, `fleet.json`,
  `fares.json`, `journal.json`, and uploaded car photos in `data/uploads/`. All go
  through `lib/db.ts`. Fine on a VPS/Node host; on serverless hosts the filesystem is
  ephemeral — swap `lib/db.ts` for a database first. Back up `data/` regularly.
- Publishing: saving in Fleet or Fares expires every public page that shows cars or
  prices (cache tag `catalog`), so the next visitor sees the change — no redeploy.
  If you ever edit `data/fleet.json` or `data/fares.json` by hand, delete
  `.next/cache/fetch-cache` and restart the server so the site picks it up.

## Run it

```bash
npm install
npm run dev      # http://localhost:5600
npm run build    # production build
```

## Where everything lives

All content — phone numbers, services, routes, testimonials, FAQs — is data in
**`lib/site.ts`**. Edit that one file to change what the site says; no component changes needed.

**Fleet and fares** are edited in the admin panel. `lib/site.ts` holds only their starting
values (`seedFleet`, `seedFares`), used until the first save in the admin.

| Route | Purpose |
|---|---|
| `/` | Home: hero, stats, services, fleet, routes & fares, steps, testimonials, FAQ |
| `/services` + `/services/[slug]` | 6 service detail pages with Service JSON-LD |
| `/fleet` | Real fleet photos + per-km rates and hourly packages |
| `/routes/[slug]` | 5 route/fare landing pages (Patna Airport, Buxar, Ara, Varanasi, Gaya) |
| `/booking` | Server-rendered booking page; form opens a pre-filled WhatsApp message |
| `/about`, `/contact` | Story & standards; contact cards + embedded Google Map |
| `sitemap.xml`, `robots.txt` | Generated from `app/sitemap.ts` / `app/robots.ts` |

## ⚠️ Before launch — required

1. **Confirm every fare** in `lib/site.ts` (`perKmRates`, `hourlyPackages`, `routes[].fareFrom`,
   `fareNotes`) with the operator. Current figures are indicative placeholders.
2. **Replace the sample testimonials** in `lib/site.ts` with real customer reviews, quoted with
   permission. The current four are illustrative samples — do not launch with them.
3. **Search Console**: verify the domain, then add the real code in `app/layout.tsx`
   (`verification: { google: "..." }`) and submit `/sitemap.xml`.
4. **Google Business Profile**: claim/create the listing with the same name, address and phone as
   the site, and start collecting reviews there.
5. **Social links**: the old site had dead Facebook/Instagram/YouTube icons; this build omits them.
   Add real profile URLs to `components/Footer.tsx` only when the profiles exist.
6. **WhatsApp number**: confirm 95258 02341 is WhatsApp-enabled; change `site.whatsapp` otherwise.

## Nice next steps

- Wire the booking form to an API route / database for an admin dashboard (the old site had `/admin`).
- Hindi translations (`next-intl`), since much of the audience is Hindi-first.
- Move fleet images into this repo or a managed Cloudinary folder with descriptive filenames.
- Add more route pages — copy any entry in `routes` in `lib/site.ts`.
