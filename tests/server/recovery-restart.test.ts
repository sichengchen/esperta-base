import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { Agent } from "@aria/agent";
import { createEngineClient } from "@aria/access-client";
import { flushProcedureState } from "@aria/gateway/procedures";
import { startServer, type EngineServer } from "@aria/gateway/server";
import type { EngineRuntime } from "@aria/node-runtime/runtime";
import { getRuntimeSessionCoordinator } from "@aria/server/session-coordinator";
import { createTestRuntime, getAvailableGatewayPortPair } from "../helpers/server-runtime.js";

let testDir: string;
let previousAriaHome: string | undefined;
let previousTestApiKey: string | undefined;

beforeEach(async () => {
  previousAriaHome = process.env.ARIA_HOME;
  previousTestApiKey = process.env.TEST_API_KEY;
  testDir = await mkdtemp(`${tmpdir()}/aria-node-recovery-restart-`);
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

function collectSubscription(
  subscribe: (handlers: {
    onData(event: any): void;
    onError(error: unknown): void;
    onComplete(): void;
  }) => { unsubscribe(): void },
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const events: any[] = [];
    let subscription: { unsubscribe(): void };
    subscription = subscribe({
      onData(event) {
        events.push(event);
      },
      onError(error) {
        subscription.unsubscribe();
        reject(error);
      },
      onComplete() {
        resolve(events);
      },
    });
  });
}

describe("server recovery restart", () => {
  test("flushes active work and pending interactions before shutdown or restart", async () => {
    const runtime = await createTestRuntime(testDir);
    const session = runtime.sessions.create("chat:shutdown", "engine");
    const coordinator = getRuntimeSessionCoordinator(runtime);
    let aborted = false;
    const approvalResults: boolean[] = [];
    const questionErrors: string[] = [];

    runtime.store.createRun({
      runId: "run-shutdown",
      sessionId: session.id,
      trigger: "chat",
      status: "running",
      inputText: "active work",
      startedAt: Date.now(),
    });
    runtime.store.recordToolCallStart({
      toolCallId: "approval-shutdown",
      runId: "run-shutdown",
      sessionId: session.id,
      toolName: "exec",
      args: { command: "deploy", danger: "dangerous" },
    });
    runtime.store.recordApprovalPending({
      approvalId: "approval-shutdown",
      runId: "run-shutdown",
      sessionId: session.id,
      toolCallId: "approval-shutdown",
      toolName: "exec",
      args: { command: "deploy", danger: "dangerous" },
    });
    coordinator.activeRunsBySession.set(session.id, "run-shutdown");
    coordinator.pendingApprovals.set("approval-shutdown", (approved) => {
      approvalResults.push(approved);
    });
    coordinator.pendingApprovalMeta.set("approval-shutdown", {
      sessionId: session.id,
      toolName: "exec",
      runId: "run-shutdown",
    });
    coordinator.pendingQuestions.set("question-shutdown", {
      resolve() {},
      reject(error) {
        questionErrors.push(error.message);
      },
      sessionId: session.id,
    });
    coordinator.sessionAgents.set(session.id, {
      async *chat() {},
      getMessages() {
        return [
          { role: "user", content: "active work", timestamp: 100 },
          { role: "assistant", content: "partial response", timestamp: 101 },
        ];
      },
      abort() {
        aborted = true;
        return true;
      },
    } as unknown as Agent);

    try {
      await flushProcedureState(runtime, "Engine restart requested");

      const run = (runtime.store as any)
        .getDb()
        .prepare("SELECT status, error_message FROM runs WHERE run_id = ?")
        .get("run-shutdown") as { status: string; error_message: string };
      expect(run).toEqual({
        status: "interrupted",
        error_message: "Engine restart requested",
      });
      expect(runtime.store.listApprovals({ sessionId: session.id })).toEqual([
        expect.objectContaining({
          approvalId: "approval-shutdown",
          status: "interrupted",
        }),
      ]);
      expect(aborted).toBe(true);
      expect(approvalResults).toEqual([false]);
      expect(questionErrors).toEqual(["Engine restart requested"]);
      expect(coordinator.activeRunsBySession.size).toBe(0);
      expect(coordinator.pendingApprovals.size).toBe(0);
      expect(coordinator.pendingApprovalMeta.size).toBe(0);
      expect(coordinator.pendingQuestions.size).toBe(0);
      expect(runtime.store.getSessionMessages(session.id)).toEqual([
        expect.objectContaining({ role: "user", content: "active work" }),
        expect.objectContaining({ role: "assistant", content: "partial response" }),
      ]);
      expect(runtime.archive.getSession(session.id)).toMatchObject({
        sessionId: session.id,
      });
      expect(runtime.archive.getMessages(session.id)).toEqual([
        expect.objectContaining({ role: "user", content: "active work" }),
        expect.objectContaining({ role: "assistant", content: "partial response" }),
      ]);
    } finally {
      await runtime.close();
    }
  });

  test("restores gateway sessions, archives, session tokens, and automation config", async () => {
    let runtime: EngineRuntime | undefined;
    let server: EngineServer | undefined;

    try {
      runtime = await createTestRuntime(testDir);
      const firstPort = await getAvailableGatewayPortPair();
      server = await startServer(runtime, { hostname: "127.0.0.1", port: firstPort });

      const paired = runtime.auth.pair(
        runtime.auth.getMasterToken(),
        "telegram:recovery",
        "telegram",
      );
      expect(paired.success).toBe(true);
      expect(paired.token).toEqual(expect.any(String));

      const firstClient = createEngineClient({
        httpUrl: `http://127.0.0.1:${firstPort}`,
        wsUrl: `ws://127.0.0.1:${firstPort + 1}`,
        token: paired.token!,
      });
      const firstAdminClient = createEngineClient({
        httpUrl: `http://127.0.0.1:${firstPort}`,
        wsUrl: `ws://127.0.0.1:${firstPort + 1}`,
        token: runtime.auth.getMasterToken(),
      });
      const { session } = await firstClient.session.create.mutate({
        connectorType: "telegram",
        prefix: "telegram:recovery",
      });
      getRuntimeSessionCoordinator(runtime).sessionAgents.set(session.id, {
        async *chat(prompt: string) {
          expect(prompt).toBe("Persist this recovery transcript");
          yield { type: "text_delta", delta: "Recovered archive reply" };
          yield { type: "done", stopReason: "end_turn" };
        },
        getMessages() {
          return [
            {
              role: "user",
              content: "Persist this recovery transcript",
              timestamp: 100,
            },
            {
              role: "assistant",
              content: "Recovered archive reply",
              timestamp: 101,
            },
          ];
        },
        abort() {
          return false;
        },
      } as unknown as Agent);

      const firstEvents = await collectSubscription((handlers) =>
        firstClient.chat.stream.subscribe(
          {
            sessionId: session.id,
            message: "Persist this recovery transcript",
          },
          handlers,
        ),
      );
      expect(firstEvents).toEqual([
        expect.objectContaining({ type: "text_delta", delta: "Recovered archive reply" }),
        expect.objectContaining({ type: "done", stopReason: "end_turn" }),
      ]);
      expect(runtime.store.getSessionMessages(session.id)).toHaveLength(2);

      await firstAdminClient.cron.add.mutate({
        name: "restore-digest",
        schedule: "every 15m",
        prompt: "Summarize recovered state",
      });
      await firstAdminClient.webhookTask.add.mutate({
        name: "Restore hook",
        slug: "restore-hook",
        prompt: "Handle restored payload: {{payload}}",
        enabled: true,
      });

      await server.stop();
      server = undefined;
      runtime = undefined;

      runtime = await createTestRuntime(testDir, { preserveFiles: true });
      expect(runtime.auth.validate(paired.token!)).toMatchObject({
        type: "session",
        connectorId: "telegram:recovery",
      });

      const secondPort = await getAvailableGatewayPortPair();
      server = await startServer(runtime, { hostname: "127.0.0.1", port: secondPort });
      const secondClient = createEngineClient({
        httpUrl: `http://127.0.0.1:${secondPort}`,
        wsUrl: `ws://127.0.0.1:${secondPort + 1}`,
        token: paired.token!,
      });
      const secondAdminClient = createEngineClient({
        httpUrl: `http://127.0.0.1:${secondPort}`,
        wsUrl: `ws://127.0.0.1:${secondPort + 1}`,
        token: runtime.auth.getMasterToken(),
      });

      const latest = await secondClient.session.getLatest.query({ prefix: "telegram:recovery" });
      expect(latest).toMatchObject({ id: session.id, connectorType: "telegram" });
      await expect(
        secondClient.chat.history.query({ sessionId: session.id }),
      ).resolves.toMatchObject({
        sessionId: session.id,
        archived: false,
        messages: [
          expect.objectContaining({ role: "user", content: "Persist this recovery transcript" }),
          expect.objectContaining({ role: "assistant", content: "Recovered archive reply" }),
        ],
      });

      const archived = await secondClient.session.listArchived.query({ limit: 5 });
      expect(archived).toEqual([
        expect.objectContaining({
          sessionId: session.id,
          connectorType: "telegram",
          connectorId: "telegram:recovery",
        }),
      ]);
      const search = await secondClient.session.search.query({
        query: "recovery transcript",
        limit: 5,
      });
      expect(search).toEqual([
        expect.objectContaining({
          sessionId: session.id,
          connectorId: "telegram:recovery",
        }),
      ]);

      await expect(secondClient.session.destroy.mutate({ sessionId: session.id })).resolves.toEqual(
        {
          destroyed: true,
        },
      );
      await expect(
        secondClient.chat.history.query({ sessionId: session.id }),
      ).resolves.toMatchObject({
        sessionId: session.id,
        archived: true,
        messages: [
          expect.objectContaining({ role: "user", content: "Persist this recovery transcript" }),
          expect.objectContaining({ role: "assistant", content: "Recovered archive reply" }),
        ],
      });

      expect(
        (await secondAdminClient.cron.list.query()).find((task) => task.name === "restore-digest"),
      ).toMatchObject({
        scheduleKind: "interval",
        intervalMinutes: 15,
        prompt: "Summarize recovered state",
      });
      expect(runtime.scheduler.list().find((task) => task.name === "restore-digest")).toMatchObject(
        {
          scheduleKind: "interval",
          intervalMinutes: 15,
        },
      );
      expect(runtime.store.getAutomationTaskByName("cron", "restore-digest")).toMatchObject({
        taskType: "cron",
        enabled: true,
        paused: false,
      });
      expect(await secondAdminClient.webhookTask.list.query()).toEqual([
        expect.objectContaining({
          name: "Restore hook",
          slug: "restore-hook",
          enabled: true,
        }),
      ]);
      expect(runtime.store.getAutomationTaskBySlug("restore-hook")).toMatchObject({
        taskType: "webhook",
        name: "Restore hook",
      });
    } finally {
      await server?.stop();
      if (!server) {
        await runtime?.close();
      }
    }
  });
});
