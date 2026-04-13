import { describe, expect, test } from "bun:test";
import {
  createAriaMobileAppShell,
  startAriaMobileNativeHostShell,
} from "../apps/aria-mobile/src/app.js";
import { createAriaMobileNativeHostModel } from "../apps/aria-mobile/src/native-model.js";

describe("aria-mobile native host scaffold", () => {
  test("derives a native host summary from the mobile app shell", () => {
    const shell = createAriaMobileAppShell({
      target: { serverId: "mobile", baseUrl: "https://aria.example.test/" },
      ariaThreadState: {
        connected: true,
        sessionId: "mobile:session-1",
        sessionStatus: "resumed",
        approvalMode: "ask",
        securityMode: "trusted",
        securityModeRemainingTTL: 600,
        modelName: "sonnet",
        agentName: "Esperta Aria",
        messages: [{ role: "assistant", content: "hello" }],
        streamingText: "",
        isStreaming: false,
        pendingApproval: null,
        pendingQuestion: null,
        lastError: null,
      },
    });

    expect(createAriaMobileNativeHostModel(shell)).toEqual({
      title: "Aria Mobile",
      serverLabel: "mobile",
      sessionId: "mobile:session-1",
      sessionStatus: "resumed",
      approvalMode: "ask",
      securityMode: "trusted",
      transcriptCount: 1,
      latestMessage: "hello",
      pendingApproval: "none",
      pendingQuestion: "none",
      recentSessions: [],
    });
  });

  test("starts a mobile native host shell with recent sessions loaded", async () => {
    const connectedState = {
      connected: true,
      sessionId: "mobile:session-1",
      sessionStatus: "resumed" as const,
      approvalMode: "ask" as const,
      securityMode: "trusted" as const,
      securityModeRemainingTTL: 600,
      modelName: "sonnet",
      agentName: "Esperta Aria",
      messages: [{ role: "assistant" as const, content: "hello" }],
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
          sessionId: "mobile:live-1",
          connectorType: "tui",
          connectorId: "mobile",
          archived: false,
        },
      ],
      listArchivedSessions: async () => [
        {
          sessionId: "mobile:archived-1",
          connectorType: "tui",
          connectorId: "mobile",
          archived: true,
          preview: "Archived",
          summary: "Archived summary",
        },
      ],
      searchSessions: async () => [],
    };

    const shell = await startAriaMobileNativeHostShell({
      target: { serverId: "mobile", baseUrl: "https://aria.example.test/" },
      ariaThreadController: controller as any,
    });

    expect(createAriaMobileNativeHostModel(shell).recentSessions).toEqual([
      { sessionId: "mobile:live-1", kind: "live" },
      { sessionId: "mobile:archived-1", kind: "archived" },
    ]);
  });
});
