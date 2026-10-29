/**
 * Shareable Portal answers (F-portal-share). `/api/portal/chat` signs each
 * answer it generates — question, answer text and the citations it was
 * given — with an HMAC; `/api/portal/share` stores an answer only when that
 * signature verifies, so a shared page always shows something the Portal
 * actually said. Nothing is stored unless the visitor clicks Share.
 */
import { createHash, createHmac, randomBytes } from "node:crypto";

import { secretsEqual } from "@/lib/access";
import type { ContentNote } from "@/lib/player";

/** The citation fields that are signed, stored and shown. */
export type SharedCitation = {
  index: number;
  catalogNumber: string;
  recordingTitle: string;
  intervieweeName: string | null;
  audioUrl: string | null;
  startTime: number;
  endTime: number;
  excerpt: string;
  contentNotes?: ContentNote[];
};

type Env = { readonly [key: string]: string | undefined };

/**
 * Signing key: PORTAL_SHARE_SECRET, else derived from REVALIDATE_SECRET
 * (domain-separated, so neither value can stand in for the other). Null →
 * sharing is off.
 */
export function shareSecret(env: Env = process.env): string | null {
  if (env.PORTAL_SHARE_SECRET) return env.PORTAL_SHARE_SECRET;
  if (env.REVALIDATE_SECRET) {
    return createHmac("sha256", env.REVALIDATE_SECRET).update("livingatl.portal-share.v1").digest("hex");
  }
  return null;
}

function canonical(question: string, answer: string, citations: SharedCitation[]): string {
  return JSON.stringify([
    1,
    question,
    answer,
    citations.map((c) => [
      c.index,
      c.catalogNumber,
      c.recordingTitle,
      c.intervieweeName ?? null,
      c.audioUrl ?? null,
      c.startTime,
      c.endTime,
      c.excerpt,
      (c.contentNotes ?? []).map((n) => [n.category, n.severity]),
    ]),
  ]);
}

export function signAnswer(
  secret: string,
  question: string,
  answer: string,
  citations: SharedCitation[],
): string {
  return createHmac("sha256", secret).update(canonical(question, answer, citations)).digest("base64url");
}

export function verifyAnswer(
  secret: string,
  question: string,
  answer: string,
  citations: SharedCitation[],
  sig: string,
): boolean {
  return secretsEqual(sig, signAnswer(secret, question, answer, citations));
}

/** Stable key for "this exact answer was already shared". */
export function sigHash(sig: string): string {
  return createHash("sha256").update(sig).digest("hex");
}

export function newShareId(): string {
  return randomBytes(8).toString("base64url");
}

const CITATION_MARKERS = /\[(\d+(?:\s*[,|]\s*\d+)*)\]/g;

/** Citations the answer text actually references with `[N]` markers. */
export function citedOnly<T extends { index: number }>(answer: string, citations: T[]): T[] {
  const used = new Set<number>();
  for (const m of answer.matchAll(CITATION_MARKERS)) {
    for (const n of m[1].split(/[,|]/)) used.add(Number.parseInt(n.trim(), 10));
  }
  return citations.filter((c) => used.has(c.index));
}
