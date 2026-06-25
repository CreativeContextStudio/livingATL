/**
 * Timeline loading state — matches the rendered page's container
 * dimensions so the layout doesn't jump on data resolve.
 */
export default function TimelineLoading() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-muted-foreground">
          Timeline
        </p>
        <div className="h-9 w-3/4 animate-pulse rounded-md bg-muted sm:h-10" />
        <div className="h-4 w-2/3 animate-pulse rounded-md bg-muted" />
      </header>
      <div className="relative h-[540px] w-full animate-pulse rounded-2xl border border-border bg-card" />
    </main>
  );
}
