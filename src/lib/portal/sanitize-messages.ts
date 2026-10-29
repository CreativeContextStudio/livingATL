import type { UIMessage } from "ai";

/**
 * Server-side rebuild of the Portal conversation before it reaches the model.
 *
 * `useChat` resends the whole history every turn, and the request body is
 * fully client-controlled. Passing it straight to `convertToModelMessages`
 * would let a caller inject `role: "system"` messages (AI SDK v6 converts them
 * into real system messages), attach `file` parts or `providerMetadata`, or
 * send an unbounded history. So we never trust the client's message objects:
 * we read only user/assistant text, cap sizes, keep a short window, and build
 * fresh `UIMessage`s from scratch.
 */

/** Hard ceiling on the raw request body. A max-length 6-message window is ~30 KB. */
export const MAX_BODY_BYTES = 64 * 1024;
/** The visitor's question. Mirrors the textarea `maxLength` in portal-client. */
export const MAX_QUESTION_CHARS = 1000;
/** Prior assistant answers are truncated, not rejected — they're our own output. */
const MAX_ASSISTANT_CHARS = 4000;
/** Reject absurd arrays outright rather than iterating them. */
const MAX_INCOMING_MESSAGES = 60;
/** Messages forwarded to the model: the current question plus 2.5 prior turns. */
const HISTORY_WINDOW = 6;

export type SanitizeResult =
  | { ok: true; messages: UIMessage[]; question: string }
  | { ok: false; status: 400; error: string };

function textOf(message: unknown): string {
  if (!message || typeof message !== "object") return "";
  const parts = (message as { parts?: unknown }).parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .filter(
      (p): p is { type: "text"; text: string } =>
        !!p &&
        typeof p === "object" &&
        (p as { type?: unknown }).type === "text" &&
        typeof (p as { text?: unknown }).text === "string",
    )
    .map((p) => p.text)
    .join(" ")
    .trim();
}

export function sanitizePortalMessages(raw: unknown): SanitizeResult {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, status: 400, error: "empty_question" };
  }
  if (raw.length > MAX_INCOMING_MESSAGES) {
    return { ok: false, status: 400, error: "too_many_messages" };
  }

  const cleaned: UIMessage[] = [];
  raw.forEach((message, i) => {
    const role = (message as { role?: unknown } | null)?.role;
    if (role !== "user" && role !== "assistant") return;
    let text = textOf(message);
    if (!text) return;
    if (role === "assistant" && text.length > MAX_ASSISTANT_CHARS) {
      text = text.slice(0, MAX_ASSISTANT_CHARS);
    }
    if (role === "user" && text.length > MAX_QUESTION_CHARS) {
      text = text.slice(0, MAX_QUESTION_CHARS);
    }
    cleaned.push({ id: `m${i}`, role, parts: [{ type: "text", text }] });
  });

  // The turn being answered must be the visitor's, and must fit the cap
  // un-truncated — silently answering half a question is worse than a 400.
  const last = raw[raw.length - 1] as { role?: unknown } | null;
  const question = textOf(last);
  if (last?.role !== "user" || !question) {
    return { ok: false, status: 400, error: "empty_question" };
  }
  if (question.length > MAX_QUESTION_CHARS) {
    return { ok: false, status: 400, error: "question_too_long" };
  }

  let window = cleaned.slice(-HISTORY_WINDOW);
  // Model input should open on a user turn.
  while (window.length > 1 && window[0].role !== "user") window = window.slice(1);

  return { ok: true, messages: window, question };
}
