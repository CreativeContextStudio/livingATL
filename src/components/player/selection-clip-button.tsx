"use client";

import { useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { CheckIcon, ScissorsIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { clipForSegments, clipHref, type ClipRange } from "@/lib/clips";
import { formatTimestamp } from "@/lib/player";
import type { TranscriptSegment } from "@/lib/queries/player";

type Pending = { clip: ClipRange; top: number; left: number };

function segmentIndexOf(node: Node | null): number | null {
  const el = node instanceof Element ? node : node?.parentElement;
  const row = el?.closest<HTMLElement>("[data-segment-index]");
  return row ? Number(row.dataset.segmentIndex) : null;
}

/**
 * Select transcript text → a floating "Share clip" button. The clip spans
 * the whole segments the selection touches, so the link plays exactly the
 * passage the visitor highlighted (PRD F-clips).
 */
export function SelectionClipButton({
  containerRef,
  segments,
}: {
  containerRef: RefObject<HTMLElement | null>;
  segments: TranscriptSegment[];
}) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let frame = 0;
    const onChange = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const sel = document.getSelection();
        const container = containerRef.current;
        if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !container) {
          setPending(null);
          return;
        }
        if (!container.contains(sel.anchorNode) || !container.contains(sel.focusNode)) {
          setPending(null);
          return;
        }
        const a = segmentIndexOf(sel.anchorNode);
        const b = segmentIndexOf(sel.focusNode);
        const clip = a === null || b === null ? null : clipForSegments(segments, a, b);
        if (!clip) {
          setPending(null);
          return;
        }
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        setCopied(false);
        setPending({
          clip,
          // Clamp into the viewport — the selection may be partly scrolled away.
          top: Math.max(8, Math.min(rect.bottom + 8, window.innerHeight - 48)),
          left: Math.max(8, Math.min(rect.left, window.innerWidth - 200)),
        });
      });
    };
    document.addEventListener("selectionchange", onChange);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("selectionchange", onChange);
    };
  }, [containerRef, segments]);

  if (!pending) return null;
  const length = formatTimestamp(pending.clip.end - pending.clip.start);

  return createPortal(
    <div className="fixed z-50" style={{ top: pending.top, left: pending.left }}>
      <Button
        size="sm"
        className="shadow-lg"
        // Keep the text selection alive while pressing the button.
        onMouseDown={(e) => e.preventDefault()}
        onClick={async () => {
          const href = clipHref(window.location.href, pending.clip);
          try {
            await navigator.clipboard.writeText(href);
            setCopied(true);
            window.setTimeout(() => {
              setPending(null);
              document.getSelection()?.removeAllRanges();
            }, 1200);
          } catch {
            window.prompt("Copy this clip link:", href);
          }
        }}
        aria-label={`Copy link to the selected clip, ${formatTimestamp(pending.clip.start)} to ${formatTimestamp(pending.clip.end)}`}
      >
        {copied ? <CheckIcon aria-hidden className="size-3.5" /> : <ScissorsIcon aria-hidden className="size-3.5" />}
        {copied ? "Copied" : `Share clip · ${length}`}
      </Button>
    </div>,
    document.body,
  );
}
