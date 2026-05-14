import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { Agent } from "@aria/agent";
import { createEngineClient } from "@aria/access-client";
import { runAutomationAgent } from "@aria/automation";
import { ChatSDKAdapter } from "@aria/connectors/chat-sdk";
import { startServer, type EngineServer } from "@aria/gateway/server";
import { getRuntimeSessionCoordinator } from "@aria/server/session-coordinator";
import { createTestRuntime, getAvailableGatewayPortPair } from "../helpers/server-runtime.js";

let testDir: string;
let previousAriaHome: string | undefined;
let previousTestApiKey: string | undefined;

function createFakeChat() {
  return {
    onNewMention() {},
    onSubscribedMessage() {},
    onAction() {},
  } as any;
}

function createFakeThread() {
  const posts: string[] = [];
  return {
    thread: {
      id: "thread-connector",
      channelId: "channel-connector",
      isDM: false,
      async post(content: string) {
        posts.push(content);
        const index = posts.length - 1;
        return {
          id: `msg-${posts.length}`,
          async edit(nextContent: string) {
            posts[index] = nextContent;
          },
        };
      },
      async subscribe() {},
    },
    posts,
  };
}

async function waitFor(assertion: () => void | Promise<void>, timeoutMs = 1_000): Promise<void> {
  const startedAt = Date.now();
  let lastError: unknown;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      await assertion();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

beforeEach(async () => {
  previousAriaHome = process.env.ARIA_HOME;
  previousTestApiKey = process.env.TEST_API_KEY;
  testDir = await mkdtemp(`${tmpdir()}/aria-node-connector-flow-`);
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

describe("server connector flow", () => {
  test("normalizes inbound Chat SDK messages into connector-owned Aria sessions over the gateway", async () => {
    const runtime = await createTestRuntime(testDir);
    const port = await getAvailableGatewayPortPair();
    let server: EngineServer | undefined;

    try {
      server = await startServer(runtime, { hostname: "127.0.0.1", port });
      const paired = runtime.auth.pair(
        runtime.auth.getMasterToken(),
        "telegram:channel-connector",
        "telegram",
      );
      expect(paired.success).toBe(true);
      expect(paired.token).toBeTruthy();

      const connectorClient = createEngineClient({
        httpUrl: `http://127.0.0.1:${port}`,
        wsUrl: `ws://127.0.0.1:${port + 1}`,
        token: paired.token!,
      });
      const created = await connectorClient.session.create.mutate({
        connectorType: "telegram",
        prefix: "telegram:channel-connector",
      });
      const coordinator = getRuntimeSessionCoordinator(runtime);
      const seenPrompts: string[] = [];
      coordinator.sessionAgents.set(created.session.id, {
        async *chat(prompt: string) {
          seenPrompts.push(prompt);
          yield { type: "text_delta", delta: "Connector reply" };
          yield {
            type: "tool_end",
            name: "read",
            id: "tool-read",
            result: { content: "tool output", isError: false },
          };
          yield { type: "done", stopReason: "end_turn" };
        },
        getMessages() {
          return [
            { role: "user", content: seenPrompts.at(-1) ?? "", timestamp: 100 },
            { role: "assistant", content: "Connector reply", timestamp: 101 },
          ];
        },
        abort() {
          return false;
        },
      } as unknown as Agent);

      const adapter = new ChatSDKAdapter(createFakeChat(), {
        connectorType: "telegram",
        platformName: "telegram",
        attributeSender: true,
      });
      (adapter as any).client = connectorClient;

      const { thread, posts } = createFakeThread();
      await (adapter as any).handleMessage(thread, {
        text: "Please inspect status",
        author: { fullName: "Remote User" },
      });

      await waitFor(() => {
        expect(posts).toContain("Connector reply");
      });
      expect(posts).not.toContain("tool output");

      expect(seenPrompts).toEqual(["[Remote User]: Please inspect status"]);
      expect(runtime.sessions.getLatest("telegram:channel-connector")).toMatchObject({
        id: created.session.id,
        connectorType: "telegram",
        connectorId: "telegram:channel-connector",
      });
      await expect(
        connectorClient.projects.thread.open.query({ threadId: "local-project-thread" }),
      ).rejects.toThrow("master token");

      const boundaryEvents = await new Promise<any[]>((resolve, reject) => {
        const events: any[] = [];
        const subscription = connectorClient.chat.stream.subscribe(
          {
            sessionId: created.session.id,
            message: "try to bind a project directory",
            workingDirectory: testDir,
          },
          {
            onData(event) {
              events.push(event);
              if (event.type === "error") {
                subscription.unsubscribe();
                resolve(events);
              }
            },
            onError: reject,
            onComplete() {
              resolve(events);
            },
          },
        );
      });
      expect(boundaryEvents).toEqual([
        expect.objectContaining({
          type: "error",
          message: "workingDirectory overrides require the master token",
          sessionId: created.session.id,
          connectorType: "telegram",
        }),
      ]);

      const deliveredMessages: Array<{ message: string; connector: unknown }> = [];
      runtime.tools.push({
        name: "notify",
        description: "Fake connector delivery tool",
        dangerLevel: "safe",
        parameters: {} as any,
        execute: async (args: Record<string, unknown>) => {
          deliveredMessages.push({
            message: String(args.message),
            connector: args.connector,
          });
          return { content: "Sent to: telegram", isError: false };
        },
      });
      runtime.store.upsertAutomationTask({
        taskId: "cron:connector-delivery",
        taskType: "cron",
        name: "Connector delivery",
        enabled: true,
        paused: false,
        config: {
          name: "Connector delivery",
          delivery: { connector: "telegram" },
        },
      });
      const automationResult = await runAutomationAgent(runtime, {
        taskId: "cron:connector-delivery",
        taskType: "cron",
        sessionPrefix: "cron:connector-delivery",
        connectorType: "cron",
        name: "Connector delivery",
        prompt: "Summarize delivery",
        delivery: { connector: "telegram" },
        agentFactory: () => ({
          async *chat() {
            yield { type: "text_delta", delta: "Delivery summary" };
            yield { type: "done", stopReason: "end_turn" };
          },
          getMessages() {
            return [];
          },
        }),
      });
      expect(automationResult).toMatchObject({
        deliveryStatus: "delivered",
        deliveryError: null,
        responseText: "Delivery summary",
      });
      expect(deliveredMessages).toEqual([{ message: "Delivery summary", connector: "telegram" }]);
      expect(runtime.store.listAutomationRuns("cron:connector-delivery", 1)[0]).toMatchObject({
        taskId: "cron:connector-delivery",
        deliveryStatus: "delivered",
        deliveryError: null,
      });

      const otherPaired = runtime.auth.pair(
        runtime.auth.getMasterToken(),
        "slack:channel-other",
        "slack",
      );
      expect(otherPaired.success).toBe(true);
      const otherClient = createEngineClient({
        httpUrl: `http://127.0.0.1:${port}`,
        wsUrl: `ws://127.0.0.1:${port + 1}`,
        token: otherPaired.token!,
      });
      await expect(
        otherClient.chat.history.query({ sessionId: created.session.id }),
      ).rejects.toThrow("You do not own this session");
    } finally {
      await server?.stop();
    }
  });

  test("resolves connector approval and question replies through the gateway session boundary", async () => {
    const runtime = await createTestRuntime(testDir);
    const port = await getAvailableGatewayPortPair();
    let server: EngineServer | undefined;

    try {
      server = await startServer(runtime, { hostname: "127.0.0.1", port });
      const paired = runtime.auth.pair(
        runtime.auth.getMasterToken(),
        "telegram:channel-connector",
        "telegram",
      );
      expect(paired.success).toBe(true);
      expect(paired.token).toBeTruthy();

      const connectorClient = createEngineClient({
        httpUrl: `http://127.0.0.1:${port}`,
        wsUrl: `ws://127.0.0.1:${port + 1}`,
        token: paired.token!,
      });
      const created = await connectorClient.session.create.mutate({
        connectorType: "telegram",
        prefix: "telegram:channel-connector",
      });
      const coordinator = getRuntimeSessionCoordinator(runtime);
      coordinator.sessionAgents.set(created.session.id, {
        async *chat() {
          yield { type: "text_delta", delta: "Need permission." };
          const approvalPromise = new Promise<boolean>((resolve) => {
            coordinator.pendingApprovals.set("approval-exec", resolve);
          });
          yield {
            type: "tool_start",
            name: "exec",
            id: "approval-exec",
            args: { command: "rm -rf /tmp/aria-connector-approval", danger: "dangerous" },
          };
          yield {
            type: "tool_approval_request",
            name: "exec",
            id: "approval-exec",
            args: { command: "rm -rf /tmp/aria-connector-approval", danger: "dangerous" },
          };
          const approved = await approvalPromise;
          yield { type: "text_delta", delta: approved ? "Approved." : "Denied." };

          const answerPromise = new Promise<string>((resolve, reject) => {
            coordinator.pendingQuestions.set("question-plan", {
              resolve,
              reject,
              sessionId: created.session.id,
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
            { role: "user", content: "needs connector interaction", timestamp: 100 },
            { role: "assistant", content: "Answer:B", timestamp: 101 },
          ];
        },
        abort() {
          return false;
        },
      } as unknown as Agent);

      const adapter = new ChatSDKAdapter(createFakeChat(), {
        connectorType: "telegram",
        platformName: "telegram",
        attributeSender: false,
      });
      (adapter as any).client = connectorClient;

      const { thread, posts } = createFakeThread();
      await (adapter as any).handleMessage(thread, {
        text: "needs connector interaction",
        author: { fullName: "Remote User" },
      });

      await waitFor(() => {
        if (!posts.some((post) => post.includes("Approve execution?"))) {
          throw new Error(`approval prompt not posted: ${JSON.stringify(posts)}`);
        }
      }, 3_000);
      expect((adapter as any).pendingApprovals.get("approval")).toBe("approval-exec");
      await (adapter as any).handleCommand(thread, "approve approval");

      await waitFor(() => {
        expect(posts.some((post) => post.includes("Which plan?"))).toBe(true);
      });
      await (adapter as any).handleCommand(thread, "answer 2");

      await waitFor(() => {
        expect(posts.some((post) => post.includes("Answer:B"))).toBe(true);
      });
      expect(runtime.store.listApprovals({ sessionId: created.session.id })).toEqual([
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
});
