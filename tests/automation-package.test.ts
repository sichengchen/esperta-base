import { describe, expect, test } from "bun:test";
import { matchesCron, parseScheduleInput, Scheduler } from "../packages/automation/src/index.js";

describe("@aria/automation package entrypoints", () => {
  test("re-exports schedule parsing helpers", () => {
    const parsed = parseScheduleInput("every 2h", new Date("2026-04-11T12:00:00Z"));
    expect(parsed).toEqual({
      schedule: "@every 120m",
      scheduleKind: "interval",
      intervalMinutes: 120,
    });
  });

  test("re-exports scheduler primitives", () => {
    expect(matchesCron("0 8 * * *", new Date("2026-04-11T08:00:00Z"))).toBe(true);
    expect(new Scheduler()).toBeInstanceOf(Scheduler);
  });
});
