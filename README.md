# Dumraon Cab Service — Website

Rebuilt Next.js site for [dumraoncab.com](https://www.dumraoncab.com) — cab & car rental in Dumraon, Buxar, Bihar.
Fixes every issue from the site audit (see `docs-audit.txt`): real static stats, filled FAQs and
testimonial slots, published fares, per-service and per-route SEO pages, structured data, and a
server-rendered booking page.

## Stack

- Next.js 16 (App Router; public pages statically generated, admin/API dynamic)
- Tailwind CSS v4, next/font (Plus Jakarta Sans · IBM Plex Mono)
- Booking flow: forms compose a WhatsApp message AND record the request via `/api/bookings`
- Fleet photos load from the operator's existing Cloudinary account
- `FEATURES.txt` is the living feature inventory — update it with every feature change

## Admin panel

`/admin` shows everything: booking requests from the site (with status workflow),
fleet, routes, fares and content overview.

- Password: set `ADMIN_PASSWORD` in `.env.local` (dev fallback: `dumraon123` — change before launch).
- Session: httpOnly cookie, 30 days; `/admin` is noindex and blocked in robots.txt.
- Storage: `data/bookings.json` (gitignored). Fine on a VPS/Node host; on serverless
  hosts the filesystem is ephemeral — swap `lib/store.ts` for a database first.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

## Where everything lives

All content — phone numbers, services, fleet, fares, routes, testimonials, FAQs — is data in
**`lib/site.ts`**. Edit that one file to change what the site says; no component changes needed.

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
