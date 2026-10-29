/**
 * Absolute origin for metadata (Open Graph URLs, sitemap, canonical links).
 * NEXT_PUBLIC_SITE_URL wins; on Vercel the production domain is used; local
 * dev falls back to localhost.
 */
export function siteUrl(): URL {
  if (process.env.NEXT_PUBLIC_SITE_URL) return new URL(process.env.NEXT_PUBLIC_SITE_URL);
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return new URL(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  }
  return new URL("http://localhost:3000");
}
