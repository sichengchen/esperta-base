import { describe, expect, test } from "bun:test";

import {
  ariaMobileAppModel,
  ariaMobileHost,
  ariaMobileNavigation,
  createAriaMobileAppShell,
  createAriaMobileHostBootstrap,
} from "../apps/aria-mobile/src/index.js";

describe("Aria mobile app surface", () => {
  test("composes a real app-level shell over the mobile client seam", () => {
    const appShell = createAriaMobileAppShell({
      target: { serverId: "mobile", baseUrl: "https://aria.example.test/" },
      projects: [
        {
          project: { name: "Aria" },
          threads: [
            {
              threadId: "thread-2",
              title: "Remote review",
              status: "idle",
              threadType: "remote_project",
              agentId: "codex",
              approvalLabel: "2 approvals pending",
              automationLabel: "Automation queued",
              remoteReviewLabel: "Ready for remote review",
              connectionLabel: "Connected to Home Server",
              reconnectLabel: "Reconnect after sleep",
            },
          ],
        },
      ],
      initialThread: {
        project: { name: "Aria" },
        thread: {
          threadId: "thread-2",
          title: "Remote review",
          status: "idle",
          threadType: "remote_project",
          agentId: "codex",
          approvalLabel: "2 approvals pending",
          automationLabel: "Automation queued",
          remoteReviewLabel: "Ready for remote review",
          connectionLabel: "Connected to Home Server",
          reconnectLabel: "Reconnect after sleep",
        },
      },
      activeThreadContext: {
        thread: {
          threadId: "thread-2",
          threadType: "remote_project",
          approvalLabel: "2 approvals pending",
          automationLabel: "Automation queued",
          remoteReviewLabel: "Ready for remote review",
          connectionLabel: "Connected to Home Server",
          reconnectLabel: "Reconnect after sleep",
        },
        remoteStatusLabel: "Connected to Home Server",
      },
    });

    expect(ariaMobileHost.navigation).toBe(ariaMobileNavigation);
    expect(ariaMobileAppModel.navigation).toBe(ariaMobileNavigation);
    expect(ariaMobileNavigation.tabs).toEqual([
      { id: "aria", label: "Aria" },
      { id: "projects", label: "Projects" },
    ]);
    expect(ariaMobileNavigation.spaces).toEqual([
      {
        id: "aria",
        label: "Aria",
        defaultScreenId: "chat",
        screens: [
          { id: "chat", label: "Chat", kind: "thread" },
          { id: "inbox", label: "Inbox", kind: "feed" },
          { id: "automations", label: "Automations", kind: "feed" },
          { id: "connectors", label: "Connectors", kind: "feed" },
        ],
      },
      {
        id: "projects",
        label: "Projects",
        defaultScreenId: "thread-list",
        screens: [
          { id: "thread-list", label: "Thread List", kind: "list" },
          { id: "thread", label: "Active Thread", kind: "thread" },
        ],
      },
    ]);
    expect(appShell.layout).toEqual({
      threadListScreen: {
        placement: "stacked",
        mode: "project-first",
      },
      activeThreadScreen: {
        headerPlacement: "top",
        streamPlacement: "center",
        composerPlacement: "bottom",
        detailPresentations: [
          "bottom-sheet",
          "push-screen",
          "segmented-detail-view",
        ],
      },
    });
    expect(appShell.initialThread).toMatchObject({
      id: "thread-2",
      projectLabel: "Aria",
      status: "Idle",
      threadType: "remote_project",
    });
    expect(appShell.activeThreadContext).toMatchObject({
      threadId: "thread-2",
      threadType: "remote_project",
      threadTypeLabel: "Remote Project",
      remoteStatusLabel: "Connected to Home Server",
      connectionLabel: "Connected to Home Server",
      approvalLabel: "2 approvals pending",
      automationLabel: "Automation queued",
      remoteReviewLabel: "Ready for remote review",
      reconnectLabel: "Reconnect after sleep",
    });
    expect(createAriaMobileHostBootstrap({ serverId: "mobile", baseUrl: "https://aria.example.test/" }).appShell.navigation).toBe(
      ariaMobileNavigation,
    );
  });
});
