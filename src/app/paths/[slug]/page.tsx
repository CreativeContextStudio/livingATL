import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdvisoryBadge } from "@/components/browser/advisory-badge";
import { MomentQueueButtons, PlayPathButton } from "@/components/queue/queue-buttons";
import { requireArchiveAccess } from "@/lib/access-request";
import { formatSpeakerName } from "@/lib/format";
import { findPath, momentKey } from "@/lib/paths";
import { formatTimestamp } from "@/lib/player";
import { fetchTimelineData, type TimelineMoment } from "@/lib/queries/timeline";

/**
 * One listening path (F-paths): steward intro, then each moment preceded
 * by its interstitial. Editorial slots that are still empty render as
 * clearly marked placeholders. Steps resolve against Timeline data; a step
 * whose moment is gone (brief re-authored) is skipped.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const path = findPath((await params).slug);
  return path ? { title: `${path.title} · Listening paths · livingATL`, description: path.dek } : {};
}

function minutes(seconds: number): string {
  const m = Math.round(seconds / 60);
  return m <= 1 ? "about a minute" : `about ${m} minutes`;
}

function Placeholder({ label }: { label: string }) {
  return (
    <p className="rounded-lg border border-dashed border-border bg-card/40 px-4 py-3 font-mono text-[11px] tracking-[0.18em] uppercase text-muted-foreground">
      {label} · Forthcoming
    </p>
  );
}

export default async function PathPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireArchiveAccess();
  const path = findPath((await params).slug);
  if (!path) notFound();

  const { moments } = await fetchTimelineData();
  const byKey = new Map(moments.map((m) => [momentKey(m.catalogNumber, m.momentIndex), m]));
  const steps = path.steps
    .map((s) => ({ step: s, moment: byKey.get(momentKey(s.catalogNumber, s.momentIndex)) }))
    .filter((s): s is { step: typeof s.step; moment: TimelineMoment } => s.moment !== undefined);
  if (steps.length < path.steps.length) {
    console.warn(`[paths] ${path.slug}: ${path.steps.length - steps.length} step(s) no longer resolve`);
  }
  const total = steps.reduce((sum, s) => sum + (s.moment.endTime - s.moment.startTime), 0);
  const voices = new Set(steps.map((s) => s.moment.intervieweeName ?? s.moment.catalogNumber)).size;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-3">
        <nav aria-label="Breadcrumb" className="font-mono text-xs tracking-[0.2em] uppercase text-muted-foreground">
          <Link href="/paths" className="underline-offset-4 hover:text-foreground hover:underline">
            Listening paths
          </Link>
        </nav>
        <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight">{path.title}</h1>
        <p className="text-base leading-relaxed text-foreground/80">{path.dek}</p>
        <p className="text-sm text-muted-foreground">
          {steps.length} moments · {voices} voice{voices === 1 ? "" : "s"} · {minutes(total)}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <PlayPathButton moments={steps.map((s) => s.moment)} title={path.title} />
          <Link
            href={`/cards?path=${path.slug}`}
            className="text-sm font-medium text-primary-ink underline-offset-4 hover:underline"
          >
            Print story cards
          </Link>
        </div>
      </header>

      {path.intro ? (
        <p className="leading-relaxed text-foreground/85">{path.intro}</p>
      ) : (
        <Placeholder label="Steward introduction" />
      )}

      <ol className="flex flex-col gap-6">
        {steps.map(({ step, moment: m }, i) => (
          <li key={momentKey(m.catalogNumber, m.momentIndex)} className="flex flex-col gap-3">
            {step.interstitial ? (
              <p className="text-sm italic leading-relaxed text-foreground/80">{step.interstitial}</p>
            ) : (
              <Placeholder label={`Interstitial ${i + 1}`} />
            )}
            <article className="flex flex-col gap-2 rounded-xl border border-border bg-card/50 p-5">
              <p className="flex flex-wrap items-center gap-2 font-mono text-[11px] tabular-nums tracking-[0.12em] uppercase text-muted-foreground">
                <span>
                  {String(i + 1).padStart(2, "0")} · {m.eraLabel ?? (m.eraStartYear ? `${m.eraStartYear}${m.eraEndYear && m.eraEndYear !== m.eraStartYear ? `–${m.eraEndYear}` : ""}` : "")}
                </span>
                {m.contentAdvisory?.display_advisory ? (
                  <AdvisoryBadge advisory={m.contentAdvisory} />
                ) : null}
              </p>
              <h2 className="font-heading text-lg font-semibold leading-snug">
                <Link
                  href={`/player/${encodeURIComponent(m.catalogNumber)}?t=${formatTimestamp(m.startTime)}&end=${formatTimestamp(m.endTime)}`}
                  className="underline-offset-4 hover:underline"
                >
                  {m.title}
                </Link>
              </h2>
              <p className="text-xs italic text-muted-foreground">
                {m.intervieweeName ? formatSpeakerName(m.intervieweeName) : m.recordingTitle} ·{" "}
                {formatTimestamp(m.startTime)}–{formatTimestamp(m.endTime)}
              </p>
              {m.summary ? <p className="line-clamp-4 text-sm leading-relaxed text-foreground/80">{m.summary}</p> : null}
              <div className="pt-1">
                <MomentQueueButtons moment={m} />
              </div>
            </article>
          </li>
        ))}
      </ol>
    </main>
  );
}
