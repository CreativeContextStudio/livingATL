"use client";

import { useCallback, useMemo, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ArrowDownUpIcon } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BrowserSort } from "@/lib/queries/recordings";

type SortOption = {
  value: BrowserSort;
  label: string;
  short: string;
};

const SORT_OPTIONS: SortOption[] = [
  { value: "alphabetical", label: "Alphabetical (last name)", short: "A–Z · last name" },
  { value: "alphabetical_first", label: "Alphabetical (first name)", short: "A–Z · first name" },
  { value: "date_recorded_desc", label: "Date recorded (newest first)", short: "Newest recording" },
  { value: "duration_desc", label: "Duration (longest first)", short: "Longest first" },
  { value: "date_added_desc", label: "Date added (newest first)", short: "Recently added" },
];

export function SortSelect({ value }: { value: BrowserSort }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const shortByValue = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of SORT_OPTIONS) map.set(o.value, o.short);
    // "random" is the default when no `?sort=` param is present. The
    // SortSelect intentionally doesn't advertise a Shuffle option — the
    // trigger renders the same label it used to render as the default
    // so the UI reads as unchanged while the server picks a fresh order
    // per request.
    map.set("random", map.get("alphabetical") ?? "Shuffled");
    return map;
  }, []);

  const onChange = useCallback(
    (next: string | null) => {
      if (next == null) return;
      // Every explicit pick writes to the URL. The absence of `?sort=` is
      // reserved for the default random order — so we can't collapse
      // "alphabetical" to a missing param anymore the way we used to.
      const params = new URLSearchParams(searchParams.toString());
      params.set("sort", next);
      const qs = params.toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="flex w-full items-center gap-2 sm:w-auto">
      <span
        aria-hidden
        className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase"
      >
        Sort
      </span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 w-full min-w-0 flex-1 gap-2 rounded-lg sm:w-auto sm:flex-none sm:min-w-[14rem]">
          <ArrowDownUpIcon
            aria-hidden
            className="size-3.5 text-muted-foreground"
          />
          <SelectValue placeholder="Sort by">
            {(v) => (
              <span className="truncate text-sm">
                {typeof v === "string" ? shortByValue.get(v) ?? v : "Sort by"}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
