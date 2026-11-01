"use client";

import Form from "next/form";
import Link from "next/link";
import { PlayIcon, SearchIcon } from "lucide-react";

import { useListeningQueue } from "@/components/queue/listening-queue";
import { Button } from "@/components/ui/button";
import { captureEvent } from "@/lib/analytics/posthog";
import type { HomeClip } from "@/lib/home-clip";
import { formatTimestamp } from "@/lib/player";

/**
 * Home, for visitors who can reach the archive: hear one voice right away
 * (a different clip each visit), or look for a name. Plays through the listening queue, so it keeps going
 * while the visitor moves on. The search goes to `/browse` without a page
 * load, so the clip keeps playing; it also searches summaries, so people
 * mentioned in a story turn up too.
 */
export function HomeListen({ clip: CLIP }: { clip: HomeClip }) {
  const { enqueue, items, currentIndex, isPlaying } = useListeningQueue();
  const playing = isPlaying && items[currentIndex]?.id === CLIP.id;
  const seconds = Math.round(CLIP.end - CLIP.start);

  return (
    <section aria-label="Listen" className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
      <article className="flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-5 sm:gap-4 sm:p-6">
        <blockquote className="font-heading text-lg font-semibold leading-snug tracking-tight sm:text-2xl">
          &ldquo;{CLIP.quote}&rdquo;
        </blockquote>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{CLIP.storyteller}</span>, {CLIP.detail}
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button
            className="h-auto min-h-11 max-w-full whitespace-normal px-4"
            disabled={playing}
            onClick={() => {
              captureEvent("home_clip_play", { catalog: CLIP.catalogNumber, clip: CLIP.title });
              enqueue(
                [
                  {
                    id: CLIP.id,
                    catalogNumber: CLIP.catalogNumber,
                    title: CLIP.title,
                    storyteller: CLIP.storyteller,
                    audioUrl: CLIP.audioUrl,
                    start: CLIP.start,
                    end: CLIP.end,
                  },
                ],
                { play: true },
              );
            }}
          >
            <PlayIcon aria-hidden className="size-4" />
            {playing ? "Playing" : `Listen · ${seconds} seconds`}
          </Button>
          <Link
            href={`/player/${encodeURIComponent(CLIP.catalogNumber)}?t=${formatTimestamp(Math.floor(CLIP.start))}`}
            className="inline-flex min-h-11 items-center text-sm font-medium text-primary-ink underline-offset-4 hover:underline"
          >
            Open the full interview
          </Link>
        </div>
      </article>

      <Form action="/browse" className="flex flex-col justify-center gap-3 rounded-xl border border-border bg-card/60 p-6">
        <label htmlFor="home-search" className="font-heading text-xl font-semibold leading-tight tracking-tight">
          Is your family in here?
        </label>
        <p className="text-sm leading-relaxed text-foreground/80">
          Search a name, a church, or a business.
        </p>
        <div className="flex items-center gap-2">
          <input
            id="home-search"
            name="q"
            type="search"
            required
            placeholder="A name or place…"
            className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button type="submit" variant="outline" className="h-11" aria-label="Search the interviews">
            <SearchIcon aria-hidden className="size-4" />
            Search
          </Button>
        </div>
      </Form>
    </section>
  );
}
