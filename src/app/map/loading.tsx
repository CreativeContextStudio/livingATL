import { Skeleton } from "@/components/ui/skeleton";

export default function MapLoading() {
  return (
    <main aria-busy="true" className="page-container flex flex-col gap-5 py-6 sm:py-8 lg:py-10">
      <p role="status" className="sr-only">Loading…</p>
      <Skeleton className="h-4 w-36" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-4 w-[28rem] max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_24rem]">
        <Skeleton className="h-[60dvh] min-h-[360px] w-full rounded-xl lg:h-[70dvh] lg:min-h-[420px]" />
        <Skeleton className="h-[60dvh] min-h-[360px] w-full rounded-xl lg:h-[70dvh] lg:min-h-[420px]" />
      </div>
    </main>
  );
}
