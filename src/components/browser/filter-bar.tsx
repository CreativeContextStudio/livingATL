"use client";

import {
  useCallback,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import {
  type CategoryStyle,
  historicalEventStyle,
  humanizeCategory,
  neighborhoodStyle,
  organizationStyle,
  themeStyle,
} from "@/components/shared/category-colors";
import { cn } from "@/lib/utils";
import type { BrowserFacet, BrowserFacets } from "@/lib/queries/recordings";

const COLLAPSED_COUNT = 8;

type FilterKey =
  | "decade"
  | "neighborhood"
  | "theme"
  | "org_cat"
  | "event_cat";

/** Single style applied to every era/decade chip — eras don't carry
 *  per-value semantic color in the collection cards (they render as plain
 *  footer text), so all era chips share one neutral stone tint that reads
 *  as "time / permanence" without competing with the categorical chips. */
const ERA_STYLE: CategoryStyle = {
  bg: "bg-stone-500/10",
  text: "text-stone-700 dark:text-stone-300",
  border: "border-stone-500/30",
  label: "",
};

/** Resolves the category-color style for a chip based on its facet key,
 *  matching the same color helpers `RecordingCard` uses on the Collection
 *  page. Keeps the filter chips visually parity-locked to the cards they
 *  filter so a user reading one can recognize the other instantly. */
function chipStyleForKey(
  paramKey: FilterKey,
  value: string,
): CategoryStyle {
  switch (paramKey) {
    case "neighborhood":
      return neighborhoodStyle(value);
    case "theme":
      return themeStyle(value);
    case "org_cat":
      return organizationStyle(value);
    case "event_cat":
      return historicalEventStyle(value);
    case "decade":
      return ERA_STYLE;
  }
}

type FilterBarProps = {
  facets: BrowserFacets;
  active: {
    decade?: string;
    neighborhood?: string;
    theme?: string;
    org_cat?: string;
    event_cat?: string;
  };
};

/** Filter keys whose values are the snake_case category slugs from
 *  scripts/config.py. Rendered through `humanizeCategory` for readability. */
const CATEGORY_KEYS = new Set<FilterKey>(["org_cat", "event_cat"]);

/** Human-readable labels for active-filter chips. */
function keyLabel(key: FilterKey): string {
  switch (key) {
    case "decade":
      return "era";
    case "neighborhood":
      return "neighborhood";
    case "theme":
      return "theme";
    case "org_cat":
      return "orgs";
    case "event_cat":
      return "events";
  }
}

export type { FilterKey, FilterBarProps };

export { FilterGroup, ActiveFilterStrip, keyLabel };

export function FilterBar({ facets, active }: FilterBarProps) {
  return (
    <div className="flex flex-col gap-5 rounded-xl border border-border bg-card/60 p-5">
      <FilterGroup
        label="Era of content"
        paramKey="decade"
        options={facets.decades}
        activeValue={active.decade}
      />
      <FilterGroup
        label="Neighborhood"
        paramKey="neighborhood"
        options={facets.neighborhoods}
        activeValue={active.neighborhood}
      />
      <FilterGroup
        label="Theme"
        paramKey="theme"
        options={facets.themes}
        activeValue={active.theme}
      />
      <FilterGroup
        label="Organizations"
        paramKey="org_cat"
        options={facets.orgCategories}
        activeValue={active.org_cat}
      />
      <FilterGroup
        label="Historical events"
        paramKey="event_cat"
        options={facets.eventCategories}
        activeValue={active.event_cat}
      />
      <ActiveFilterStrip active={active} />
    </div>
  );
}

function FilterGroup({
  label,
  paramKey,
  options,
  activeValue,
}: {
  label: string;
  paramKey: FilterKey;
  options: BrowserFacet[];
  activeValue?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? options : options.slice(0, COLLAPSED_COUNT);
  const moreCount = Math.max(0, options.length - COLLAPSED_COUNT);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h3 className="font-heading text-xs font-semibold tracking-[0.12em] text-foreground uppercase">
          {label}
        </h3>
        {options.length > COLLAPSED_COUNT && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            {expanded ? "Show fewer" : `Show ${moreCount} more`}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {shown.map((opt) => (
          <FilterChip
            key={opt.value}
            paramKey={paramKey}
            option={opt}
            active={opt.value === activeValue}
          />
        ))}
      </div>
    </div>
  );
}

function FilterChip({
  paramKey,
  option,
  active,
}: {
  paramKey: FilterKey;
  option: BrowserFacet;
  active: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // Transient override so the chip's pressed state flips instantly on click,
  // without waiting for the RSC round-trip to return fresh props. Cleared
  // during render once the prop-derived `active` changes (either catching
  // up to our optimistic value, or externally via a "Clear all").
  const [transientActive, setTransientActive] = useState<boolean | null>(null);
  const [lastSeenActive, setLastSeenActive] = useState(active);
  if (active !== lastSeenActive) {
    setLastSeenActive(active);
    setTransientActive(null);
  }
  const displayActive = transientActive ?? active;

  const label = useMemo(() => {
    if (CATEGORY_KEYS.has(paramKey)) return humanizeCategory(option.value);
    return option.value.replace(/_/g, " ");
  }, [option.value, paramKey]);

  const onClick = useCallback(() => {
    const next = !active;
    setTransientActive(next);
    const params = new URLSearchParams(searchParams.toString());
    if (active) {
      params.delete(paramKey);
    } else {
      params.set(paramKey, option.value);
    }
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }, [active, option.value, paramKey, pathname, router, searchParams]);

  const style = chipStyleForKey(paramKey, option.value);

  return (
    <button
      type="button"
      onClick={onClick}
      className="transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-4xl"
      aria-pressed={displayActive}
    >
      <Badge
        variant="outline"
        className={cn(
          style.bg,
          style.border,
          style.text,
          displayActive &&
            "ring-2 ring-current ring-offset-1 ring-offset-background",
        )}
      >
        {label}
        <span className="ml-1 text-[10px] opacity-60">{option.count}</span>
      </Badge>
    </button>
  );
}

function ActiveFilterStrip({
  active,
}: {
  active: FilterBarProps["active"];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const activeEntries = (Object.entries(active) as Array<
    [FilterKey, string | undefined]
  >).filter(([, v]) => typeof v === "string" && v.length > 0);

  if (activeEntries.length === 0) return null;

  const clearAll = () => {
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
      <span className="text-xs text-muted-foreground">Active filters:</span>
      {activeEntries.map(([key, value]) => {
        const displayValue = CATEGORY_KEYS.has(key)
          ? humanizeCategory(value!)
          : value!.replace(/_/g, " ");
        const style = chipStyleForKey(key, value!);
        return (
          <Badge
            key={key}
            variant="outline"
            className={cn("gap-1", style.bg, style.border, style.text)}
          >
            <span className="text-[10px] uppercase tracking-[0.1em] opacity-70">
              {keyLabel(key)}
            </span>
            <span>{displayValue}</span>
          </Badge>
        );
      })}
      <button
        type="button"
        onClick={clearAll}
        className="ml-auto text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        Clear all
      </button>
    </div>
  );
}
