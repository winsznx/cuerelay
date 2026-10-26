import { describe, expect, it } from "vitest";
import { resolveLocalTime } from "../src/localTime.js";

describe("T15 cross-midnight schedule", () => {
  it("rolls into the next calendar day when minuteOfDay exceeds 1439", () => {
    const sameDay = resolveLocalTime("2026-11-07", "America/New_York", 23 * 60); // 11:00 PM, Nov 7
    const nextDay = resolveLocalTime("2026-11-07", "America/New_York", 25 * 60); // 1:00 AM, Nov 8
    expect(new Date(nextDay.utcInstant).getTime() - new Date(sameDay.utcInstant).getTime()).toBe(2 * 60 * 60 * 1000);
    expect(nextDay.isNonExistent).toBe(false);
    expect(nextDay.isAmbiguous).toBe(false);
  });
});

describe("T16 DST transitions are flagged, not silently guessed", () => {
  it("flags a nonexistent wall-clock time during the US spring-forward gap", () => {
    // 2026-03-08 02:30 America/New_York does not exist (clocks jump 2:00 -> 3:00).
    const minuteOfDay = 2 * 60 + 30;
    const resolved = resolveLocalTime("2026-03-08", "America/New_York", minuteOfDay);
    expect(resolved.isNonExistent).toBe(true);
    expect(resolved.isAmbiguous).toBe(false);
  });

  it("flags an ambiguous wall-clock time during the US fall-back repeat", () => {
    // 2026-11-01 01:30 America/New_York occurs twice (clocks fall back 2:00 -> 1:00).
    const minuteOfDay = 1 * 60 + 30;
    const resolved = resolveLocalTime("2026-11-01", "America/New_York", minuteOfDay);
    expect(resolved.isAmbiguous).toBe(true);
    expect(resolved.isNonExistent).toBe(false);
  });

  it("lets a caller pin the exact offset once the ambiguity is resolved through the UI", () => {
    const minuteOfDay = 1 * 60 + 30;
    const edt = resolveLocalTime("2026-11-01", "America/New_York", minuteOfDay, { disambiguateOffsetMinutes: -240 });
    const est = resolveLocalTime("2026-11-01", "America/New_York", minuteOfDay, { disambiguateOffsetMinutes: -300 });
    expect(edt.utcInstant).not.toBe(est.utcInstant);
  });

  it("resolves an ordinary unambiguous time normally", () => {
    const resolved = resolveLocalTime("2026-11-07", "America/New_York", 16 * 60 + 30); // 4:30 PM, no transition nearby
    expect(resolved.isAmbiguous).toBe(false);
    expect(resolved.isNonExistent).toBe(false);
  });
});
