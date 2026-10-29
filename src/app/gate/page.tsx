import type { Metadata } from "next";

import { safeNextPath } from "@/lib/safe-next";

/**
 * Demo password gate — "fake security" for the public preview.
 *
 * `src/proxy.ts` rewrites every non-allowlisted request here while the visitor
 * lacks a valid `la_gate` cookie. This page is a plain server-rendered form
 * that POSTs to `/api/gate`; no client JS. The handler checks the password,
 * sets the cookie, and redirects back to `?next`.
 *
 * Active only when SITE_GATE_TOKEN is set (see proxy.ts). With
 * SITE_GATE_PASSWORD unset the gate is invite-only (PRD F-invite): no form,
 * just how to get in. `/invite/<token>` and revoked-invite redirects land
 * here with `?error=invite|revoked`.
 */
export const metadata: Metadata = {
  title: "livingATL. Enter",
  description: "Password-protected preview of the Living Atlanta oral history collection.",
  robots: { index: false, follow: false },
};

export default async function GatePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  const hasError = params.error === "1";
  const rateLimited = params.error === "rate";
  const passwordEnabled = Boolean(process.env.SITE_GATE_PASSWORD);
  // Invite problems show above the form; with no form, so does rate limiting.
  const inviteProblem =
    params.error === "invite"
      ? "That invite link isn't valid. It may have expired or been revoked."
      : params.error === "revoked"
        ? "Your invite has been revoked or has expired."
        : rateLimited && !passwordEnabled
          ? "Too many attempts. Wait a minute, then try again."
          : null;

  return (
    <main
      className="mx-auto flex min-h-[80dvh] max-w-md flex-col items-start justify-center gap-6 px-6 py-16"
    >
      <div className="flex flex-col gap-2">
        <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-muted-foreground">
          Invite-only preview
        </p>
        <h1 className="font-heading text-3xl font-bold">livingATL</h1>
        <p className="text-muted-foreground">
          The Living Atlanta oral history collection is in private preview.{" "}
          {passwordEnabled
            ? "Enter the password or open your invite link to continue."
            : "Open the invite link you were sent to continue. To ask for one, contact the livingATL team."}
        </p>
      </div>

      {inviteProblem ? (
        <p role="alert" className="text-sm text-red-800 dark:text-red-300">
          {inviteProblem}
        </p>
      ) : null}

      {passwordEnabled ? (
        <form action="/api/gate" method="POST" className="flex w-full flex-col gap-3">
          <input type="hidden" name="next" value={next} />
          <label htmlFor="password" className="sr-only">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoFocus
            required
            autoComplete="current-password"
            placeholder="Password"
            aria-invalid={hasError || rateLimited}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {hasError || rateLimited ? (
            <p role="alert" className="text-sm text-red-800 dark:text-red-300">
              {rateLimited
                ? "Too many attempts. Wait a minute, then try again."
                : "Incorrect password. Try again."}
            </p>
          ) : null}
          <button
            type="submit"
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Enter
          </button>
        </form>
      ) : null}
    </main>
  );
}
