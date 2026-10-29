import "server-only";

import { openai } from "@ai-sdk/openai";
import * as Sentry from "@sentry/nextjs";
import {
  embed,
  generateText,
  streamText,
  createUIMessageStream,
  createUIMessageStreamResponse,
  convertToModelMessages,
  Output,
  type UIMessage,
} from "ai";
import { z } from "zod";

import { canRequestViewArchive } from "@/lib/access-request";
import { getSynthesisModel } from "@/lib/ai/provider";
import {
  buildSystemPrompt,
  NO_MATERIAL_REPLY,
} from "@/lib/ai/portal-prompt";
import {
  MAX_BODY_BYTES,
  sanitizePortalMessages,
} from "@/lib/portal/sanitize-messages";
import { retrieveRelevantChunks } from "@/lib/queries/portal";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * AI Portal chat endpoint — PRD §7.4. v0.2: streaming.
 *
 * Accepts AI SDK v6 `useChat` contract — `{ messages: UIMessage[] }` — and
 * returns a UIMessageStream that carries three kinds of parts:
 *   - text deltas (the synthesis answer, streamed from `streamText`)
 *   - a `data-citations` part (emitted up-front so the citations panel can
 *     render immediately, before the first text token arrives)
 *   - a `data-followups` part (emitted via `onFinish` after the answer
 *     completes — a tiny second LLM call tuned to propose three short
 *     follow-up questions based on the final answer)
 *
 * Access: returns 403 `preview_mode` unless the visitor can view the archive
 * (src/lib/access.ts — gate cookie when the demo gate is on, launch flag
 * otherwise). Required backstop per PRD §8.8 in case the proxy is bypassed.
 */

// Retrieval tuning knobs. K=16 at threshold 0.25 on 2026-04-20 — bumped
// from K=12 after the live-portal eval (see
// evals/ai-portal/portal_findings.md) showed several expected chunks
// (Ruby Owens's 1906/1917 accounts, Wheat Street references) ranked
// between 12 and 20 for their queries. 16 gives the LLM more candidates
// without blowing out the prompt context. Absence discipline was clean
// at K=12 so we're not expecting the extra noise to break refusals.
const RETRIEVE_TOP_K = 16;
const SIMILARITY_THRESHOLD = 0.25;

// Output caps. The longest answer in the 15-question live eval was ~1,600
// characters (~400 tokens), so 1,200 leaves headroom without letting one
// request run up an unbounded bill.
const ANSWER_MAX_OUTPUT_TOKENS = 1200;
const FOLLOWUPS_MAX_OUTPUT_TOKENS = 300;

// Per-instance backstop; the Vercel Firewall rule on this path is the real
// limit (see src/lib/rate-limit.ts).
const checkRateLimit = createRateLimiter([
  { limit: 8, windowMs: 60_000 },
  { limit: 60, windowMs: 60 * 60_000 },
]);

/** Generic client-facing error text; the real error goes to Sentry. */
function reportStreamError(error: unknown): string {
  Sentry.captureException(error);
  console.error("[portal-chat] stream error", error);
  return "Something went wrong while answering.";
}

export type PortalCitation = {
  index: number;
  catalogNumber: string;
  recordingTitle: string;
  intervieweeName: string | null;
  startTime: number;
  endTime: number;
  excerpt: string;
};

/**
 * Typed custom data parts. The `data-<name>` on the wire becomes
 * `UIMessage.parts[].type === "data-<name>"` on the client, with typed
 * `.data` payload.
 */
export type PortalUIMessage = UIMessage<
  never,
  {
    citations: PortalCitation[];
    followups: string[];
  }
>;

const followUpsSchema = z.object({
  followUps: z
    .array(z.string())
    .length(3)
    .describe(
      "Three short, distinct follow-up questions. Each under 90 characters, answerable from the Living Atlanta collection (1914–1977). No citation markers.",
    ),
});

function stripCitationMarkers(text: string): string {
  return text
    .replace(/\[\s*\d+(\s*[,|]\s*\d+)*\s*\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateExcerpt(text: string, max = 320): string {
  const clean = text.trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).trimEnd()}…`;
}

export async function POST(req: Request): Promise<Response> {
  if (!(await canRequestViewArchive())) {
    return Response.json({ reason: "preview_mode" }, { status: 403 });
  }

  const limited = checkRateLimit(clientIp(req));
  if (!limited.ok) {
    return Response.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSeconds) },
      },
    );
  }

  const declaredLength = Number(req.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return Response.json({ error: "payload_too_large" }, { status: 413 });
  }
  const rawBody = await req.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return Response.json({ error: "payload_too_large" }, { status: 413 });
  }

  let body: { messages?: unknown };
  try {
    body = JSON.parse(rawBody) as { messages?: unknown };
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  // Never forward client message objects as-is — see sanitize-messages.ts.
  const sanitized = sanitizePortalMessages(body?.messages);
  if (!sanitized.ok) {
    return Response.json({ error: sanitized.error }, { status: sanitized.status });
  }
  const { messages: uiMessages, question } = sanitized;

  // Embed the question.
  const { embedding } = await embed({
    model: openai.embedding("text-embedding-3-small"),
    value: question,
  });

  // Retrieve top-K chunks and filter by similarity threshold.
  const retrieved = await retrieveRelevantChunks(embedding, RETRIEVE_TOP_K);
  const relevant = retrieved.filter((c) => c.similarity >= SIMILARITY_THRESHOLD);

  if (process.env.NODE_ENV !== "production") {
    console.log(
      "[portal-retrieval]",
      JSON.stringify({
        question: question.slice(0, 120),
        retrieved_count: retrieved.length,
        relevant_count: relevant.length,
        similarities: retrieved.map((c) => Number(c.similarity.toFixed(3))),
        top_catalogs: retrieved.slice(0, 5).map((c) => c.catalogNumber),
      }),
    );
  }

  const citations: PortalCitation[] = relevant.map((chunk, idx) => ({
    index: idx + 1,
    catalogNumber: chunk.catalogNumber,
    recordingTitle: chunk.recordingTitle,
    intervieweeName: chunk.intervieweeName,
    startTime: chunk.startTime,
    endTime: chunk.endTime,
    excerpt: truncateExcerpt(chunk.text),
  }));

  // No-material branch — deterministic reply, skip the LLM. Still delivered
  // via the UIMessageStream so the client's `useChat` pipeline processes it
  // the same way as a streamed answer.
  if (relevant.length === 0) {
    const stream = createUIMessageStream<PortalUIMessage>({
      execute: ({ writer }) => {
        writer.write({
          type: "data-citations",
          id: "citations",
          data: [],
        });
        writer.write({
          type: "data-followups",
          id: "followups",
          data: [],
        });
        const textId = "no-material";
        writer.write({ type: "text-start", id: textId });
        writer.write({
          type: "text-delta",
          id: textId,
          delta: NO_MATERIAL_REPLY,
        });
        writer.write({ type: "text-end", id: textId });
      },
    });
    return createUIMessageStreamResponse({ stream });
  }

  // Build model messages from the UI messages. Strip `[N]` markers from any
  // prior assistant replies so stale citation numbering doesn't collide
  // with the fresh retrieval's numbering.
  const baseModelMessages = await convertToModelMessages(uiMessages);
  const modelMessages = baseModelMessages.map((m) => {
    if (m.role !== "assistant") return m;
    const content = m.content;
    if (typeof content === "string") {
      return { ...m, content: stripCitationMarkers(content) };
    }
    if (Array.isArray(content)) {
      return {
        ...m,
        content: content.map((part) => {
          if (
            part &&
            typeof part === "object" &&
            "type" in part &&
            part.type === "text" &&
            typeof (part as { text?: unknown }).text === "string"
          ) {
            return {
              ...part,
              text: stripCitationMarkers((part as { text: string }).text),
            };
          }
          return part;
        }),
      };
    }
    return m;
  });

  const stream = createUIMessageStream<PortalUIMessage>({
    onError: reportStreamError,
    execute: async ({ writer }) => {
      // Emit citations immediately so the panel can render before the first
      // text token arrives. `id` lets us reconcile this part if we ever
      // want to update it mid-stream.
      writer.write({
        type: "data-citations",
        id: "citations",
        data: citations,
      });

      // Stream the answer text.
      const result = streamText({
        model: getSynthesisModel(),
        system: buildSystemPrompt(relevant),
        messages: modelMessages,
        maxOutputTokens: ANSWER_MAX_OUTPUT_TOKENS,
      });

      writer.merge(
        result.toUIMessageStream({
          sendReasoning: false,
          onError: reportStreamError,
        }),
      );

      // `execute` must stay open until the follow-ups are written, otherwise
      // the stream closes before the second call returns. Awaiting
      // `result.text` blocks until the answer stream has fully completed;
      // the merged deltas have already reached the client by then.
      let answerText = "";
      try {
        answerText = await result.text;
      } catch {
        // If synthesis fails mid-stream, emit an empty follow-ups list and
        // let the merged stream surface the error. We still want the
        // `data-followups` part so the client isn't left waiting.
        writer.write({
          type: "data-followups",
          id: "followups",
          data: [],
        });
        return;
      }

      try {
        const followUpsGen = await generateText({
          model: getSynthesisModel(),
          system:
            "You are a follow-up question generator for the Living Atlanta oral-history archive (Atlanta 1914–1977). Given an answer to a visitor's question, propose exactly three short follow-up questions the visitor could ask next. Each must be specific, under 90 characters, answerable from the collection, and distinct in angle from the others — favor different framings (a deeper dive on a named person, a different neighborhood, a move across eras, a contrast between speakers). If the answer says the archive does not have material on the topic, pivot to topics the collection does cover (Sweet Auburn businesses, the 1906 Race Massacre, the streetcar era, segregated schools, church life). No citation markers.",
          prompt: `ANSWER:\n${stripCitationMarkers(answerText)}\n\nReturn three follow-up questions as the \`followUps\` array.`,
          experimental_output: Output.object({ schema: followUpsSchema }),
          maxOutputTokens: FOLLOWUPS_MAX_OUTPUT_TOKENS,
        });
        const followUps = followUpsGen.experimental_output?.followUps ?? [];
        writer.write({
          type: "data-followups",
          id: "followups",
          data: followUps,
        });
      } catch (err) {
        Sentry.captureException(err);
        console.error("[portal-followups] generation failed", err);
        writer.write({
          type: "data-followups",
          id: "followups",
          data: [],
        });
      }
    },
  });

  return createUIMessageStreamResponse({ stream });
}
