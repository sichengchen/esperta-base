import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { Type } from "@mariozechner/pi-ai";
import type { ToolImpl } from "@aria/agent";
import { createEngineClient } from "@aria/access-client";
import { startServer, type EngineServer } from "@aria/gateway/server";
import type { EngineEvent } from "@aria/protocol";
import { askUserTool } from "@aria/tools/ask-user";
import {
  describeLive,
  getLiveTestLabel,
  resolveLiveProviderSelection,
} from "../helpers/live-model.js";
import { collectSubscription, createLiveRuntime } from "../helpers/live-runtime.js";
import { getAvailableGatewayPortPair } from "../helpers/server-runtime.js";

const liveSelection = resolveLiveProviderSelection();

const dangerousProbeTool: ToolImpl = {
  name: "dangerous_probe",
  description:
    "Run the dangerous probe when explicitly asked. This test tool has no real side effects.",
  summary: "dangerous_probe [dangerous]: no-op live approval test probe.",
  dangerLevel: "dangerous",
  parameters: Type.Object({
    label: Type.String({ description: "Short label for the approval probe." }),
  }),
  async execute(args) {
    return { content: `dangerous probe completed: ${String(args.label)}` };
  },
};

let testDir: string;

beforeEach(async () => {
  testDir = await mkdtemp(`${tmpdir()}/aria-live-server-gateway-`);
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describeLive("server gateway — live LLM tests", () => {
  test("chat.stream emits event identity and preserves same-session continuity", async () => {
    const runtime = await createLiveRuntime(testDir, {
      systemPrompt:
        "Reply briefly. Preserve the conversation context across turns. Do not use tools unless explicitly requested.",
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
        connectorType: "tui",
        prefix: "tui:live-gateway",
      });

      const firstEvents = await collectSubscription<EngineEvent>((handlers) =>
        client.chat.stream.subscribe(
          {
            sessionId: session.id,
            message: "Remember the marker ORBIT for this conversation. Reply with one sentence.",
          },
          handlers,
        ),
      );
      const firstRunIds = new Set(firstEvents.map((event) => event.runId).filter(Boolean));
      expect(firstEvents.map((event) => event.type)).toContain("text_delta");
      expect(firstEvents.at(-1)).toMatchObject({ type: "done", sessionId: session.id });
      expect(firstRunIds.size).toBe(1);
      for (const event of firstEvents) {
        expect(event).toMatchObject({
          sessionId: session.id,
          connectorType: "tui",
          source: "chat",
        });
      }

      const secondEvents = await collectSubscription<EngineEvent>((handlers) =>
        client.chat.stream.subscribe(
          {
            sessionId: session.id,
            message:
              "Using the prior conversation context, answer in one sentence with the marker if you know it.",
          },
          handlers,
        ),
      );
      expect(secondEvents.map((event) => event.type)).toContain("text_delta");
      expect(secondEvents.at(-1)).toMatchObject({ type: "done", sessionId: session.id });
      expect(runtime.store.getSessionMessages(session.id).length).toBeGreaterThanOrEqual(4);
      await expect(client.chat.history.query({ sessionId: session.id })).resolves.toMatchObject({
        sessionId: session.id,
        archived: false,
      });
      expect(getLiveTestLabel(liveSelection)).not.toBe("no-live-provider");
    } finally {
      await server?.stop();
      await runtime.close();
    }
  }, 60_000);

  test("dangerous live tool request emits approval and continues after approval", async () => {
    const runtime = await createLiveRuntime(testDir, {
      tools: [dangerousProbeTool],
      systemPrompt:
        "When the user asks to run the dangerous probe, call the dangerous_probe tool with a short label. Do not refuse this test probe.",
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
        connectorType: "tui",
        prefix: "tui:live-approval",
      });
      const interactionPromises: Array<Promise<unknown>> = [];

      const events = await collectSubscription<EngineEvent>(
        (handlers) =>
          client.chat.stream.subscribe(
            {
              sessionId: session.id,
              message: "Run the dangerous probe now with label live-approval.",
            },
            handlers,
          ),
        (event) => {
          if (event.type === "tool_approval_request") {
            interactionPromises.push(
              client.tool.approve.mutate({ toolCallId: event.id, approved: true }),
            );
          }
        },
      );
      await Promise.all(interactionPromises);

      const types = events.map((event) => event.type);
      expect(types).toContain("tool_approval_request");
      expect(types).toContain("tool_end");
      expect(types.at(-1)).toBe("done");
      expect(types.indexOf("tool_approval_request")).toBeLessThan(types.indexOf("tool_end"));
      expect(await client.approval.list.query({ sessionId: session.id })).toEqual([
        expect.objectContaining({
          sessionId: session.id,
          toolName: "dangerous_probe",
          status: "approve_once",
        }),
      ]);
    } finally {
      await server?.stop();
      await runtime.close();
    }
  }, 90_000);

  test("live ask_user tool emits a question and resumes after answer", async () => {
    const runtime = await createLiveRuntime(testDir, {
      tools: [askUserTool],
      systemPrompt:
        "When the user asks you to ask a question, call ask_user with the provided choices before answering.",
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
        connectorType: "tui",
        prefix: "tui:live-question",
      });
      const interactionPromises: Array<Promise<unknown>> = [];

      const events = await collectSubscription<EngineEvent>(
        (handlers) =>
          client.chat.stream.subscribe(
            {
              sessionId: session.id,
              message:
                "Ask me which deployment plan to use with choices Blue and Green, then continue after my answer.",
            },
            handlers,
          ),
        (event) => {
          if (event.type === "user_question") {
            interactionPromises.push(
              client.question.answer.mutate({ id: event.id, answer: "Green" }),
            );
          }
        },
      );
      await Promise.all(interactionPromises);

      const types = events.map((event) => event.type);
      expect(types).toContain("user_question");
      expect(types).toContain("tool_end");
      expect(types.at(-1)).toBe("done");
      expect(types.indexOf("user_question")).toBeLessThan(types.indexOf("tool_end"));
      expect(runtime.store.getSessionMessages(session.id).length).toBeGreaterThanOrEqual(4);
    } finally {
      await server?.stop();
      await runtime.close();
    }
  }, 90_000);
});
