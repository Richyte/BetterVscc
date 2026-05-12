/**
 * Daily scraper for vscc.co.uk → src/data/events.json.
 *
 * Run locally with: npm run scrape
 *
 * Strategy:
 *   1) Try every configured page for JSON-LD schema.org Event blocks.
 *   2) Fall back to a CSS-selector pass over candidate "event card" elements.
 *   3) Deduplicate by (title + start date), categorise heuristically, hot-link
 *      images by absolute URL so next/image can serve them via remotePatterns.
 *
 * Tune SELECTORS once you've seen the real markup — the JSON-LD path is the
 * most resilient and should be tried first regardless.
 */
import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const EVENT_CATEGORIES = [
  "race",
  "trial",
  "tour",
  "rally",
  "autosolo",
  "speed",
  "marshalling",
  "social",
] as const;

type EventCategory = (typeof EVENT_CATEGORIES)[number];

type RaceEvent = {
  id: string;
  title: string;
  startDate: string;
  endDate?: string;
  venue: string;
  region?: string;
  category: EventCategory;
  description: string;
  entryUrl?: string;
  marshalUrl?: string;
  detailsUrl?: string;
  imageUrl?: string;
  source?: "seed" | "vscc.co.uk";
};

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const OUTPUT_PATH = resolve(REPO_ROOT, "src/data/events.json");

const ORIGIN = "https://vscc.co.uk";

// vscc.co.uk routes every section under /page/<slug>. The homepage stays at "/".
const CANDIDATE_PATHS = [
  "/",
  "/page/events",
  "/page/calendar",
  "/page/whats-on",
  "/page/diary",
  "/page/race-meetings",
  "/page/news",
];

const USER_AGENT =
  "VSCC-Calendar-Scraper/1.0 (+https://vscc.co.uk; contact: web@vscc.co.uk)";

const SELECTORS = {
  card:
    "[class*='event'], article.event, .event-card, .event-listing, li.event, .tribe-events-calendar-list__event",
  title: "h2, h3, .event-title, .tribe-events-calendar-list__event-title",
  date: "time[datetime], .event-date, .tribe-events-calendar-list__event-datetime",
  venue: ".event-venue, .venue, .tribe-events-venue-details, address",
  description: ".event-description, .event-excerpt, p",
  link: "a[href]",
  image: "img",
};

const CATEGORY_KEYWORDS: Record<EventCategory, string[]> = {
  race: ["race", "racing", "grand prix", "trophy", "gp", "circuit"],
  trial: ["trial"],
  tour: ["tour", "touring"],
  rally: ["rally", "navigation", "regularity"],
  autosolo: ["autosolo", "auto solo", "driving test"],
  speed: ["hillclimb", "hill climb", "sprint", "speed"],
  marshalling: ["marshal", "marshall", "training"],
  social: [
    "dinner",
    "social",
    "concours",
    "agm",
    "drinks",
    "lunch",
    "presentation",
  ],
};

const REGION_KEYWORDS: Record<string, string[]> = {
  Midlands: ["silverstone", "shelsley", "mallory", "donington", "leicester", "warwick", "northants"],
  "South West": ["prescott", "castle combe", "thruxton", "exmoor", "cotswold", "gloucester", "somerset", "devon"],
  "North West": ["oulton", "lakeland", "cumbria", "cheshire", "lancashire"],
  "North East": ["elvington", "yorkshire", "harewood"],
  Scotland: ["scottish", "perthshire", "highland", "trossachs", "knockhill"],
  Wales: ["welsh", "brecon", "wye", "anglesey"],
  London: ["london", "rac club", "pall mall"],
  "South East": ["goodwood", "brands hatch", "snetterton", "kent", "sussex", "surrey"],
};

type ScrapedEvent = Omit<RaceEvent, "source"> & { source: "vscc.co.uk" };

async function main() {
  const collected = new Map<string, ScrapedEvent>();
  const diagnostics: Record<string, unknown> = {};

  for (const path of CANDIDATE_PATHS) {
    const url = `${ORIGIN}${path}`;
    let html: string;
    try {
      html = await fetchHtml(url);
    } catch (err) {
      diagnostics[path] = { ok: false, error: String(err) };
      continue;
    }
    const $ = cheerio.load(html);

    const jsonLd = extractFromJsonLd($, url);
    const selector = extractFromSelectors($, url);
    const found = dedupe([...jsonLd, ...selector]);
    diagnostics[path] = {
      ok: true,
      jsonLdEvents: jsonLd.length,
      selectorEvents: selector.length,
      kept: found.length,
    };
    for (const ev of found) {
      const key = `${ev.title.toLowerCase()}|${ev.startDate}`;
      if (!collected.has(key)) collected.set(key, ev);
    }
  }

  const events = [...collected.values()].sort((a, b) =>
    a.startDate.localeCompare(b.startDate),
  );

  const payload = {
    scrapedAt: new Date().toISOString(),
    source: ORIGIN,
    diagnostics,
    events,
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2) + "\n", "utf8");

  console.log(`Scraped ${events.length} event(s) → ${OUTPUT_PATH}`);
  for (const [path, info] of Object.entries(diagnostics)) {
    console.log(`  ${path}: ${JSON.stringify(info)}`);
  }
  if (events.length === 0) {
    console.log(
      "\nNo events parsed. Inspect a saved sample of the HTML, then tune SELECTORS at the top of src/scripts/scrape.ts.",
    );
    console.log(
      "Quick recon: curl -sS -A 'VSCC-Calendar-Scraper/1.0' https://vscc.co.uk/page/events > /tmp/vscc-events.html",
    );
  }
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.text();
}

function extractFromJsonLd(
  $: cheerio.CheerioAPI,
  pageUrl: string,
): ScrapedEvent[] {
  const events: ScrapedEvent[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw.trim()) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    const nodes = flattenLd(parsed);
    for (const node of nodes) {
      if (!isLdEvent(node)) continue;
      const ev = ldToEvent(node, pageUrl);
      if (ev) events.push(ev);
    }
  });
  return events;
}

function flattenLd(value: unknown): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const visit = (v: unknown) => {
    if (Array.isArray(v)) {
      for (const item of v) visit(item);
      return;
    }
    if (v && typeof v === "object") {
      const obj = v as Record<string, unknown>;
      out.push(obj);
      if ("@graph" in obj) visit(obj["@graph"]);
      if ("itemListElement" in obj) visit(obj["itemListElement"]);
    }
  };
  visit(value);
  return out;
}

function isLdEvent(node: Record<string, unknown>): boolean {
  const t = node["@type"];
  if (typeof t === "string") return /event/i.test(t);
  if (Array.isArray(t)) return t.some((x) => typeof x === "string" && /event/i.test(x));
  return false;
}

function ldToEvent(
  node: Record<string, unknown>,
  pageUrl: string,
): ScrapedEvent | null {
  const title = asString(node.name);
  const startRaw = asString(node.startDate);
  if (!title || !startRaw) return null;
  const startDate = toISODate(startRaw);
  if (!startDate) return null;
  const endDate = toISODate(asString(node.endDate));
  const venue = lookupVenue(node.location) ?? "TBC";
  const description = asString(node.description) ?? "";
  const image = pickImage(node.image, pageUrl);
  const url = absolutise(asString(node.url), pageUrl) ?? pageUrl;
  const category = categorise(`${title} ${description} ${venue}`);
  const region = guessRegion(`${title} ${venue}`);

  return {
    id: slugify(`${title}-${startDate}`),
    title,
    startDate,
    endDate: endDate && endDate !== startDate ? endDate : undefined,
    venue,
    region,
    category,
    description: shorten(description),
    entryUrl: url,
    detailsUrl: url,
    imageUrl: image,
    source: "vscc.co.uk",
  };
}

function extractFromSelectors(
  $: cheerio.CheerioAPI,
  pageUrl: string,
): ScrapedEvent[] {
  const events: ScrapedEvent[] = [];
  $(SELECTORS.card).each((_, el) => {
    const card = $(el);
    const title = textOf(card.find(SELECTORS.title).first());
    const dateText = textOf(card.find(SELECTORS.date).first());
    const datetimeAttr = card.find("time[datetime]").attr("datetime");
    const startDate = toISODate(datetimeAttr ?? dateText);
    if (!title || !startDate) return;

    const venue = textOf(card.find(SELECTORS.venue).first()) || "TBC";
    const description = textOf(card.find(SELECTORS.description).first());
    const link = card.find(SELECTORS.link).first().attr("href");
    const img = card.find(SELECTORS.image).first();
    const imageUrl =
      absolutise(img.attr("src"), pageUrl) ??
      absolutise(img.attr("data-src"), pageUrl) ??
      pickFromSrcset(img.attr("srcset"), pageUrl);
    const category = categorise(`${title} ${description} ${venue}`);
    const region = guessRegion(`${title} ${venue}`);
    const url = absolutise(link, pageUrl) ?? pageUrl;

    events.push({
      id: slugify(`${title}-${startDate}`),
      title,
      startDate,
      venue,
      region,
      category,
      description: shorten(description),
      entryUrl: url,
      detailsUrl: url,
      imageUrl,
      source: "vscc.co.uk",
    });
  });
  return events;
}

function dedupe(list: ScrapedEvent[]): ScrapedEvent[] {
  const seen = new Map<string, ScrapedEvent>();
  for (const ev of list) {
    const key = `${ev.title.toLowerCase()}|${ev.startDate}`;
    const prev = seen.get(key);
    if (!prev) {
      seen.set(key, ev);
      continue;
    }
    seen.set(key, {
      ...prev,
      description: prev.description || ev.description,
      imageUrl: prev.imageUrl ?? ev.imageUrl,
      endDate: prev.endDate ?? ev.endDate,
      region: prev.region ?? ev.region,
    });
  }
  return [...seen.values()];
}

function asString(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim()) return v.trim();
  return undefined;
}

function textOf(el: cheerio.Cheerio<AnyNode>): string {
  return el.text().replace(/\s+/g, " ").trim();
}

function lookupVenue(loc: unknown): string | undefined {
  if (!loc) return undefined;
  if (typeof loc === "string") return loc;
  if (Array.isArray(loc)) {
    for (const item of loc) {
      const v = lookupVenue(item);
      if (v) return v;
    }
    return undefined;
  }
  if (typeof loc === "object") {
    const o = loc as Record<string, unknown>;
    const name = asString(o.name);
    const address = lookupVenue(o.address);
    if (name && address) return `${name}, ${address}`;
    return name ?? address ?? undefined;
  }
  return undefined;
}

function pickImage(image: unknown, pageUrl: string): string | undefined {
  if (!image) return undefined;
  if (typeof image === "string") return absolutise(image, pageUrl);
  if (Array.isArray(image)) {
    for (const i of image) {
      const v = pickImage(i, pageUrl);
      if (v) return v;
    }
    return undefined;
  }
  if (typeof image === "object") {
    const o = image as Record<string, unknown>;
    return absolutise(asString(o.url) ?? asString(o.contentUrl), pageUrl);
  }
  return undefined;
}

function pickFromSrcset(
  srcset: string | undefined,
  pageUrl: string,
): string | undefined {
  if (!srcset) return undefined;
  const candidates = srcset
    .split(",")
    .map((part) => part.trim().split(/\s+/))
    .filter((p) => p[0]);
  const last = candidates[candidates.length - 1]?.[0];
  return absolutise(last, pageUrl);
}

function absolutise(
  href: string | undefined,
  pageUrl: string,
): string | undefined {
  if (!href) return undefined;
  try {
    return new URL(href, pageUrl).toString();
  } catch {
    return undefined;
  }
}

function toISODate(input: string | undefined): string | undefined {
  if (!input) return undefined;
  const trimmed = input.trim();
  const iso = trimmed.match(/^\d{4}-\d{2}-\d{2}/);
  if (iso) return iso[0];
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getUTCFullYear();
    const m = String(parsed.getUTCMonth() + 1).padStart(2, "0");
    const d = String(parsed.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return undefined;
}

function categorise(haystack: string): EventCategory {
  const text = haystack.toLowerCase();
  for (const cat of EVENT_CATEGORIES) {
    for (const kw of CATEGORY_KEYWORDS[cat]) {
      if (text.includes(kw)) return cat;
    }
  }
  return "race";
}

function guessRegion(haystack: string): string | undefined {
  const text = haystack.toLowerCase();
  for (const [region, keywords] of Object.entries(REGION_KEYWORDS)) {
    if (keywords.some((k) => text.includes(k))) return region;
  }
  return undefined;
}

function shorten(text: string, max = 320): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

main().catch((err) => {
  console.error("Scrape failed:", err);
  process.exit(1);
});
