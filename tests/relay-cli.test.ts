import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { relayCommand } from "../src/cli/relay.js";
import { RelayStore } from "../packages/relay/src/store.js";

let runtimeHome = "";
let originalAriaHome: string | undefined;

async function captureLogs(fn: () => Promise<void>): Promise<string[]> {
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  };
  try {
    await fn();
  } finally {
    console.log = originalLog;
  }
  return logs;
}

beforeEach(async () => {
  runtimeHome = await mkdtemp(join(tmpdir(), "aria-relay-cli-"));
  originalAriaHome = process.env.ARIA_HOME;
  process.env.ARIA_HOME = runtimeHome;
  process.exitCode = 0;
});

afterEach(() => {
  if (originalAriaHome === undefined) {
    delete process.env.ARIA_HOME;
  } else {
    process.env.ARIA_HOME = originalAriaHome;
  }
  process.exitCode = 0;
});

describe("relayCommand", () => {
  test("manages paired devices, attachments, and queued relay events", async () => {
    await relayCommand(["register", "device-1", "My", "Phone"]);
    await relayCommand(["attach", "device-1", "session-1"]);
    await relayCommand(["send", "device-1", "session-1", "continue", "please"]);
    await relayCommand(["approve", "device-1", "session-1", "tool-1", "approve"]);

    const state = await new RelayStore(join(runtimeHome, "relay-state.json")).load();
    expect(state.devices).toHaveLength(1);
    expect(state.attachments).toHaveLength(1);
    expect(state.events).toHaveLength(2);
    expect(state.events.map((event) => event.type).sort()).toEqual(["approval_response", "follow_up"]);

    const logs = await captureLogs(async () => {
      await relayCommand(["list"]);
      await relayCommand(["attachments"]);
      await relayCommand(["events"]);
      await relayCommand(["deliver", state.events[0]!.eventId]);
      await relayCommand(["detach", "device-1", "session-1"]);
      await relayCommand(["revoke", "device-1"]);
    });

    expect(logs.some((line) => line.includes("device-1"))).toBe(true);
    expect(logs.some((line) => line.includes("session-1"))).toBe(true);

    const updated = await new RelayStore(join(runtimeHome, "relay-state.json")).load();
    expect(updated.devices[0]?.revokedAt).toBeNumber();
    expect(updated.attachments[0]?.detachedAt).toBeNumber();
    expect(updated.events.some((event) => event.deliveredAt)).toBe(true);
  });
});
