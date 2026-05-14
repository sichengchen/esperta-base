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
  testDir = await mkdtemp(`${tmpdir()}/aria-node-gateway-ws-`);
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
    const subscription = subscribe({
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

describe("gateway WebSocket transport", () => {
  test("streams with session-token auth and reattaches through canonical session state", async () => {
    const runtime = await createTestRuntime(testDir);
    const port = await getAvailableGatewayPortPair();
    let server: EngineServer | undefined;

    try {
      server = await startServer(runtime, { hostname: "127.0.0.1", port });
      const baseUrls = {
        httpUrl: `http://127.0.0.1:${port}`,
        wsUrl: `ws://127.0.0.1:${port + 1}`,
      };
      const paired = runtime.auth.pair(
        runtime.auth.getMasterToken(),
        "telegram:gateway-ws",
        "telegram",
      );
      expect(paired.success).toBe(true);
      expect(paired.token).toEqual(expect.any(String));

      const firstClient = createEngineClient({
        ...baseUrls,
        token: paired.token!,
      });
      const { session } = await firstClient.session.create.mutate({
        connectorType: "telegram",
        prefix: "telegram:gateway-ws",
      });
      const prompts: string[] = [];
      getRuntimeSessionCoordinator(runtime).sessionAgents.set(session.id, {
        async *chat(prompt: string) {
          prompts.push(prompt);
          yield { type: "text_delta", delta: `WS reply ${prompts.length}` };
          yield { type: "done", stopReason: "end_turn" };
        },
        getMessages() {
          return prompts.flatMap((prompt, index) => [
            { role: "user", content: prompt, timestamp: 100 + index * 2 },
            {
              role: "assistant",
              content: `WS reply ${index + 1}`,
              timestamp: 101 + index * 2,
            },
          ]);
        },
        abort() {
          return false;
        },
      } as unknown as Agent);

      const firstEvents = await collectSubscription((handlers) =>
        firstClient.chat.stream.subscribe(
          { sessionId: session.id, message: "first websocket turn" },
          handlers,
        ),
      );
      expect(firstEvents).toEqual([
        expect.objectContaining({
          type: "text_delta",
          delta: "WS reply 1",
          sessionId: session.id,
          connectorType: "telegram",
          threadType: "connector",
          source: "chat",
        }),
        expect.objectContaining({
          type: "done",
          stopReason: "end_turn",
          sessionId: session.id,
          connectorType: "telegram",
          threadType: "connector",
          source: "chat",
        }),
      ]);
      expect(firstEvents[0].runId).toBe(firstEvents[1].runId);

      const reconnectingClient = createEngineClient({
        ...baseUrls,
        token: paired.token!,
      });
      const latest = await reconnectingClient.session.getLatest.query({
        prefix: "telegram:gateway-ws",
      });
      expect(latest).toMatchObject({
        id: session.id,
        connectorType: "telegram",
        connectorId: "telegram:gateway-ws",
      });
      const reattachedHistory = await reconnectingClient.chat.history.query({
        sessionId: session.id,
      });
      expect(reattachedHistory).toMatchObject({
        sessionId: session.id,
        archived: false,
      });
      expect(reattachedHistory.messages).toHaveLength(2);

      const secondEvents = await collectSubscription((handlers) =>
        reconnectingClient.chat.stream.subscribe(
          { sessionId: session.id, message: "second websocket turn" },
          handlers,
        ),
      );
      expect(secondEvents).toEqual([
        expect.objectContaining({
          type: "text_delta",
          delta: "WS reply 2",
          sessionId: session.id,
          connectorType: "telegram",
        }),
        expect.objectContaining({
          type: "done",
          sessionId: session.id,
          connectorType: "telegram",
        }),
      ]);
      expect(runtime.store.getSessionMessages(session.id)).toHaveLength(4);
      expect(runtime.sessions.listSessions().filter((item) => item.id === session.id)).toHaveLength(
        1,
      );

      const anonymousClient = createEngineClient(baseUrls);
      await expect(
        collectSubscription((handlers) =>
          anonymousClient.chat.stream.subscribe(
            { sessionId: session.id, message: "missing auth" },
            handlers,
          ),
        ),
      ).rejects.toThrow("Missing auth token");
    } finally {
      await server?.stop();
    }
  });
});
