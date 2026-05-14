import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createEngineClient } from "@aria/access-client";
import type { AutomationAgentFactory } from "@aria/automation";
import { startServer, type EngineServer } from "@aria/gateway/server";
import { createTestRuntime, getAvailableGatewayPortPair } from "../helpers/server-runtime.js";

let testDir: string;
let previousAriaHome: string | undefined;
let previousTestApiKey: string | undefined;

beforeEach(async () => {
  previousAriaHome = process.env.ARIA_HOME;
  previousTestApiKey = process.env.TEST_API_KEY;
  testDir = await mkdtemp(`${tmpdir()}/aria-node-automation-e2e-`);
  process.env.ARIA_HOME = testDir;
});

afterEach(async () => {
  if (previousAriaHome === undefined) {
    delete process.env.ARIA_HOME;
  } else {
    process.env.ARIA_HOME = previousAriaHome;
  }

  if (previousTestApiKey === undefined) {
    delete process.env.TEST_API_KEY;
  } else {
    process.env.TEST_API_KEY = previousTestApiKey;
  }

  await rm(testDir, { recursive: true, force: true });
});

describe("automation server workflow", () => {
  test("triggers heartbeat and runs cron tasks with retry metadata", async () => {
    const runtime = await createTestRuntime(testDir);
    const config = runtime.config.getConfigFile();
    await runtime.config.saveConfig({
      ...config,
      runtime: {
        ...config.runtime,
        webhook: { enabled: true },
      },
    });

    const cronPrompts: string[] = [];
    let updatedDigestAttempts = 0;
    runtime.automationAgentFactory = (() => ({
      async *chat(prompt: string) {
        cronPrompts.push(prompt);
        if (prompt === "Run updated digest") {
          updatedDigestAttempts += 1;
        }
        if (prompt === "Run updated digest" && updatedDigestAttempts === 1) {
          throw new Error("transient cron failure");
        }
        yield {
          type: "text_delta",
          delta:
            prompt === "Run scheduled digest"
              ? "Scheduled digest succeeded"
              : "Cron retry succeeded",
        };
        yield { type: "done", stopReason: "end_turn" };
      },
      getMessages() {
        return [];
      },
    })) satisfies AutomationAgentFactory;

    const port = await getAvailableGatewayPortPair();
    let server: EngineServer | undefined;

    try {
      server = await startServer(runtime, { hostname: "127.0.0.1", port });
      const client = createEngineClient({
        httpUrl: `http://127.0.0.1:${port}`,
        wsUrl: `ws://127.0.0.1:${port + 1}`,
        token: runtime.auth.getMasterToken(),
      });

      const heartbeat = await client.heartbeat.trigger.mutate();
      expect(heartbeat.triggered).toBe(true);
      expect(heartbeat.lastResult).toMatchObject({
        agentRan: false,
        suppressed: false,
      });
      const heartbeatRecord = runtime.store.getAutomationTaskByName("heartbeat", "heartbeat");
      expect(heartbeatRecord).toMatchObject({
        taskId: "heartbeat",
        lastStatus: "success",
      });
      expect(heartbeatRecord?.lastRunAt).toBeTruthy();

      const unauthorizedHeartbeat = await fetch(`http://127.0.0.1:${port}/webhook/heartbeat`, {
        method: "POST",
      });
      expect(unauthorizedHeartbeat.status).toBe(401);

      const webhookHeartbeat = await fetch(`http://127.0.0.1:${port}/webhook/heartbeat`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${runtime.auth.getWebhookToken()}`,
        },
      });
      expect(webhookHeartbeat.status).toBe(200);
      await expect(webhookHeartbeat.json()).resolves.toMatchObject({ triggered: true });
      expect(runtime.store.getAutomationTaskByName("heartbeat", "heartbeat")).toMatchObject({
        taskId: "heartbeat",
        lastStatus: "success",
      });

      await client.cron.add.mutate({
        name: "scheduled-digest",
        schedule: "* * * * *",
        prompt: "Run scheduled digest",
      });
      await runtime.scheduler.tick(new Date("2026-01-01T00:00:00.000Z"));
      expect(cronPrompts).toContain("Run scheduled digest");
      const scheduledRecord = runtime.store.getAutomationTaskByName("cron", "scheduled-digest");
      expect(scheduledRecord).toMatchObject({
        lastStatus: "success",
        lastSummary: "Scheduled digest succeeded",
      });
      const scheduledRuns = runtime.store.listAutomationRuns(scheduledRecord!.taskId, 1);
      expect(scheduledRuns).toHaveLength(1);
      expect(scheduledRuns[0]).toMatchObject({
        taskType: "cron",
        trigger: "cron",
        status: "success",
        promptText: "Run scheduled digest",
        responseText: "Scheduled digest succeeded",
      });
      expect(scheduledRuns[0]?.sessionId).toStartWith("cron:scheduled-digest:");
      await expect(client.cron.remove.mutate({ name: "scheduled-digest" })).resolves.toEqual({
        removed: true,
      });

      await client.cron.add.mutate({
        name: "digest",
        schedule: "every 5m",
        prompt: "Run digest",
        retryPolicy: { maxAttempts: 2, delaySeconds: 0 },
      });
      let digest = (await client.cron.list.query()).find((task) => task.name === "digest");
      expect(digest).toMatchObject({
        name: "digest",
        scheduleKind: "interval",
        intervalMinutes: 5,
        paused: false,
      });

      await expect(client.cron.pause.mutate({ name: "digest" })).resolves.toEqual({
        updated: true,
      });
      expect(runtime.store.getAutomationTaskByName("cron", "digest")).toMatchObject({
        paused: true,
        nextRunAt: null,
      });

      await expect(client.cron.resume.mutate({ name: "digest" })).resolves.toEqual({
        updated: true,
      });
      await expect(
        client.cron.update.mutate({
          name: "digest",
          schedule: "0 9 * * *",
          prompt: "Run updated digest",
        }),
      ).resolves.toEqual({ updated: true, name: "digest" });

      digest = (await client.cron.list.query()).find((task) => task.name === "digest");
      expect(digest).toMatchObject({
        schedule: "0 9 * * *",
        scheduleKind: "cron",
        prompt: "Run updated digest",
        paused: false,
      });

      await expect(client.cron.run.mutate({ name: "digest" })).resolves.toEqual({
        triggered: true,
      });
      expect(cronPrompts.filter((prompt) => prompt === "Run updated digest")).toEqual([
        "Run updated digest",
        "Run updated digest",
      ]);

      const digestRecord = runtime.store.getAutomationTaskByName("cron", "digest");
      expect(digestRecord).toMatchObject({
        lastStatus: "success",
        lastSummary: "Cron retry succeeded",
      });
      const runs = runtime.store
        .listAutomationRuns(digestRecord!.taskId, 10)
        .sort((a, b) => a.attemptNumber - b.attemptNumber);
      expect(runs).toHaveLength(2);
      expect(runs[0]).toMatchObject({
        taskType: "cron",
        trigger: "cron",
        status: "error",
        attemptNumber: 1,
        maxAttempts: 2,
        promptText: "Run updated digest",
      });
      expect(runs[0]?.responseText).toContain("transient cron failure");
      expect(runs[1]).toMatchObject({
        taskType: "cron",
        trigger: "cron",
        status: "success",
        attemptNumber: 2,
        maxAttempts: 2,
        responseText: "Cron retry succeeded",
        deliveryStatus: "not_requested",
      });
      expect(runs[0]?.sessionId).toStartWith("cron:digest:");
      expect(runs[1]?.sessionId).toStartWith("cron:digest:");
      expect(runs[0]?.sessionId).not.toBe(runs[1]?.sessionId);

      await expect(
        client.automation.runs.query({ taskId: digestRecord!.taskId, limit: 10 }),
      ).resolves.toHaveLength(2);

      await expect(client.cron.remove.mutate({ name: "digest" })).resolves.toEqual({
        removed: true,
      });
      expect((await client.cron.list.query()).some((task) => task.name === "digest")).toBe(false);
      expect(runtime.store.getAutomationTaskByName("cron", "digest")).toBeUndefined();
    } finally {
      await server?.stop();
    }
  });
});
