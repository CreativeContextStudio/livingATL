"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { SendHorizontalIcon } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PortalResponseCard } from "@/components/portal/portal-response-card";
import { CitationsPanel } from "@/components/portal/citations-panel";
import { capturePortalEvent } from "@/lib/portal/analytics";
import {
  ACCENT_BY_KEY,
  defaultSlice,
  samplePerGroup,
  type GroupKey,
  type PromptGroup,
} from "@/lib/portal/prompt-library";
import type {
  PortalCitation,
  PortalUIMessage,
} from "@/app/api/portal/chat/route";

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
 * with the `text-primary` coral), a thin rule between turn groups, flush-
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

/**
 * Truncate a past question down to the first ~7 words for the coda
 * overture. Strips leading punctuation, lowercases the first word so the
 * overture reads as a prepositional fragment ("on auburn avenue nightlife"),
 * appends an ellipsis when truncated. Pure local heuristic — no server
 * round-trip. Ugly results happen gracefully (just more words until the
 * natural word boundary).
 */
function compressQuestion(text: string): string {
  const cleaned = text.trim().replace(/^[^\p{L}\p{N}]+/u, "");
  if (!cleaned) return "earlier question";
  const words = cleaned.split(/\s+/);
  const kept = words.slice(0, 7).join(" ").replace(/[.,;:!?]+$/, "");
  const truncated = words.length > 7;
  const lower = kept.charAt(0).toLowerCase() + kept.slice(1);
  return truncated ? `${lower}…` : lower;
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
} {
  let text = "";
  let allCitations: PortalCitation[] = [];
  let followUps: string[] = [];
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
  };
}

// ---------------------------------------------------------------------------
// Main island
// ---------------------------------------------------------------------------

export function PortalClient() {
  const { messages, sendMessage, status, error } = useChat<PortalUIMessage>({
    transport: new DefaultChatTransport({ api: "/api/portal/chat" }),
  });

  const [input, setInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Origin group per user-turn ordinal index (0, 1, 2, …). Populated when
  // a visitor clicks a prompt card or a follow-up; typed-from-scratch
  // questions leave the slot empty and render with a neutral border.
  const [originByTurn, setOriginByTurn] = useState<Map<number, GroupKey>>(
    () => new Map(),
  );

  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isLoading = status === "submitted" || status === "streaming";
  const hasConversation = messages.length > 0 || isLoading;
  const showEmptyState = messages.length === 0 && !isLoading;
  const hasInput = input.trim().length > 0;

  // Auto-scroll the conversation into view as text deltas arrive. The scroll
  // target is the end-of-list anchor — this keeps the most recent token
  // visible without fighting user-initiated scrolling.
  useEffect(() => {
    if (messages.length === 0) return;
    scrollAnchorRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, status]);

  // Translate useChat errors into user-facing copy. Preview-mode 403 is the
  // one server error the Portal surfaces distinctly; everything else is a
  // generic "try again" message.
  useEffect(() => {
    if (!error) {
      setErrorMessage(null);
      return;
    }
    if (error.message.toLowerCase().includes("preview_mode")) {
      setErrorMessage(
        "The archive is not yet public. This Portal is gated behind preview mode.",
      );
    } else {
      setErrorMessage(
        "Something went wrong while answering. Please try again.",
      );
    }
  }, [error]);

  // Refocus the input after a turn completes so the visitor can keep asking
  // follow-ups without reaching for the mouse.
  useEffect(() => {
    if (!isLoading) {
      textareaRef.current?.focus();
    }
  }, [isLoading]);

  const submit = useCallback(
    (rawText: string, sourceGroup?: GroupKey) => {
      const question = rawText.trim();
      if (!question || isLoading) return;

      const turnIndex = messages.filter((m) => m.role === "user").length;

      setErrorMessage(null);
      capturePortalEvent("portal_query", {
        question_length: question.length,
        turn_index: turnIndex,
      });

      if (sourceGroup) {
        setOriginByTurn((prev) => {
          const next = new Map(prev);
          next.set(turnIndex, sourceGroup);
          return next;
        });
      }

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

  const userTurnCount = messages.filter((m) => m.role === "user").length;

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-border bg-card/40",
        "h-[70dvh] lg:h-full lg:min-h-0",
      )}
    >
      {/* Header row — mirrors the Player's Transcript card header. */}
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <div aria-hidden className="h-1.5 w-8 rounded-full bg-primary" />
          <h2 className="font-heading text-xs font-semibold tracking-[0.14em] uppercase">
            Conversation
          </h2>
        </div>
        <p className="font-mono text-[10px] tabular-nums tracking-[0.18em] uppercase text-muted-foreground">
          {hasConversation
            ? `${userTurnCount} turn${userTurnCount === 1 ? "" : "s"}`
            : "Ready"}
        </p>
      </div>

      {/* Scroll region */}
      <div className="scrollbar-soft min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="flex flex-col gap-6">
          {showEmptyState ? (
            <EmptyStateWithSampledPrompts onPick={submit} />
          ) : null}

          {hasConversation ? (
            (() => {
              // Pre-compute the user-turn ordinal for every message so the
              // accent-color lookup is O(1) in the render loop below. An
              // assistant message inherits the ordinal of its preceding
              // user turn — they're the two halves of one conversational
              // pair.
              let userOrdinal = -1;
              const ordinals = messages.map((m) => {
                if (m.role === "user") userOrdinal += 1;
                return userOrdinal;
              });
              const lastUserIdx = findLastUserIndex(messages);
              const lastUserOrdinal = userTurnCount - 1;
              const loadingGroupKey =
                lastUserOrdinal >= 0
                  ? originByTurn.get(lastUserOrdinal)
                  : undefined;
              const loadingAccent = loadingGroupKey
                ? ACCENT_BY_KEY[loadingGroupKey]
                : undefined;
              return (
                <ol
                  // Horizontal divider appears above a user turn at every
                  // pair boundary (i.e., any user turn that isn't the
                  // first li). Within a pair (user → archive answer), no
                  // divider — they read as one exchange.
                  className="flex flex-col [&>li[data-role='user']:not(:first-child)]:mt-5 [&>li[data-role='user']:not(:first-child)]:border-t [&>li[data-role='user']:not(:first-child)]:border-border/40 [&>li[data-role='user']:not(:first-child)]:pt-5"
                >
                  {messages.map((message, idx) => {
                    // A turn is "current" if it belongs to the last
                    // user+archive pair. Everything before renders in
                    // coda (compact) form.
                    const isCurrent = idx >= lastUserIdx;
                    const ordinal = ordinals[idx];
                    const groupKey =
                      ordinal >= 0 ? originByTurn.get(ordinal) : undefined;
                    const accent = groupKey
                      ? ACCENT_BY_KEY[groupKey]
                      : undefined;
                    return (
                      <li
                        key={message.id}
                        data-role={message.role}
                        className={cn(
                          "border-l-2 pl-3",
                          accent?.leftBorder ?? "border-l-transparent",
                        )}
                      >
                        {message.role === "user" ? (
                          isCurrent ? (
                            <UserTurn text={extractUserText(message)} />
                          ) : (
                            <UserTurnCoda text={extractUserText(message)} />
                          )
                        ) : (
                          <AssistantTurn
                            message={message}
                            onPickFollowUp={submit}
                            sourceGroup={groupKey}
                            isCurrent={isCurrent}
                          />
                        )}
                      </li>
                    );
                  })}
                  {status === "submitted" ? (
                    <li
                      data-role="assistant"
                      className={cn(
                        "border-l-2 pl-3",
                        loadingAccent?.leftBorder ?? "border-l-transparent",
                      )}
                    >
                      <AssistantTurnLoading />
                    </li>
                  ) : null}
                  <li aria-hidden>
                    <div ref={scrollAnchorRef} />
                  </li>
                </ol>
              );
            })()
          ) : null}

          {errorMessage ? (
            <div
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {errorMessage}
            </div>
          ) : null}
        </div>
      </div>

      {/* Input bar — anchored to the bottom of the workspace card. */}
      <div
        className={cn(
          "flex flex-col gap-2 border-t border-border/60 bg-card/60 px-4 py-3",
          "focus-within:bg-card/80",
        )}
      >
        <div className="hidden items-center gap-2 px-1 sm:flex">
          <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
            Ask the archive
          </p>
          <div aria-hidden className="h-px flex-1 bg-border/70" />
          {hasInput && !isLoading ? (
            <kbd
              aria-hidden
              className="inline-flex items-center gap-0.5 rounded-md border border-border/70 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-[0.08em] text-muted-foreground"
            >
              <span className="text-[11px] leading-none">⌘</span>
              <span>↵</span>
            </kbd>
          ) : null}
        </div>
        <form onSubmit={onFormSubmit} className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            onKeyDown={onKeyDown}
            placeholder="A person, a neighborhood, an era — type your question…"
            rows={2}
            disabled={isLoading}
            aria-label="Ask the archive a question"
            className={cn(
              "min-h-10 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground",
              "focus:outline-none disabled:opacity-50",
            )}
          />
          <Button
            type="submit"
            size="sm"
            disabled={isLoading || !hasInput}
            aria-label="Ask"
          >
            <SendHorizontalIcon className="size-3.5" />
            <span>Ask</span>
          </Button>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

/**
 * Hook — returns a `PromptGroup[]` that is deterministic on the first
 * render (so SSR and client's first render agree) and replaced with a
 * session-stable random sample on mount.
 *
 * Pattern: the initial `useState` value runs on both the server and the
 * client's first render, so it must be deterministic — we return the
 * `defaultSlice` (first N of each group's pool). The `useEffect` then
 * runs only on the client after hydration and sets the state to a random
 * sample. The sample is taken once per mount; subsequent re-renders (new
 * input characters, new turns) do not re-sample.
 */
function useSampledPrompts(n: number): PromptGroup[] {
  const [groups, setGroups] = useState<PromptGroup[]>(() =>
    defaultSlice(n).map((g) => ({
      key: g.key,
      label: g.label,
      accent: g.accent,
      prompts: [...g.prompts],
    })),
  );
  useEffect(() => {
    setGroups(samplePerGroup(n));
  }, [n]);
  return groups;
}

function EmptyStateWithSampledPrompts({
  onPick,
}: {
  onPick: (q: string, sourceGroup: GroupKey) => void;
}) {
  const groups = useSampledPrompts(PROMPTS_PER_GROUP);
  return <EmptyState groups={groups} onPick={onPick} />;
}

function EmptyState({
  groups,
  onPick,
}: {
  groups: ReadonlyArray<PromptGroup>;
  onPick: (q: string, sourceGroup: GroupKey) => void;
}) {
  return (
    <section
      className="flex flex-col gap-6"
      aria-labelledby="portal-empty-heading"
    >
      <div className="flex flex-col gap-2">
        <h2
          id="portal-empty-heading"
          className="font-heading text-xl font-semibold text-foreground"
        >
          The archive answers in the voices that lived it.
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-foreground/75">
          Start with one of these, or type your own. Every response cites the
          recordings it draws from — click a citation to hear that moment in
          the Player.
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-3">
        {groups.map((group) => (
          <li
            key={group.label}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card/40 p-4"
          >
            <div className="flex items-center gap-2">
              <div
                aria-hidden
                className={cn("h-px w-6", group.accent.stripe)}
              />
              <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
                {group.label}
              </p>
            </div>
            <ul className="flex flex-col gap-2">
              {group.prompts.map((prompt) => (
                <li key={prompt}>
                  <button
                    type="button"
                    onClick={() => onPick(prompt, group.key)}
                    className={cn(
                      "w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-left text-xs leading-relaxed text-foreground/85",
                      "transition-all hover:-translate-y-0.5 hover:bg-muted hover:text-foreground",
                      group.accent.hoverBorder,
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                    )}
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
 * Right-aligned user turn (current). Label + thin rule anchor to the right
 * edge; body reads right-aligned with a max-width so short questions don't
 * stretch across the full conversation column.
 */
function UserTurn({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex w-full items-center gap-2">
        <div aria-hidden className="h-px flex-1 bg-border/60" />
        <p className="font-mono text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
          You
        </p>
      </div>
      <p className="max-w-[80%] whitespace-pre-line text-right text-sm leading-relaxed text-foreground">
        {text}
      </p>
    </div>
  );
}

/**
 * Compressed past-question overture. Sits in the coda register — one italic
 * mono-tracked line echoing the page-section eyebrow vocabulary elsewhere in
 * the app. Reads as a chapter mark, not a standalone turn.
 */
function UserTurnCoda({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[85%] text-right font-mono text-[10px] tracking-[0.14em] uppercase italic text-muted-foreground/85">
        — on {compressQuestion(text)} —
      </p>
    </div>
  );
}

/**
 * Left-aligned archive turn. Carries the "THE ARCHIVE · N voices" label
 * externally (replacing the old PortalResponseCard `Answer` header), leans
 * on flush-left prose for the body, and conditionally renders citations
 * panel + follow-ups only for the current turn. Past-turn archive answers
 * keep the prose body for readability but collapse the citations panel.
 */
function AssistantTurn({
  message,
  onPickFollowUp,
  sourceGroup,
  isCurrent,
}: {
  message: PortalUIMessage;
  onPickFollowUp: (question: string, sourceGroup?: GroupKey) => void;
  sourceGroup?: GroupKey;
  isCurrent: boolean;
}) {
  const { text, citationsForLookup, citationsForPanel, followUps } =
    extractAssistantFields(message);
  const voiceCount = citationsForPanel.length;
  return (
    <div
      className="flex max-w-[92%] flex-col gap-3"
      aria-label="Archive answer"
    >
      <ArchiveSpeakerLabel voiceCount={voiceCount} />
      <PortalResponseCard text={text} citations={citationsForLookup} />
      {voiceCount > 0 ? (
        <CitationsPanel
          citations={citationsForPanel}
          collapsed={!isCurrent}
        />
      ) : null}
      {isCurrent && followUps.length > 0 ? (
        <FollowUps
          prompts={followUps}
          onPick={(q) => onPickFollowUp(q, sourceGroup)}
        />
      ) : null}
    </div>
  );
}

/** Loading-state archive turn — label + skeleton-variant body. Rendered
 *  during `status === "submitted"` before the first text token arrives. */
function AssistantTurnLoading() {
  return (
    <div className="flex max-w-[92%] flex-col gap-3">
      <ArchiveSpeakerLabel voiceCount={0} loading />
      <PortalResponseCard text="" citations={[]} loading />
    </div>
  );
}

/**
 * "The archive · N voices ───" speaker label. Mono-tracked uppercase per
 * the Transcript Pane precedent; `text-primary` coral on "The archive"
 * mirrors how the Player renders the interviewee's name. `N voices` is the
 * active citation count — hidden when 0 (refusal answers don't count as
 * "voices") or during loading.
 */
function ArchiveSpeakerLabel({
  voiceCount,
  loading = false,
}: {
  voiceCount: number;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <p className="font-mono text-[10px] font-semibold tracking-[0.18em] uppercase text-primary">
        The archive
      </p>
      {!loading && voiceCount > 0 ? (
        <p className="font-mono text-[10px] tabular-nums tracking-[0.14em] uppercase text-muted-foreground">
          · {voiceCount} {voiceCount === 1 ? "voice" : "voices"}
        </p>
      ) : null}
      {loading ? (
        <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground italic">
          · retrieving…
        </p>
      ) : null}
      <div aria-hidden className="h-px flex-1 bg-border/60" />
    </div>
  );
}

/**
 * Walks messages backwards to find the last `user` message. The current
 * turn = that user message + any assistant message following it. Anything
 * before compresses into coda form.
 */
function findLastUserIndex(messages: PortalUIMessage[]): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return i;
  }
  return -1;
}

function FollowUps({
  prompts,
  onPick,
}: {
  prompts: string[];
  onPick: (question: string) => void;
}) {
  return (
    <section
      aria-labelledby="portal-followups-heading"
      className="flex flex-col gap-2"
    >
      <div className="flex items-center gap-3">
        <h4
          id="portal-followups-heading"
          className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground"
        >
          Keep going
        </h4>
        <div aria-hidden className="h-px flex-1 bg-border/70" />
      </div>
      <ul className="flex flex-wrap gap-2">
        {prompts.map((prompt, idx) => (
          <li key={`${idx}-${prompt}`}>
            <button
              type="button"
              onClick={() => onPick(prompt)}
              className={cn(
                "rounded-full border border-border bg-background px-3 py-1.5 text-left text-xs text-foreground/80",
                "transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              )}
            >
              {prompt}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
