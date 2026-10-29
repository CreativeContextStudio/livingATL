import type { MetadataRoute } from "next";

import { archiveIsPublic } from "@/lib/access";
import { LISTENING_PATHS } from "@/lib/paths";
import { placeHref } from "@/lib/places";
import { fetchBrowserFacets, fetchBrowserRecordings } from "@/lib/queries/recordings";
import { siteUrl } from "@/lib/site-url";

// Evaluated per request, not prerendered at build: whether the archive is
// public is a runtime setting (gate token / launch flag).
export const dynamic = "force-dynamic";

/**
 * Public surfaces + every published recording. Empty until the archive is
 * public: sitemap.xml is reachable while gated and would otherwise list the
 * catalog to anyone.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!archiveIsPublic()) return [];
  const base = siteUrl();
  const at = (path: string) => new URL(path, base).toString();
  const [recordings, facets] = await Promise.all([
    fetchBrowserRecordings({}, "alphabetical"),
    fetchBrowserFacets(),
  ]);
  return [
    ...["/", "/browse", "/timeline", "/map", "/portal", "/places", "/paths", "/about", "/contact"].map((p) => ({
      url: at(p),
      changeFrequency: "weekly" as const,
    })),
    ...LISTENING_PATHS.map((p) => ({
      url: at(`/paths/${p.slug}`),
      changeFrequency: "monthly" as const,
    })),
    ...facets.neighborhoods.map((n) => ({
      url: at(placeHref(n.value)),
      changeFrequency: "monthly" as const,
    })),
    ...recordings.map((r) => ({
      url: at(`/player/${encodeURIComponent(r.catalogNumber)}`),
      changeFrequency: "monthly" as const,
    })),
  ];
}
