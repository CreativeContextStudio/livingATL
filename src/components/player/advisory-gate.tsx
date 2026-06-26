"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getAdvisoryText,
  type AdvisoryVersion,
} from "@/lib/content-advisory";
import type { ContentAdvisory } from "@/lib/queries/recordings";

/**
 * Pre-playback content-advisory gate — PRD §7.2 + §8.5.
 *
 * Modal blocks playback until the user explicitly clicks the continue
 * button. Editorial contract:
 *   - no auto-dismiss
 *   - no keyboard shortcut skip (ESC / backdrop-click suppressed via
 *     `dismissible={false}` on the base-ui Dialog Root)
 *   - the full versioned text comes from `lib/content-advisory.ts`, keyed on
 *     `advisory.advisory_version`
 *
 * This is a legal/editorial boundary, not a UX hint. Do not relax the
 * dismissibility without editorial review.
 */
export function AdvisoryGate({
  advisory,
  onAccept,
}: {
  advisory: ContentAdvisory | null;
  onAccept: () => void;
}) {
  const text = getAdvisoryText(
    (advisory?.advisory_version ?? null) as AdvisoryVersion | null,
  );

  // Belt-and-suspenders: if some future base-ui change leaks an ESC close,
  // trap the key here so the gate still can't be skipped without a click.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, []);

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[calc(100%-2rem)] gap-6 p-6 sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl leading-tight">
            {text.title}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            {text.full}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Link
            href="/browse"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            Back to Browser
          </Link>
          <Button
            size="lg"
            onClick={onAccept}
            className="bg-primary text-primary-foreground"
            autoFocus
          >
            {text.continueLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
