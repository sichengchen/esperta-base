import { describe, expect, test } from "bun:test";
import { createKernelRuntime } from "../packages/kernel/src/index.js";
import {
  DEFAULT_HEARTBEAT,
  CRON_DEFAULT_TOOLS,
  WEBHOOK_DEFAULT_TOOLS,
  deliverAutomationResult,
  dispatchAutomationDeliveryOutbox,
  matchesCron,
  parseScheduleInput,
  Scheduler,
} from "../packages/automation/src/index.js";

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
    expect(matchesCron("0 8 * * *", new Date(2026, 3, 11, 8, 0, 0))).toBe(true);
    expect(new Scheduler()).toBeInstanceOf(Scheduler);
  });

  test("re-exports automation-owned defaults", () => {
    expect(DEFAULT_HEARTBEAT).toEqual({
      enabled: true,
      intervalMinutes: 30,
      checklistPath: "HEARTBEAT.md",
      suppressToken: "HEARTBEAT_OK",
    });
    expect(CRON_DEFAULT_TOOLS).toContain("memory_write");
    expect(WEBHOOK_DEFAULT_TOOLS).not.toContain("memory_write");
  });

  test("routes connector deliveries through the kernel outbox", async () => {
    const kernel = createKernelRuntime();
    const calls: unknown[] = [];
    const notifyTool = {
      name: "notify",
      dangerLevel: "safe",
      execute: async (args: Record<string, unknown>) => {
        calls.push(args);
        return { content: "sent" };
      },
    };
    const runtime = {
      kernel,
      tools: [notifyTool],
      executeToolWithCapability: async (request: { sessionId: string; execute(): unknown }) => {
        expect(request.sessionId.startsWith("automation-delivery:")).toBe(true);
        return request.execute();
      },
    } as any;

    const result = await deliverAutomationResult(runtime, { connector: "slack" }, "hello");

    expect(result.status).toBe("delivered");
    expect(calls).toEqual([{ message: "hello", connector: "slack" }]);
    expect(kernel.outbox.list("automation.delivery.notify")).toEqual([]);
  });

  test("keeps failed connector deliveries in the kernel outbox for recovery", async () => {
    const kernel = createKernelRuntime();
    const runtime = {
      kernel,
      tools: [],
      executeToolWithCapability: async (request: { execute(): unknown }) => request.execute(),
    } as any;

    const failed = await deliverAutomationResult(runtime, { connector: "slack" }, "hello");
    expect(failed.status).toBe("failed");
    expect(kernel.outbox.list("automation.delivery.notify")).toHaveLength(1);

    const calls: unknown[] = [];
    runtime.tools = [
      {
        name: "notify",
        dangerLevel: "safe",
        execute: async (args: Record<string, unknown>) => {
          calls.push(args);
          return { content: "sent" };
        },
      },
    ];

    const recovered = await dispatchAutomationDeliveryOutbox(runtime);
    expect(recovered.status).toBe("delivered");
    expect(calls).toEqual([{ message: "hello", connector: "slack" }]);
    expect(kernel.outbox.list("automation.delivery.notify")).toEqual([]);
  });
});
