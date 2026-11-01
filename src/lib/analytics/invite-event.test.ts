import { NextResponse } from "next/server";
import { describe, expect, it } from "vitest";

import { INVITE_EVENT_COOKIE, inviteLabelFromCookies } from "./invite-event";

describe("inviteLabelFromCookies", () => {
  it("reads and decodes the label among other cookies", () => {
    const value = encodeURIComponent("WRFG board / 3");
    expect(inviteLabelFromCookies(`a=1; ${INVITE_EVENT_COOKIE}=${value}; b=2`)).toBe("WRFG board / 3");
  });
  it("reads back what the invite route sets, once decoded", () => {
    const res = NextResponse.redirect("http://localhost/");
    res.cookies.set(INVITE_EVENT_COOKIE, "WRFG board / 3", { path: "/" });
    const pair = (res.headers.get("set-cookie") ?? "").split(";")[0];
    expect(inviteLabelFromCookies(pair)).toBe("WRFG board / 3");
  });
  it("is null when absent, empty or malformed", () => {
    expect(inviteLabelFromCookies("a=1")).toBeNull();
    expect(inviteLabelFromCookies(`${INVITE_EVENT_COOKIE}=`)).toBeNull();
    expect(inviteLabelFromCookies(`${INVITE_EVENT_COOKIE}=%E0%A4%A`)).toBeNull();
  });
});
