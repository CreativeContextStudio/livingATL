/**
 * One-time hand-off for the `invite_redeemed` event. The invite route is
 * server-side and can't reach PostHog, so it leaves the invite's label in a
 * short-lived readable cookie; the browser sends the event and clears it.
 * Link unfurlers (Slack, iMessage) never run this, so unlike
 * `preview_invites.use_count` it counts people, not previews.
 */
export const INVITE_EVENT_COOKIE = "la_invite_event";
export const INVITE_EVENT_MAX_AGE_S = 120;

/** The invite label in a `document.cookie` string, or null. */
export function inviteLabelFromCookies(cookies: string): string | null {
  const prefix = `${INVITE_EVENT_COOKIE}=`;
  const pair = cookies
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(prefix));
  if (!pair) return null;
  try {
    return decodeURIComponent(pair.slice(prefix.length)) || null;
  } catch {
    return null;
  }
}
