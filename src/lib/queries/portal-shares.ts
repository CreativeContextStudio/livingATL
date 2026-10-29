import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { portalShares } from "@/db/schema";
import type { SharedCitation } from "@/lib/portal/share";

export type PortalShare = {
  id: string;
  question: string;
  answer: string;
  citations: SharedCitation[];
  createdAt: Date;
};

/** Store a verified answer; sharing the same answer again returns its id. */
export async function saveShare(input: {
  id: string;
  sigHash: string;
  question: string;
  answer: string;
  citations: SharedCitation[];
}): Promise<string> {
  const inserted = await db
    .insert(portalShares)
    .values(input)
    .onConflictDoNothing({ target: portalShares.sigHash })
    .returning({ id: portalShares.id });
  if (inserted[0]) return inserted[0].id;
  const [existing] = await db
    .select({ id: portalShares.id })
    .from(portalShares)
    .where(eq(portalShares.sigHash, input.sigHash))
    .limit(1);
  return existing.id;
}

export async function getShare(id: string): Promise<PortalShare | null> {
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  const [row] = await db
    .select({
      id: portalShares.id,
      question: portalShares.question,
      answer: portalShares.answer,
      citations: portalShares.citations,
      createdAt: portalShares.createdAt,
    })
    .from(portalShares)
    .where(and(eq(portalShares.id, id), isNull(portalShares.hiddenAt)))
    .limit(1);
  return row ? { ...row, citations: row.citations as SharedCitation[] } : null;
}
