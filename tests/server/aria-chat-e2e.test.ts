import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { Agent } from "@aria/agent";
import { createEngineClient } from "@aria/access-client";
import { startServer, type EngineServer } from "@aria/gateway/server";
import { getRuntimeSessionCoordinator } from "@aria/server/session-coordinator";
import { createTestRuntime, getAvailableGatewayPortPair } from "../helpers/server-runtime.js";

let testDir: string;
let previousAriaHome: string | undefined;
let previousTestApiKey: string | undefined;

beforeEach(async () => {
  previousAriaHome = process.env.ARIA_HOME;
  previousTestApiKey = process.env.TEST_API_KEY;
  testDir = await mkdtemp(`${tmpdir()}/aria-server-chat-e2e-`);
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

function collectStream(
  subscriptionFactory: (handlers: {
    onData(event: any): void;
    onError(error: unknown): void;
    onComplete(): void;
  }) => { unsubscribe(): void },
  onEvent?: (event: any) => void,
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const events: any[] = [];
    let subscription: { unsubscribe(): void };
    subscription = subscriptionFactory({
      onData(event) {
        events.push(event);
        try {
          onEvent?.(event);
        } catch (error) {
          subscription.unsubscribe();
          reject(error);
        }
      },
      onError(error) {
        reject(error);
      },
      onComplete() {
        resolve(events);
      },
    });
  });
}

describe("server Aria chat e2e", () => {
  test("streams a chat turn through the gateway and persists durable history", async () => {
    const runtime = await createTestRuntime(testDir);
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
        connectorType: "engine",
        prefix: "chat:e2e",
      });
      getRuntimeSessionCoordinator(runtime).sessionAgents.set(session.id, {
        async *chat(prompt: string) {
          expect(prompt).toBe("hello durable chat");
          yield { type: "text_delta", delta: "Hello from Aria" };
          yield { type: "done", stopReason: "end_turn" };
        },
        getMessages() {
          return [
            { role: "user", content: "hello durable chat", timestamp: 100 },
            { role: "assistant", content: "Hello from Aria", timestamp: 101 },
          ];
        },
        abort() {
          return false;
        },
      } as unknown as Agent);

      const events = await collectStream((handlers) =>
        client.chat.stream.subscribe(
          { sessionId: session.id, message: "hello durable chat" },
          handlers,
        ),
      );

      expect(events).toEqual([
        expect.objectContaining({
          type: "text_delta",
          delta: "Hello from Aria",
          sessionId: session.id,
          connectorType: "engine",
          source: "chat",
          threadType: "aria",
          agentId: "Test",
        }),
        expect.objectContaining({
          type: "done",
          stopReason: "end_turn",
          sessionId: session.id,
          connectorType: "engine",
          source: "chat",
          threadType: "aria",
          agentId: "Test",
        }),
      ]);
      expect(events[0].runId).toBe(events[1].runId);
      expect(runtime.store.getSessionMessages(session.id)).toHaveLength(2);

      const history = await client.chat.history.query({ sessionId: session.id });
      expect(history).toMatchObject({ sessionId: session.id, archived: false });
      expect(history.messages).toHaveLength(2);

      const latest = await client.session.getLatest.query({ prefix: "chat:e2e" });
      expect(latest).toMatchObject({ id: session.id, connectorType: "engine" });
    } finally {
      await server?.stop();
    }
  });

  test("resolves approval and question interruptions over the gateway", async () => {
    const runtime = await createTestRuntime(testDir);
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
        connectorType: "engine",
        prefix: "chat:interaction",
      });
      const coordinator = getRuntimeSessionCoordinator(runtime);
      coordinator.sessionAgents.set(session.id, {
        async *chat() {
          yield { type: "text_delta", delta: "Need permission." };
          const approvalPromise = new Promise<boolean>((resolve) => {
            coordinator.pendingApprovals.set("approval-exec", resolve);
          });
          yield {
            type: "tool_start",
            name: "exec",
            id: "approval-exec",
            args: { command: "rm -rf /tmp/aria-approval-test", danger: "dangerous" },
          };
          yield {
            type: "tool_approval_request",
            name: "exec",
            id: "approval-exec",
            args: { command: "rm -rf /tmp/aria-approval-test", danger: "dangerous" },
          };
          const approved = await approvalPromise;
          yield {
            type: "tool_end",
            name: "exec",
            id: "approval-exec",
            result: { content: "approved", isError: false },
          };
          yield { type: "text_delta", delta: approved ? "Approved." : "Denied." };

          const answerPromise = new Promise<string>((resolve, reject) => {
            coordinator.pendingQuestions.set("question-plan", {
              resolve,
              reject,
              sessionId: session.id,
            });
          });
          yield {
            type: "user_question",
            id: "question-plan",
            question: "Which plan?",
            options: ["A", "B"],
          };
          const answer = await answerPromise;
          yield { type: "text_delta", delta: `Answer:${answer}` };
          yield { type: "done", stopReason: "end_turn" };
        },
        getMessages() {
          return [
            { role: "user", content: "needs interaction", timestamp: 100 },
            { role: "assistant", content: "Answer:B", timestamp: 101 },
          ];
        },
        abort() {
          return false;
        },
      } as unknown as Agent);

      const interactionPromises: Array<Promise<unknown>> = [];
      const events = await collectStream(
        (handlers) =>
          client.chat.stream.subscribe(
            { sessionId: session.id, message: "needs interaction" },
            handlers,
          ),
        (event) => {
          if (event.type === "tool_approval_request") {
            expect(
              runtime.store.listApprovals({ sessionId: session.id, status: "pending" }),
            ).toEqual([
              expect.objectContaining({
                approvalId: "approval-exec",
                sessionId: session.id,
                toolName: "exec",
                status: "pending",
              }),
            ]);
            interactionPromises.push(
              new Promise((resolve, reject) => {
                setTimeout(() => {
                  client.tool.approve
                    .mutate({
                      toolCallId: "approval-exec",
                      approved: true,
                    })
                    .then((ack) => {
                      expect(ack).toEqual({ acknowledged: true });
                      resolve(ack);
                    })
                    .catch(reject);
                }, 0);
              }),
            );
          }
          if (event.type === "user_question") {
            interactionPromises.push(
              new Promise((resolve, reject) => {
                setTimeout(() => {
                  client.question.answer
                    .mutate({ id: "question-plan", answer: "B" })
                    .then((ack) => {
                      expect(ack).toEqual({ acknowledged: true });
                      resolve(ack);
                    })
                    .catch(reject);
                }, 0);
              }),
            );
          }
        },
      );
      await Promise.all(interactionPromises);

      expect(events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: "tool_approval_request", id: "approval-exec" }),
          expect.objectContaining({ type: "text_delta", delta: "Approved." }),
          expect.objectContaining({ type: "user_question", id: "question-plan" }),
          expect.objectContaining({ type: "text_delta", delta: "Answer:B" }),
          expect.objectContaining({ type: "done", stopReason: "end_turn" }),
        ]),
      );
      expect(await client.approval.list.query({ sessionId: session.id })).toEqual([
        expect.objectContaining({
          approvalId: "approval-exec",
          status: "approve_once",
        }),
      ]);
      expect(coordinator.pendingApprovals.has("approval-exec")).toBe(false);
      expect(coordinator.pendingQuestions.has("question-plan")).toBe(false);
    } finally {
      await server?.stop();
    }
  });

  test("stops an active chat run and clears pending runtime state", async () => {
    const runtime = await createTestRuntime(testDir);
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
        connectorType: "engine",
        prefix: "chat:stop",
      });
      const coordinator = getRuntimeSessionCoordinator(runtime);
      let releaseRun!: () => void;
      const runBlocked = new Promise<void>((resolve) => {
        releaseRun = resolve;
      });
      let aborted = false;
      let stopResult: Promise<{ cancelled: boolean }> | null = null;
      coordinator.sessionAgents.set(session.id, {
        async *chat() {
          yield { type: "text_delta", delta: "Working..." };
          await runBlocked;
          if (!aborted) {
            yield { type: "done", stopReason: "end_turn" };
          }
        },
        getMessages() {
          return [
            { role: "user", content: "long task", timestamp: 100 },
            { role: "assistant", content: "Working...", timestamp: 101 },
          ];
        },
        abort() {
          aborted = true;
          releaseRun();
          return true;
        },
      } as unknown as Agent);

      const events = await collectStream(
        (handlers) =>
          client.chat.stream.subscribe({ sessionId: session.id, message: "long task" }, handlers),
        (event) => {
          if (event.type === "text_delta" && !stopResult) {
            stopResult = client.chat.stop.mutate({ sessionId: session.id });
          }
        },
      );

      expect(stopResult).toBeTruthy();
      await expect(stopResult!).resolves.toEqual({ cancelled: true });
      expect(aborted).toBe(true);
      expect(events).toEqual([
        expect.objectContaining({
          type: "text_delta",
          delta: "Working...",
          sessionId: session.id,
        }),
      ]);
      expect(coordinator.activeRunsBySession.has(session.id)).toBe(false);
      expect(runtime.store.getSessionMessages(session.id)).toHaveLength(2);
    } finally {
      await server?.stop();
    }
  });
});
