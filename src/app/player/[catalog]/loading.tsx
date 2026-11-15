import { Skeleton } from "@/components/ui/skeleton";

export default function PlayerLoading() {
  return (
    <main aria-busy="true" className="page-container page-y flex flex-col gap-6">
      <p role="status" className="sr-only">Loading…</p>
      <Skeleton className="h-4 w-32" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-5 w-96" />
        <Skeleton className="h-3 w-64" />
      </div>
      <Skeleton className="h-[104px] w-full rounded-xl" />
      <Skeleton className="h-14 w-full rounded-xl" />
    </main>
  );
}
