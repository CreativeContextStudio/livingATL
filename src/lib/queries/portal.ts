import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";

/**
 * AI Portal retrieval layer — PRD §7.4.
 *
 * Pulls the top-K transcript chunks most similar to a query embedding using
 * pgvector cosine distance (`<=>`). The HNSW index on
 * `transcript_chunks.embedding` is created in the raw-SQL migration
 * `drizzle/sql/*` (drizzle-kit can't emit HNSW options directly).
 *
 * Chunk text is stored with speaker-role prefixes `[INTERVIEWER]` /
 * `[INTERVIEWEE]` / `[OTHER]` baked in at ingest (`scripts/ingest.py`'s
 * `_chunk_segments`). We pass the raw text through to the LLM so the model
 * can distinguish question vs. answer without a schema-level speaker_id join.
 */

/**
 * Display + deep-link fields used by the Portal client. `similarity` is
 * `1 - cosine_distance` so a single "higher is better" threshold comparison
 * works downstream.
 */
export type PortalChunk = {
  chunkId: string;
  recordingId: string;
  catalogNumber: string;
  recordingTitle: string;
  intervieweeName: string | null;
  text: string;
  startTime: number;
  endTime: number;
  similarity: number;
};

type PortalChunkRow = {
  chunk_id: string;
  recording_id: string;
  catalog_number: string;
  title: string;
  interviewee_name: string | null;
  text: string;
  start_time: number;
  end_time: number;
  similarity: number;
};

/**
 * Retrieve top-K most-similar transcript chunks for a query embedding.
 *
 * The pgvector parameter has to be formatted as `[n1,n2,...]` literal — there
 * is no drizzle helper for vector binding yet. We cast it at query time with
 * `::vector(1536)` so HNSW's cosine operator class picks up the index.
 *
 * The interviewee_name join picks a single interviewee per recording (the
 * first by created_at). Recordings with multiple interviewees are rare in
 * the 1914–1977 collection; when they occur the Player page shows all, but
 * the Portal citation chip only has room for one line of attribution.
 */
export async function retrieveRelevantChunks(
  queryEmbedding: number[],
  limit = 8,
): Promise<PortalChunk[]> {
  if (queryEmbedding.length !== 1536) {
    throw new Error(
      `Portal retrieval expects 1536-dim embedding, got ${queryEmbedding.length}.`,
    );
  }

  const vectorLiteral = `[${queryEmbedding.join(",")}]`;

  const rows = await db.execute<PortalChunkRow>(sql`
    SELECT
      tc.id AS chunk_id,
      tc.recording_id,
      r.catalog_number,
      r.title,
      (
        SELECT sp.name
        FROM public.recording_speakers rs
        INNER JOIN public.speakers sp ON sp.id = rs.speaker_id
        WHERE rs.recording_id = r.id
          AND rs.role = 'interviewee'
        ORDER BY sp.created_at ASC
        LIMIT 1
      ) AS interviewee_name,
      tc.text,
      tc.start_time,
      tc.end_time,
      (1 - (tc.embedding <=> ${vectorLiteral}::vector(1536)))::float AS similarity
    FROM public.transcript_chunks tc
    INNER JOIN public.recordings r ON r.id = tc.recording_id
    WHERE r.transcription_status = 'completed'
    ORDER BY tc.embedding <=> ${vectorLiteral}::vector(1536)
    LIMIT ${limit}
  `);

  return rows.map((row) => ({
    chunkId: row.chunk_id,
    recordingId: row.recording_id,
    catalogNumber: row.catalog_number,
    recordingTitle: row.title,
    intervieweeName: row.interviewee_name,
    text: row.text,
    startTime: Number(row.start_time),
    endTime: Number(row.end_time),
    similarity: Number(row.similarity),
  }));
}
