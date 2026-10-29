"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { CheckCircle2Icon } from "lucide-react";

import { submitReport, type ReportFormState } from "@/app/contact/actions";
import { Button } from "@/components/ui/button";
import {
  REASON_MAX,
  REPORT_KINDS,
  REPORT_RELATIONSHIPS,
  type ReportKind,
} from "@/lib/reports";
import { cn } from "@/lib/utils";

/**
 * Report / correction / takedown form (F-report) on /contact. A server
 * action through `useActionState`, so it posts without JavaScript too.
 * Native inputs (not Base UI Select) for the same reason. Field values come
 * back from the action on an error, and the form remounts with them as
 * defaults — React resets uncontrolled forms after an action.
 */

type Prefill = { kind?: ReportKind; catalogNumber?: string; timestamp?: string };

const INITIAL: ReportFormState = { status: "idle" };

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-red-700 dark:aria-[invalid=true]:border-red-400";

export function ReportForm({ prefill }: { prefill: Prefill }) {
  const [state, action, pending] = useActionState(submitReport, INITIAL);
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);

  // After a failed submit, take keyboard and screen-reader users to the
  // first field that needs attention.
  useEffect(() => {
    if (state.status !== "error") return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"] input, [aria-invalid="true"]:not(fieldset)')?.focus();
  }, [state]);

  if (state.status === "sent") {
    return (
      <div role="status" className="flex flex-col items-start gap-3">
        <p className="flex items-center gap-2 font-heading text-lg font-semibold">
          <CheckCircle2Icon aria-hidden className="size-5 text-teal-700 dark:text-teal-400" />
          Thank you. Your report is with the stewards.
        </p>
        <p className="max-w-prose text-sm leading-relaxed text-foreground/80">
          Reference <span className="font-mono">{state.reference}</span>. Stewards review every
          report and escalate decisions about access to the project leads; nothing is removed
          unilaterally. If you left an email address, we&apos;ll reply there.
        </p>
      </div>
    );
  }

  const errors = state.status === "error" ? state.errors : {};
  const v = state.status === "error" ? state.values : undefined;
  const field = (name: string) => `${id}-${name}`;
  const errorId = (name: keyof typeof errors) => (errors[name] ? field(`${name}-error`) : undefined);
  const fieldError = (name: keyof typeof errors) =>
    errors[name] ? (
      <p id={field(`${name}-error`)} className="text-sm text-red-800 dark:text-red-300">
        {errors[name]}
      </p>
    ) : null;
  const kind = v?.kind ?? prefill.kind ?? "";

  return (
    <form
      // Remount on each failed submit so the returned values become defaults.
      key={state.status === "error" ? JSON.stringify(v) : "fresh"}
      ref={formRef}
      action={action}
      noValidate
      className="flex flex-col gap-6"
    >
      {state.status === "error" && state.message ? (
        <p role="alert" className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-800 dark:text-red-300">
          {state.message}
        </p>
      ) : null}
      {state.status === "error" && !state.message ? (
        <p role="alert" className="sr-only">
          Some fields need attention.
        </p>
      ) : null}

      <fieldset
        className="flex flex-col gap-2"
        aria-describedby={errorId("kind")}
        aria-invalid={errors.kind ? true : undefined}
      >
        <legend className="mb-2 text-sm font-medium">What is this about?</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {REPORT_KINDS.map((k) => (
            <label
              key={k.value}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background/60 p-3 text-sm has-checked:border-primary has-checked:bg-primary/5 has-focus-visible:ring-2 has-focus-visible:ring-ring"
            >
              <input
                type="radio"
                name="kind"
                value={k.value}
                defaultChecked={kind === k.value}
                required
                className="mt-0.5 accent-[var(--primary)]"
              />
              <span className="flex flex-col gap-0.5">
                <span className="font-medium">{k.label}</span>
                <span className="text-muted-foreground">{k.hint}</span>
              </span>
            </label>
          ))}
        </div>
        {fieldError("kind")}
      </fieldset>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={field("catalog")} className="text-sm font-medium">
            Recording catalog number <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <input
            id={field("catalog")}
            name="catalogNumber"
            defaultValue={v?.catalogNumber ?? prefill.catalogNumber ?? ""}
            maxLength={64}
            autoComplete="off"
            className={cn(inputClass, "font-mono")}
            aria-invalid={errors.catalogNumber ? true : undefined}
            aria-describedby={errorId("catalogNumber")}
          />
          {fieldError("catalogNumber")}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={field("time")} className="text-sm font-medium">
            Time <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <input
            id={field("time")}
            name="timestamp"
            defaultValue={v?.timestamp ?? prefill.timestamp ?? ""}
            placeholder="12:04"
            inputMode="numeric"
            maxLength={12}
            autoComplete="off"
            className={cn(inputClass, "font-mono tabular-nums")}
            aria-invalid={errors.timestamp ? true : undefined}
            aria-describedby={errorId("timestamp")}
          />
          {fieldError("timestamp")}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={field("reason")} className="text-sm font-medium">
          What needs attention?
        </label>
        <textarea
          id={field("reason")}
          name="reason"
          required
          rows={6}
          maxLength={REASON_MAX}
          defaultValue={v?.reason ?? ""}
          className={cn(inputClass, "min-h-32 resize-y leading-relaxed")}
          aria-invalid={errors.reason ? true : undefined}
          aria-describedby={errorId("reason")}
        />
        {fieldError("reason")}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={field("rel")} className="text-sm font-medium">
            Your connection <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <select
            id={field("rel")}
            name="relationship"
            defaultValue={v?.relationship ?? ""}
            className={inputClass}
            aria-invalid={errors.relationship ? true : undefined}
            aria-describedby={errorId("relationship")}
          >
            <option value="">Prefer not to say</option>
            {REPORT_RELATIONSHIPS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          {fieldError("relationship")}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={field("name")} className="text-sm font-medium">
            Name <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <input
            id={field("name")}
            name="contactName"
            defaultValue={v?.contactName ?? ""}
            maxLength={120}
            autoComplete="name"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={field("email")} className="text-sm font-medium">
            Email <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <input
            id={field("email")}
            name="contactEmail"
            type="email"
            defaultValue={v?.contactEmail ?? ""}
            maxLength={254}
            autoComplete="email"
            className={inputClass}
            aria-invalid={errors.contactEmail ? true : undefined}
            aria-describedby={[errorId("contactEmail"), field("email-hint")].filter(Boolean).join(" ")}
          />
          {fieldError("contactEmail")}
        </div>
      </div>
      <p id={field("email-hint")} className="-mt-3 text-xs text-muted-foreground">
        We use your name and email only to reply about this report. They are never shown on the
        site.
      </p>

      {/* Honeypot — hidden from people and assistive tech; bots fill it. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send to the stewards"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Recordings stay as spoken; corrections go in the metadata, not the tape.
        </p>
      </div>
    </form>
  );
}
