import "server-only";

import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { canRequestViewArchive } from "@/lib/access-request";
import {
  citedOnly,
  newShareId,
  shareSecret,
  sigHash,
  verifyAnswer,
} from "@/lib/portal/share";
import { saveShare } from "@/lib/queries/portal-shares";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";

/**
 * POST /api/portal/share (F-portal-share). Body: the question, answer and
 * citations exactly as `/api/portal/chat` streamed them, plus that answer's
 * `sig`. Stored only if the signature verifies — a forged or edited answer
 * gets 400 — and only the citations the answer references are kept.
 * Returns `{ id, path }` for `/portal/a/<id>`.
 */

const MAX_BODY_BYTES = 64 * 1024;

const checkRateLimit = createRateLimiter([
  { limit: 5, windowMs: 60_000 },
  { limit: 30, windowMs: 60 * 60_000 },
]);

const citation = z.object({
  index: z.number().int().min(1).max(64),
  catalogNumber: z.string().max(64),
  recordingTitle: z.string().max(400),
  intervieweeName: z.string().max(200).nullable(),
  audioUrl: z.string().max(500).nullable(),
  startTime: z.number().nonnegative(),
  endTime: z.number().nonnegative(),
  excerpt: z.string().max(2000),
  contentNotes: z
    .array(z.object({ category: z.string().max(64), severity: z.string().max(64) }))
    .max(20)
    .optional(),
});

const body = z.object({
  question: z.string().min(1).max(1000),
  answer: z.string().min(1).max(12_000),
  citations: z.array(citation).max(32),
  sig: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
});

export async function POST(req: Request): Promise<Response> {
  if (!(await canRequestViewArchive())) {
    return Response.json({ reason: "preview_mode" }, { status: 403 });
  }
  const secret = shareSecret();
  if (!secret) return Response.json({ error: "sharing_disabled" }, { status: 404 });
  if (!checkRateLimit(clientIp(req)).ok) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return Response.json({ error: "too_large" }, { status: 413 });
  let parsed;
  try {
    parsed = body.safeParse(JSON.parse(raw));
  } catch {
    return Response.json({ error: "bad_json" }, { status: 400 });
  }
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400 });
  const { question, answer, citations, sig } = parsed.data;

  if (!verifyAnswer(secret, question, answer, citations, sig)) {
    return Response.json({ error: "not_a_portal_answer" }, { status: 400 });
  }

  try {
    const id = await saveShare({
      id: newShareId(),
      sigHash: sigHash(sig),
      question,
      answer,
      citations: citedOnly(answer, citations),
    });
    return Response.json({ id, path: `/portal/a/${id}` });
  } catch (err) {
    Sentry.captureException(err);
    return Response.json({ error: "save_failed" }, { status: 500 });
  }
}
