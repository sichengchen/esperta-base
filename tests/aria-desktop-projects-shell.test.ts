import { describe, expect, test } from "bun:test";
import type {
  EnvironmentRecord,
  ProjectRecord,
  RepoRecord,
  ThreadRecord,
} from "@aria/projects/types";

function createProjectRecord(projectId: string, name: string, updatedAt: number): ProjectRecord {
  return {
    createdAt: updatedAt,
    description: null,
    name,
    projectId,
    slug: name,
    updatedAt,
  };
}

function createEnvironmentRecord(
  environmentId: string,
  projectId: string,
  locator: string,
): EnvironmentRecord {
  return {
    createdAt: 1,
    environmentId,
    kind: "main",
    label: "This Device / main",
    locator,
    mode: "local",
    projectId,
    updatedAt: 1,
    workspaceId: "desktop-local-workspace",
  };
}

function createThreadRecord(
  threadId: string,
  projectId: string,
  title: string,
  updatedAt: number,
): ThreadRecord {
  return {
    agentId: "codex",
    createdAt: updatedAt,
    environmentBindingId: "binding-1",
    environmentId: "env-1",
    projectId,
    repoId: null,
    status: "idle",
    taskId: null,
    threadId,
    threadType: "local_project",
    title,
    updatedAt,
    workspaceId: "desktop-local-workspace",
  };
}

describe("buildDesktopProjectShellState", () => {
  test("groups projects and preserves projects with zero threads", async () => {
    const { buildDesktopProjectShellState } =
      await import("../apps/aria-desktop/src/main/desktop-projects-shell.js");
    const projects = [
      createProjectRecord("project-2", "mercury-api", 2),
      createProjectRecord("project-1", "atlas-app", 1),
    ];
    const repos: RepoRecord[] = [
      {
        createdAt: 1,
        defaultBranch: "main",
        name: "atlas-app",
        projectId: "project-1",
        remoteUrl: "git@example.com:test/atlas-app.git",
        repoId: "repo-1",
        updatedAt: 1,
      },
    ];
    const environments = [
      createEnvironmentRecord("env-2", "project-2", "/tmp/mercury-api"),
      createEnvironmentRecord("env-1", "project-1", "/tmp/atlas-app"),
    ];
    const threads = [
      createThreadRecord("thread-2", "project-1", "Thread 2", 2),
      createThreadRecord("thread-1", "project-1", "Thread 1", 1),
    ];

    const shellState = buildDesktopProjectShellState({
      environments,
      projects,
      repos,
      shellState: null,
      threads,
    });

    expect(shellState.selectedProjectId).toBe("project-2");
    expect(shellState.selectedThreadId).toBeNull();
    expect(shellState.projects).toEqual([
      {
        name: "mercury-api",
        projectId: "project-2",
        repoName: null,
        rootPath: "/tmp/mercury-api",
        threads: [],
      },
      {
        name: "atlas-app",
        projectId: "project-1",
        repoName: "atlas-app",
        rootPath: "/tmp/atlas-app",
        threads: [
          expect.objectContaining({
            status: "idle",
            statusLabel: "Idle",
            threadId: "thread-2",
            title: "Thread 2",
          }),
          expect.objectContaining({
            status: "idle",
            statusLabel: "Idle",
            threadId: "thread-1",
            title: "Thread 1",
          }),
        ],
      },
    ]);
  });

  test("restores a valid selected thread and clears stale ids while filtering collapsed groups", async () => {
    const { buildDesktopProjectShellState } =
      await import("../apps/aria-desktop/src/main/desktop-projects-shell.js");
    const projects = [createProjectRecord("project-1", "atlas-app", 1)];
    const environments = [createEnvironmentRecord("env-1", "project-1", "/tmp/atlas-app")];
    const threads = [
      createThreadRecord("thread-1", "project-1", "Thread 1", 2),
      createThreadRecord("thread-2", "project-1", "Thread 2", 1),
    ];
    const shellStateRow = {
      archivedThreadIds: [],
      collapsedProjectIds: ["project-1", "project-missing"],
      pinnedThreadIds: [],
      selectedProjectId: "project-1",
      selectedThreadId: "thread-1",
      shellId: "desktop-shell-state",
      updatedAt: 10,
    };

    const restored = buildDesktopProjectShellState({
      environments,
      projects,
      repos: [],
      shellState: shellStateRow,
      threads,
    });
    const staleThreadSelection = buildDesktopProjectShellState({
      environments,
      projects,
      repos: [],
      shellState: {
        ...shellStateRow,
        selectedThreadId: "thread-missing",
      },
      threads,
    });

    expect(restored.selectedProjectId).toBe("project-1");
    expect(restored.selectedThreadId).toBe("thread-1");
    expect(restored.collapsedProjectIds).toEqual(["project-1"]);

    expect(staleThreadSelection.selectedProjectId).toBe("project-1");
    expect(staleThreadSelection.selectedThreadId).toBeNull();
  });

  test("filters archived threads and orders pinned threads first", async () => {
    const { buildDesktopProjectShellState } =
      await import("../apps/aria-desktop/src/main/desktop-projects-shell.js");
    const projects = [createProjectRecord("project-1", "atlas-app", 1)];
    const environments = [createEnvironmentRecord("env-1", "project-1", "/tmp/atlas-app")];
    const threads = [
      createThreadRecord("thread-1", "project-1", "Thread 1", 1),
      createThreadRecord("thread-2", "project-1", "Thread 2", 2),
      createThreadRecord("thread-3", "project-1", "Thread 3", 3),
    ];

    const shellState = buildDesktopProjectShellState({
      environments,
      projects,
      repos: [],
      shellState: {
        archivedThreadIds: ["thread-2"],
        collapsedProjectIds: [],
        pinnedThreadIds: ["thread-1"],
        selectedProjectId: "project-1",
        selectedThreadId: "thread-1",
        shellId: "desktop-shell-state",
        updatedAt: 10,
      },
      threads,
    });

    expect(shellState.archivedThreadIds).toEqual(["thread-2"]);
    expect(shellState.pinnedThreadIds).toEqual(["thread-1"]);
    expect(shellState.projects[0]?.threads.map((thread) => thread.threadId)).toEqual([
      "thread-1",
      "thread-3",
    ]);
    expect(shellState.projects[0]?.threads[0]).toMatchObject({ pinned: true });
  });
});
