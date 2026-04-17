import { describe, expect, test } from "bun:test";

import { createAriaMobileShell } from "@aria/mobile";
import { ariaServerApp, createAriaServerBootstrap } from "@aria/server";

describe("package shell composition", () => {
  test("@aria/server exposes package-owned server shell metadata and bootstrap discovery", () => {
    const bootstrap = createAriaServerBootstrap({
      runtimeHome: "/tmp/aria-shell-test",
      hostname: "127.0.0.1",
      port: 7420,
    });

    expect(ariaServerApp).toMatchObject({
      id: "aria-server",
      displayName: "Esperta Aria",
      runtimeName: "Aria Runtime",
      cliName: "aria",
      surface: "server",
    });
    expect(ariaServerApp.capabilities).toContain("aria-agent-host");
    expect(ariaServerApp.ownership).toMatchObject({
      ariaAgent: "server-only",
      memory: "server-only",
      automation: "server-only",
      connectors: "server-only",
      projectLocalExecution: "unsupported",
    });
    expect(ariaServerApp.sharedPackages).toEqual(["@aria/runtime", "@aria/gateway"]);
    expect(bootstrap).toMatchObject({
      app: ariaServerApp,
      runtimeHome: "/tmp/aria-shell-test",
      hostname: "127.0.0.1",
      port: 7420,
    });
    expect(bootstrap.discovery).toMatchObject({
      pidFile: "/tmp/aria-shell-test/engine.pid",
      urlFile: "/tmp/aria-shell-test/engine.url",
      logFile: "/tmp/aria-shell-test/engine.log",
      restartMarkerFile: "/tmp/aria-shell-test/engine.restart",
    });
  });

  test("@aria/mobile composes remote review shell state at the package seam", () => {
    const shell = createAriaMobileShell({
      target: { serverId: "mobile", baseUrl: "https://aria.example.test/" },
      projects: [
        {
          project: { name: "Aria" },
          threads: [
            {
              threadId: "thread-2",
              title: "Review",
              status: "idle",
              threadType: "remote_project",
              agentId: "codex",
              approvalLabel: "2 approvals pending",
              remoteReviewLabel: "Ready for review",
              connectionLabel: "Connected",
              reconnectLabel: "Reconnect after sleep",
            },
          ],
        },
      ],
      initialThread: {
        project: { name: "Aria" },
        thread: {
          threadId: "thread-2",
          title: "Review",
          status: "idle",
          threadType: "remote_project",
          agentId: "codex",
          approvalLabel: "2 approvals pending",
          remoteReviewLabel: "Ready for review",
          connectionLabel: "Connected",
          reconnectLabel: "Reconnect after sleep",
        },
      },
      activeThreadContext: {
        thread: {
          threadId: "thread-2",
          threadType: "remote_project",
          approvalLabel: "2 approvals pending",
          remoteReviewLabel: "Ready for review",
          connectionLabel: "Connected",
          reconnectLabel: "Reconnect after sleep",
        },
        serverLabel: "Home Server",
        remoteStatusLabel: "Connected",
      },
    });

    expect(shell.tabs).toEqual([
      { id: "aria", label: "Aria" },
      { id: "projects", label: "Projects" },
    ]);
    expect(shell.detailPresentations).toEqual([
      "bottom-sheet",
      "push-screen",
      "segmented-detail-view",
    ]);
    expect(shell.actionSections.map((section) => section.id)).toEqual([
      "approvals",
      "automation",
      "notifications",
      "attachments",
      "remote-review",
      "reconnect",
      "job-status",
    ]);
    expect(shell.projectThreads).toEqual([
      {
        projectLabel: "Aria",
        threads: [
          {
            id: "thread-2",
            title: "Review",
            projectLabel: "Aria",
            status: "Idle",
            threadType: "remote_project",
            threadTypeLabel: "Remote Project",
            environmentId: null,
            agentId: "codex",
            approvalLabel: "2 approvals pending",
            remoteReviewLabel: "Ready for review",
            connectionLabel: "Connected",
            reconnectLabel: "Reconnect after sleep",
          },
        ],
      },
    ]);
    expect(shell.initialThread).toMatchObject({
      id: "thread-2",
      projectLabel: "Aria",
      threadType: "remote_project",
    });
    expect(shell.activeThreadContext).toMatchObject({
      threadId: "thread-2",
      threadType: "remote_project",
      threadTypeLabel: "Remote Project",
      serverLabel: "Home Server",
      remoteStatusLabel: "Connected",
      approvalLabel: "2 approvals pending",
      remoteReviewLabel: "Ready for review",
      connectionLabel: "Connected",
      reconnectLabel: "Reconnect after sleep",
    });
  });
});
