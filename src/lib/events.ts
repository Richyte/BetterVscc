export const EVENT_CATEGORIES = [
  "race",
  "trial",
  "tour",
  "rally",
  "autosolo",
  "speed",
  "marshalling",
  "social",
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export type RaceEvent = {
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
};

export const CATEGORY_META: Record<
  EventCategory,
  { label: string; dot: string; chip: string; ring: string }
> = {
  race: {
    label: "Race Meeting",
    dot: "bg-[var(--brg)]",
    chip: "bg-[var(--brg)]/10 text-[var(--brg)] ring-[var(--brg)]/30",
    ring: "ring-[var(--brg)]/40",
  },
  trial: {
    label: "Trial",
    dot: "bg-amber-700",
    chip: "bg-amber-700/10 text-amber-800 ring-amber-700/30",
    ring: "ring-amber-700/40",
  },
  tour: {
    label: "Tour",
    dot: "bg-sky-700",
    chip: "bg-sky-700/10 text-sky-800 ring-sky-700/30",
    ring: "ring-sky-700/40",
  },
  rally: {
    label: "Rally",
    dot: "bg-rose-700",
    chip: "bg-rose-700/10 text-rose-800 ring-rose-700/30",
    ring: "ring-rose-700/40",
  },
  autosolo: {
    label: "AutoSolo",
    dot: "bg-violet-700",
    chip: "bg-violet-700/10 text-violet-800 ring-violet-700/30",
    ring: "ring-violet-700/40",
  },
  speed: {
    label: "Speed Event",
    dot: "bg-orange-700",
    chip: "bg-orange-700/10 text-orange-800 ring-orange-700/30",
    ring: "ring-orange-700/40",
  },
  marshalling: {
    label: "Marshalling",
    dot: "bg-slate-700",
    chip: "bg-slate-700/10 text-slate-800 ring-slate-700/30",
    ring: "ring-slate-700/40",
  },
  social: {
    label: "Social",
    dot: "bg-emerald-700",
    chip: "bg-emerald-700/10 text-emerald-800 ring-emerald-700/30",
    ring: "ring-emerald-700/40",
  },
};

export const SEED_EVENTS: RaceEvent[] = [
  {
    id: "vscc-spring-start-mallory",
    title: "Spring Start Race Meeting",
    startDate: "2026-05-23",
    endDate: "2026-05-23",
    venue: "Mallory Park, Leicestershire",
    region: "Midlands",
    category: "race",
    description:
      "The traditional season-opening race meeting featuring the Melville Trophy, Geoghegan Trophy and Pre-War Sports Cars.",
    entryUrl: "https://vscc.co.uk",
    marshalUrl: "https://vscc.co.uk",
  },
  {
    id: "lakeland-trial",
    title: "Lakeland Trial",
    startDate: "2026-06-06",
    venue: "Cumbrian Fells",
    region: "North West",
    category: "trial",
    description:
      "A long-standing classic trial across the steep, rocky sections of the Lake District.",
    entryUrl: "https://vscc.co.uk",
  },
  {
    id: "cotswolds-tour",
    title: "Cotswolds Summer Tour",
    startDate: "2026-06-13",
    endDate: "2026-06-14",
    venue: "Chipping Campden, Gloucestershire",
    region: "South West",
    category: "tour",
    description:
      "A relaxed two-day tour of the Cotswold villages with a Saturday lunch stop and an overnight rendezvous.",
    detailsUrl: "https://vscc.co.uk",
  },
  {
    id: "shelsley-walsh-speed",
    title: "Shelsley Walsh Speed Hillclimb",
    startDate: "2026-06-20",
    venue: "Shelsley Walsh, Worcestershire",
    region: "Midlands",
    category: "speed",
    description:
      "The world's oldest motorsport venue still in use. Bring your timing chip and a sturdy pair of nerves.",
    entryUrl: "https://vscc.co.uk",
    marshalUrl: "https://vscc.co.uk",
  },
  {
    id: "silverstone-formula-vintage",
    title: "Formula Vintage at Silverstone",
    startDate: "2026-07-04",
    endDate: "2026-07-05",
    venue: "Silverstone Circuit, Northamptonshire",
    region: "Midlands",
    category: "race",
    description:
      "Two days of pre-war and pre-1961 racing on the GP loop. The Williams Trophy and Boulogne Trophy headline.",
    entryUrl: "https://vscc.co.uk",
    marshalUrl: "https://vscc.co.uk",
  },
  {
    id: "yorkshire-autosolo",
    title: "Yorkshire AutoSolo",
    startDate: "2026-07-11",
    venue: "Elvington Airfield, North Yorkshire",
    region: "North East",
    category: "autosolo",
    description:
      "Low-speed precision driving tests on a sealed airfield surface. Open to all members.",
    entryUrl: "https://vscc.co.uk",
  },
  {
    id: "scottish-rally",
    title: "Scottish Rally",
    startDate: "2026-07-25",
    endDate: "2026-07-26",
    venue: "Perthshire & The Trossachs",
    region: "Scotland",
    category: "rally",
    description:
      "A navigational rally weekend through the Highlands with timed regularity sections and overnight stops.",
    entryUrl: "https://vscc.co.uk",
  },
  {
    id: "prescott-august",
    title: "Prescott August Speed",
    startDate: "2026-08-08",
    endDate: "2026-08-09",
    venue: "Prescott Hill, Gloucestershire",
    region: "South West",
    category: "speed",
    description:
      "VSCC speed hillclimb at the Bugatti Owners' Club's home. Practice Saturday, timed runs Sunday.",
    entryUrl: "https://vscc.co.uk",
    marshalUrl: "https://vscc.co.uk",
  },
  {
    id: "oulton-park-gold-cup",
    title: "Oulton Park Gold Cup",
    startDate: "2026-08-29",
    endDate: "2026-08-31",
    venue: "Oulton Park, Cheshire",
    region: "North West",
    category: "race",
    description:
      "Three days of historic racing over the August bank holiday. Camping available; bring a hat.",
    entryUrl: "https://vscc.co.uk",
    marshalUrl: "https://vscc.co.uk",
  },
  {
    id: "welsh-tour",
    title: "Welsh Borders Tour",
    startDate: "2026-09-12",
    endDate: "2026-09-13",
    venue: "Brecon Beacons & Wye Valley",
    region: "Wales",
    category: "tour",
    description:
      "A leisurely tour of the Welsh borderlands. Curated route book, optional B-road detours.",
    detailsUrl: "https://vscc.co.uk",
  },
  {
    id: "marshals-training-day",
    title: "Marshals' Training Day",
    startDate: "2026-09-19",
    venue: "Curborough Sprint Course, Staffordshire",
    region: "Midlands",
    category: "marshalling",
    description:
      "Annual training day for new and returning marshals. Lunch and tabards provided.",
    detailsUrl: "https://vscc.co.uk",
  },
  {
    id: "autumn-dinner",
    title: "Autumn Members' Dinner",
    startDate: "2026-10-10",
    venue: "RAC Club, Pall Mall, London",
    region: "London",
    category: "social",
    description:
      "Black-tie dinner with guest speaker and the annual trophy presentations.",
    detailsUrl: "https://vscc.co.uk",
  },
  {
    id: "exmoor-trial",
    title: "Exmoor Classic Trial",
    startDate: "2026-11-07",
    venue: "Exmoor, Somerset",
    region: "South West",
    category: "trial",
    description:
      "Late-season classic trial across the wet, mossy hills of Exmoor. Stout boots advised.",
    entryUrl: "https://vscc.co.uk",
  },
];

export function getEvents(): RaceEvent[] {
  return [...SEED_EVENTS].sort((a, b) =>
    a.startDate.localeCompare(b.startDate),
  );
}
