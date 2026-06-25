"use client";

import { PanelLeftCloseIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  EVENT_CATEGORY_STYLES,
  ORG_CATEGORY_STYLES,
  historicalEventStyle,
  neighborhoodStyle,
  organizationStyle,
  themeStyle,
  type CategoryStyle,
  type HistoricalEventCategory,
  type OrganizationCategory,
} from "@/components/shared/category-colors";
import {
  formatDuration,
  formatPublisher,
  formatRecordingDate,
  formatSpeakerName,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  PlayerData,
  TaggedHistoricalEvent,
  TaggedOrganization,
} from "@/lib/queries/player";

/**
 * Metadata sidebar — PRD §7.2. Storyteller bio, recording facts, themes,
 * neighborhoods, organizations, historical events. Pulls from the single
 * `fetchPlayerData` call; no additional DB round-trips.
 */
export function MetadataSidebar({
  data,
  onCollapse,
}: {
  data: PlayerData;
  /** When provided, renders a small collapse button in the card's top-right
   *  corner so the whole sidebar can collapse to a rail. Pairs with the
   *  Transcript card's header-chevron on the right column so both columns
   *  share a consistent "controls live in the card's top row" rhythm. */
  onCollapse?: () => void;
}) {
  const interviewer = data.speakers.find((s) => s.role === "interviewer");

  const dateLabel = formatRecordingDate(
    data.recordingDate,
    data.recordingDatePrecision as
      | "year"
      | "month"
      | "exact"
      | "estimated"
      | null,
  );

  return (
    <aside className="relative flex flex-col gap-5 rounded-xl border border-border bg-card/40 p-5">
      {onCollapse ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onCollapse}
          aria-label="Collapse context sidebar"
          title="Collapse context"
          className="absolute top-3 right-3"
        >
          <PanelLeftCloseIcon />
        </Button>
      ) : null}
      {/* Storyteller bio promoted to the page header as of the Player UX pass
          (Move 1) — the sidebar keeps only the Interviewer + Recording
          facts + facet chips + references so researchers still have the
          index they expect. */}

      {interviewer ? (
        <div className="flex flex-col gap-1">
          <h3 className="font-heading text-xs font-semibold tracking-[0.14em] uppercase text-muted-foreground">
            Interviewer
          </h3>
          <p className="text-sm">{formatSpeakerName(interviewer.name)}</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <h3 className="font-heading text-xs font-semibold tracking-[0.14em] uppercase text-muted-foreground">
          Recording
        </h3>
        <dl className="flex flex-col gap-2 text-sm">
          <RecordingFact label="Date" value={dateLabel} />
          <RecordingFact
            label="Duration"
            value={formatDuration(data.durationSeconds)}
          />
          {data.collection ? (
            <RecordingFact label="Collection" value={data.collection} muted />
          ) : null}
          {data.publisher ? (() => {
            const publisher = formatPublisher(data.publisher);
            return publisher ? (
              <RecordingFact label="Publisher" value={publisher} muted />
            ) : null;
          })() : null}
        </dl>
      </div>

      {data.neighborhoods.length > 0 ? (
        <FacetList
          label="Neighborhoods"
          values={data.neighborhoods}
          variant="neighborhood"
        />
      ) : null}

      {data.themes.length > 0 ? (
        <FacetList
          label="Themes"
          values={data.themes}
          variant="theme"
        />
      ) : null}

      {data.organizations.length > 0 ? (
        <OrganizationChips
          label="Organizations"
          items={data.organizations}
        />
      ) : null}

      {data.historicalEvents.length > 0 ? (
        <HistoricalEventChips
          label="Historical events"
          items={data.historicalEvents}
        />
      ) : null}
    </aside>
  );
}

function RecordingFact({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  /** Publisher / collection render with softer weight so Date + Duration
   *  read as the primary facts at a skim. */
  muted?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="font-mono text-[10px] font-medium tracking-[0.16em] uppercase text-muted-foreground/80">
        {label}
      </dt>
      <dd
        className={cn(
          "text-sm leading-snug whitespace-pre-line",
          muted ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function FacetList({
  label,
  values,
  variant,
}: {
  label: string;
  values: string[];
  variant: "outline" | "theme" | "neighborhood";
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="font-heading text-xs font-semibold tracking-[0.14em] uppercase text-muted-foreground">
        {label}
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => {
          let className: string | undefined;
          let display = v;
          if (variant === "theme") {
            const s = themeStyle(v);
            className = cn(s.border, s.bg, s.text);
            display = v.replace(/_/g, " ");
          } else if (variant === "neighborhood") {
            const s = neighborhoodStyle(v);
            className = cn(s.border, s.bg, s.text);
          }
          return (
            <Badge key={v} variant="outline" className={className}>
              {display}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Tagged-facet chip group. Organizations and historical events both render
 * as category-colored chips grouped under a small muted subheading per
 * category (so "Education" chips cluster together, "Civil rights" chips
 * cluster together, etc.). Kept as a generic helper so both surfaces share
 * the visual rhythm; the two wrappers below pick the right category
 * lookup and render the optional per-item suffix (year) for events.
 */
function CategoryChipGroup({
  label,
  groups,
}: {
  label: string;
  groups: Array<{
    category: string;
    style: CategoryStyle;
    chips: Array<{ key: string; text: string }>;
  }>;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-heading text-xs font-semibold tracking-[0.14em] uppercase text-muted-foreground">
        {label}
      </h3>
      <div className="flex flex-col gap-2">
        {groups.map((group) => (
          <div key={group.category} className="flex flex-col gap-1">
            <span className="text-[10px] font-medium tracking-[0.12em] uppercase text-muted-foreground/80">
              {group.style.label}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {group.chips.map((chip) => (
                <span
                  key={chip.key}
                  title={chip.text}
                  className={cn(
                    // Multi-line chip: fixed-height Badge (h-5 +
                    // overflow-hidden) clipped wrapped labels at the top.
                    // A plain span gives us a natural-height rounded box.
                    "inline-block max-w-full rounded-md border px-2 py-0.5",
                    "text-xs leading-snug whitespace-normal break-words",
                    group.style.border,
                    group.style.bg,
                    group.style.text,
                  )}
                >
                  {chip.text}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrganizationChips({
  label,
  items,
}: {
  label: string;
  items: TaggedOrganization[];
}) {
  const groups = groupByCategory<TaggedOrganization, OrganizationCategory>({
    items,
    getCategory: (o) => o.category,
    canonicalOrder: ORG_CATEGORY_STYLES,
    resolveStyle: (cat) => organizationStyle(cat),
    toChip: (o, i) => ({
      key: `${o.label}-${i}`,
      text: o.label,
    }),
  });
  return <CategoryChipGroup label={label} groups={groups} />;
}

function HistoricalEventChips({
  label,
  items,
}: {
  label: string;
  items: TaggedHistoricalEvent[];
}) {
  const groups = groupByCategory<
    TaggedHistoricalEvent,
    HistoricalEventCategory
  >({
    items,
    getCategory: (e) => e.category,
    canonicalOrder: EVENT_CATEGORY_STYLES,
    resolveStyle: (cat) => historicalEventStyle(cat),
    toChip: (e, i) => {
      // Don't double-print the year: if the authored label already embeds
      // a matching 4-digit year (e.g. "Great Depression (1929–c. 1939)"),
      // suppress the trailing `(YYYY)` suffix we'd otherwise append.
      const yearStr = typeof e.year === "number" ? String(e.year) : null;
      const labelContainsYear = yearStr
        ? new RegExp(`\\b${yearStr}\\b`).test(e.label)
        : false;
      const text =
        yearStr && !labelContainsYear ? `${e.label} (${yearStr})` : e.label;
      return { key: `${e.label}-${i}`, text };
    },
  });
  return <CategoryChipGroup label={label} groups={groups} />;
}

/**
 * Group an array of tagged facets by their `category` value, preserving the
 * canonical ordering declared in the style map (so the UI reads in a stable
 * order regardless of jsonb array order from the DB). Unknown categories —
 * values the pipeline emits that the web app hasn't caught up to yet — sort
 * to the end under a humanized fallback label rather than crashing.
 */
function groupByCategory<T, Cat extends string>({
  items,
  getCategory,
  canonicalOrder,
  resolveStyle,
  toChip,
}: {
  items: T[];
  getCategory: (item: T) => string;
  canonicalOrder: Record<Cat, CategoryStyle>;
  resolveStyle: (category: string) => CategoryStyle;
  toChip: (item: T, index: number) => { key: string; text: string };
}): Array<{
  category: string;
  style: CategoryStyle;
  chips: Array<{ key: string; text: string }>;
}> {
  const byCategory = new Map<
    string,
    Array<{ key: string; text: string }>
  >();
  items.forEach((item, i) => {
    const cat = getCategory(item);
    const existing = byCategory.get(cat);
    const chip = toChip(item, i);
    if (existing) existing.push(chip);
    else byCategory.set(cat, [chip]);
  });

  const knownOrder = Object.keys(canonicalOrder);
  const known: Array<{
    category: string;
    style: CategoryStyle;
    chips: Array<{ key: string; text: string }>;
  }> = [];
  for (const cat of knownOrder) {
    const chips = byCategory.get(cat);
    if (!chips) continue;
    known.push({ category: cat, style: resolveStyle(cat), chips });
    byCategory.delete(cat);
  }
  // Anything left is an unknown / out-of-taxonomy category — render last,
  // alpha-sorted for determinism.
  const unknown = Array.from(byCategory.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cat, chips]) => ({
      category: cat,
      style: resolveStyle(cat),
      chips,
    }));
  return [...known, ...unknown];
}
