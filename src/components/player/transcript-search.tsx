"use client";

import { useEffect, useRef } from "react";
import { ChevronDownIcon, ChevronUpIcon, SearchIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Transcript search bar — sits above the accordion header of the Transcript
 * section on the Player page. Does no searching itself; the parent owns
 * `query`, match indices, and navigation state. This component is a pure
 * controlled input + next/prev + match-count indicator.
 *
 * Keyboard: `Enter` inside the input jumps to the next match; `Shift+Enter`
 * jumps to the previous match. Escape clears the query.
 */
export function TranscriptSearch({
  query,
  onQueryChange,
  matchCount,
  currentPosition,
  onNext,
  onPrev,
  autoFocusKey,
}: {
  query: string;
  onQueryChange: (next: string) => void;
  matchCount: number;
  /** 1-indexed position of the focused match (1 of N). 0 = no match focused. */
  currentPosition: number;
  onNext: () => void;
  onPrev: () => void;
  /** Changing this re-focuses the input — use for programmatic focus
   *  requests from keyboard shortcuts. */
  autoFocusKey?: unknown;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (autoFocusKey === undefined) return;
    inputRef.current?.focus();
  }, [autoFocusKey]);

  const hasQuery = query.trim().length > 0;
  const showNav = hasQuery && matchCount > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex flex-1 items-center">
        <SearchIcon
          aria-hidden
          className="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground"
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (!hasQuery || matchCount === 0) return;
              if (e.shiftKey) onPrev();
              else onNext();
            } else if (e.key === "Escape") {
              e.preventDefault();
              onQueryChange("");
            }
          }}
          placeholder="Search transcript…"
          aria-label="Search transcript"
          className={cn(
            "h-8 w-full rounded-md border border-border bg-background pr-7 pl-8 text-sm text-foreground placeholder:text-muted-foreground",
            "transition-colors focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
          )}
        />
        {hasQuery ? (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            aria-label="Clear search"
            className="absolute right-1.5 rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <XIcon className="size-3.5" />
          </button>
        ) : null}
      </div>

      {hasQuery ? (
        <div
          className="flex items-center gap-1 font-mono text-[11px] tabular-nums text-muted-foreground"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {matchCount === 0 ? (
            <span>No matches</span>
          ) : (
            <span>
              {currentPosition} <span className="text-muted-foreground/60">of</span>{" "}
              {matchCount}
            </span>
          )}
          {showNav ? (
            <div className="ml-1 flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={onPrev}
                aria-label="Previous match"
                title="Previous match (Shift+Enter)"
              >
                <ChevronUpIcon className="size-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={onNext}
                aria-label="Next match"
                title="Next match (Enter)"
              >
                <ChevronDownIcon className="size-3" />
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
