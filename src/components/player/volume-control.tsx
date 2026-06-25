"use client";

import { useMemo } from "react";
import { Popover } from "@base-ui/react/popover";
import { Volume2Icon, VolumeXIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Volume control — compact speaker icon trigger + popover containing a
 * vertical slider. Replaces the inline horizontal slider, which read as
 * "speaker icon + floating dot" at normal viewing distances because the
 * track was too thin to register.
 *
 * Click the icon → popover opens above the button with a ~160px vertical
 * slider and a live percentage label. Click outside or the icon again →
 * popover closes. Slider change commits immediately (no "Apply" button).
 *
 * Icon swaps to `VolumeX` at zero volume; tooltip on the trigger states
 * the current value so listeners don't need to open the popover just to
 * read where they are.
 */
export function VolumeControl({
  volume,
  setVolume,
  accentHex,
}: {
  volume: number;
  setVolume: (v: number) => void;
  /** Theme accent in hex — tints the slider's filled range so the volume
   *  popover matches the seek slider + waveform for the current recording. */
  accentHex: string;
}) {
  const pct = useMemo(() => Math.round(volume * 100), [volume]);
  const muted = volume === 0;

  return (
    <TooltipProvider delay={250}>
      <Popover.Root>
        <Tooltip>
          <TooltipTrigger
            render={
              <Popover.Trigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={muted ? "Volume: muted" : `Volume: ${pct}%`}
                  >
                    {muted ? (
                      <VolumeXIcon className="size-4" aria-hidden />
                    ) : (
                      <Volume2Icon className="size-4" aria-hidden />
                    )}
                  </Button>
                }
              />
            }
          />
          <TooltipContent side="top">
            {muted ? "Volume: muted" : `Volume: ${pct}%`}
          </TooltipContent>
        </Tooltip>

        <Popover.Portal>
          <Popover.Positioner
            side="top"
            align="center"
            sideOffset={8}
            // Keep the popover within the viewport on narrow screens
            // so a listener near the bottom of the page doesn't get the
            // slider cropped.
            collisionPadding={8}
          >
            <Popover.Popup
              className={cn(
                "z-50 flex min-w-[3rem] flex-col items-center gap-2 rounded-lg border border-border bg-popover px-3 py-3 shadow-md outline-none",
                "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 transition-opacity duration-150",
              )}
            >
              <span className="font-mono text-[10px] font-semibold tabular-nums text-muted-foreground">
                {pct}%
              </span>
              <Slider
                orientation="vertical"
                value={[pct]}
                min={0}
                max={100}
                step={1}
                onValueChange={(next) => {
                  const raw = Array.isArray(next) ? next[0] : next;
                  setVolume((raw ?? 100) / 100);
                }}
                aria-label="Volume"
                style={
                  { "--slider-range-color": accentHex } as React.CSSProperties
                }
                className={cn(
                  "h-28 md:h-32",
                  "[&_[data-slot=slider-track]]:bg-foreground/25",
                  "[&_[data-slot=slider-range]]:bg-[var(--slider-range-color)]",
                )}
              />
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </TooltipProvider>
  );
}
