# livingatl/ — the web app

This is the Next.js web app for **livingATL**, a public platform for the Living Atlanta oral history collection (1914–1977). It's the surface that will eventually let visitors browse the archive, listen to recordings with synchronized transcripts, see the stories plotted on an interactive map, and ask questions of the collection through an AI portal that cites the voices it draws from. The editorial stance is **preserve, don't censor** — the recordings present as spoken, with advisory framing where it's warranted, never edits to the source.

**Who this README is for:** you're a producer or creative lead, not a developer, and you want to understand what's in this repo, how to look at it on your own machine, what you're seeing when it loads, and where the line is between things you steer and things your developer handles.

**For developers:** technical orientation lives in `CLAUDE.md` and `AGENTS.md` at the repo root alongside this file.

---

## What this repo is (and isn't)

This repo is **the web app only**. It's a standalone Next.js project that clones and runs on its own.

It is **not** the transcription pipeline (that's a separate Python workspace that reads archive MP3s, runs diarization and Whisper, and writes into the same Supabase database). It is **not** the product reference binder (PRD, brand guide, catalog samples — those live in a separate reference workspace). You don't need either of those to work on, review, or deploy this repo. They feed the same database; the web app reads what they produce.

If you're looking at this repo through GitHub and wondering "where's everything else" — it's deliberately scoped. The sibling workspaces ship separately because their audiences, contributors, and release cadence are all different.

---

## Current state

The site is in **invite-only preview mode**. The "launch gate" lives in `src/proxy.ts`. When the environment variable `NEXT_PUBLIC_LAUNCH_ENABLED` is anything other than `true`, every non-allowlisted URL rewrites to a single `/preview` page — a short explainer about citation-first preview mode and the rights conversation with WRFG / Atlanta History Center. The allowlist is intentionally small and does not include any of the Phase 2 surfaces.

When the gate flips to `true`, the real site goes live. All five Phase 2 surfaces are already built behind the gate: **Browser** (search and filter the collection), **Map** (neighborhoods plotted with their associated recordings), **Player** (audio with synchronized transcript, chapter scrubber, pre-playback content advisory), **Timeline** (recording moments plotted by era), and the **AI Portal** (ask the archive a question, get cited answers from real voices). The gate flip is a decision point, not a bug fix — it means the rights agreement is in place and the editorial team has signed off.

Preserve-don't-censor is the framing for everything that ships. The pre-playback advisory is preventive context, not a warning label in front of a takedown. Advisories are reviewed per recording and carry a version tag so editorial wording can evolve without rewriting the underlying data.

**Short status line for stakeholder calls:**
> *Phase 1 done; all five Phase 2 surfaces built. 48 recordings fully processed (diarized, transcribed, briefed, advisory-reviewed, ingested). Browser, Map, Player, Timeline, and the AI Portal are built and live behind the invite-only gate. The next big piece is community capture (Phase 5). Public launch still gated on the WRFG/AHC rights agreement.*

---

## What you steer vs. what the developer handles

This is the most valuable line to keep clean on a project like livingATL, because the producer/developer boundary is where new collaborators get tangled up.

**You steer** (creative, editorial, stakeholder):

- **Interview briefs.** Chapter-by-chapter narrative structure for each recording — what the moments are, which ones are highlights, how to summarize them, which themes and neighborhoods they touch. Authored per-recording through the manual extraction workflow.
- **Content advisory text.** The canonical wording for the pre-playback advisory lives in `src/lib/content-advisory.ts`, versioned (`livingatl-v1`, `livingatl-v2`, …) so revisions ship cleanly. Your approval — plus the external reviewer sign-offs from WRFG / AHC / community reviewers — is what clears the advisory to display.
- **Per-recording sensitivity calls.** Whether a given recording needs an advisory at all, which controlled-vocabulary themes apply, what the reviewer notes say. Editorial judgement, not a technical decision.
- **Canonical name corrections.** When a transcript renders a name the way Whisper heard it rather than the way it's spelled — you're the authority on the right spelling. Corrections live in the transcript layer, never in the raw machine output.
- **WRFG / AHC rights conversation.** Until that agreement is signed, the launch gate stays closed. No technical workaround — it's the actual gating decision.
- **Atlanta Brand System.** The brand system (Space Grotesk / DM Sans / JetBrains Mono, the light Neon+Peach and dark Canopy+Concrete palettes) is applied. The app ships three themes — `light` (Neon+Peach, default), `dark` (Canopy+Concrete), and `geist` (a neutral fallback) — switchable in the UI. Wording, palette evolution, and which theme leads are your call.

**Developer handles** (technical, plumbing):

- Framework, database schema, migrations, Supabase connection
- The launch gate logic in `src/proxy.ts` (wiring, not policy)
- Sentry error monitoring, analytics, deploy pipeline
- Audio waveform rendering, map tile loading, transcript sync
- Vector search and the retrieval layer the AI Portal sits on top of
- Production deploys, when you give the green light

**The gray zone** (worth pairing on):

- How a content advisory appears on a recording card vs. before playback
- AI Portal chat tone and whether the citations feel right
- Browser facet density — how much metadata to surface at a glance
- Map legend choices and how neighborhood clusters read
- Player chapter scrubber density — what counts as a "moment" worth flagging

When in doubt, ask. The developer's job is to make your editorial decisions load faster, not to make those decisions for you.

---

## Tech stack

For the "what's it built on?" question in a stakeholder call:

- **Next.js 16** (App Router, Turbopack) — the web framework.
- **React 19** — the UI library underneath Next.js.
- **Tailwind CSS v4** — the styling system; utility classes over stylesheet files.
- **Supabase Postgres + Drizzle ORM** — the database, and the type-safe layer the app uses to talk to it.
- **Base UI** — unstyled accessible primitives (dialogs, menus, popovers) that the design system wraps.
- **wavesurfer.js** — the audio waveform and playhead in the recording player.
- **Mapbox GL** — the interactive map surface.
- **Vercel AI SDK** (OpenAI + Anthropic) — the streaming, cited answers in the AI Portal; provider is a single env-var flip.
- **Sentry** — error monitoring; the developer sees when something breaks in production.
- **PostHog** — privacy-respecting product analytics (which features get used, how the portal is queried).

---

## Run it locally

You only need to do this occasionally — to review a new feature, walk a stakeholder through something on your laptop, or verify that a change the developer made landed the way you expected.

1. Install dependencies once:
   ```bash
   pnpm install
   ```
   (If `pnpm` isn't on your machine yet, your developer can install it with `brew install pnpm`. One-time setup.)

2. Copy the environment template and fill it in:
   ```bash
   cp .env.example .env.local
   ```
   The variables you'll need are listed in `.env.example` with short comments explaining each one. The developer is the one who hands you values for the secrets (database password, API keys) — don't guess, and don't commit `.env.local`.

3. Start the dev server:
   ```bash
   pnpm dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in any browser. The page auto-updates whenever a file is saved, so if you're watching during a pairing session, changes appear live. Stop the server with `Ctrl+C` in the terminal.

If the server starts cleanly you'll see a "Ready in …ms" line in the terminal. If you see a wall of red text instead, screenshot it and send it to the developer — the common causes are environment-specific (Node version, missing keys, expired database password) and they can diagnose it faster than you can.

---

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Start the local dev server on :3000 with live reload. |
| `pnpm build` | Produce a production build; also verifies Sentry is wired correctly. |
| `pnpm lint` | Run the code linter. |
| `pnpm tsc --noEmit` | Type-check the whole project without writing any files. |
| `pnpm exec drizzle-kit generate` | Generate a new SQL migration from changes to the database schema. |

The last one is the only script you'll rarely touch directly — it's what your developer runs after they've edited the schema file.

---

## Deploy to Vercel

The deploy target is Vercel. The environment variables Vercel needs are the same ones listed in `.env.example` at the repo root — that's the canonical list, and `.env.example` is what gets updated when a new variable is introduced.

Two deploy-time things worth knowing:

- **Sentry source-map upload** needs `SENTRY_AUTH_TOKEN` as a build-time secret in the Vercel project settings. Without it the build still succeeds, but stack traces in Sentry won't map back to readable source.
- **Mapbox token** should be URL-restricted in the Mapbox dashboard after the first deploy, so the token only works from the livingATL domain. Until that restriction is in place, the token is technically usable by anyone who views the site and grabs it from the browser.

Your developer runs the deploy; you sign off on the launch checklist.

---

## Contributing & contact

- **Developers** — start with `CLAUDE.md` and `AGENTS.md` at the repo root. Those capture the conventions and the gotchas that aren't obvious from reading the code.
- **Editorial questions, corrections, rights inquiries** — use the in-app `/contact` page. If something looks like it undermines the goal of preserving authentic Atlanta voices, that's the channel we most want to hear about it.

---

## License

**Code** in this repository is released under the **MIT license** (see the `LICENSE` file).

**The Living Atlanta collection — recordings, transcripts, catalog metadata, interview briefs — is not covered by the code license.** Those materials remain subject to the existing rights terms of the collection (WRFG / Atlanta History Center). MIT-licensing the code does not MIT-license the archive. If you're forking this repo to build something on top of it, you get the web app; you do not get the recordings.

That split is deliberate. The code is a gift to anyone who wants to build similar community-archive surfaces. The voices are a stewardship responsibility, and they stay governed by the agreements that put them in the archive in the first place.
