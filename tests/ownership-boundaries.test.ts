import { describe, expect, test } from "bun:test";

import { ariaDesktopApp } from "@aria/desktop";
import { ariaMobileApp } from "@aria/mobile";
import { ariaServerApp } from "@aria/server";

describe("architecture ownership boundaries", () => {
  test("keeps Aria-owned assistant state on the server", () => {
    expect(ariaServerApp.ownership).toMatchObject({
      ariaAgent: "server-only",
      assistantState: "server-only",
      memory: "server-only",
      automation: "server-only",
      connectors: "server-only",
      inboxApprovals: "server-only",
      remoteJobs: "server-only",
      projectLocalExecution: "desktop-only",
    });
  });

  test("separates desktop local execution from server-hosted Aria surfaces", () => {
    expect(ariaDesktopApp.executionPlanes).toEqual({
      aria: "server",
      remoteProjects: "server",
      localProjects: "desktop",
    });
  });

  test("keeps mobile as a thin server client", () => {
    expect(ariaMobileApp.ownership).toEqual({
      ariaAgent: "server-only",
      assistantState: "server-only",
      memory: "server-only",
      automation: "server-only",
      localExecution: "unsupported",
      codingAgents: "server-or-desktop-only",
    });
  });
});
