import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { Agent } from "@aria/agent";
import { createTuiClient } from "@aria/console/client";
import { startServer, type EngineServer } from "@aria/gateway/server";
import { getRuntimeSessionCoordinator } from "@aria/server/session-coordinator";
import { createTestRuntime, getAvailableGatewayPortPair } from "../helpers/server-runtime.js";

let testDir: string;
let previousAriaHome: string | undefined;
let previousTestApiKey: string | undefined;

beforeEach(async () => {
  previousAriaHome = process.env.ARIA_HOME;
  previousTestApiKey = process.env.TEST_API_KEY;
  testDir = await mkdtemp(`${tmpdir()}/aria-node-console-e2e-`);
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

describe("node-local console e2e", () => {
  test("uses local gateway auth and persists Aria chat state in the node runtime", async () => {
    const runtime = await createTestRuntime(testDir);
    const port = await getAvailableGatewayPortPair();
    let server: EngineServer | undefined;

    try {
      server = await startServer(runtime, { hostname: "127.0.0.1", port });
      const client = createTuiClient();
      await expect(client.health.ping.query()).resolves.toMatchObject({
        status: "ok",
        agentName: "Test",
      });

      const { session } = await client.session.create.mutate({
        connectorType: "tui",
        prefix: "tui",
      });
      expect(session.id).toStartWith("tui:");
      expect(session.connectorType).toBe("tui");
      getRuntimeSessionCoordinator(runtime).sessionAgents.set(session.id, {
        async *chat(prompt: string) {
          expect(prompt).toBe("Console local chat");
          yield { type: "text_delta", delta: "Console reply" };
          yield { type: "done", stopReason: "end_turn" };
        },
        getMessages() {
          return [
            { role: "user", content: "Console local chat", timestamp: 100 },
            { role: "assistant", content: "Console reply", timestamp: 101 },
          ];
        },
        abort() {
          return false;
        },
      } as unknown as Agent);

      const events = await collectSubscription((handlers) =>
        client.chat.stream.subscribe(
          {
            sessionId: session.id,
            message: "Console local chat",
          },
          handlers,
        ),
      );
      expect(events).toEqual([
        expect.objectContaining({
          type: "text_delta",
          delta: "Console reply",
          sessionId: session.id,
          connectorType: "tui",
          threadType: "connector",
          source: "chat",
        }),
        expect.objectContaining({
          type: "done",
          sessionId: session.id,
          connectorType: "tui",
          threadType: "connector",
          source: "chat",
        }),
      ]);
      expect(events[0].runId).toBe(events[1].runId);
      expect(runtime.store.getSessionMessages(session.id)).toHaveLength(2);
      await expect(client.chat.history.query({ sessionId: session.id })).resolves.toMatchObject({
        sessionId: session.id,
        archived: false,
        messages: [
          expect.objectContaining({ role: "user", content: "Console local chat" }),
          expect.objectContaining({ role: "assistant", content: "Console reply" }),
        ],
      });
    } finally {
      await server?.stop();
    }
  });
});
