import type { Metadata } from "next";
import Link from "next/link";
import { ListMusicIcon } from "lucide-react";

import { requireArchiveAccess } from "@/lib/access-request";
import { LISTENING_PATHS } from "@/lib/paths";

/**
 * Listening paths index (F-paths) — a low-friction way in for new
 * listeners: a handful of short, ordered sequences instead of 48 full
 * interviews. Definitions live in `src/lib/paths.ts`.
 */
export const metadata: Metadata = {
  title: "Listening paths",
  description: "Short guided sequences of chapters from the Living Atlanta oral histories.",
};

export default async function PathsPage() {
  await requireArchiveAccess();
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          Start with a path
        </h1>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
          Each path strings together a few minutes from several interviews, in order. Play the
          whole thing, or stop anywhere and open the full recording.
        </p>
      </header>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {LISTENING_PATHS.map((path) => (
          <li key={path.slug} className="flex">
            <Link
              href={`/paths/${path.slug}`}
              className="flex w-full flex-col gap-2 rounded-xl border border-border bg-card/50 p-5 transition-colors hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <p className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.18em] uppercase text-muted-foreground">
                <ListMusicIcon aria-hidden className="size-3.5" />
                {path.steps.length} chapters
              </p>
              <h2 className="font-heading text-xl font-semibold leading-tight">{path.title}</h2>
              <p className="text-sm leading-relaxed text-foreground/80">{path.dek}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
