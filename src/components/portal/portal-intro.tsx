/**
 * Portal page intro: eyebrow, headline, and one short explainer. (The
 * former left-column rail — span bar, stats, "no fabricated quotes",
 * explore links — repeated Home and About and was removed 2026-10-29.)
 */
export function PortalIntro() {
  return (
    <header className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div aria-hidden className="h-1.5 w-16 rounded-full bg-primary" />
        <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground">
          Ask the archive
        </p>
      </div>
      <h1 className="font-heading text-3xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-4xl">
        Fifty years of Atlanta voices, answering back.
      </h1>
      <p className="leading-relaxed text-foreground/80">
        Ask about a person, a neighborhood, an era, an event. The Portal
        answers from the Living Atlanta oral history collection and cites the
        recordings and timestamps it drew from. If the archive doesn&rsquo;t
        cover your question, it will say so.
      </p>
    </header>
  );
}
