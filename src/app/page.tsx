import { RaceCalendar } from "@/components/RaceCalendar";
import { PwaInstall } from "@/components/PwaInstall";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getEvents } from "@/lib/events";
import { parseISODate } from "@/lib/date";

export default function Home() {
  const events = getEvents();
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const next = events.find(
    (e) => parseISODate(e.endDate ?? e.startDate) >= now,
  );

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-[var(--border)] bg-gradient-to-b from-[var(--brg)] to-[var(--brg-dark)] text-white">
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 30%, white 1px, transparent 1.5px), radial-gradient(circle at 70% 70%, white 1px, transparent 1.5px)",
              backgroundSize: "42px 42px, 64px 64px",
            }}
          />
          <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">
              Season 2026 · Race Calendar
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold leading-tight sm:text-5xl">
              Every VSCC fixture,
              <br />
              from spring shake-downs to autumn trials.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">
              A modern calendar for the Vintage Sports-Car Club — race meetings,
              speed hillclimbs, classic trials, tours, AutoSolos and rallies.
              Works on the desktop and installs as a Progressive Web App on
              iPhone and Android for offline access at the paddock.
            </p>
            {next && (
              <div className="mt-6 inline-flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm ring-1 ring-white/20">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                  Next up
                </span>
                <span className="hidden h-4 w-px bg-white/30 sm:inline-block" />
                <span className="font-display text-base font-semibold">
                  {next.title}
                </span>
                <span className="hidden text-xs text-white/70 sm:inline">
                  · {next.venue}
                </span>
              </div>
            )}
          </div>
        </section>

        <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
          <PwaInstall />
          <RaceCalendar events={events} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
