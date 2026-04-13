import { describe, expect, test } from "bun:test";
import {
  resolveAriaDesktopRendererTarget,
  startAriaDesktopRendererModel,
} from "../apps/aria-desktop/src/renderer.js";

describe("aria-desktop host scaffold", () => {
  test("resolves renderer targets with desktop defaults", () => {
    expect(resolveAriaDesktopRendererTarget(undefined)).toEqual({
      serverId: "desktop",
      baseUrl: "http://127.0.0.1:7420/",
    });

    expect(
      resolveAriaDesktopRendererTarget({
        serverId: "relay",
        baseUrl: "https://relay.example.test/",
      }),
    ).toEqual({
      serverId: "relay",
      baseUrl: "https://relay.example.test/",
    });
  });

  test("starts a desktop renderer model with recent sessions loaded", async () => {
    const connectedState = {
      connected: true,
      sessionId: "desktop:session-1",
      sessionStatus: "resumed" as const,
      approvalMode: "ask" as const,
      securityMode: "default" as const,
      securityModeRemainingTTL: null,
      modelName: "sonnet",
      agentName: "Esperta Aria",
      messages: [],
      streamingText: "",
      isStreaming: false,
      pendingApproval: null,
      pendingQuestion: null,
      lastError: null,
    };
    const controller = {
      getState: () => connectedState,
      connect: async () => connectedState,
      sendMessage: async () => connectedState,
      stop: async () => connectedState,
      openSession: async () => connectedState,
      approveToolCall: async () => connectedState,
      acceptToolCallForSession: async () => connectedState,
      answerQuestion: async () => connectedState,
      listSessions: async () => [
        {
          sessionId: "desktop:live-1",
          connectorType: "tui",
          connectorId: "desktop",
          archived: false,
        },
      ],
      listArchivedSessions: async () => [
        {
          sessionId: "desktop:archived-1",
          connectorType: "tui",
          connectorId: "desktop",
          archived: true,
          preview: "Archived",
          summary: "Archived summary",
        },
      ],
      searchSessions: async () => [],
    };

    const model = await startAriaDesktopRendererModel({
      target: { serverId: "desktop", baseUrl: "http://127.0.0.1:7420/" },
      ariaThreadController: controller as any,
    });

    expect(model.ariaThread.state.connected).toBe(true);
    expect(model.ariaRecentSessions.map((session) => session.sessionId)).toEqual([
      "desktop:live-1",
      "desktop:archived-1",
    ]);
  });
});
