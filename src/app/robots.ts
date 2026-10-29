import type { MetadataRoute } from "next";

import { archiveIsPublic } from "@/lib/access";
import { siteUrl } from "@/lib/site-url";

// Evaluated per request, not prerendered at build: whether the archive is
// public is a runtime setting (gate token / launch flag).
export const dynamic = "force-dynamic";

/**
 * robots.txt is reachable even while the site is gated (the proxy skips it),
 * so it must not invite crawling until the archive is public.
 */
export default function robots(): MetadataRoute.Robots {
  if (!archiveIsPublic()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/gate", "/preview"] },
    sitemap: new URL("/sitemap.xml", siteUrl()).toString(),
  };
}
