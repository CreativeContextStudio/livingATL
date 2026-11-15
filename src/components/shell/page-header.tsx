import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The intro block at the top of a page: an optional eyebrow (label or
 * breadcrumb), the page's one h1, and an optional lead paragraph and meta
 * line. It has no max-width, so it spans the full `page-container` and lines
 * up with the site header and footer on every breakpoint.
 *
 * `hero` is the front door's display size; `page` is every other route.
 * Headings use fluid type with `text-balance`, so they fill the width on
 * desktop without leaving a one-word last line.
 */

const TITLE = {
  hero: "text-[clamp(2.5rem,1rem+5.6vw,6.5rem)] leading-[1]",
  page: "text-[clamp(2.25rem,1.6rem+2.6vw,4rem)] leading-[1.05]",
} as const;

const LEAD = {
  hero: "text-base sm:text-lg text-foreground/85",
  page: "text-base text-muted-foreground",
} as const;

/** h1 classes, for pages that lay out their own header row. */
export function titleClass(variant: keyof typeof TITLE = "page") {
  return cn("font-heading font-bold tracking-tight text-balance", TITLE[variant]);
}

/** Lead-paragraph classes, for leads that carry their own markup (links). */
export function leadClass(variant: keyof typeof LEAD = "page") {
  return cn("leading-relaxed text-pretty", LEAD[variant]);
}

export function PageHeader({
  title,
  eyebrow,
  lead,
  meta,
  variant = "page",
  accentBar = false,
  titleClassName,
  titleSlot,
  className,
  children,
}: {
  title: ReactNode;
  /** Label or breadcrumb above the title. Strings render in the shared eyebrow style. */
  eyebrow?: ReactNode;
  lead?: ReactNode;
  /** Small secondary line under the lead (counts, dates). */
  meta?: ReactNode;
  variant?: keyof typeof TITLE;
  /** The coral bar before the eyebrow (home, player). */
  accentBar?: boolean;
  titleClassName?: string;
  /** Rendered beside the title on the same row (e.g. a colour dot). */
  titleSlot?: ReactNode;
  className?: string;
  /** Extra content at the end of the header (actions, badges). */
  children?: ReactNode;
}) {
  const heading = (
    <h1
      className={cn(titleClass(variant), titleClassName)}
    >
      {title}
    </h1>
  );

  return (
    <header className={cn("flex w-full flex-col gap-3 sm:gap-4", className)}>
      {eyebrow || accentBar ? (
        <div className="flex min-w-0 items-center gap-3">
          {accentBar ? (
            <div aria-hidden className="h-1.5 w-20 shrink-0 rounded-full bg-primary" />
          ) : null}
          {typeof eyebrow === "string" ? <p className="eyebrow">{eyebrow}</p> : eyebrow}
        </div>
      ) : null}
      {titleSlot ? (
        <div className="flex items-center gap-3">
          {titleSlot}
          {heading}
        </div>
      ) : (
        heading
      )}
      {lead ? (
        typeof lead === "string" ? (
          <p className={leadClass(variant)}>{lead}</p>
        ) : (
          lead
        )
      ) : null}
      {meta ? <div className="text-sm text-muted-foreground">{meta}</div> : null}
      {children}
    </header>
  );
}
