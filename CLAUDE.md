@AGENTS.md

## Project rules

- FEATURES.txt at the repo root is the living inventory of every site feature. Whenever you add, change, or remove a feature, update the matching section of FEATURES.txt in the same change.
- All site content (contact info, services, routes, testimonials, FAQs) is edited in lib/site.ts — never hard-code content in components.
- Fleet and fares are edited in the admin panel (stored in data/). lib/site.ts only holds their seed values (seedFleet, seedFares). Public pages read them through getCatalog() in lib/catalog.ts — never import the seeds into public components.
- Design: "chinkara Design System.json" is the master design system. Style with the Chinkara Tailwind classes defined in app/globals.css (bg-brand, text-secondary, border-subtle, type-h1…) — never hard-code hex colours or add off-system fonts. After changing the JSON, run `npm run tokens` to regenerate app/chinkara.css and lib/designTokens.ts (never edit those by hand).
