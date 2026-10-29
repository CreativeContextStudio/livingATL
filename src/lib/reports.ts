/**
 * Reports, corrections and takedown requests (PRD §8.5 / §8.7, F-report) —
 * the shared vocabulary and form validation. Pure, so the /contact form,
 * the server action and the tests agree. Persisted in `reports_takedowns`.
 */
import { z } from "zod";

import { parseShareTime } from "@/lib/player";

export const REPORT_KINDS = [
  {
    value: "correction",
    label: "Correction",
    hint: "A name, date, place or transcript error.",
  },
  {
    value: "restriction",
    label: "Restriction request",
    hint: "For narrators and descendants: limit how a recording is shared.",
  },
  {
    value: "takedown",
    label: "Takedown request",
    hint: "Ask the stewards to remove a recording or passage.",
  },
  {
    value: "sensitive_content",
    label: "Content advisory",
    hint: "A passage that needs a content advisory, or one that's wrong.",
  },
  {
    value: "ai_summary",
    label: "AI summary or metadata",
    hint: "Feedback on an AI-written summary, theme or tag.",
  },
  { value: "other", label: "Something else", hint: "Anything else about the collection." },
] as const;

export type ReportKind = (typeof REPORT_KINDS)[number]["value"];

export const REPORT_RELATIONSHIPS = [
  { value: "descendant", label: "Descendant or family of a narrator" },
  { value: "narrator", label: "Narrator or interviewer" },
  { value: "researcher", label: "Researcher, educator or archivist" },
  { value: "listener", label: "Listener" },
  { value: "partner", label: "WRFG / Atlanta History Center / partner" },
  { value: "other", label: "Other" },
] as const;

export const REASON_MIN = 10;
export const REASON_MAX = 4000;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null);

const reportSchema = z.object({
  kind: z.enum(REPORT_KINDS.map((k) => k.value) as [ReportKind, ...ReportKind[]], {
    error: "Choose what this is about.",
  }),
  catalogNumber: optionalText(64),
  timestamp: z
    .string()
    .trim()
    .max(12)
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      const seconds = parseShareTime(v);
      if (seconds === null) {
        ctx.addIssue({ code: "custom", message: "Use minutes:seconds, like 12:04." });
        return z.NEVER;
      }
      return seconds;
    }),
  reason: z
    .string({ error: "Tell us what needs attention." })
    .trim()
    .min(REASON_MIN, `Please add a little more detail (at least ${REASON_MIN} characters).`)
    .max(REASON_MAX, `Please keep it under ${REASON_MAX} characters.`),
  relationship: z
    .enum(REPORT_RELATIONSHIPS.map((r) => r.value) as [string, ...string[]])
    .optional()
    .or(z.literal("").transform(() => undefined))
    .transform((v) => v ?? null),
  contactName: optionalText(120),
  contactEmail: z
    .string()
    .trim()
    .max(254)
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      if (!z.email().safeParse(v).success) {
        ctx.addIssue({ code: "custom", message: "That email address doesn't look right." });
        return z.NEVER;
      }
      return v;
    }),
});

export type ReportInput = z.output<typeof reportSchema>;

export type ReportFieldErrors = Partial<Record<keyof ReportInput, string>>;

/** Validate a submitted form; `null` fields mean "left blank". */
export function parseReportForm(
  form: Record<string, FormDataEntryValue | null | undefined>,
): { ok: true; data: ReportInput } | { ok: false; errors: ReportFieldErrors } {
  const asString = (v: FormDataEntryValue | null | undefined) =>
    typeof v === "string" ? v : undefined;
  const result = reportSchema.safeParse({
    kind: asString(form.kind),
    catalogNumber: asString(form.catalogNumber),
    timestamp: asString(form.timestamp),
    reason: asString(form.reason),
    relationship: asString(form.relationship),
    contactName: asString(form.contactName),
    contactEmail: asString(form.contactEmail),
  });
  if (result.success) return { ok: true, data: result.data };
  const errors: ReportFieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof ReportInput;
    errors[key] ??= issue.message;
  }
  return { ok: false, errors };
}

/** Link into the /contact report form, prefilled from a recording. */
export function reportHref(opts: {
  catalogNumber?: string;
  seconds?: number;
  kind?: ReportKind;
}): string {
  const params = new URLSearchParams();
  if (opts.kind) params.set("kind", opts.kind);
  if (opts.catalogNumber) params.set("recording", opts.catalogNumber);
  if (opts.seconds !== undefined && opts.seconds > 0) {
    const s = Math.floor(opts.seconds);
    params.set("t", `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);
  }
  const qs = params.toString();
  return `/contact${qs ? `?${qs}` : ""}#report`;
}
