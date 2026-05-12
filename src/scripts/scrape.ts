/**
 * Daily scraper for vscc.co.uk → src/data/events.json.
 *
 * Usage:
 *   npm run scrape                     # fetch /page/events live
 *   npm run scrape -- --file path.html # parse a local HTML sample (no network)
 *
 * Strategy:
 *   1) Primary: parse vscc.co.uk's Bootstrap card layout — every event is a
 *      `.card` with header (event-bg-N colour + title + eventID), body
 *      (background-image inline style for the photo + Info/Enter/Marshal/Regs
 *      action buttons), and footer (date text like "23 May 2026").
 *   2) Backup: schema.org JSON-LD Event blocks if any page emits them.
 *
 * The `event-bg-N` class on the header/footer is vscc's internal event type
 * code. Observed mapping: 1=Driving Test, 2=Race, 3=Speed, 4=Trial,
 * 5=Rally, 8=Tour, 22=AutoSolo. Anything else falls back to keyword guessing.
 */
import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import { mkdir, readFile, writeFile } from "node:fs/promises";
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

const ORIGIN = "https://www.vscc.co.uk";

const CANDIDATE_PATHS = ["/page/events"];

const USER_AGENT =
  "VSCC-Calendar-Scraper/1.0 (+https://vscc.co.uk; contact: web@vscc.co.uk)";

// event-bg-N codes observed on /page/events. Anything not in this map falls
// through to keyword-based guessing in `categorise()`.
const EVENT_BG_CATEGORY: Record<string, EventCategory> = {
  "1": "autosolo",   // Driving Test — closest fit in our taxonomy
  "2": "race",
  "3": "speed",      // Hillclimb / Sprint
  "4": "trial",
  "5": "rally",
  "8": "tour",
  "22": "autosolo",
};

const CATEGORY_KEYWORDS: Record<EventCategory, string[]> = {
  race: ["race", "racing", "trophy", "circuit", "grand prix"],
  trial: ["trial"],
  tour: ["tour", "touring"],
  rally: ["rally", "navigation", "regularity"],
  autosolo: ["autosolo", "auto solo", "driving test"],
  speed: ["hillclimb", "hill climb", "sprint", "speed"],
  marshalling: ["marshal", "marshall", "training day"],
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
  Midlands: ["silverstone", "shelsley", "mallory", "donington", "leicester", "warwick", "northants", "loton"],
  "South West": ["prescott", "castle combe", "thruxton", "exmoor", "cotswold", "gloucester", "somerset", "devon", "dorset", "cornwall"],
  "North West": ["oulton", "lakeland", "cumbria", "cumbrian", "cheshire", "lancashire", "lancs"],
  "North East": ["elvington", "yorkshire", "harewood", "lincolnshire"],
  Scotland: ["scottish", "perthshire", "highland", "trossachs", "knockhill"],
  Wales: ["welsh", "brecon", "wye", "anglesey"],
  London: ["london", "rac club", "pall mall"],
  "South East": ["goodwood", "brands hatch", "snetterton", "kent", "sussex", "surrey", "hertfordshire", "berkshire", "buckinghamshire", "oxfordshire", "norfolk"],
};

type ScrapedEvent = Omit<RaceEvent, "source"> & { source: "vscc.co.uk" };

type SourceInput = { url: string; html: string; ok: true } | { url: string; ok: false; error: string };

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const inputs: SourceInput[] = [];
  if (args.file) {
    try {
      const html = await readFile(args.file, "utf8");
      inputs.push({ url: `${ORIGIN}/page/events`, html, ok: true });
      console.log(`Reading local sample: ${args.file}`);
    } catch (err) {
      console.error(`Failed to read ${args.file}: ${String(err)}`);
      process.exit(1);
    }
  } else {
    for (const path of CANDIDATE_PATHS) {
      const url = `${ORIGIN}${path}`;
      try {
        const html = await fetchHtml(url);
        inputs.push({ url, html, ok: true });
      } catch (err) {
        inputs.push({ url, ok: false, error: String(err) });
      }
    }
  }

  const collected = new Map<string, ScrapedEvent>();
  const diagnostics: Record<string, unknown> = {};

  for (const input of inputs) {
    if (!input.ok) {
      diagnostics[input.url] = { ok: false, error: input.error };
      continue;
    }
    const $ = cheerio.load(input.html);
    const cards = extractFromVsccCards($, input.url);
    const jsonLd = extractFromJsonLd($, input.url);
    const found = dedupe([...cards, ...jsonLd]);
    diagnostics[input.url] = {
      ok: true,
      cardEvents: cards.length,
      jsonLdEvents: jsonLd.length,
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
  for (const [k, info] of Object.entries(diagnostics)) {
    console.log(`  ${k}: ${JSON.stringify(info)}`);
  }
  if (events.length === 0) {
    console.log(
      "\nNo events parsed. If the live site returned 403, try `npm run scrape -- --file /tmp/vscc-events.html` after saving a copy with curl.",
    );
  }
}

function parseArgs(argv: string[]): { file?: string } {
  const out: { file?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--file" || a === "-f") out.file = argv[++i];
    else if (a.startsWith("--file=")) out.file = a.slice("--file=".length);
  }
  return out;
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

function extractFromVsccCards(
  $: cheerio.CheerioAPI,
  pageUrl: string,
): ScrapedEvent[] {
  const events: ScrapedEvent[] = [];

  $("div.card.h-100").each((_, el) => {
    const card = $(el);
    const header = card.children(".card-header").first();
    const body = card.children(".card-body").first();
    const footer = card.children(".card-footer").first();

    const titleLink = header.find("a").first();
    const title = textOf(titleLink);
    if (!title) return;

    const detailHref = titleLink.attr("href");
    const detailUrl = absolutise(detailHref, pageUrl);
    const eventId = extractEventId(detailHref);

    const startDate = toISODate(textOf(footer));
    if (!startDate) return;

    const bgCode = matchBgCode(header.attr("class")) ??
      matchBgCode(footer.attr("class"));
    const categoryFromBg = bgCode ? EVENT_BG_CATEGORY[bgCode] : undefined;
    const category: EventCategory = categoryFromBg ?? categorise(title);

    const imageUrl = extractBackgroundImage(body.attr("style"), pageUrl);

    const buttons = body.find("a");
    const entryUrl = pickButtonHref(buttons, "fa-key", pageUrl);
    const marshalUrl = pickButtonHref(buttons, "fa-flag-checkered", pageUrl);

    const region = guessRegion(title);
    const venue = guessVenue(title);

    events.push({
      id: eventId ? `vscc-${eventId}` : slugify(`${title}-${startDate}`),
      title,
      startDate,
      venue,
      region,
      category,
      description: "",
      entryUrl: entryUrl ?? detailUrl,
      marshalUrl,
      detailsUrl: detailUrl,
      imageUrl,
      source: "vscc.co.uk",
    });
  });

  return events;
}

function matchBgCode(className: string | undefined): string | undefined {
  if (!className) return undefined;
  const match = className.match(/event-bg-(\d+)/);
  return match?.[1];
}

function extractEventId(href: string | undefined): string | undefined {
  if (!href) return undefined;
  const match = href.match(/eventID=(\d+)/i);
  return match?.[1];
}

function extractBackgroundImage(
  style: string | undefined,
  pageUrl: string,
): string | undefined {
  if (!style) return undefined;
  // background-image: url("...") | url('...') | url(...)
  const match = style.match(/background-image\s*:\s*url\(\s*(?:"|')?([^)"']+)/i);
  return absolutise(match?.[1], pageUrl);
}

/**
 * Returns the href of the first `<a>` whose descendants include an icon
 * matching `iconClass`, but only if it's a real navigable link — links
 * that just open a modal (data-toggle="modal", no href) are skipped.
 */
function pickButtonHref(
  anchors: cheerio.Cheerio<AnyNode>,
  iconClass: string,
  pageUrl: string,
): string | undefined {
  let found: string | undefined;
  anchors.each((_, a) => {
    if (found) return;
    const $a = anchors.eq(anchors.index(a));
    const hasIcon = $a.find(`i.${iconClass}`).length > 0;
    if (!hasIcon) return;
    const href = $a.attr("href");
    if (!href || href === "#" || href.startsWith("javascript:")) return;
    found = absolutise(href, pageUrl);
  });
  return found;
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
    for (const node of flattenLd(parsed)) {
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
  const venue = lookupVenue(node.location) ?? guessVenue(title);
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
      entryUrl: prev.entryUrl ?? ev.entryUrl,
      marshalUrl: prev.marshalUrl ?? ev.marshalUrl,
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

const MONTHS: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

function toISODate(input: string | undefined): string | undefined {
  if (!input) return undefined;
  const trimmed = input.trim();

  // ISO already: 2026-05-23 (optionally with time)
  const iso = trimmed.match(/^\d{4}-\d{2}-\d{2}/);
  if (iso) return iso[0];

  // VSCC card-footer format: "23 May 2026"
  const dm = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (dm) {
    const day = Number(dm[1]);
    const month = MONTHS[dm[2].toLowerCase()];
    const year = Number(dm[3]);
    if (month && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  // Last-resort: Date.parse for anything else (e.g. JSON-LD timestamps)
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

/**
 * VSCC event cards don't carry a venue field — the title is usually either a
 * circuit name (Donington, Mallory Park) or a county-flavoured tour name
 * (Hertfordshire Tour, Cumbrian Tour). For the latter, strip the event-type
 * suffix to leave just the location.
 */
function guessVenue(title: string): string {
  return title
    .replace(/\b(autosolo|hillclimb|hill climb|hill\s+climb|trial|tour|rally|driving tests?|race meeting|sprint|tests?)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim() || title;
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
