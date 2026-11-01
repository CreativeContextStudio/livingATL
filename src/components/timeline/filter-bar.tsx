"use client";

import { useMemo } from "react";
import { Popover } from "@base-ui/react/popover";
import { CheckIcon, ChevronDownIcon, StarIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  familyColorVar,
  themeLabel,
  type FamilyKey,
  type ThemeKey,
} from "@/lib/theme-colors";
import { neighborhoodColor } from "@/lib/neighborhood-colors";
import type { TimelineMoment } from "@/lib/queries/timeline";
import {
  computeNeighborhoodFacets,
  computeThemeFacets,
} from "@/components/timeline/filter-facets";

/**
 * Timeline toolbar: Theme / Place / Highlights filters, a match count
 * while filtering, clear-all, and a `trailing` slot (the zoom controls).
 * Filtering fades non-matching moments on the canvas rather than hiding
 * them, so the shape of the whole collection stays visible. The Theme
 * menu doubles as the color key: its swatches are the family colors the
 * dots use, and a family heading selects all of its themes.
 *
 * All state is lifted to `TimelineClient`; this component is pure
 * presentation + reporting changes via `onChange`.
 */

export type TimelineFilter = {
  themes: ThemeKey[];
  neighborhoods: string[];
  /** Top-level family buckets (Justice / Place / Daily Life /
   *  Institutions / Culture). Applied across BOTH moments (via theme →
   *  family lookup) and historical events (via category → family
   *  lookup) so the legend swatches filter the whole canvas. OR
   *  semantics within the field, AND across fields. */
  families: FamilyKey[];
  highlightOnly: boolean;
};

export const EMPTY_FILTER: TimelineFilter = {
  themes: [],
  neighborhoods: [],
  families: [],
  highlightOnly: false,
};

export function isEmptyFilter(f: TimelineFilter): boolean {
  return (
    f.themes.length === 0 &&
    f.neighborhoods.length === 0 &&
    f.families.length === 0 &&
    !f.highlightOnly
  );
}

export function TimelineFilterBar({
  filter,
  onChange,
  moments,
  matchingMomentCount,
  matchingNarratorCount,
  trailing,
}: {
  filter: TimelineFilter;
  onChange: (next: TimelineFilter) => void;
  /** The full moment dataset — used to derive facet counts in the
   *  popovers. Counts reflect the corpus, not the current view. */
  moments: TimelineMoment[];
  matchingMomentCount: number;
  matchingNarratorCount: number;
  trailing?: React.ReactNode;
}) {
  const themeFacets = useMemo(() => computeThemeFacets(moments), [moments]);
  const neighborhoodFacets = useMemo(
    () => computeNeighborhoodFacets(moments),
    [moments],
  );

  const toggleTheme = (key: ThemeKey) => {
    const next = filter.themes.includes(key)
      ? filter.themes.filter((k) => k !== key)
      : [...filter.themes, key];
    onChange({ ...filter, themes: next });
  };
  /** Family heading: select all of its themes, or clear them if all are on. */
  const toggleFamily = (keys: ThemeKey[]) => {
    const allOn = keys.every((k) => filter.themes.includes(k));
    const next = allOn
      ? filter.themes.filter((k) => !keys.includes(k))
      : [...new Set([...filter.themes, ...keys])];
    onChange({ ...filter, themes: next });
  };
  const toggleNeighborhood = (name: string) => {
    const next = filter.neighborhoods.includes(name)
      ? filter.neighborhoods.filter((n) => n !== name)
      : [...filter.neighborhoods, name];
    onChange({ ...filter, neighborhoods: next });
  };
  const toggleHighlight = () => {
    onChange({ ...filter, highlightOnly: !filter.highlightOnly });
  };
  const clearAll = () => onChange(EMPTY_FILTER);

  const anyActive = !isEmptyFilter(filter);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border/60 px-3 py-2.5 text-[11px] font-mono tracking-[0.12em] uppercase text-muted-foreground sm:px-4">
      <div className="flex flex-wrap items-center gap-2">
        <ThemeMultiSelect
          selected={filter.themes}
          facets={themeFacets}
          onToggle={toggleTheme}
          onToggleFamily={toggleFamily}
        />
        <NeighborhoodMultiSelect
          selected={filter.neighborhoods}
          facets={neighborhoodFacets}
          onToggle={toggleNeighborhood}
        />
        <HighlightToggle active={filter.highlightOnly} onToggle={toggleHighlight} />
        {anyActive ? (
          <>
            <span
              className="normal-case tracking-normal"
              aria-live="polite"
              title={`${matchingMomentCount} chapters from ${matchingNarratorCount} ${matchingNarratorCount === 1 ? "storyteller" : "storytellers"} in view`}
            >
              <span className="text-foreground">{matchingMomentCount}</span> in view
            </span>
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <XIcon aria-hidden className="size-3" />
              Clear
            </button>
          </>
        ) : null}
      </div>
      {trailing ? <div className="ml-auto">{trailing}</div> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pickers
// ---------------------------------------------------------------------------

// `Popover.Trigger render={<FilterTriggerShell ... />}` clones this element
// and merges in its own onClick/ref/aria-* props. The shell must spread
// those onto the underlying <button> or the popover never opens — that's
// the bug behind the dead Themes/Places dropdowns.
function FilterTriggerShell({
  label,
  count,
  active,
  children,
  className,
  ref,
  ...rest
}: {
  label: string;
  count: number;
  active: boolean;
} & React.ComponentPropsWithRef<"button">) {
  return (
    <button
      {...rest}
      ref={ref}
      type="button"
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[11px] uppercase tracking-[0.12em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-primary/60 bg-primary/10 text-foreground"
          : "border-border bg-background text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      <span>{label}</span>
      {count > 0 ? (
        <span className="rounded-sm bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
          {count}
        </span>
      ) : null}
      {children}
      <ChevronDownIcon aria-hidden className="size-3 opacity-60" />
    </button>
  );
}

function ThemeMultiSelect({
  selected,
  facets,
  onToggle,
  onToggleFamily,
}: {
  selected: ThemeKey[];
  facets: ReturnType<typeof computeThemeFacets>;
  onToggle: (key: ThemeKey) => void;
  onToggleFamily: (keys: ThemeKey[]) => void;
}) {
  const count = selected.length;
  const selectedSet = new Set(selected);

  return (
    <Popover.Root>
      <Popover.Trigger
        render={<FilterTriggerShell label="Theme" count={count} active={count > 0} />}
      />
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="start" className="z-50">
          <Popover.Popup className="max-h-[360px] w-[min(92vw,300px)] overflow-y-auto rounded-lg border border-border bg-popover p-2 text-popover-foreground shadow-lg ring-1 ring-foreground/10">
            {facets.map(({ family, facets: familyFacets }) => (
              <div key={family.key} className="mb-2 flex flex-col gap-0.5 last:mb-0">
                <button
                  type="button"
                  onClick={() => onToggleFamily(familyFacets.map((f) => f.key))}
                  title={`Select all ${family.label} themes`}
                  className="flex items-center gap-2 rounded-md px-2 pt-1 pb-0.5 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span aria-hidden className="inline-block size-2.5 shrink-0 rounded-full" style={{ backgroundColor: familyColorVar(family.key) }} />
                  {family.label}
                </button>
                {familyFacets.map(({ key, count: facetCount }) => {
                  const checked = selectedSet.has(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={checked}
                      onClick={() => onToggle(key)}
                      disabled={facetCount === 0 && !checked}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[12px] normal-case tracking-normal transition-colors",
                        checked
                          ? "bg-muted text-foreground"
                          : "text-foreground/85 hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent",
                      )}
                    >
                      <span
                        aria-hidden
                        className="inline-flex size-4 shrink-0 items-center justify-center rounded border border-border bg-background"
                        style={
                          checked
                            ? { backgroundColor: familyColorVar(family.key), borderColor: familyColorVar(family.key) }
                            : undefined
                        }
                      >
                        {checked ? (
                          <CheckIcon aria-hidden className="size-3 text-background" />
                        ) : null}
                      </span>
                      <span className="flex-1 truncate">{themeLabel(key)}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {facetCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function NeighborhoodMultiSelect({
  selected,
  facets,
  onToggle,
}: {
  selected: string[];
  facets: ReturnType<typeof computeNeighborhoodFacets>;
  onToggle: (name: string) => void;
}) {
  const count = selected.length;
  const selectedSet = new Set(selected);

  return (
    <Popover.Root>
      <Popover.Trigger
        render={<FilterTriggerShell label="Place" count={count} active={count > 0} />}
      />
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="start" className="z-50">
          <Popover.Popup className="max-h-[360px] w-[min(92vw,280px)] overflow-y-auto rounded-lg border border-border bg-popover p-2 text-popover-foreground shadow-lg ring-1 ring-foreground/10">
            {facets.length === 0 ? (
              <p className="px-2 py-1 text-[12px] normal-case tracking-normal text-muted-foreground">
                No neighborhoods in the current data.
              </p>
            ) : (
              facets.map(({ name, count: facetCount }) => {
                const checked = selectedSet.has(name);
                const color = neighborhoodColor(name);
                return (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={checked}
                    onClick={() => onToggle(name)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[12px] normal-case tracking-normal transition-colors",
                      checked ? "bg-muted text-foreground" : "text-foreground/85 hover:bg-muted",
                    )}
                  >
                    <span
                      aria-hidden
                      className="inline-flex size-4 shrink-0 items-center justify-center rounded border border-border bg-background"
                      style={
                        checked
                          ? { backgroundColor: color, borderColor: color }
                          : undefined
                      }
                    >
                      {checked ? (
                        <CheckIcon aria-hidden className="size-3 text-background" />
                      ) : null}
                    </span>
                    <span
                      aria-hidden
                      className="inline-block size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="flex-1 truncate">{name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {facetCount}
                    </span>
                  </button>
                );
              })
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function HighlightToggle({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      title="Show highlights only"
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[11px] uppercase tracking-[0.12em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-primary/70 bg-primary/15 text-primary-ink"
          : "border-border bg-background text-muted-foreground hover:text-foreground",
      )}
    >
      <StarIcon
        aria-hidden
        className={cn("size-3", active ? "fill-primary" : "")}
      />
      <span>Highlights</span>
    </button>
  );
}
