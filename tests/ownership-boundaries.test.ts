import { describe, expect, test } from "bun:test";

import { ariaNodeRuntimeApp } from "@aria/server";

describe("architecture ownership boundaries", () => {
  test("keeps Aria-owned assistant state on the node runtime", () => {
    expect(ariaNodeRuntimeApp.ownership).toMatchObject({
      ariaAgent: "node-owned",
      assistantState: "node-owned",
      memory: "node-owned",
      automation: "node-owned",
      connectors: "node-owned",
      inboxApprovals: "node-owned",
      remoteJobs: "node-owned",
      projectLocalExecution: "configured-provider",
    });
  });
});
