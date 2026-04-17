import { describe, expect, test } from "bun:test";

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
      projectLocalExecution: "unsupported",
    });
  });

  test("keeps mobile as a thin server client", () => {
    expect(ariaMobileApp.ownership).toEqual({
      ariaAgent: "server-only",
      assistantState: "server-only",
      memory: "server-only",
      automation: "server-only",
      localExecution: "unsupported",
      codingAgents: "server-only",
    });
  });
});
