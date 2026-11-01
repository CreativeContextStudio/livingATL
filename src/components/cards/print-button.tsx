"use client";

import { PrinterIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { captureEvent } from "@/lib/analytics/posthog";

export function PrintButton() {
  return (
    <Button
      onClick={() => {
        captureEvent("story_cards_print", { target: window.location.search.slice(1) });
        window.print();
      }}
    >
      <PrinterIcon aria-hidden className="size-4" />
      Print cards
    </Button>
  );
}
