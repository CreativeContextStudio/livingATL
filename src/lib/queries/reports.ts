import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { moderationLog, recordings, reportsTakedowns } from "@/db/schema";
import type { ReportInput } from "@/lib/reports";

/**
 * Store a report and its "submitted" audit row in one transaction. The
 * catalog number is matched to a recording when it can be; the raw value is
 * kept either way. Returns the new report id.
 */
export async function insertReport(
  input: ReportInput,
  inviteId: string | null,
): Promise<string> {
  return db.transaction(async (tx) => {
    const recording = input.catalogNumber
      ? (
          await tx
            .select({ id: recordings.id })
            .from(recordings)
            .where(eq(recordings.catalogNumber, input.catalogNumber))
            .limit(1)
        )[0]
      : undefined;
    const [row] = await tx
      .insert(reportsTakedowns)
      .values({
        kind: input.kind,
        recordingId: recording?.id ?? null,
        catalogNumber: input.catalogNumber,
        timestampSeconds: input.timestamp,
        reason: input.reason,
        relationship: input.relationship,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        inviteId,
      })
      .returning({ id: reportsTakedowns.id });
    await tx.insert(moderationLog).values({
      reportId: row.id,
      action: "submitted",
      toStatus: "pending",
      actor: "public",
    });
    return row.id;
  });
}
