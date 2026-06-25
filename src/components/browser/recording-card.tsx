import Link from "next/link";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { neighborhoodStyle, themeStyle } from "@/components/shared/category-colors";
import { cn } from "@/lib/utils";
import {
  formatDuration,
  formatRecordingDate,
  firstSentence,
  formatSpeakerName,
} from "@/lib/format";
import { AdvisoryBadge } from "./advisory-badge";
import type { BrowserRecordingCard } from "@/lib/queries/recordings";

const MAX_NEIGHBORHOOD_CHIPS = 2;
const MAX_THEME_CHIPS = 3;

function formatInterviewees(list: BrowserRecordingCard["interviewees"]): string {
  if (list.length === 0) return "Unknown storyteller";
  return formatSpeakerName(list[0].name);
}

export function RecordingCard({ recording }: { recording: BrowserRecordingCard }) {
  const intervieweeLabel = formatInterviewees(recording.interviewees);
  const summary = firstSentence(
    recording.briefOverview ?? recording.aiSummary,
    220,
  );
  const dateLabel = formatRecordingDate(
    recording.recordingDate,
    recording.recordingDatePrecision as
      | "year"
      | "month"
      | "exact"
      | "estimated"
      | null,
  );
  const eraRange = recording.eraRange;
  const durationLabel = formatDuration(recording.durationSeconds);

  const neighborhoods = recording.neighborhoods.slice(0, MAX_NEIGHBORHOOD_CHIPS);
  const neighborhoodOverflow =
    recording.neighborhoods.length - neighborhoods.length;
  const themes = recording.themes.slice(0, MAX_THEME_CHIPS);
  const themeOverflow = recording.themes.length - themes.length;

  return (
    <Link
      href={`/player/${encodeURIComponent(recording.catalogNumber)}`}
      className="group block transition-all focus-visible:outline-none"
      aria-label={`Open ${intervieweeLabel}'s interview`}
    >
      <Card
        className={
          "h-full ring-foreground/10 transition-all " +
          "group-hover:ring-2 group-hover:ring-ring/40 group-hover:-translate-y-0.5 " +
          "group-focus-visible:ring-2 group-focus-visible:ring-ring"
        }
      >
        <CardHeader className="gap-2">
          <CardTitle className="font-heading text-xl leading-tight">
            {intervieweeLabel}
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-3">
          {summary ? (
            <p className="text-sm leading-relaxed text-foreground/80 line-clamp-3">
              {summary}
            </p>
          ) : null}

          <div className="mt-auto flex min-h-[3.25rem] flex-wrap content-start gap-1.5">
            {neighborhoods.map((n) => {
              const style = neighborhoodStyle(n);
              return (
                <Badge
                  key={`nbhd-${n}`}
                  variant="outline"
                  className={cn(style.border, style.bg, style.text)}
                >
                  {n}
                </Badge>
              );
            })}
            {neighborhoodOverflow > 0 && (
              <Badge variant="ghost">+{neighborhoodOverflow}</Badge>
            )}
            {themes.map((t) => {
              const style = themeStyle(t);
              return (
                <Badge
                  key={`theme-${t}`}
                  variant="outline"
                  className={cn(style.border, style.bg, style.text)}
                >
                  {t.replace(/_/g, " ")}
                </Badge>
              );
            })}
            {themeOverflow > 0 && (
              <Badge variant="ghost">+{themeOverflow} themes</Badge>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col items-stretch gap-2 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span>{durationLabel}</span>
              <span aria-hidden>·</span>
              <span>Recorded {dateLabel}</span>
              {eraRange ? (
                <>
                  <span aria-hidden>·</span>
                  <span>Era {eraRange}</span>
                </>
              ) : null}
            </div>
            <span className="font-mono text-[10px] tracking-tight">
              {recording.catalogNumber}
            </span>
          </div>
          <div className="flex min-h-[1.25rem] items-center">
            <AdvisoryBadge advisory={recording.contentAdvisory} />
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
