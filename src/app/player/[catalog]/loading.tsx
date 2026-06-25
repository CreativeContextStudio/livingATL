import { Skeleton } from "@/components/ui/skeleton";

export default function PlayerLoading() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col gap-6 px-6 py-10 lg:py-14">
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
