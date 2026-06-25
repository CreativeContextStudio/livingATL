"use client";

import { useMemo, useState } from "react";

import {
  ActiveFilterStrip,
  FilterGroup,
  type FilterBarProps,
  type FilterKey,
} from "@/components/browser/filter-bar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BrowserFacet, BrowserFacets } from "@/lib/queries/recordings";

/**
 * Tabbed version of FilterBar — each facet section is a tab panel so the
 * filter UI collapses to one strip + one section at a time. Shared by the
 * Collection browser and the Map; both surfaces share the same URL
 * search-param contract so tab selection is purely local UI state.
 */

type TabDef = {
  value: FilterKey;
  label: string;
  options: BrowserFacet[];
  activeValue?: string;
};

export function FilterTabs({
  facets,
  active,
}: {
  facets: BrowserFacets;
  active: FilterBarProps["active"];
}) {
  const tabs: TabDef[] = useMemo(
    () => [
      {
        value: "decade",
        label: "Era",
        options: facets.decades,
        activeValue: active.decade,
      },
      {
        value: "neighborhood",
        label: "Neighborhood",
        options: facets.neighborhoods,
        activeValue: active.neighborhood,
      },
      {
        value: "theme",
        label: "Theme",
        options: facets.themes,
        activeValue: active.theme,
      },
      {
        value: "org_cat",
        label: "Organizations",
        options: facets.orgCategories,
        activeValue: active.org_cat,
      },
      {
        value: "event_cat",
        label: "Historical events",
        options: facets.eventCategories,
        activeValue: active.event_cat,
      },
    ],
    [facets, active],
  );

  const [tab, setTab] = useState<FilterKey>("decade");

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/60 p-5">
      <Tabs value={tab} onValueChange={(v) => setTab(v as FilterKey)}>
        <TabsList className="h-auto flex-wrap gap-1 bg-muted">
          {tabs.map((t) => {
            const activeCount = t.activeValue ? 1 : 0;
            return (
              <TabsTrigger key={t.value} value={t.value} className="h-7 px-3">
                <span>{t.label}</span>
                {activeCount > 0 && (
                  <span className="ml-1 inline-flex size-5 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                    {activeCount}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {tabs.map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-3">
            <FilterGroup
              label={t.label}
              paramKey={t.value}
              options={t.options}
              activeValue={t.activeValue}
            />
          </TabsContent>
        ))}
      </Tabs>

      <ActiveFilterStrip active={active} />
    </div>
  );
}
