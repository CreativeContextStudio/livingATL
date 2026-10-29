import type { Metadata } from "next";
import Link from "next/link";

import { neighborhoodStyle } from "@/components/shared/category-colors";
import { requireArchiveAccess } from "@/lib/access-request";
import { placeHref } from "@/lib/places";
import { fetchBrowserFacets } from "@/lib/queries/recordings";
import { cn } from "@/lib/utils";

/**
 * Places index (F-places) — every neighborhood the storytellers describe,
 * ordered by how many recordings touch it. Each links to its place page.
 */
export const metadata: Metadata = {
  title: "Places · livingATL",
  description: "Atlanta neighborhoods in the Living Atlanta oral histories, and the storytellers who describe them.",
};

export default async function PlacesPage() {
  await requireArchiveAccess();
  const { neighborhoods } = await fetchBrowserFacets();
  const places = [...neighborhoods].sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-muted-foreground">
          Collection · Places
        </p>
        <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          Neighborhoods
        </h1>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
          {places.length} Atlanta neighborhoods come up in the collection. Each page gathers the
          recordings and moments that touch it. <Link href="/map" className="text-primary-ink underline-offset-4 hover:underline">See them on the map</Link>.
        </p>
      </header>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {places.map((p) => {
          const s = neighborhoodStyle(p.value);
          return (
            <li key={p.value}>
              <Link
                href={placeHref(p.value)}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/50 p-4 transition-colors hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex items-center gap-2.5">
                  <span aria-hidden className={cn("size-2.5 rounded-full border", s.border, s.bg)} />
                  <span className="font-heading font-semibold">{p.value}</span>
                </span>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {p.count} recording{p.count === 1 ? "" : "s"}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
