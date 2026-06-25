"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Browser search input — writes `?q=` search param with a 200ms debounce so
 * typing feels instant locally while the RSC round-trip catches up. The
 * query runs server-side via `fetchBrowserRecordings({ search, ... })`
 * against pg_trgm + GIN indexes on title / catalog / speakers.name /
 * ai_summary, so it scales cleanly as the corpus grows from 48 → 400+.
 *
 * Scope (PRD §7.1): metadata + speaker names + brief overview +
 * organizations. Full-transcript search is an AI Portal (§7.4) concern.
 */
const DEBOUNCE_MS = 200;

export function SearchInput({ initialValue = "" }: { initialValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const [value, setValue] = useState(initialValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentParam = searchParams.get("q") ?? "";
  const [lastSeenParam, setLastSeenParam] = useState(currentParam);
  if (currentParam !== lastSeenParam) {
    setLastSeenParam(currentParam);
    setValue(currentParam);
  }

  const pushQuery = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.trim().length === 0) {
        params.delete("q");
      } else {
        params.set("q", next);
      }
      const qs = params.toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const onChange = useCallback(
    (next: string) => {
      setValue(next);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => pushQuery(next), DEBOUNCE_MS);
    },
    [pushQuery],
  );

  const onClear = useCallback(() => {
    setValue("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    pushQuery("");
    inputRef.current?.focus();
  }, [pushQuery]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ⌘K / Ctrl+K — global focus shortcut.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const hasValue = value.length > 0;

  return (
    <div
      className={cn(
        "group relative flex h-9 w-full items-center rounded-lg border border-input bg-background",
        "transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40",
      )}
    >
      <SearchIcon
        aria-hidden
        className="pointer-events-none ml-3 size-4 shrink-0 text-muted-foreground transition-colors group-focus-within:text-foreground"
      />
      <input
        ref={inputRef}
        type="search"
        placeholder="Search storytellers, titles, summaries…"
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        aria-label="Search recordings"
        className={cn(
          "h-full min-w-0 flex-1 bg-transparent px-2.5 text-sm text-foreground placeholder:text-muted-foreground",
          "focus:outline-none [&::-webkit-search-cancel-button]:hidden",
        )}
      />
      {hasValue ? (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className={cn(
            "mr-1.5 inline-flex size-6 items-center justify-center rounded-md text-muted-foreground",
            "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          )}
        >
          <XIcon className="size-3.5" />
        </button>
      ) : (
        <kbd
          aria-hidden
          className={cn(
            "mr-2 hidden select-none items-center gap-0.5 rounded-md border border-border/70 bg-muted/50 px-1.5 py-0.5",
            "font-mono text-[10px] font-medium tracking-[0.08em] text-muted-foreground sm:inline-flex",
          )}
        >
          <span className="text-[11px] leading-none">⌘</span>
          <span>K</span>
        </kbd>
      )}
    </div>
  );
}
