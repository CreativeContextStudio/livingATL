import { describe, expect, it } from "vitest";

import { updateResumeStore } from "./resume";

describe("updateResumeStore", () => {
  it("stores whole seconds mid-recording", () => {
    expect(updateResumeStore({}, "A", 1394.7, 3600, 1)).toEqual({ A: { t: 1394, at: 1 } });
  });
  it("clears near the start and near the end", () => {
    const store = { A: { t: 500, at: 1 } };
    expect(updateResumeStore(store, "A", 10, 3600, 2)).toEqual({});
    expect(updateResumeStore(store, "A", 3590, 3600, 2)).toEqual({});
  });
  it("keeps only the 50 most recent recordings", () => {
    let store = {};
    for (let i = 0; i < 52; i++) store = updateResumeStore(store, `R${i}`, 100, 3600, i);
    expect(Object.keys(store)).toHaveLength(50);
    expect(store).not.toHaveProperty("R0");
    expect(store).not.toHaveProperty("R1");
    expect(store).toHaveProperty("R51");
  });
});
