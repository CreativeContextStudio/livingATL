"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, Share2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { captureEvent } from "@/lib/analytics/posthog";
import type { PortalCitation } from "@/app/api/portal/chat/route";

/**
 * "Share this answer" (F-portal-share). Posts the answer exactly as it was
 * streamed, with its server signature, to /api/portal/share and shows the
 * permalink. Nothing is stored until this is clicked.
 */
export function ShareAnswer({
  share,
  answer,
  citations,
}: {
  share: { sig: string; question: string };
  answer: string;
  citations: PortalCitation[];
}) {
  const [state, setState] = useState<
    { kind: "idle" } | { kind: "saving" } | { kind: "done"; url: string } | { kind: "error"; message: string }
  >({ kind: "idle" });
  const [copied, setCopied] = useState(false);

  async function create() {
    captureEvent("share_click", { surface: "portal" });
    setState({ kind: "saving" });
    try {
      const res = await fetch("/api/portal/share", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: share.question, answer, citations, sig: share.sig }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.path) {
        setState({
          kind: "error",
          message: res.status === 429 ? "Too many shares in a short time. Try again in a minute." : "Couldn't create a link. Try again.",
        });
        return;
      }
      setState({ kind: "done", url: new URL(json.path, window.location.origin).toString() });
    } catch {
      setState({ kind: "error", message: "Couldn't create a link. Try again." });
    }
  }

  if (state.kind === "done") {
    return (
      <div role="status" className="flex flex-col gap-1.5 text-xs">
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={state.url}
            aria-label="Link to this answer"
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1 font-mono text-[11px]"
          />
          <Button
            size="xs"
            variant="outline"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(state.url);
                setCopied(true);
              } catch {
                /* the field is selectable as a fallback */
              }
            }}
          >
            {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <p className="text-muted-foreground">
          Anyone who can open livingATL can see this question and answer at that link.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="xs" variant="ghost" onClick={create} disabled={state.kind === "saving"}>
        <Share2Icon aria-hidden />
        {state.kind === "saving" ? "Creating link…" : "Share this answer"}
      </Button>
      {state.kind === "error" ? (
        <p role="alert" className="text-xs text-red-800 dark:text-red-300">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
