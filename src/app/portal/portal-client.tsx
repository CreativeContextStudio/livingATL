"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { RotateCcwIcon, SendHorizontalIcon, SquareIcon } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

import { Button } from "@/components/ui/button";
import { PortalResponseCard } from "@/components/portal/portal-response-card";
import { ShareAnswer } from "@/components/portal/share-answer";
import { CitationsPanel } from "@/components/portal/citations-panel";
import { capturePortalEvent } from "@/lib/portal/analytics";
import { MAX_QUESTION_CHARS } from "@/lib/portal/sanitize-messages";
import {
  defaultSlice,
  samplePerGroup,
  type PromptGroup,
} from "@/lib/portal/prompt-library";
import type {
  PortalCitation,
  PortalUIMessage,
} from "@/app/api/portal/chat/route";
import { PlayCitationsButton } from "@/components/queue/queue-buttons";

/**
 * Portal chat island — PRD §7.4. v0.3: transcript-idiom chat thread.
 *
 * Uses AI SDK v6 `useChat` from `@ai-sdk/react` with a `DefaultChatTransport`
 * pointed at `/api/portal/chat`. The server emits a UIMessageStream that
 * carries text deltas (streaming answer), a `data-citations` part (emitted
 * up-front so the source panel can render immediately), and a
 * `data-followups` part (emitted after the answer finishes).
 *
 * Visual register borrows the Player's Transcript Pane: mono-tracked
 * uppercase speaker labels ("YOU" right-aligned, "THE ARCHIVE" left-aligned
 * with the `text-primary-ink` coral), a thin rule between turn groups, flush-
 * left prose for the archive's answer (no nested card chrome). Past turns
 * compress — user question becomes an italic overture, citations collapse
 * behind a `▾ N sources` toggle, follow-ups hide. Only the current pair
 * (last user question + its archive answer) renders full-body.
 */

// Empty-state prompt pool lives in `@/lib/portal/prompt-library`. The
// visible 2-per-group slice is randomized per-session on mount (see
// `useSampledPrompts` below). The SSR/initial-render slice is deterministic
// (first N per group) so the server HTML matches the client's first render
// and hydration stays clean.
const PROMPTS_PER_GROUP = 2;

// ---------------------------------------------------------------------------
// Part extraction — read text / citations / followups from UIMessage.parts
// ---------------------------------------------------------------------------

/** `[3]` / `[1, 4]` citation markers read as noise when announced. */
function stripCitationMarks(text: string): string {
  return text
    .replace(/\s*\[\s*\d+(\s*[,|]\s*\d+)*\s*\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractUserText(message: PortalUIMessage): string {
  return message.parts
    .filter(
      (p): p is { type: "text"; text: string } =>
        p.type === "text" &&
        typeof (p as { text?: unknown }).text === "string",
    )
    .map((p) => p.text)
    .join("");
}

function extractAssistantFields(message: PortalUIMessage): {
  text: string;
  citationsForLookup: PortalCitation[];
  citationsForPanel: PortalCitation[];
  followUps: string[];
  share: { sig: string; question: string } | null;
} {
  let text = "";
  let allCitations: PortalCitation[] = [];
  let followUps: string[] = [];
  let share: { sig: string; question: string } | null = null;
  for (const part of message.parts) {
    if (
      part.type === "text" &&
      typeof (part as { text?: unknown }).text === "string"
    ) {
      text += (part as { text: string }).text;
    } else if (part.type === "data-citations") {
      allCitations = (part as { data: PortalCitation[] }).data;
    } else if (part.type === "data-followups") {
      followUps = (part as { data: string[] }).data;
    } else if (part.type === "data-share") {
      share = (part as { data: { sig: string; question: string } }).data;
    }
  }

  // Inline chips need the full lookup table so `[N]` markers can resolve
  // to recording details as they arrive. The panel below the answer only
  // shows the excerpts the LLM actually referenced via markers — chunks
  // retrieval surfaced but the LLM declined to use aren't "sources" of
  // the answer and including them would be misleading.
  const citedIndices = new Set<number>();
  for (const match of text.matchAll(/\[(\d+(?:\s*[,|]\s*\d+)*)\]/g)) {
    for (const n of match[1].split(/[,|]/)) {
      const parsed = Number.parseInt(n.trim(), 10);
      if (Number.isFinite(parsed)) citedIndices.add(parsed);
    }
  }
  const citationsForPanel =
    citedIndices.size > 0
      ? allCitations.filter((c) => citedIndices.has(c.index))
      : [];

  return {
    text,
    citationsForLookup: allCitations,
    citationsForPanel,
    followUps,
    share,
  };
}

// ---------------------------------------------------------------------------
// Main island
// ---------------------------------------------------------------------------

/**
 * Translate useChat errors into user-facing copy. The transport surfaces the
 * response body as `error.message`, so the route's `error`/`reason` codes are
 * matched here; anything unrecognized gets the generic "try again".
 */
function describePortalError(error: Error | undefined): string | null {
  if (!error) return null;
  const message = error.message.toLowerCase();
  if (message.includes("preview_mode")) {
    return "The archive is not yet public. This Portal is gated behind preview mode.";
  }
  if (message.includes("rate_limited")) {
    return "You're asking faster than the archive can answer. Wait a minute and try again.";
  }
  if (message.includes("question_too_long")) {
    return `Questions are limited to ${MAX_QUESTION_CHARS.toLocaleString()} characters. Try a shorter question.`;
  }
  return "Something went wrong while answering. Please try again.";
}

export function PortalClient() {
  const { messages, sendMessage, status, error, stop, regenerate } =
    useChat<PortalUIMessage>({
      transport: new DefaultChatTransport({ api: "/api/portal/chat" }),
    });

  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLOListElement>(null);

  const isLoading = status === "submitted" || status === "streaming";
  const hasInput = input.trim().length > 0;

  // Pair messages into exchanges: a question and (once it arrives) its answer.
  const exchanges: Array<{ id: string; question: string; answer?: PortalUIMessage }> = [];
  for (const m of messages) {
    if (m.role === "user") exchanges.push({ id: m.id, question: extractUserText(m) });
    else if (m.role === "assistant" && exchanges.length > 0) exchanges[exchanges.length - 1].answer = m;
  }
  const showEmptyState = exchanges.length === 0;

  // A new question scrolls its exchange to the top of the screen, so the
  // answer reads from its first line as it streams in below. Never on load.
  const exchangeCount = exchanges.length;
  const seenCountRef = useRef(0);
  useEffect(() => {
    if (exchangeCount <= seenCountRef.current) {
      seenCountRef.current = exchangeCount;
      return;
    }
    seenCountRef.current = exchangeCount;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-exchange="${exchangeCount - 1}"]`);
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
  }, [exchangeCount]);

  // One persistent screen-reader status: announce the search, stay quiet
  // while tokens stream, then read the finished answer once.
  const lastMessage = messages.at(-1);
  const srStatus =
    status === "submitted"
      ? "Searching the archive…"
      : status === "ready" && lastMessage?.role === "assistant"
        ? `Answer: ${stripCitationMarks(extractAssistantFields(lastMessage).text)}`
        : "";

  // useChat clears `error` when the next request starts, so the copy is
  // derived during render rather than mirrored into state.
  const errorMessage = describePortalError(error);

  // Focus the input on arrival and after each answer, without scrolling the
  // page; skip the on-arrival focus on touch screens (it pops the keyboard).
  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (isLoading) return;
    const firstRun = !hasMountedRef.current;
    hasMountedRef.current = true;
    if (firstRun && !window.matchMedia("(pointer: fine)").matches) return;
    textareaRef.current?.focus({ preventScroll: true });
  }, [isLoading]);

  const submit = useCallback(
    (rawText: string) => {
      const question = rawText.trim();
      if (!question || isLoading) return;
      capturePortalEvent("portal_query", {
        question_length: question.length,
        turn_index: messages.filter((m) => m.role === "user").length,
      });
      setInput("");
      void sendMessage({ text: question });
    },
    [isLoading, messages, sendMessage],
  );

  const onFormSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      submit(input);
    },
    [input, submit],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submit(input);
      }
    },
    [input, submit],
  );

  return (
    <div className="flex flex-1 flex-col gap-8">
      <p role="status" className="sr-only">
        {srStatus}
      </p>

      {showEmptyState ? <EmptyStateWithSampledPrompts onPick={submit} /> : null}

      {exchanges.length > 0 ? (
        <ol ref={listRef} aria-label="Conversation" aria-busy={isLoading} className="flex flex-col gap-10">
          {exchanges.map((ex, i) => {
            const isLast = i === exchanges.length - 1;
            return (
              <li
                key={ex.id}
                data-exchange={i}
                // The latest exchange reserves a screen's height so a new
                // question can scroll to the top while its answer streams in.
                className={isLast ? "min-h-[calc(100dvh-14rem)] scroll-mt-20" : "scroll-mt-20"}
              >
                <article className="flex flex-col gap-4">
                  <h2 className="font-heading text-xl font-semibold leading-snug tracking-tight text-foreground sm:text-2xl">
                    {ex.question}
                  </h2>
                  {ex.answer ? (
                    <Answer message={ex.answer} isCurrent={isLast} onPickFollowUp={submit} />
                  ) : isLast && isLoading ? (
                    <PortalResponseCard text="" citations={[]} loading />
                  ) : null}
                </article>
              </li>
            );
          })}
        </ol>
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-red-800 dark:text-red-200"
        >
          <span>{errorMessage}</span>
          {exchanges.length > 0 ? (
            <Button type="button" size="sm" variant="outline" onClick={() => void regenerate()}>
              <RotateCcwIcon aria-hidden className="size-3.5" />
              Try again
            </Button>
          ) : null}
        </div>
      ) : null}

      {/* Question box, pinned to the bottom of the screen (above the
          listening-queue bar when it's showing). */}
      <div
        className="sticky z-20 mt-auto -mx-4 bg-gradient-to-t from-background from-70% to-transparent px-4 pt-6 pb-4 sm:-mx-6 sm:px-6"
        style={{ bottom: "var(--queue-bar-h, 0px)" }}
      >
        <p id="portal-input-help" className="sr-only">
          Press Enter to send, Shift+Enter for a new line.
        </p>
        <form
          onSubmit={onFormSubmit}
          className="flex items-end gap-2 rounded-xl border border-border bg-card p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            onKeyDown={onKeyDown}
            placeholder={exchanges.length > 0 ? "Ask a follow-up or a new question…" : "Ask about a person, a place, or an event…"}
            rows={1}
            maxLength={MAX_QUESTION_CHARS}
            disabled={isLoading}
            aria-label="Ask the archive a question"
            aria-describedby="portal-input-help"
            className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-base text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 [field-sizing:content]"
          />
          {isLoading ? (
            // While an answer is coming, the send button becomes Stop. What
            // has streamed so far stays on screen.
            <Button type="button" variant="outline" onClick={() => void stop()} aria-label="Stop answering">
              <SquareIcon aria-hidden className="size-3" />
              <span>Stop</span>
            </Button>
          ) : (
            <Button type="submit" disabled={!hasInput} aria-label="Ask">
              <SendHorizontalIcon className="size-3.5" />
              <span>Ask</span>
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

const subscribeNoop = () => () => {};

/**
 * Hook — returns a `PromptGroup[]` that is deterministic on the first
 * render (so SSR and client's first render agree) and switches to a
 * mount-stable random sample once hydrated.
 *
 * Pattern: `useSyncExternalStore` reports `false` while rendering on the
 * server and during hydration (getServerSnapshot) and `true` afterwards, so
 * hydration sees the deterministic `defaultSlice` (first N of each group's
 * pool) and React then re-renders with the random sample. The sample is
 * drawn once per mount in a `useState` initializer; later re-renders (new
 * input characters, new turns) do not re-sample.
 */
function useSampledPrompts(n: number): PromptGroup[] {
  const hydrated = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
  const [defaults] = useState<PromptGroup[]>(() =>
    defaultSlice(n).map((g) => ({
      key: g.key,
      label: g.label,
      accent: g.accent,
      prompts: [...g.prompts],
    })),
  );
  const [sampled] = useState<PromptGroup[]>(() => samplePerGroup(n));
  return hydrated ? sampled : defaults;
}

function EmptyStateWithSampledPrompts({ onPick }: { onPick: (q: string) => void }) {
  const groups = useSampledPrompts(PROMPTS_PER_GROUP);
  return <EmptyState groups={groups} onPick={onPick} />;
}

function EmptyState({
  groups,
  onPick,
}: {
  groups: ReadonlyArray<PromptGroup>;
  onPick: (q: string) => void;
}) {
  return (
    <section aria-label="Example questions" className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">Try one of these, or type your own below.</p>
      <ul className="grid gap-3 sm:grid-cols-3">
        {groups.map((group) => (
          <li key={group.label} className="flex flex-col gap-2">
            <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
              {group.label}
            </p>
            <ul className="flex flex-col gap-2">
              {group.prompts.map((prompt) => (
                <li key={prompt}>
                  <button
                    type="button"
                    onClick={() => onPick(prompt)}
                    className="w-full rounded-lg border border-border bg-card/60 px-3 py-2.5 text-left text-sm leading-snug text-foreground/90 transition-colors hover:border-primary/40 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {prompt}
                  </button>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * One answer: the prose (with inline citation chips), its sources, the
 * Play / Share actions, and — for the latest answer — follow-up questions.
 * Earlier answers keep their prose and actions but collapse their sources.
 */
function Answer({
  message,
  isCurrent,
  onPickFollowUp,
}: {
  message: PortalUIMessage;
  isCurrent: boolean;
  onPickFollowUp: (question: string) => void;
}) {
  const { text, citationsForLookup, citationsForPanel, followUps, share } =
    extractAssistantFields(message);
  const cited = citationsForPanel.length;
  return (
    <div className="flex flex-col gap-5" aria-label="Archive answer">
      <PortalResponseCard text={text} citations={citationsForLookup} />
      {cited > 0 ? (
        <CitationsPanel citations={citationsForPanel} collapsed={!isCurrent} headingLevel="h3" />
      ) : null}
      {cited > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <PlayCitationsButton citations={citationsForPanel} />
          {share ? <ShareAnswer share={share} answer={text} citations={citationsForLookup} /> : null}
        </div>
      ) : null}
      {isCurrent && followUps.length > 0 ? <FollowUps prompts={followUps} onPick={onPickFollowUp} /> : null}
    </div>
  );
}

function FollowUps({ prompts, onPick }: { prompts: string[]; onPick: (question: string) => void }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h3 id={headingId} className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
        Keep going
      </h3>
      <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {prompts.map((prompt, idx) => (
          <li key={`${idx}-${prompt}`}>
            <button
              type="button"
              onClick={() => onPick(prompt)}
              className="w-full rounded-lg border border-border bg-card/60 px-3 py-2 text-left text-sm text-foreground/90 transition-colors hover:border-primary/40 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
            >
              {prompt}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
