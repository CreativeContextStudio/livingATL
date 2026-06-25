"use client";

/**
 * Renders the current calendar year as a tiny client island inside
 * `SiteFooter`. The footer itself is a Server Component rendered into the
 * root layout, which Next.js prerenders statically for `/`, `/preview`, and
 * `/contact` — meaning a plain `new Date().getFullYear()` on the server
 * would pin to the build year and silently read stale after Jan 1 of the
 * next year until the next deploy.
 *
 * This component runs `new Date().getFullYear()` at render time on the
 * client, so the year updates as soon as a stale-static page is loaded in
 * a new calendar year. `suppressHydrationWarning` covers the edge case
 * where a build done in December hydrates in January — the server HTML
 * carries the build year, the client re-renders with the current year,
 * and React quietly swaps without warning.
 */
export function FooterYear() {
  return (
    <span suppressHydrationWarning>{new Date().getFullYear()}</span>
  );
}
