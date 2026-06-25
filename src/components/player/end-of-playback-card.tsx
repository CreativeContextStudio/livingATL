"use client";

import { useState } from "react";
import Link from "next/link";
import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatDuration, formatSpeakerName, titleForCard } from "@/lib/format";
import type { RelatedRecording } from "@/lib/queries/player";
import { usePlayer } from "./player-context";

/**
 * End-of-playback "Up next" card — PRD §7.2 discovery lift (Player UX Move 6).
 *
 * Appears above the Transport when `currentTime/duration` crosses 92% AND
 * `isPlaying`. Show-only — never autoplays the next recording. Editorially
 * we don't want to be the algorithm's successor-of-oral-history; we want
 * to offer a thread to follow when the listener's attention signals "give
 * me more like this."
 *
 * Dismissible. Dismissal is session-local and scoped to the current
 * recording id — switching recordings resets the dismiss state so the
 * listener doesn't have to keep closing the same card across the corpus.
 */

const SHOW_AT_PROGRESS = 0.92;

export function EndOfPlaybackCard({
  related,
  recordingId,
}: {
  related: RelatedRecording | null;
  recordingId: string;
}) {
  const { currentTime, duration, isPlaying } = usePlayer();
  const [dismissed, setDismissed] = useState(false);

  // Reset dismiss state during render when the recording changes.
  const [lastSeenRecording, setLastSeenRecording] = useState(recordingId);
  if (recordingId !== lastSeenRecording) {
    setLastSeenRecording(recordingId);
    setDismissed(false);
  }

  if (!related) return null;

  const progress = duration > 0 ? currentTime / duration : 0;
  const shouldShow = isPlaying && progress >= SHOW_AT_PROGRESS && !dismissed;

  // Return null when hidden so the card doesn't reserve vertical space
  // above the transport. Trade-off: no fade-in (just appears on cross of
  // the 92% threshold) — that's fine for an always-late-stage surface.
  if (!shouldShow) return null;

  const interviewee = related.interviewees[0];
  const life = interviewee?.birthYear
    ? ` (${interviewee.birthYear}${
        interviewee.deathYear ? `–${interviewee.deathYear}` : "–"
      })`
    : "";
  const label = interviewee
    ? `${formatSpeakerName(interviewee.name)}${life}`
    : titleForCard(related.title);

  return (
    <div
      className="flex w-full items-start gap-3 bg-card/80 px-4 py-3 backdrop-blur-sm"
    >
      <div className="flex flex-1 flex-col gap-1.5">
        <p className="font-mono text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground">
          Up next
        </p>
        <Link
          href={`/player/${encodeURIComponent(related.catalogNumber)}`}
          className="group flex flex-col gap-1"
        >
          <p className="font-heading text-sm leading-tight font-semibold group-hover:text-primary">
            {label}
          </p>
          {related.briefOverview ? (
            <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
              {related.briefOverview}
            </p>
          ) : null}
          <p className="font-mono text-[10px] tabular-nums text-muted-foreground">
            {formatDuration(related.durationSeconds)} · {related.catalogNumber}
          </p>
        </Link>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss up-next card"
        className="shrink-0"
      >
        <XIcon />
      </Button>
    </div>
  );
}
