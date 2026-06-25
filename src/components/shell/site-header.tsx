"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { MobileNavSheet } from "@/components/shell/mobile-nav-sheet";
import { ThemeSwitcher } from "@/components/shell/theme-switcher";
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

const NAV_LINKS = [
  { href: "/browse", label: "Collection" },
  { href: "/portal", label: "Portal" },
  { href: "/map", label: "Map" },
  { href: "/timeline", label: "Timeline" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader({ initialTheme }: { initialTheme: Theme }) {
  const pathname = usePathname() ?? "/";
  const launchEnabled = process.env.NEXT_PUBLIC_LAUNCH_ENABLED === "true";

  return (
    <header className="sticky top-0 z-20 w-full border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-6">
        <Link
          href="/"
          className="font-heading text-lg font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded"
        >
          living<span className="text-primary">ATL</span>
        </Link>

        <div className="flex items-center gap-3">
          {launchEnabled ? (
            <>
              <nav aria-label="Primary" className="hidden md:block">
                <ul className="flex items-center gap-6">
                  {NAV_LINKS.map((link) => {
                    const active = isActive(pathname, link.href);
                    return (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "font-mono text-xs tracking-[0.18em] uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded",
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
              <div className="md:hidden">
                <MobileNavSheet links={NAV_LINKS} />
              </div>
            </>
          ) : null}
          <ThemeSwitcher initialTheme={initialTheme} />
        </div>
      </div>
    </header>
  );
}
