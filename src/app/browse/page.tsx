import type { Metadata } from "next";
import Link from "next/link";

import {
  fetchArchiveStats,
  fetchBrowserFacets,
  fetchBrowserRecordings,
  type BrowserFilter,
  type BrowserSort,
} from "@/lib/queries/recordings";
import { FilterTabs } from "@/components/browser/filter-tabs";
import { SortSelect } from "@/components/browser/sort-select";
import { SearchInput } from "@/components/browser/search-input";
import { RecordingCard } from "@/components/browser/recording-card";
import { requireArchiveAccess } from "@/lib/access-request";

/**
 * Collection Browser — PRD §7.1.
 *
 * Phase 2 Week 4 refactor: filter + sort + search all run server-side in
 * SQL against pg_trgm + GIN-indexed columns so the Browser scales from
 * 48 → 400+ recordings without shipping unused brief payloads to the
 * client. The RSC receives only the matching, trimmed card rows.
 *
 * Launch-gate behavior: this route is intentionally NOT on the preview
 * allowlist in `src/proxy.ts`. When `NEXT_PUBLIC_LAUNCH_ENABLED !== "true"`,
 * the proxy rewrites `/browse` to `/preview`.
 */
export const metadata: Metadata = {
  title: "Browse the collection",
  description:
    "Explore the Living Atlanta oral history collection (1914–1977). Filter by era, neighborhood, and theme. Search across storytellers, titles, and summaries.",
};

const VALID_SORTS = new Set<BrowserSort>([
  "alphabetical",
  "alphabetical_first",
  "date_recorded_desc",
  "duration_desc",
  "date_added_desc",
  "random",
]);

/**
 * Resolve the URL's `?sort=` param to a `BrowserSort`. Missing or
 * unrecognized values default to `"random"` so the Collection's landing
 * state is shuffled on every visit — returning users see different
 * recordings at the top each time they return. Users who pick an
 * explicit sort from the SortSelect get the URL param written and this
 * function passes it through unchanged.
 */
function normalizeSort(raw: string | undefined): BrowserSort {
  if (raw && VALID_SORTS.has(raw as BrowserSort)) return raw as BrowserSort;
  // PRD §7.1: alphabetical by default — stable across filter changes and
  // Back, and it matches what the sort control says.
  return "alphabetical";
}

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // PRD §8.8 backstop — the proxy is the first line; see src/lib/access.ts.
  await requireArchiveAccess();
  const params = await searchParams;
  const filter: BrowserFilter = {
    theme: firstParam(params.theme),
    neighborhood: firstParam(params.neighborhood),
    decade: firstParam(params.decade),
    orgCategory: firstParam(params.org_cat),
    eventCategory: firstParam(params.event_cat),
    search: firstParam(params.q),
  };
  const sort = normalizeSort(firstParam(params.sort));

  const [filtered, facets, stats] = await Promise.all([
    fetchBrowserRecordings(filter, sort),
    fetchBrowserFacets(),
    fetchArchiveStats(),
  ]);

  // Corpus total = every published (completed) recording. The previous
  // max(filtered, top theme's count) showed the most common theme's count.
  const totalRecordings = stats.processedRecordings;
  const hasActiveFilter = Boolean(
    filter.theme ||
      filter.neighborhood ||
      filter.decade ||
      filter.orgCategory ||
      filter.eventCategory ||
      filter.search?.trim(),
  );

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 lg:py-14">
      <header className="flex flex-col gap-3">
        <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          Atlanta, in its own voice
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground">
          Filter by era, neighborhood, or theme, or search for a name.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <FilterTabs
          facets={facets}
          active={{
            decade: filter.decade,
            neighborhood: filter.neighborhood,
            theme: filter.theme,
            org_cat: filter.orgCategory,
            event_cat: filter.eventCategory,
          }}
        />
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-3">
          <div className="min-w-0 flex-1 sm:max-w-md">
            <SearchInput initialValue={filter.search ?? ""} />
          </div>
          <p
            className="flex items-center gap-2 text-xs text-muted-foreground sm:border-l sm:border-border/60 sm:pl-4"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="font-mono text-[10px] tracking-[0.18em] uppercase">
              Showing
            </span>
            <span className="text-sm font-medium text-foreground">
              {filtered.length}
              {hasActiveFilter ? (
                <span className="text-muted-foreground"> / {totalRecordings}</span>
              ) : null}
            </span>
            <span className="text-muted-foreground">
              recording{filtered.length === 1 ? "" : "s"}
            </span>
          </p>
          <div className="sm:ml-auto">
            <SortSelect value={sort} />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((recording) => (
              <RecordingCard key={recording.id} recording={recording} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
      <p className="font-heading text-lg font-semibold">
        No interviews match those filters yet.
      </p>
      <p className="max-w-md text-sm text-muted-foreground">
        Try removing a filter, widening your era or theme selection, or
        clearing the search box.
      </p>
      <Link
        href="/browse"
        className="mt-2 text-sm font-medium text-primary-ink underline underline-offset-4"
      >
        Clear all filters
      </Link>
    </div>
  );
}
