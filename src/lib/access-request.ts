import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  GATE_COOKIE,
  canViewArchive,
  inviteIdFromCookie,
  resolveAccess,
  type AccessState,
} from "@/lib/access";
import { isInviteActive } from "@/lib/invites";

/**
 * Access state for the current request (server components, route handlers).
 *
 * Adds the one check the proxy can't make cheaply: an invite cookie
 * (`v2.<inviteId>…`, PRD F-invite) only counts while its invite is unrevoked
 * and unexpired in `public.preview_invites` (cached 60 s, tag `invites`).
 * If that lookup fails the signed cookie is trusted — the holder was invited,
 * and the archive pages behind this check can't render without the database
 * anyway.
 */
export async function getRequestAccess(): Promise<AccessState> {
  return (await requestAccess()).state;
}

async function requestAccess(): Promise<{ state: AccessState; revoked: boolean }> {
  const cookie = (await cookies()).get(GATE_COOKIE)?.value;
  const state = resolveAccess(cookie);
  const token = process.env.SITE_GATE_TOKEN;
  if (state !== "entered" || !token) return { state, revoked: false };
  const inviteId = inviteIdFromCookie(cookie, token);
  if (!inviteId) return { state, revoked: false };
  try {
    if (await isInviteActive(inviteId)) return { state, revoked: false };
    return { state: "gate-required", revoked: true };
  } catch {
    return { state, revoked: false };
  }
}

export async function canRequestViewArchive(): Promise<boolean> {
  return canViewArchive(await getRequestAccess());
}

/**
 * Page-level backstop for archive surfaces (PRD §8.8). The proxy normally
 * rewrites these requests before they get here; if it is ever bypassed, send
 * the visitor where the proxy would have — the password gate or the preview
 * holding page — rather than rendering archive content. A revoked invite
 * lands on the gate with an explanation.
 */
export async function requireArchiveAccess(): Promise<void> {
  const { state, revoked } = await requestAccess();
  if (state === "gate-required") redirect(revoked ? "/gate?error=revoked" : "/gate");
  if (state === "preview") redirect("/preview");
}
