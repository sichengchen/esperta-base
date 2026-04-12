import { describe, expect, test } from "bun:test";

import { buildClientExecutionHierarchySummary } from "@aria/access-client";
import { createProjectEnvironmentListItem } from "@aria/ui";

describe("client execution hierarchy seams", () => {
  test("@aria/access-client summarizes server, workspace, and environment hierarchy for clients", () => {
    expect(
      buildClientExecutionHierarchySummary(
        {
          workspaceId: "workspace-home",
          label: "Home Workspace",
          serverId: "server-home",
        },
        {
          environmentId: "environment-sandbox",
          label: "sandbox/pr-128",
          mode: "remote",
          kind: "sandbox",
          locator: "sandbox/pr-128",
        },
        {
          serverId: "server-home",
          label: "Home Server",
        },
      ),
    ).toEqual({
      serverId: "server-home",
      serverLabel: "Home Server",
      workspaceId: "workspace-home",
      workspaceLabel: "Home Workspace",
      environmentId: "environment-sandbox",
      environmentLabel: "sandbox/pr-128",
      environmentMode: "remote",
      environmentKind: "sandbox",
      locator: "sandbox/pr-128",
    });
  });

  test("@aria/ui formats project environment options for shell selectors", () => {
    expect(
      createProjectEnvironmentListItem(
        {
          workspaceId: "workspace-local",
          label: "This Device",
        },
        {
          environmentId: "environment-main",
          label: "main",
          mode: "local",
          kind: "main",
          locator: "main",
        },
      ),
    ).toEqual({
      id: "environment-main",
      label: "main",
      hostLabel: "This Device",
      mode: "local",
      kind: "main",
      locator: "main",
    });
  });
});
