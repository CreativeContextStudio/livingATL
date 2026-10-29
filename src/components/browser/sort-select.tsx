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
  { value: "random", label: "Shuffle", short: "Shuffled" },
];

export function SortSelect({ value }: { value: BrowserSort }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const shortByValue = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of SORT_OPTIONS) map.set(o.value, o.short);
    return map;
  }, []);

  const onChange = useCallback(
    (next: string | null) => {
      if (next == null) return;
      // The default (alphabetical) is the absence of `?sort=`, so the
      // canonical URL stays clean; every other pick writes the param.
      const params = new URLSearchParams(searchParams.toString());
      if (next === "alphabetical") params.delete("sort");
      else params.set("sort", next);
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
