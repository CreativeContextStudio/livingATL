"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, ShareIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { formatTimestamp, parseShareTime } from "@/lib/player";
import { usePlayer } from "./player-context";

/**
 * Share button — PRD §7.2. Copies a URL with `?t=` appended so the
 * listener can link to a specific moment. Format matches podcast-app
 * convention ("14:32" or "1:08:30" depending on recording length).
 *
 * Also auto-seeks on Player mount when a `?t=` param is present and the
 * wavesurfer has fired `ready`.
 */
export function ShareButton() {
  const searchParams = useSearchParams();
  const { currentTime, seek, isReady } = usePlayer();
  const [copied, setCopied] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const initialSeekAppliedRef = useRef(false);

  // Auto-seek from `?t=` on first ready.
  useEffect(() => {
    if (!isReady || initialSeekAppliedRef.current) return;
    const tParam = searchParams.get("t");
    const seconds = parseShareTime(tParam);
    if (seconds !== null && seconds > 0) {
      seek(seconds);
    }
    initialSeekAppliedRef.current = true;
  }, [isReady, searchParams, seek]);

  const onCopy = async () => {
    const t = formatTimestamp(currentTime);
    const url = new URL(window.location.href);
    url.searchParams.set("t", t);
    const href = url.toString();
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      setFallbackUrl(null);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard refused (insecure context, missing permission, etc).
      // Expose the URL so the user can select + copy it manually.
      setFallbackUrl(href);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button
        variant="outline"
        size="sm"
        onClick={onCopy}
        aria-label="Copy link to this timestamp"
        title="Copy link to this timestamp"
        className="gap-1.5"
      >
        {copied ? (
          <>
            <CheckIcon className="size-3.5" />
            <span>Copied</span>
          </>
        ) : (
          <>
            <ShareIcon className="size-3.5" />
            <span>Share @ {formatTimestamp(currentTime)}</span>
          </>
        )}
        <span className="sr-only">
          Copy this recording&rsquo;s URL at {formatTimestamp(currentTime)}
        </span>
      </Button>
      {fallbackUrl ? (
        <div className="flex max-w-[20rem] flex-col items-end gap-1">
          <p className="text-[10px] text-muted-foreground">
            Clipboard refused. Select to copy:
          </p>
          <input
            type="text"
            value={fallbackUrl}
            readOnly
            onFocus={(e) => e.currentTarget.select()}
            onClick={(e) => e.currentTarget.select()}
            className="w-full rounded border border-border bg-background px-2 py-1 font-mono text-[10px] text-foreground"
          />
        </div>
      ) : null}
    </div>
  );
}
