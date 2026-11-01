"use client";

import { useState, type ReactNode } from "react";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** A Player side panel: closed by default, one tap to open. */
export function FoldPanel({
  title,
  aside,
  children,
}: {
  title: string;
  /** Short text at the end of the header row, shown open or closed. */
  aside?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex shrink-0 flex-col gap-3 rounded-xl border border-border bg-card/40 p-5">
      <h3>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-h-6 w-full items-baseline pointer-coarse:min-h-11 pointer-coarse:items-center justify-between gap-3 rounded-sm text-left transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex items-center gap-2">
            <ChevronDownIcon
              aria-hidden
              className={cn(
                "size-3.5 text-muted-foreground transition-transform duration-200",
                open ? "rotate-0" : "-rotate-90",
              )}
            />
            <span className="font-heading text-xs font-semibold tracking-[0.14em] uppercase">{title}</span>
          </span>
          {aside ? <span className="font-mono text-[11px] text-muted-foreground">{aside}</span> : null}
        </button>
      </h3>
      {open ? children : null}
    </div>
  );
}
