"use client";

import { useState } from "react";
import Link from "next/link";
import { SparklesIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getAIAdvisoryText } from "@/lib/content-advisory";

/**
 * "AI advisory" inline link — renders a small underlined text button that
 * opens a dismissible dialog explaining how livingATL was built. Scoped to
 * the Summary card on the Player page for now; slot into other surfaces
 * (Browser footer, /about) later without restructuring.
 *
 * Dismissible on purpose (ESC, backdrop click, explicit Close). The
 * pre-playback content advisory (`AdvisoryGate`) is a legal/editorial
 * boundary and stays non-dismissible — this one is platform disclosure,
 * not a gate.
 */
export function AIAdvisoryLink({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const text = getAIAdvisoryText();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.12em] uppercase text-muted-foreground underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 rounded-sm",
          className,
        )}
      >
        AI advisory
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg gap-6 p-6 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading text-xl leading-tight">
              <SparklesIcon
                aria-hidden
                className="size-4 text-muted-foreground"
              />
              {text.title}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
              {text.body}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
            {/* Placeholder route — wire up /contact page content next.
                Clicking this navigates, which also closes the dialog. */}
            <Link
              href="/contact"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              Contact us
            </Link>
            <Button onClick={() => setOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
