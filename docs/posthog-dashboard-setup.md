# livingATL PostHog dashboard setup

One-time setup doc for the PostHog "livingATL — engagement" dashboard. Every event referenced below is already wired in the app (see `src/instrumentation-client.ts`, `src/components/analytics/posthog-provider.tsx`, `src/lib/portal/analytics.ts`, `src/components/player/player-client.tsx`). This doc is just the PostHog-side configuration — specific filter values and step configs so you don't have to guess at any dropdown.

Project: **livingatl** (project ID `380730` on US cloud). Log in at https://us.posthog.com.

---

## Event reference

These are the events the app is firing. Every insight below is built on some subset of these.

| Event | Fires when | Properties |
|---|---|---|
| `$pageview` | Every App Router route change | `$current_url` (includes pathname + query string) |
| `portal_query` | Visitor asks a question via the AI Portal | `question_length`, `turn_index` |
| `portal_citation_click` | Visitor clicks a citation chip or citations-panel row | `catalog_number`, `start_time`, `citation_index`, `source` (`"panel"` when it's the source row, absent when the inline chip) |
| `portal_to_capture_handoff` | (reserved — Phase 5, not yet firing) | — |
| `player_play` | Wavesurfer starts playing audio | `catalog`, `current_time` |
| `player_pause` | Wavesurfer pauses OR finishes | `catalog`, `current_time`, `reason` (`"finish"` on natural end, absent on user-initiated pause) |
| `player_seek` | Scrubber, transcript click, region click, or `?t=` URL seek | `catalog`, `to_time`, `trigger` (`"seek"` \| `"seek_and_play"` \| `"region"`) |

PRD §1 names these as the metrics the platform tracks. The dashboard below covers every named metric.

---

## The dashboard

**Name:** `livingATL — engagement`  
**Pin to:** a new dashboard (PostHog → Dashboards → New). Add each insight below via "Add insight" → select saved insight, or create inline and pin.

### 1. Portal-to-recording conversion funnel *(core through-line)*

The PRD's flagship metric: "percentage of AI Portal sessions that end with the user starting a recording flow."

**Type:** Funnel  
**Steps:**
1. **Event** `portal_query`
2. **Event** `portal_citation_click`
3. **Event** `$pageview`  
   - Filter: `$current_url` **contains** `/player/`
4. **Event** `player_play`  
   - (This final step is the strongest signal — they didn't just land on the page, they actually started listening.)

**Conversion window:** 30 minutes (default) or 1 day — pick the longer window for an archive site; people browse slowly.  
**Breakdown:** none at first. Once you have traffic, try breaking down by **week** (cohort) to see whether conversion improves as prompt + retrieval are tuned.

**What it tells you:** every step's drop-off. The step-2-to-step-3 drop is "did the deep link actually navigate them" (should be near 100% if the chips work). The step-1-to-step-2 drop is the citation CTR. The step-3-to-step-4 drop is "did they press play once on the Player page."

---

### 2. Portal citation click-through rate

**Type:** Trend  
**Series:**
- **A**: `portal_citation_click` — unique users per day
- **B**: `portal_query` — unique users per day
- **Formula:** `A / B × 100` (add via "Add formula")

**Chart:** Line, `Last 30 days`, daily granularity.  
**Name:** `Citation CTR (%)`

**What it tells you:** of the visitors who asked something, what fraction clicked a citation? If this stays below ~20% long-term, the Portal answers are either too complete (user doesn't need to click) or the citations aren't compelling. Either is worth knowing.

---

### 3. Top recordings clicked through from the Portal

**Type:** Insight (trend with breakdown)  
**Event:** `portal_citation_click`  
**Breakdown by property:** `catalog_number`  
**Chart:** Horizontal bar, **Total count**, last 30 days.  
**Name:** `Top recordings reached via Portal`

**What it tells you:** which parts of the corpus the Portal actually surfaces to listeners. If Ruby Owens's recordings dominate this list, the retrieval is concentrating there. If it's flat across dozens of catalog numbers, the retrieval is broad and diverse — both have different implications for the collection's discoverability.

---

### 4. Listener completion rate *(PRD §1 "listener engagement")*

**Type:** Trend  
**Series:**
- **A**: `player_pause` — unique events per day, filter `reason` **equals** `finish`
- **B**: `player_play` — unique events per day
- **Formula:** `A / B × 100`

**Chart:** Line, last 30 days.  
**Name:** `Completion rate (%)`

**What it tells you:** the fraction of playback sessions that run all the way to the recording's natural end. A meaningful metric for an oral-history archive where "did listeners stay with it" is more important than "did they click."

---

### 5. Median current time at pause *(where do people stop)*

**Type:** Trend  
**Event:** `player_pause`  
**Filter:** `reason` **is not** `finish` (isolates user-initiated pauses)  
**Math:** **Median** of property `current_time`  
**Chart:** Line, last 30 days.  
**Name:** `Median pause time (seconds)`

**What it tells you:** average stopping point in seconds. A rising median over time means listeners are staying in longer. Correlate with changes to the Player UI or transcript quality.

---

### 6. Seek triggers — how do people navigate?

**Type:** Insight (trend with breakdown)  
**Event:** `player_seek`  
**Breakdown by property:** `trigger`  
**Chart:** Stacked bar, last 30 days, weekly granularity.  
**Name:** `Seek triggers`

**What it tells you:** the mix of `seek` (scrubber / keyboard / share-URL), `seek_and_play` (transcript/chapter clicks), and `region` (waveform region clicks). If `seek_and_play` dominates, the transcript pane is doing its job as the primary navigation surface. If `region` is high, people are using the waveform regions (chapter visualization) a lot — worth investing in that feature further.

---

### 7. Questions per Portal session

**Type:** Trend  
**Event:** `portal_query`  
**Math:** **Average** per user per session  
**Chart:** Line, last 30 days.  
**Name:** `Questions per session`

**What it tells you:** whether multi-turn chat is being used. A value near 1 means most visitors ask one question and leave. Above 2 means people are doing follow-up conversations (exactly the UX we designed for with the "Keep going" chips).

---

### 8. Pageview volume by route

**Type:** Insight (trend with breakdown)  
**Event:** `$pageview`  
**Breakdown by property:** `$pathname` (or derive from `$current_url`)  
**Chart:** Line, last 30 days.  
**Name:** `Route volume`

**What it tells you:** which pages get used. `/browse`, `/portal`, `/map`, `/player/*` — the mix tells you whether the Portal is pulling its weight as a discovery surface vs. the Browser / Map.

---

## Assembly steps

1. Log into https://us.posthog.com, project `livingatl`.
2. Left sidebar → **Dashboards** → **New dashboard**, name: `livingATL — engagement`.
3. Left sidebar → **Product Analytics** → **Insights** → **New insight**.
4. For each insight above: build with the configs listed, save, then pin to the dashboard (small "pin" icon on the saved insight).
5. On the dashboard, drag the funnel to the top-left and size it to roughly 2x the others — it's the headline metric.
6. Set the dashboard's default date range to **Last 30 days** (dashboard settings).
7. Optional — set a weekly email summary (dashboard settings → subscriptions) so trends surface without having to pull them.

---

## Watching it come alive

First events should appear within a few seconds of the first Portal visit once the key is live. Verify flow:

1. Open `http://localhost:3000/portal` in a fresh browser session.
2. DevTools → Network. Filter to `us.i.posthog.com`. You should see:
   - `/e/?` (ingest endpoint) with a `$pageview` event on load
   - `/e/?` with `portal_query` when you submit a question
   - `/e/?` with `portal_citation_click` when you click a citation chip
   - `/e/?` with `$pageview` + `player_play` shortly after the Player page loads + auto-seeks
3. In PostHog: **Activity** → **Live events**. Events should appear within ~10 seconds.
4. Once live events are visible, the insights above will start populating over time.

---

## When to revise

- **A new event gets wired.** Add the event row to the reference table, and consider whether any insight should break down by its new properties.
- **An insight shows nothing.** Check the event is actually firing (Live events view). If it is, check the filter — PostHog property filters are case-sensitive and require exact matches.
- **Traffic volume crosses ~100 visitors/day.** Swap "unique users" math to "unique sessions" for session-level metrics so you don't conflate a single power user with organic traffic.
- **The PRD's conversion threshold moves.** PRD §1 implies the "portal-to-recording conversion" is the flagship KPI. If a target number gets set, add a goal line to insight #1 and configure an alert.
