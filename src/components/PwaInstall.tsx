"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    const mq = window.matchMedia("(display-mode: standalone)");
    const onStandaloneChange = () => setIsStandalone(mq.matches);

    queueMicrotask(() => {
      setIsIOS(
        /iPad|iPhone|iPod/.test(navigator.userAgent) &&
          !("MSStream" in window),
      );
      setIsStandalone(
        mq.matches ||
          (navigator as Navigator & { standalone?: boolean }).standalone ===
            true,
      );
    });

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => undefined);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    mq.addEventListener?.("change", onStandaloneChange);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      mq.removeEventListener?.("change", onStandaloneChange);
    };
  }, []);

  if (isStandalone || installed) return null;

  return (
    <div
      id="install"
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--brg)]/10 text-[var(--brg)]"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v12" />
              <path d="m7 10 5 5 5-5" />
              <path d="M5 21h14" />
            </svg>
          </span>
          <div>
            <p className="font-display text-base font-semibold text-[var(--ink)]">
              Install the VSCC Race Calendar
            </p>
            <p className="mt-0.5 text-sm text-[var(--ink-muted)]">
              {isIOS
                ? "On iPhone, tap the Share button in Safari, then “Add to Home Screen”."
                : deferred
                ? "Add to your home screen for offline access to upcoming events."
                : "Use your browser’s “Install app” menu to add it to your home screen."}
            </p>
          </div>
        </div>
        {deferred && !isIOS && (
          <button
            type="button"
            onClick={async () => {
              await deferred.prompt();
              const choice = await deferred.userChoice;
              if (choice.outcome === "accepted") setDeferred(null);
            }}
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--brg)] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-[var(--brg-dark)]"
          >
            Install
          </button>
        )}
      </div>
    </div>
  );
}
