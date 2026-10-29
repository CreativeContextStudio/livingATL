"use server";

import * as Sentry from "@sentry/nextjs";
import { cookies, headers } from "next/headers";

import { GATE_COOKIE, inviteIdFromCookie } from "@/lib/access";
import { canRequestViewArchive } from "@/lib/access-request";
import { insertReport } from "@/lib/queries/reports";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";
import { parseReportForm, type ReportFieldErrors } from "@/lib/reports";

/**
 * Report / correction / takedown intake (PRD §8.5, §8.7 — F-report). Called
 * by the /contact form through `useActionState`, so it also works without
 * JavaScript. Stewards are alerted through Sentry (one grouped issue, no
 * personal details) and work the queue with
 * `livingatl-pipeline/scripts/reports.py`.
 */

export type ReportFormState =
  | { status: "idle" }
  | {
      status: "error";
      errors: ReportFieldErrors;
      message?: string;
      values: Record<string, string>;
    }
  | { status: "sent"; reference: string };

// Per client IP, per instance (see src/lib/rate-limit.ts).
const checkRateLimit = createRateLimiter([
  { limit: 3, windowMs: 60_000 },
  { limit: 20, windowMs: 24 * 60 * 60_000 },
]);

const FIELDS = [
  "kind",
  "catalogNumber",
  "timestamp",
  "reason",
  "relationship",
  "contactName",
  "contactEmail",
] as const;

export async function submitReport(
  _prev: ReportFormState,
  formData: FormData,
): Promise<ReportFormState> {
  const values = Object.fromEntries(
    FIELDS.map((f) => [f, String(formData.get(f) ?? "").slice(0, 5000)]),
  );
  const fail = (message: string): ReportFormState => ({
    status: "error",
    errors: {},
    message,
    values,
  });

  // Same backstop as every archive route: no intake while the visitor
  // couldn't see the site.
  if (!(await canRequestViewArchive())) return fail("The archive isn't open to you right now.");

  // Honeypot: real people never see or fill this field. Pretend success.
  if (String(formData.get("website") ?? "") !== "") {
    return { status: "sent", reference: "received" };
  }

  if (!checkRateLimit(clientIp({ headers: await headers() })).ok) {
    return fail("You've sent several reports in a short time. Please wait a minute and try again.");
  }

  const parsed = parseReportForm(Object.fromEntries(FIELDS.map((f) => [f, formData.get(f)])));
  if (!parsed.ok) return { status: "error", errors: parsed.errors, values };

  const token = process.env.SITE_GATE_TOKEN;
  const inviteId = token
    ? inviteIdFromCookie((await cookies()).get(GATE_COOKIE)?.value, token)
    : null;

  let id: string;
  try {
    id = await insertReport(parsed.data, inviteId);
  } catch (err) {
    Sentry.captureException(err);
    return fail("We couldn't save your report just now. Please try again in a few minutes.");
  }

  // Steward alert. Kind + id only — never the reporter's words or contact.
  Sentry.captureMessage("livingATL report submitted", {
    level: "info",
    fingerprint: ["livingatl-report-submitted"],
    tags: { report_kind: parsed.data.kind },
    extra: { report_id: id, has_recording: Boolean(parsed.data.catalogNumber) },
  });

  return { status: "sent", reference: id.slice(0, 8) };
}
