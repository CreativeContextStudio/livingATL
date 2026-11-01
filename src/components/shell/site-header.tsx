"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { MobileNavSheet } from "@/components/shell/mobile-nav-sheet";
import { SectionTabs } from "@/components/shell/section-tabs";
import { ThemeSwitcher } from "@/components/shell/theme-switcher";
import { NAV_SECTIONS, activeSection } from "@/lib/site-nav";
import type { Theme } from "@/lib/theme";

/**
 * Global header rendered in `src/app/layout.tsx`. One sticky bar across
 * every route so Collection → Map → Player navigation reads as one
 * product instead of four disconnected surfaces. Visual spec follows
 * Atlanta Brand System §6: "living" + coral "ATL" wordmark on the left,
 * DM Sans uppercase-tracked links on the right.
 *
 * Launch-gate aware: during preview mode (`NEXT_PUBLIC_LAUNCH_ENABLED`
 * not "true"), the proxy rewrites every nav target to `/preview`, so we
 * render logo-only until the launch flag flips. `src/proxy.ts` is still
 * the enforcement point — this is purely a visual decision.
 */

export function SiteHeader({
  initialTheme,
  navEnabled,
}: {
  initialTheme: Theme;
  /** Visitor can reach the archive surfaces (src/lib/access.ts). The gate
   *  cookie is httpOnly, so the server layout resolves this. */
  navEnabled: boolean;
}) {
  const section = activeSection(usePathname() ?? "/");

  return (
    <>
    <header className="sticky top-0 z-20 w-full print:hidden border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-6">
        <Link
          href="/"
          className="font-heading text-lg font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          living<span className="text-primary-ink">ATL</span>
        </Link>

        <div className="flex items-center gap-3">
          {navEnabled ? (
            <>
              <nav aria-label="Primary" className="hidden sm:block">
                <ul className="flex items-center gap-6">
                  {NAV_SECTIONS.map((link) => {
                    const active = link.href === section?.href;
                    return (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          aria-current={active ? "true" : undefined}
                          className={cn(
                            "inline-flex h-11 items-center font-mono text-xs tracking-[0.18em] uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded",
                            active
                              ? "text-foreground"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {link.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
              <div className="sm:hidden">
                <MobileNavSheet links={NAV_SECTIONS} />
              </div>
            </>
          ) : null}
          <ThemeSwitcher initialTheme={initialTheme} />
        </div>
      </div>
    </header>
    {navEnabled ? <SectionTabs /> : null}
    </>
  );
}
