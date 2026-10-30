"use client";

import { CheckIcon, ListMusicIcon, ListPlusIcon, PlayIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatSpeakerName } from "@/lib/format";
import { useListeningQueue, type QueueItem } from "./listening-queue";

type QueueableMoment = {
  catalogNumber: string;
  momentIndex: number;
  title: string;
  intervieweeName: string | null;
  audioUrl: string | null;
  startTime: number;
  endTime: number;
};

/** A moment as a queue item; null when it has no playable audio range. */
export function momentQueueItem(moment: QueueableMoment): QueueItem | null {
  if (!moment.audioUrl || moment.endTime <= moment.startTime) return null;
  return {
    id: `moment:${moment.catalogNumber}:${moment.momentIndex}`,
    catalogNumber: moment.catalogNumber,
    title: moment.title,
    storyteller: moment.intervieweeName ? formatSpeakerName(moment.intervieweeName) : null,
    audioUrl: moment.audioUrl,
    start: moment.startTime,
    end: moment.endTime,
  };
}

/** Timeline moment → "Play" (queues it and starts) + "Add to queue". */
export function MomentQueueButtons({ moment }: { moment: QueueableMoment }) {
  const { enqueue, isQueued } = useListeningQueue();
  const item = momentQueueItem(moment);
  if (!item) return null;
  const queued = isQueued(item.id);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => enqueue([item], { play: true })}>
        <PlayIcon aria-hidden className="size-3.5" />
        Play here
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => enqueue([item])}
        disabled={queued}
        // Accessible name starts with the visible text (WCAG 2.5.3).
        aria-label={queued ? `Queued: ${moment.title}` : `Add to queue: ${moment.title}`}
      >
        {queued ? <CheckIcon aria-hidden className="size-3.5" /> : <ListPlusIcon aria-hidden className="size-3.5" />}
        {queued ? "Queued" : "Add to queue"}
      </Button>
    </div>
  );
}

/** Portal answer → queue every cited excerpt and start the first. */
export function PlayCitationsButton({
  citations,
}: {
  citations: Array<{
    catalogNumber: string;
    recordingTitle: string;
    intervieweeName: string | null;
    audioUrl?: string | null;
    startTime: number;
    endTime: number;
  }>;
}) {
  const { enqueue } = useListeningQueue();
  const items: QueueItem[] = citations
    .filter((c) => c.audioUrl && c.endTime > c.startTime)
    .map((c) => ({
      id: `cite:${c.catalogNumber}:${Math.round(c.startTime)}`,
      catalogNumber: c.catalogNumber,
      title: c.recordingTitle,
      storyteller: c.intervieweeName ? formatSpeakerName(c.intervieweeName) : null,
      audioUrl: c.audioUrl as string,
      start: c.startTime,
      end: c.endTime,
    }));
  if (items.length === 0) return null;
  return (
    <Button
      size="sm"
      variant="outline"
      className="self-start"
      onClick={() => enqueue(items, { play: true })}
    >
      <ListMusicIcon aria-hidden className="size-3.5" />
      Play all {items.length} cited clip{items.length === 1 ? "" : "s"}
    </Button>
  );
}

/** Listening path (F-paths) → queue every step in order and start the first. */
export function PlayPathButton({ moments, title }: { moments: QueueableMoment[]; title: string }) {
  const { enqueue } = useListeningQueue();
  const items = moments.map(momentQueueItem).filter((i): i is QueueItem => i !== null);
  if (items.length === 0) return null;
  return (
    <Button onClick={() => enqueue(items, { play: true })} aria-label={`Play the whole path: ${title}`}>
      <PlayIcon aria-hidden className="size-4" />
      Play the whole path
    </Button>
  );
}
