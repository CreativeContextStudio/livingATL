"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { sectionTabs } from "@/lib/site-nav";
import { cn } from "@/lib/utils";

/**
 * The pages inside a nav section, as a quiet row under the header. It scrolls
 * away with the page, so nothing that sticks below the header has to allow
 * for it.
 */
export function SectionTabs() {
  const current = sectionTabs(usePathname() ?? "/");
  if (!current) return null;
  return (
    <nav data-section-tabs="" aria-label={current.section.label} className="w-full border-b border-border/60 print:hidden">
      <ul className="page-container flex items-center gap-6 overflow-x-auto scrollbar-soft">
        {current.tabs.map((tab) => {
          const active = tab.href === current.active.href;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px flex h-11 shrink-0 items-center whitespace-nowrap border-b-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "border-primary font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
