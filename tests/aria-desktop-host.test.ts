import { describe, expect, test } from "bun:test";
import { resolveHostAccessClientTarget } from "@aria/access-client";
import {
  createAriaDesktopElectronHostBootstrap,
  runAriaDesktopElectronHost,
} from "../apps/aria-desktop/src/electron-host.js";
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

    expect(
      resolveHostAccessClientTarget(
        { serverId: "relay", baseUrl: "https://relay.example.test/" },
        { serverId: "desktop", baseUrl: "http://127.0.0.1:7420/" },
      ),
    ).toEqual({
      serverId: "relay",
      baseUrl: "https://relay.example.test/",
      token: undefined,
      directBaseUrl: undefined,
      relayBaseUrl: undefined,
      directReachable: undefined,
      preferredTransportMode: undefined,
    });
  });

  test("builds a deterministic electron host bootstrap", () => {
    expect(
      createAriaDesktopElectronHostBootstrap({
        distDir: "/tmp/aria-desktop",
        devServerUrl: "http://127.0.0.1:5173/",
      }),
    ).toEqual({
      preloadPath: "/tmp/aria-desktop/electron-preload.js",
      rendererEntry: { kind: "url", value: "http://127.0.0.1:5173/" },
      window: {
        width: 1440,
        height: 960,
        minWidth: 1100,
        minHeight: 720,
      },
    });
  });

  test("runs the pure electron host seam with a fake runtime", async () => {
    const urls: string[] = [];
    const files: string[] = [];
    let activateHandler: (() => void) | undefined;
    let closeHandler: (() => void) | undefined;
    let windowCount = 0;
    let quitCalled = false;

    const bootstrap = await runAriaDesktopElectronHost(
      {
        platform: "linux",
        whenReady: async () => {},
        onActivate(handler) {
          activateHandler = handler;
        },
        onWindowAllClosed(handler) {
          closeHandler = handler;
        },
        createWindow() {
          windowCount += 1;
          return {
            loadURL(url) {
              urls.push(url);
            },
            loadFile(filePath) {
              files.push(filePath);
            },
          };
        },
        getAllWindows() {
          return [];
        },
        quit() {
          quitCalled = true;
        },
      },
      {
        distDir: "/tmp/aria-desktop",
        devServerUrl: "http://127.0.0.1:5173/",
      },
    );

    expect(bootstrap.rendererEntry).toEqual({
      kind: "url",
      value: "http://127.0.0.1:5173/",
    });
    expect(windowCount).toBe(1);
    expect(urls).toEqual(["http://127.0.0.1:5173/"]);

    activateHandler?.();
    expect(windowCount).toBe(2);

    closeHandler?.();
    expect(quitCalled).toBe(true);
    expect(files).toEqual([]);
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
