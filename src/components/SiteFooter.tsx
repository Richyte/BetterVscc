export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-[var(--border)] bg-[var(--surface-muted)]">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-[var(--ink-muted)] sm:px-6 md:grid-cols-3">
        <div>
          <p className="font-display text-base font-semibold text-[var(--ink)]">
            Vintage Sports-Car Club
          </p>
          <p className="mt-2 max-w-sm">
            The home of pre-war and historic motorsport in the UK. Race
            meetings, trials, tours, rallies and speed events through the
            season.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink)]">
            Get involved
          </p>
          <ul className="mt-3 space-y-1.5">
            <li>Enter an event</li>
            <li>Volunteer to marshal</li>
            <li>Become a member</li>
            <li>Join the forum</li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink)]">
            This site
          </p>
          <p className="mt-3">
            A modern, mobile-first race calendar. Installable as a Progressive
            Web App on iOS and Android.
          </p>
          <p className="mt-3 text-xs text-[var(--ink-muted)]/80">
            © {new Date().getFullYear()} VSCC. Event details for illustration —
            consult the club for entry information.
          </p>
        </div>
      </div>
    </footer>
  );
}
