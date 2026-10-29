import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  GATE_COOKIE,
  canViewArchive,
  resolveAccess,
  type AccessState,
} from "@/lib/access";

/** Access state for the current request (server components, route handlers). */
export async function getRequestAccess(): Promise<AccessState> {
  const cookie = (await cookies()).get(GATE_COOKIE)?.value;
  return resolveAccess(cookie);
}

export async function canRequestViewArchive(): Promise<boolean> {
  return canViewArchive(await getRequestAccess());
}

/**
 * Page-level backstop for archive surfaces (PRD §8.8). The proxy normally
 * rewrites these requests before they get here; if it is ever bypassed, send
 * the visitor where the proxy would have — the password gate or the preview
 * holding page — rather than rendering archive content.
 */
export async function requireArchiveAccess(): Promise<void> {
  const state = await getRequestAccess();
  if (state === "gate-required") redirect("/gate");
  if (state === "preview") redirect("/preview");
}
