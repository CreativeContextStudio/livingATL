/**
 * Content-Security-Policy for HTML responses. Built per request in
 * `src/proxy.ts` with a fresh nonce; Next applies the nonce to its own
 * scripts during dynamic rendering (every route here renders per request).
 * See node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md.
 *
 * - script-src: nonce + 'strict-dynamic' — no 'unsafe-inline'; scripts the
 *   app itself loads later (PostHog's remote config) inherit trust.
 * - style-src keeps 'unsafe-inline': React `style={…}` attributes (timeline
 *   positions, waveform, sliders, map) can't carry a nonce.
 * - Mapbox: tiles/styles/glyphs over https, workers from blob:.
 * - Sentry goes through the same-origin `/monitoring` tunnel; audio through
 *   the same-origin `/audio` rewrite (`playableAudioUrl` in src/lib/player.ts
 *   makes stored audio URLs same-origin on every host).
 */

/** The nonce inside a policy built by `buildCsp`, for components that render
 *  their own inline tags (Base UI's CSPProvider). */
export function nonceFromCsp(csp: string | null): string | undefined {
  return csp?.match(/'nonce-([^']+)'/)?.[1];
}
export function buildCsp({
  nonce,
  isDev,
  isHttps,
  posthogHost,
}: {
  nonce: string;
  isDev: boolean;
  isHttps: boolean;
  posthogHost: string;
}): string {
  const posthogAssets = posthogHost.replace("://us.i.", "://us-assets.i.").replace("://eu.i.", "://eu-assets.i.");
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://*.mapbox.com",
    "font-src 'self' data:",
    `connect-src 'self' https://*.mapbox.com ${posthogHost} ${posthogAssets}`,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isHttps ? ["upgrade-insecure-requests"] : []),
  ];
  return directives.join("; ");
}
