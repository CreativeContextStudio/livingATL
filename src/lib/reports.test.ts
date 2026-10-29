import { describe, expect, it } from "vitest";

import { parseReportForm, reportHref } from "./reports";

const base = { kind: "correction", reason: "The narrator's name is spelled wrong." };

describe("parseReportForm", () => {
  it("accepts a minimal report and nulls blank optionals", () => {
    const r = parseReportForm({ ...base, catalogNumber: " ", contactEmail: "", relationship: "" });
    expect(r).toEqual({
      ok: true,
      data: {
        kind: "correction",
        catalogNumber: null,
        timestamp: null,
        reason: base.reason,
        relationship: null,
        contactName: null,
        contactEmail: null,
      },
    });
  });

  it("parses a timestamp and keeps contact details", () => {
    const r = parseReportForm({
      ...base,
      kind: "restriction",
      catalogNumber: "VIS 170.12.001",
      timestamp: "12:04",
      relationship: "descendant",
      contactName: "A. Reader",
      contactEmail: "reader@example.org",
    });
    expect(r.ok && r.data).toMatchObject({
      kind: "restriction",
      catalogNumber: "VIS 170.12.001",
      timestamp: 724,
      relationship: "descendant",
      contactEmail: "reader@example.org",
    });
  });

  it("reports one message per bad field", () => {
    const r = parseReportForm({
      kind: "nope",
      reason: "short",
      timestamp: "twelve",
      contactEmail: "not-an-email",
      relationship: "boss",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors).sort()).toEqual(
      ["contactEmail", "kind", "reason", "relationship", "timestamp"].sort(),
    );
  });

  it("rejects an over-long reason and missing fields", () => {
    expect(parseReportForm({ ...base, reason: "x".repeat(4001) }).ok).toBe(false);
    expect(parseReportForm({}).ok).toBe(false);
  });
});

describe("reportHref", () => {
  it("prefills kind, recording and time", () => {
    expect(reportHref({ catalogNumber: "VIS 170.12.001", seconds: 724.6, kind: "ai_summary" })).toBe(
      "/contact?kind=ai_summary&recording=VIS+170.12.001&t=12%3A04#report",
    );
    expect(reportHref({})).toBe("/contact#report");
  });
});
