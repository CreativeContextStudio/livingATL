import "server-only";

import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { db } from "@/db";
import { previewInvites } from "@/db/schema";

export type ActiveInvite = { id: string; label: string; expiresAt: Date | null };

const usable = () =>
  and(
    isNull(previewInvites.revokedAt),
    or(isNull(previewInvites.expiresAt), gt(previewInvites.expiresAt, new Date())),
  );

/** The unrevoked, unexpired invite for a hashed token, or null. */
export async function findActiveInvite(tokenHash: string): Promise<ActiveInvite | null> {
  const rows = await db
    .select({ id: previewInvites.id, label: previewInvites.label, expiresAt: previewInvites.expiresAt })
    .from(previewInvites)
    .where(and(eq(previewInvites.tokenHash, tokenHash), usable()))
    .limit(1);
  return rows[0] ?? null;
}

/** Per-invite usage (the "analytics" for who actually opened their link). */
export async function recordInviteUse(id: string): Promise<void> {
  await db
    .update(previewInvites)
    .set({ lastUsedAt: new Date(), useCount: sql`${previewInvites.useCount} + 1` })
    .where(eq(previewInvites.id, id));
}

/**
 * Is this invite still valid? Cached for 60 s (tag `invites`) so archive
 * pages don't hit the database per request; `scripts/invites.py revoke`
 * POSTs /api/revalidate?tag=invites for an immediate lock-out.
 */
export const isInviteActive = unstable_cache(
  async (id: string): Promise<boolean> => {
    const rows = await db
      .select({ id: previewInvites.id })
      .from(previewInvites)
      .where(and(eq(previewInvites.id, id), usable()))
      .limit(1);
    return rows.length > 0;
  },
  ["invite-active"],
  { tags: ["invites"], revalidate: 60 },
);
