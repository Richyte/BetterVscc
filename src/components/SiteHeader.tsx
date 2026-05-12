import Link from "next/link";

const NAV = [
  { label: "Calendar", href: "/" },
  { label: "News", href: "#news" },
  { label: "Join In", href: "#join" },
  { label: "About", href: "#about" },
  { label: "Trophies", href: "#trophies" },
  { label: "Contact", href: "#contact" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/85 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface)]/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid h-9 w-9 place-items-center rounded-full bg-[var(--brg)] text-[10px] font-bold tracking-widest text-white shadow-sm"
          >
            VSCC
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-display text-base font-semibold text-[var(--ink)] sm:text-lg">
              Vintage Sports-Car Club
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-muted)] sm:text-[11px]">
              Founded 1934 · Race Calendar
            </span>
          </span>
        </Link>
        <nav className="hidden md:block">
          <ul className="flex items-center gap-1 text-sm font-medium text-[var(--ink)]">
            {NAV.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="rounded-full px-3 py-1.5 transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--brg)]"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <a
          href="#install"
          className="hidden sm:inline-flex items-center gap-2 rounded-full bg-[var(--brg)] px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-[var(--brg-dark)]"
        >
          Install App
        </a>
      </div>
    </header>
  );
}
