import type { Metadata } from "next";

/**
 * Demo password gate — "fake security" for the public preview.
 *
 * `src/proxy.ts` rewrites every non-allowlisted request here while the visitor
 * lacks a valid `la_gate` cookie. This page is a plain server-rendered form
 * that POSTs to `/api/gate`; no client JS. The handler checks the password,
 * sets the cookie, and redirects back to `?next`.
 *
 * Active only when SITE_GATE_TOKEN is set (see proxy.ts).
 */
export const metadata: Metadata = {
  title: "livingATL. Enter",
  description: "Password-protected preview of the Living Atlanta oral history collection.",
  robots: { index: false, follow: false },
};

function safeNext(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  // Open-redirect guard: only allow same-origin absolute paths.
  if (value && value.startsWith("/") && !value.startsWith("//")) return value;
  return "/";
}

export default async function GatePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const hasError = params.error === "1";

  return (
    <main
      className="mx-auto flex min-h-[80dvh] max-w-md flex-col items-start justify-center gap-6 px-6 py-16"
      id="main"
    >
      <div className="flex flex-col gap-2">
        <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-muted-foreground">
          Invite-only preview
        </p>
        <h1 className="font-heading text-3xl font-bold">livingATL</h1>
        <p className="text-muted-foreground">
          The Living Atlanta oral history collection is in private preview. Enter
          the password to continue.
        </p>
      </div>

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
          aria-invalid={hasError}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {hasError ? (
          <p role="alert" className="text-sm text-destructive">
            Incorrect password. Try again.
          </p>
        ) : null}
        <button
          type="submit"
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Enter
        </button>
      </form>
    </main>
  );
}
