import { Skeleton } from "@/components/ui/skeleton";

export default function BrowseLoading() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col gap-8 px-6 py-10 lg:py-14">
      <header className="flex flex-col gap-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-4 w-96" />
      </header>
      <div className="rounded-xl border border-border bg-card/60 p-5">
        <div className="flex flex-col gap-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-3 w-32" />
              <div className="flex flex-wrap gap-1.5">
                {[0, 1, 2, 3, 4].map((j) => (
                  <Skeleton key={j} className="h-5 w-20 rounded-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex h-64 flex-col gap-3 rounded-xl bg-card p-5"
          >
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="mt-2 h-3 w-full" />
            <Skeleton className="h-3 w-11/12" />
            <div className="mt-auto flex gap-1.5">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
