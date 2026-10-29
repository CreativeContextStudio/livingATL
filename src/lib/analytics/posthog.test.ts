import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const capture = vi.fn();
const init = vi.fn();
vi.mock("posthog-js", () => ({ default: { init, capture } }));

// The module keeps load state at module scope; re-import it fresh per test.
async function load() {
  vi.resetModules();
  return import("./posthog");
}

// Wait for the wrapper's dynamic `import("posthog-js")` (and its .then) to
// finish. A fixed tick is not enough under parallel test load, and a load
// left pending would call the shared mock during the next test.
async function flush() {
  await vi.dynamicImportSettled();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("lazy PostHog wrapper", () => {
  beforeEach(async () => {
    await flush(); // settle anything a previous test left loading
    vi.stubGlobal("window", {});
    capture.mockClear();
    init.mockClear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("drops events when analytics was never initialized (no key)", async () => {
    const ph = await load();
    ph.captureEvent("portal_query", { question_length: 10 });
    ph.capturePageview("/browse");
    await flush();
    expect(capture).not.toHaveBeenCalled();
  });

  it("queues events fired while the SDK loads, then flushes them in order", async () => {
    const ph = await load();
    ph.initPostHog("phc_test", undefined);
    ph.capturePageview("/timeline?start=1930");
    ph.captureEvent("player_play", { catalog: "MSS 1" });
    expect(capture).not.toHaveBeenCalled(); // still loading
    await flush();
    expect(init).toHaveBeenCalledTimes(1);
    expect(init.mock.calls[0][1]).toMatchObject({ capture_pageview: false, respect_dnt: true });
    expect(capture.mock.calls).toEqual([
      ["$pageview", { $current_url: "/timeline?start=1930" }],
      ["player_play", { catalog: "MSS 1" }],
    ]);
  });

  it("sends directly once ready, and only initializes once", async () => {
    const ph = await load();
    ph.initPostHog("phc_test", "https://eu.i.posthog.com");
    await flush();
    ph.initPostHog("phc_test", undefined);
    ph.captureEvent("browser_search", { length: 3 });
    expect(init).toHaveBeenCalledTimes(1);
    expect(init.mock.calls[0][1]).toMatchObject({ api_host: "https://eu.i.posthog.com" });
    expect(capture).toHaveBeenCalledWith("browser_search", { length: 3 });
  });

  it("caps the pre-load queue", async () => {
    const ph = await load();
    ph.initPostHog("phc_test", undefined);
    for (let i = 0; i < 80; i++) ph.captureEvent("player_seek", { i });
    await flush();
    expect(capture).toHaveBeenCalledTimes(50);
  });

  it("is a no-op on the server", async () => {
    vi.unstubAllGlobals();
    const ph = await load();
    ph.initPostHog("phc_test", undefined);
    ph.captureEvent("portal_query");
    await flush();
    expect(init).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
  });
});
