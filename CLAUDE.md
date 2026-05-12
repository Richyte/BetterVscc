@AGENTS.md

# VSCC Race Calendar — Project Context

## What this project is
A modern, mobile-first website that displays upcoming Vintage Sports-Car Club (VSCC) races and events in a calendar format. It needs to work well in a desktop browser AND be installable as a Progressive Web App (PWA) on mobile. The existing club site at https://vscc.co.uk is the visual and content reference.

## Status
Greenfield scaffold only. Just `create-next-app` defaults — no calendar UI, no data layer, no PWA setup yet. The whole feature is still to be designed and built.

## Reference site: vscc.co.uk
Observed on 2026-05-12:
- Header nav: NEWS, EVENTS, JOIN IN, ABOUT US, TROPHIES, MY VSCC, CLASSIFIEDS & SHOP, FORUM, CONTACT US
- "Upcoming Events" section on the homepage lists scheduled activities (AutoSolos, tours across UK counties, rallies, races) with dates and entry/marshal options
- Carousel of activity imagery: trials, driving tests, speed events, rallies, tours, marshalling, racing
- Sponsor logos in the footer
- The current site is a flat list of events — not a calendar grid

## Feature scope (to plan)
1. **Calendar views** — at minimum: month grid (desktop) and agenda/list view (mobile). Consider week view.
2. **Event detail** — name, date(s), venue, category (race/trial/tour/rally/AutoSolo/speed/marshalling), description, entry link, marshal link.
3. **Filtering** — by event category, by month, possibly by region.
4. **PWA** — installable on iOS and Android, offline-capable read view of upcoming events, app icon + manifest. Decide between `@serwist/next` (modern, actively maintained) and `next-pwa` (older).
5. **Responsive design** — mobile-first, touch-friendly date picking, accessible.
6. **Visual style** — modern reinterpretation of the VSCC brand: keep the heritage/motorsport feel but clean, fast, and contemporary. Not a pixel copy of vscc.co.uk.

## Data approach
User chose "scrape / mirror vscc.co.uk." Before relying on this:
- Check vscc.co.uk's terms of use and robots.txt. Confirm user has permission or affiliation with the club.
- Their homepage `/events` URL returned 404 when checked — the events list lives on the homepage and possibly other paths. A scraper will need to be discovered, not assumed.
- Recommend starting with hardcoded sample/seed data so the UI can be built and verified first, then add a scrape pipeline (likely a build-time fetch or a scheduled job that writes JSON to the repo) as a second step.

## Stack (already chosen and scaffolded)
- Next.js 16.2.6 (App Router, src/ directory)
- React 19.2.4
- TypeScript
- Tailwind CSS 4
- ESLint
- Note: Next 16 and React 19 both have breaking changes from earlier major versions — see AGENTS.md and `node_modules/next/dist/docs/` before writing code.

## Out of scope (for the first iteration)
- Member login / account features
- Ticket purchase (vscc.co.uk uses TicketSource — likely just deep-link to it)
- Forum, classifieds, shop
- News articles (could be a later phase)

## How to run
- `npm run dev` — dev server
- `npm run build` — production build
- `npm run lint` — ESLint

## Open questions for the planning phase
- Does the user have permission to mirror vscc.co.uk content, or should we use sample data only?
- Where will the app be hosted? (Vercel, Cloudflare Pages, self-hosted) — affects PWA, ISR, and scraping options.
- What's the source of truth long-term — scraped from vscc.co.uk, manually curated, or a CMS?
- Calendar library vs. custom: `react-day-picker`, `fullcalendar`, or hand-rolled with date-fns?
