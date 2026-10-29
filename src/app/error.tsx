"use client"; // Error boundaries must be Client Components

import { RouteError } from "@/components/shell/route-error";

export default function ErrorBoundary({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return <RouteError error={error} retry={retry} />;
}
