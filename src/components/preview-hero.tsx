import Link from "next/link";
import {
  ArrowUpRightIcon,
  CompassIcon,
  HeadphonesIcon,
  MessageCircleQuestionIcon,
  type LucideIcon,
} from "lucide-react";

import { HomeListen } from "@/components/home/home-listen";
import { PageHeader } from "@/components/shell/page-header";
import { archiveIsPublic } from "@/lib/access";
import { canRequestViewArchive } from "@/lib/access-request";
import { pickHomeClip } from "@/lib/home-clip";
import { cn } from "@/lib/utils";

/**
 * The front door, rendered by both `/` and `/preview`: what this is, one
 * voice to hear, and three ways in (the same three as the nav). Stats,
 * credits and how it's made live on `/about`. Needs no database, so it
 * still renders when the archive can't be reached.
 */

type Door = {
  label: string;
  heading: string;
  body: string;
  href: string;
  icon: LucideIcon;
  iconAccent: string;
};

const DOORS: Door[] = [
  {
    label: "Listen",
    heading: "Hear the interviews",
    body: "Search by name, or start with a short path through several voices.",
    href: "/browse",
    icon: HeadphonesIcon,
    iconAccent: "bg-primary/15 text-primary-ink",
  },
  {
    label: "Explore",
    heading: "Follow a year or a street",
    body: "See the stories on a timeline, on a map, or by neighborhood.",
    href: "/timeline",
    icon: CompassIcon,
    iconAccent: "bg-teal-500/15 text-teal-700 dark:text-teal-400",
  },
  {
    label: "Ask",
    heading: "Ask a question",
    body: "Ask about people, places, or events. Answers link to the part of the interview they come from.",
    href: "/portal",
    icon: MessageCircleQuestionIcon,
    iconAccent: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
];

export async function PreviewHero() {
  // Can this visitor actually reach /browse, /map, …? Then the doors are live
  // links; otherwise they render inert. Same rule as the proxy.
  const entered = await canRequestViewArchive();

  return (
    <main className="page-container page-y flex flex-col gap-8 sm:gap-10 lg:gap-12">
      <PageHeader
        variant="hero"
        accentBar
        eyebrow={archiveIsPublic() ? undefined : "Private preview"}
        title="Atlanta, in the words of the people who lived it."
        lead="In the late 1970s, WRFG radio recorded more than 500 interviews about life in the city from 1914 to 1977. livingATL puts them online so you can listen."
      />

      {entered ? <HomeListen clip={pickHomeClip()} /> : null}

      <section aria-label="Ways in">
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:gap-5">
          {DOORS.map((d) => {
            const Icon = d.icon;
            const inner = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <span
                    aria-hidden
                    className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-lg", d.iconAccent)}
                  >
                    <Icon className="size-5" strokeWidth={1.75} />
                  </span>
                  {entered ? (
                    <ArrowUpRightIcon
                      aria-hidden
                      className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
                    />
                  ) : null}
                </div>
                <div className="flex flex-col gap-1">
                  <p className="font-mono text-[11px] font-semibold tracking-[0.22em] uppercase text-muted-foreground">
                    {d.label}
                  </p>
                  <h2 className="font-heading text-lg font-semibold leading-tight tracking-tight lg:text-xl">
                    {d.heading}
                  </h2>
                </div>
                <p className="text-sm leading-relaxed text-foreground/80">{d.body}</p>
              </>
            );
            return (
              <li key={d.label} className="flex">
                {entered ? (
                  <Link
                    href={d.href}
                    className="group flex h-full w-full flex-col gap-4 rounded-xl border border-border bg-card/60 p-5 lg:p-6 transition-colors hover:border-foreground/30 hover:bg-card/80 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div className="flex h-full w-full flex-col gap-4 rounded-xl border border-border bg-card/60 p-5 lg:p-6">
                    {inner}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
        Recordings play as they were spoken, including the language of their
        time.{" "}
        {entered ? (
          <Link href="/about" className="rounded-sm font-medium text-foreground underline decoration-foreground/40 underline-offset-4 hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            About the project
          </Link>
        ) : null}
      </p>
    </main>
  );
}
