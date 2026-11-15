/**
 * Timeline loading state — matches the rendered page's container
 * dimensions so the layout doesn't jump on data resolve.
 */
export default function TimelineLoading() {
  return (
    <main aria-busy="true" className="page-container page-y flex flex-col gap-6">
      <p role="status" className="sr-only">Loading…</p>
      <header className="flex flex-col gap-2">
        <div className="h-9 w-3/4 animate-pulse rounded-md bg-muted sm:h-10" />
        <div className="h-4 w-2/3 animate-pulse rounded-md bg-muted" />
      </header>
      <div className="relative h-[540px] w-full animate-pulse rounded-2xl border border-border bg-card" />
    </main>
  );
}
