"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CATEGORY_META,
  EVENT_CATEGORIES,
  type EventCategory,
  type RaceEvent,
} from "@/lib/events";
import {
  WEEKDAY_LABELS_SHORT,
  MONTH_LABELS,
  addMonths,
  buildMonthGrid,
  eventOccursOn,
  formatDateRange,
  isSameDay,
  isSameMonth,
  parseISODate,
  startOfMonth,
  toISODate,
} from "@/lib/date";

type ViewMode = "month" | "agenda";

type Props = {
  events: RaceEvent[];
};

function useViewMode(): [ViewMode, (m: ViewMode) => void] {
  const [view, setView] = useState<ViewMode>("agenda");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setView(mq.matches ? "month" : "agenda");
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);
  return [view, setView];
}

export function RaceCalendar({ events }: Props) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const firstEventMonth = useMemo(() => {
    const upcoming = events.find(
      (e) => parseISODate(e.endDate ?? e.startDate).getTime() >= today.getTime(),
    );
    return startOfMonth(parseISODate(upcoming?.startDate ?? toISODate(today)));
  }, [events, today]);

  const [cursor, setCursor] = useState<Date>(firstEventMonth);
  const [activeCategories, setActiveCategories] = useState<Set<EventCategory>>(
    () => new Set(EVENT_CATEGORIES),
  );
  const [view, setView] = useViewMode();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const filteredEvents = useMemo(
    () => events.filter((e) => activeCategories.has(e.category)),
    [events, activeCategories],
  );

  const monthEvents = useMemo(
    () =>
      filteredEvents.filter((e) => {
        const start = parseISODate(e.startDate);
        const end = parseISODate(e.endDate ?? e.startDate);
        const monthStart = startOfMonth(cursor);
        const monthEnd = new Date(
          cursor.getFullYear(),
          cursor.getMonth() + 1,
          0,
        );
        return end >= monthStart && start <= monthEnd;
      }),
    [filteredEvents, cursor],
  );

  const upcomingEvents = useMemo(
    () =>
      filteredEvents.filter(
        (e) =>
          parseISODate(e.endDate ?? e.startDate).getTime() >= today.getTime(),
      ),
    [filteredEvents, today],
  );

  function toggleCategory(c: EventCategory) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }

  const monthGrid = buildMonthGrid(cursor);
  const monthLabel = `${MONTH_LABELS[cursor.getMonth()]} ${cursor.getFullYear()}`;

  return (
    <section className="space-y-6">
      <Toolbar
        view={view}
        setView={setView}
        cursor={cursor}
        setCursor={setCursor}
        monthLabel={monthLabel}
        today={today}
      />

      <CategoryFilter
        active={activeCategories}
        toggle={toggleCategory}
        onAll={() => setActiveCategories(new Set(EVENT_CATEGORIES))}
        onNone={() => setActiveCategories(new Set())}
      />

      {view === "month" ? (
        <MonthGrid
          monthGrid={monthGrid}
          cursor={cursor}
          today={today}
          events={monthEvents}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      ) : (
        <AgendaList events={upcomingEvents} today={today} />
      )}

      {view === "month" && selectedDate && (
        <DayDetails
          date={selectedDate}
          events={filteredEvents.filter((e) =>
            eventOccursOn(selectedDate, e.startDate, e.endDate),
          )}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </section>
  );
}

function Toolbar({
  view,
  setView,
  cursor,
  setCursor,
  monthLabel,
  today,
}: {
  view: ViewMode;
  setView: (v: ViewMode) => void;
  cursor: Date;
  setCursor: (d: Date) => void;
  monthLabel: string;
  today: Date;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setCursor(addMonths(cursor, -1))}
          aria-label="Previous month"
          className="grid h-9 w-9 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] transition-colors hover:bg-[var(--surface-muted)]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18 9 12l6-6" /></svg>
        </button>
        <button
          type="button"
          onClick={() => setCursor(startOfMonth(today))}
          className="hidden sm:inline-flex h-9 items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-semibold uppercase tracking-wider text-[var(--ink)] transition-colors hover:bg-[var(--surface-muted)]"
        >
          Today
        </button>
        <h2 className="font-display text-xl font-semibold text-[var(--ink)] sm:text-2xl">
          {monthLabel}
        </h2>
        <button
          type="button"
          onClick={() => setCursor(addMonths(cursor, 1))}
          aria-label="Next month"
          className="grid h-9 w-9 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] transition-colors hover:bg-[var(--surface-muted)]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
        </button>
      </div>

      <div
        role="tablist"
        aria-label="View mode"
        className="inline-flex self-start rounded-full border border-[var(--border)] bg-[var(--surface)] p-1 text-xs font-semibold uppercase tracking-wider sm:self-auto"
      >
        {(["agenda", "month"] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            role="tab"
            aria-selected={view === mode}
            type="button"
            onClick={() => setView(mode)}
            className={`rounded-full px-3 py-1.5 transition-colors ${
              view === mode
                ? "bg-[var(--brg)] text-white shadow-sm"
                : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
            }`}
          >
            {mode === "agenda" ? "Agenda" : "Month"}
          </button>
        ))}
      </div>
    </div>
  );
}

function CategoryFilter({
  active,
  toggle,
  onAll,
  onNone,
}: {
  active: Set<EventCategory>;
  toggle: (c: EventCategory) => void;
  onAll: () => void;
  onNone: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {EVENT_CATEGORIES.map((c) => {
        const meta = CATEGORY_META[c];
        const isOn = active.has(c);
        return (
          <button
            key={c}
            type="button"
            onClick={() => toggle(c)}
            aria-pressed={isOn}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-all ${
              isOn
                ? `${meta.chip} ring-inset`
                : "bg-[var(--surface)] text-[var(--ink-muted)] ring-[var(--border)] opacity-60 hover:opacity-100"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${meta.dot} ${isOn ? "" : "opacity-50"}`}
            />
            {meta.label}
          </button>
        );
      })}
      <span className="mx-1 hidden h-4 w-px bg-[var(--border)] sm:inline-block" />
      <button
        type="button"
        onClick={onAll}
        className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)] hover:text-[var(--ink)]"
      >
        All
      </button>
      <span className="text-[var(--border)]">·</span>
      <button
        type="button"
        onClick={onNone}
        className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)] hover:text-[var(--ink)]"
      >
        None
      </button>
    </div>
  );
}

function MonthGrid({
  monthGrid,
  cursor,
  today,
  events,
  selectedDate,
  onSelectDate,
}: {
  monthGrid: Date[];
  cursor: Date;
  today: Date;
  events: RaceEvent[];
  selectedDate: Date | null;
  onSelectDate: (d: Date | null) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--surface-muted)] text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-muted)] sm:text-xs">
        {WEEKDAY_LABELS_SHORT.map((d) => (
          <div key={d} className="px-2 py-2 text-center">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {monthGrid.map((day, i) => {
          const dayEvents = events.filter((e) =>
            eventOccursOn(day, e.startDate, e.endDate),
          );
          const inMonth = isSameMonth(day, cursor);
          const isToday = isSameDay(day, today);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          return (
            <button
              key={i}
              type="button"
              onClick={() =>
                onSelectDate(isSelected ? null : day)
              }
              className={`relative flex min-h-[68px] flex-col items-stretch border-b border-r border-[var(--border)] px-1.5 py-1 text-left transition-colors sm:min-h-[110px] sm:px-2 sm:py-1.5 ${
                inMonth
                  ? "bg-[var(--surface)]"
                  : "bg-[var(--surface-muted)]/60 text-[var(--ink-muted)]"
              } ${isSelected ? "ring-2 ring-inset ring-[var(--brg)]" : "hover:bg-[var(--surface-muted)]"}`}
            >
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  isToday
                    ? "bg-[var(--brg)] text-white"
                    : inMonth
                    ? "text-[var(--ink)]"
                    : "text-[var(--ink-muted)]"
                }`}
              >
                {day.getDate()}
              </span>
              <ul className="mt-1 hidden flex-1 space-y-0.5 sm:block">
                {dayEvents.slice(0, 3).map((e) => {
                  const m = CATEGORY_META[e.category];
                  return (
                    <li
                      key={e.id}
                      className={`flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-[11px] font-medium ${m.chip}`}
                    >
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${m.dot}`} />
                      <span className="truncate">{e.title}</span>
                    </li>
                  );
                })}
                {dayEvents.length > 3 && (
                  <li className="px-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                    +{dayEvents.length - 3} more
                  </li>
                )}
              </ul>
              {dayEvents.length > 0 && (
                <span className="mt-auto flex flex-wrap gap-0.5 sm:hidden">
                  {dayEvents.slice(0, 4).map((e) => (
                    <span
                      key={e.id}
                      aria-label={e.title}
                      className={`h-1.5 w-1.5 rounded-full ${CATEGORY_META[e.category].dot}`}
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AgendaList({
  events,
  today,
}: {
  events: RaceEvent[];
  today: Date;
}) {
  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--ink-muted)]">
        No upcoming events match the current filters.
      </div>
    );
  }

  const groups = events.reduce<Record<string, RaceEvent[]>>((acc, e) => {
    const d = parseISODate(e.startDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    (acc[key] ??= []).push(e);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([key, group]) => {
        const [y, m] = key.split("-").map(Number);
        return (
          <div key={key}>
            <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--ink-muted)]">
              {MONTH_LABELS[m - 1]} {y}
            </h3>
            <ul className="space-y-2">
              {group.map((e) => (
                <EventCard key={e.id} event={e} today={today} />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function EventCard({ event, today }: { event: RaceEvent; today: Date }) {
  const meta = CATEGORY_META[event.category];
  const start = parseISODate(event.startDate);
  const isPast =
    parseISODate(event.endDate ?? event.startDate).getTime() < today.getTime();

  return (
    <li
      className={`group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5 ${isPast ? "opacity-60" : ""}`}
    >
      <div className="flex gap-4">
        <div
          className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-[var(--surface-muted)] ring-1 ${meta.ring}`}
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-muted)]">
            {start.toLocaleDateString("en-GB", { month: "short" })}
          </span>
          <span className="font-display text-2xl font-bold leading-none text-[var(--ink)]">
            {start.getDate()}
          </span>
          <span className="text-[9px] font-medium uppercase tracking-wider text-[var(--ink-muted)]">
            {start.toLocaleDateString("en-GB", { weekday: "short" })}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset ${meta.chip}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
              {meta.label}
            </span>
            {event.region && (
              <span className="text-[11px] uppercase tracking-wider text-[var(--ink-muted)]">
                {event.region}
              </span>
            )}
          </div>
          <h4 className="mt-1.5 font-display text-lg font-semibold leading-tight text-[var(--ink)]">
            {event.title}
          </h4>
          <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
            {formatDateRange(event.startDate, event.endDate)} · {event.venue}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--ink)]/85">
            {event.description}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {event.entryUrl && (
              <a
                href={event.entryUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full bg-[var(--brg)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-[var(--brg-dark)]"
              >
                Enter
              </a>
            )}
            {event.marshalUrl && (
              <a
                href={event.marshalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--ink)] transition-colors hover:bg-[var(--surface-muted)]"
              >
                Marshal
              </a>
            )}
            {event.detailsUrl && !event.entryUrl && (
              <a
                href={event.detailsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--ink)] transition-colors hover:bg-[var(--surface-muted)]"
              >
                Details
              </a>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

function DayDetails({
  date,
  events,
  onClose,
}: {
  date: Date;
  events: RaceEvent[];
  onClose: () => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-[var(--ink)]">
          {date.toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)] hover:text-[var(--ink)]"
        >
          Close
        </button>
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-[var(--ink-muted)]">
          No events on this day.
        </p>
      ) : (
        <ul className="space-y-2">
          {events.map((e) => (
            <EventCard key={e.id} event={e} today={today} />
          ))}
        </ul>
      )}
    </div>
  );
}
