import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { Agent } from "@aria/agent";
import { createEngineClient } from "@aria/access-client";
import type { AutomationAgentFactory } from "@aria/automation";
import { startServer, type EngineServer } from "@aria/gateway/server";
import { getRuntimeSessionCoordinator } from "@aria/server/session-coordinator";
import { createTestRuntime, getAvailableGatewayPortPair } from "../helpers/server-runtime.js";

let testDir: string;
let previousAriaHome: string | undefined;
let previousTestApiKey: string | undefined;

beforeEach(async () => {
  previousAriaHome = process.env.ARIA_HOME;
  previousTestApiKey = process.env.TEST_API_KEY;
  testDir = await mkdtemp(`${tmpdir()}/aria-node-webhook-endpoints-`);
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

function parseSseEvents(text: string): any[] {
  return text
    .split("\n\n")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const line = chunk
        .split("\n")
        .find((entry) => entry.startsWith("data: "))
        ?.slice("data: ".length);
      if (!line) {
        throw new Error(`Missing SSE data line: ${chunk}`);
      }
      return JSON.parse(line);
    });
}

describe("webhook HTTP endpoints", () => {
  test("streams authenticated /webhook/agent SSE through the server gateway", async () => {
    const runtime = await createTestRuntime(testDir);
    const config = runtime.config.getConfigFile();
    await runtime.config.saveConfig({
      ...config,
      runtime: {
        ...config.runtime,
        webhook: { enabled: true },
      },
    });
    const port = await getAvailableGatewayPortPair();
    let server: EngineServer | undefined;

    try {
      server = await startServer(runtime, { hostname: "127.0.0.1", port });
      const client = createEngineClient({
        httpUrl: `http://127.0.0.1:${port}`,
        wsUrl: `ws://127.0.0.1:${port + 1}`,
        token: runtime.auth.getMasterToken(),
      });
      const { session } = await client.session.create.mutate({
        connectorType: "webhook",
        prefix: "webhook:agent",
      });
      getRuntimeSessionCoordinator(runtime).sessionAgents.set(session.id, {
        async *chat(prompt: string) {
          expect(prompt).toBe("Webhook says hello");
          yield { type: "text_delta", delta: "Webhook reply" };
          yield { type: "done", stopReason: "end_turn" };
        },
        getMessages() {
          return [
            { role: "user", content: "Webhook says hello", timestamp: 100 },
            { role: "assistant", content: "Webhook reply", timestamp: 101 },
          ];
        },
        abort() {
          return false;
        },
      } as unknown as Agent);

      const unauthorized = await fetch(`http://127.0.0.1:${port}/webhook/agent`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "text/event-stream",
        },
        body: JSON.stringify({ sessionId: session.id, message: "Webhook says hello" }),
      });
      expect(unauthorized.status).toBe(401);

      const response = await fetch(`http://127.0.0.1:${port}/webhook/agent`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "text/event-stream",
          authorization: `Bearer ${runtime.auth.getWebhookToken()}`,
        },
        body: JSON.stringify({ sessionId: session.id, message: "Webhook says hello" }),
      });
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/event-stream");
      const events = parseSseEvents(await response.text());
      expect(events).toEqual([
        expect.objectContaining({
          type: "text_delta",
          delta: "Webhook reply",
          sessionId: session.id,
          connectorType: "webhook",
          threadType: "connector",
          source: "chat",
        }),
        expect.objectContaining({
          type: "done",
          stopReason: "end_turn",
          sessionId: session.id,
          connectorType: "webhook",
          threadType: "connector",
          source: "chat",
        }),
      ]);
      expect(events[0].runId).toBe(events[1].runId);
      expect(runtime.store.getSessionMessages(session.id)).toHaveLength(2);
    } finally {
      await server?.stop();
    }
  });

  test("runs authenticated webhook tasks with framed and truncated payloads", async () => {
    const runtime = await createTestRuntime(testDir);
    const config = runtime.config.getConfigFile();
    await runtime.config.saveConfig({
      ...config,
      runtime: {
        ...config.runtime,
        webhook: { enabled: true },
      },
    });

    let capturedPrompt = "";
    runtime.automationAgentFactory = (({ task }) => ({
      async *chat(prompt: string) {
        capturedPrompt = prompt;
        expect(prompt).toBe(task.prompt);
        yield { type: "text_delta", delta: "Webhook task processed" };
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

      await client.webhookTask.add.mutate({
        name: "CI event",
        slug: "ci-event",
        prompt: "Process CI payload:\n{{payload}}",
        enabled: true,
      });

      const unauthorized = await fetch(`http://127.0.0.1:${port}/webhook/tasks/ci-event`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ action: "queued" }),
      });
      expect(unauthorized.status).toBe(401);

      const response = await fetch(`http://127.0.0.1:${port}/webhook/tasks/ci-event`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${runtime.auth.getWebhookToken()}`,
        },
        body: JSON.stringify({
          action: "queued",
          note: "x".repeat(10_050),
        }),
      });
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        slug: "ci-event",
        task: "CI event",
        response: "Webhook task processed",
        attempt: 1,
        maxAttempts: 1,
        deliveryStatus: "not_requested",
        deliveryError: null,
      });
      expect(capturedPrompt).toContain("Process CI payload:");
      expect(capturedPrompt).toContain("<data-webhook>");
      expect(capturedPrompt).toContain("</data-webhook>");
      expect(capturedPrompt).toContain('"action":"queued"');
      expect(capturedPrompt).toContain("...(truncated)");
      expect(capturedPrompt.length).toBeLessThan(10_200);

      const taskRecord = runtime.store.getAutomationTaskBySlug("ci-event");
      expect(taskRecord).toMatchObject({
        taskType: "webhook",
        slug: "ci-event",
        lastStatus: "success",
        lastSummary: "Webhook task processed",
      });
      const runs = runtime.store.listAutomationRuns(taskRecord!.taskId, 1);
      expect(runs).toHaveLength(1);
      expect(runs[0]).toMatchObject({
        taskType: "webhook",
        taskName: "CI event",
        trigger: "webhook",
        status: "success",
        promptText: capturedPrompt,
        responseText: "Webhook task processed",
        attemptNumber: 1,
        maxAttempts: 1,
        deliveryStatus: "not_requested",
      });
      expect(runs[0]?.sessionId).toStartWith("webhook:ci-event:");
    } finally {
      await server?.stop();
    }
  });
});
