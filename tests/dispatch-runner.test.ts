import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { runDispatchExecution } from "@aria/jobs";
import { ProjectsEngineRepository, ProjectsEngineStore } from "@aria/work";
import type {
  RuntimeBackendAdapter,
  RuntimeBackendExecutionObserver,
  RuntimeBackendExecutionRequest,
  RuntimeBackendExecutionResult,
} from "@aria/jobs/runtime-backend";

const stores: ProjectsEngineStore[] = [];
const repositoryDbPaths = new WeakMap<ProjectsEngineRepository, string>();

async function createRepository(): Promise<ProjectsEngineRepository> {
  const home = await mkdtemp(join(tmpdir(), "aria-dispatch-runner-"));
  const dbPath = join(home, "aria.db");
  const store = new ProjectsEngineStore(dbPath);
  await store.init();
  stores.push(store);
  const repository = new ProjectsEngineRepository(store);
  repositoryDbPaths.set(repository, dbPath);
  return repository;
}

function createFakeBackend(options: {
  execute(
    request: RuntimeBackendExecutionRequest,
    observer?: RuntimeBackendExecutionObserver,
  ): Promise<RuntimeBackendExecutionResult>;
}): RuntimeBackendAdapter {
  return {
    backend: "aria",
    displayName: "Aria Agent",
    capabilities: {
      supportsStreamingEvents: true,
      supportsCancellation: true,
      supportsStructuredOutput: true,
      supportsFileEditing: true,
      supportsBackgroundExecution: false,
      supportsAuthProbe: false,
    },
    async probeAvailability() {
      return {
        available: true,
        authState: "configured",
        detectedVersion: "test",
        reason: null,
      };
    },
    execute: options.execute,
    async cancel() {},
  };
}

function createFakeRuntime() {
  return {
    sessions: {
      create(title: string) {
        return {
          createdAt: Date.now(),
          id: `${title}:session-1`,
          kind: "engine",
          messages: [],
          title,
          updatedAt: Date.now(),
        };
      },
    },
  } as never;
}

afterEach(() => {
  while (stores.length > 0) {
    stores.pop()?.close();
  }
});

describe("runDispatchExecution", () => {
  test("propagates running, waiting approval, and completion back into Projects Engine", async () => {
    const repository = await createRepository();
    const now = Date.now();

    repository.upsertProject({
      projectId: "project-1",
      name: "Aria",
      slug: "aria",
      description: null,
      createdAt: now,
      updatedAt: now,
    });
    repository.upsertTask({
      taskId: "task-1",
      projectId: "project-1",
      repoId: null,
      title: "Implement dispatch runner",
      description: "Add runtime-backed execution",
      status: "ready",
      createdAt: now,
      updatedAt: now,
    });
    repository.upsertThread({
      threadId: "thread-1",
      projectId: "project-1",
      taskId: "task-1",
      repoId: null,
      title: "Dispatch execution",
      status: "queued",
      threadType: "local_project",
      workspaceId: "workspace-1",
      environmentId: "env-stale",
      environmentBindingId: "binding-stale",
      agentId: "aria-agent",
      createdAt: now,
      updatedAt: now,
    });
    repository.upsertThreadEnvironmentBinding({
      bindingId: "binding-active",
      threadId: "thread-1",
      projectId: "project-1",
      workspaceId: "workspace-1",
      environmentId: "env-active",
      attachedAt: now + 1,
      detachedAt: null,
      isActive: true,
      reason: "Current active binding",
    });
    repository.upsertThread({
      threadId: "thread-1",
      projectId: "project-1",
      taskId: "task-1",
      repoId: null,
      title: "Dispatch execution",
      status: "queued",
      threadType: "local_project",
      workspaceId: "workspace-1",
      environmentId: "env-stale",
      environmentBindingId: "binding-stale",
      agentId: "aria-agent",
      createdAt: now,
      updatedAt: now + 2,
    });
    repository.upsertDispatch({
      dispatchId: "dispatch-1",
      projectId: "project-1",
      taskId: "task-1",
      threadId: "thread-1",
      jobId: null,
      repoId: null,
      worktreeId: null,
      status: "queued",
      requestedBackend: "fake",
      requestedModel: null,
      executionSessionId: null,
      summary: null,
      error: null,
      createdAt: now,
      acceptedAt: null,
      completedAt: null,
    });

    const backend = createFakeBackend({
      async execute(request, observer) {
        await observer?.onEvent?.({
          type: "execution.started",
          backend: "aria",
          executionId: request.executionId,
          timestamp: now + 1,
          metadata: request.metadata,
        });
        expect(request.metadata).toMatchObject({
          dispatchId: "dispatch-1",
          projectId: "project-1",
          threadId: "thread-1",
          threadType: "local_project",
          workspaceId: "workspace-1",
          environmentId: "env-active",
          environmentBindingId: "binding-active",
          agentId: "aria-agent",
        });
        expect(request.prompt).toContain("Environment: env-active");
        expect(request.prompt).toContain("Environment binding: binding-active");
        expect(repository.getDispatch("dispatch-1")?.status).toBe("running");

        await observer?.onEvent?.({
          type: "execution.waiting_approval",
          backend: "aria",
          executionId: request.executionId,
          timestamp: now + 2,
          metadata: {
            ...request.metadata,
            toolCallId: "tool-1",
          },
        });
        expect(repository.getDispatch("dispatch-1")?.status).toBe("waiting_approval");

        await observer?.onEvent?.({
          type: "execution.completed",
          backend: "aria",
          executionId: request.executionId,
          timestamp: now + 3,
          status: "succeeded",
          summary: "Completed dispatch run",
          metadata: request.metadata,
        });

        return {
          backend: "aria",
          executionId: request.executionId,
          status: "succeeded",
          exitCode: 0,
          stdout: "done",
          stderr: "",
          summary: "Completed dispatch run",
          filesChanged: ["src/dispatch-runner.ts"],
          metadata: request.metadata,
        };
      },
    });

    const result = await runDispatchExecution(createFakeRuntime(), repository, "dispatch-1", {
      backendRegistry: new Map([["aria", backend]]),
    });

    expect(result.executionSessionId.startsWith("dispatch:dispatch-1")).toBe(true);
    expect(result.status).toBe("succeeded");
    expect(result.summary).toBe("Completed dispatch run");

    const dispatch = repository.getDispatch("dispatch-1");
    expect(dispatch?.status).toBe("completed");
    expect(dispatch?.executionSessionId?.startsWith("dispatch:dispatch-1")).toBe(true);
    expect(dispatch?.summary).toBe("Completed dispatch run");
    expect(dispatch?.acceptedAt).toBeNumber();
    expect(dispatch?.completedAt).toBeNumber();

    expect(repository.listArtifacts("dispatch-1")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          artifactId: "dispatch-1:summary",
          kind: "summary",
          content: "Completed dispatch run",
        }),
        expect.objectContaining({
          artifactId: "dispatch-1:stdout",
          kind: "stdout",
          content: "done",
        }),
        expect.objectContaining({
          artifactId: "dispatch-1:patch",
          kind: "patch",
          content: expect.stringContaining("src/dispatch-runner.ts"),
        }),
      ]),
    );
    expect(repository.listWorkspaceMutations("dispatch-1:patch")).toEqual([
      expect.objectContaining({
        mutationId: "dispatch-1:apply_patch",
        artifactId: "dispatch-1:patch",
        status: "pending_approval",
        approvalDecision: null,
      }),
    ]);

    const dbPath = repositoryDbPaths.get(repository)!;
    repository.close();
    const restartedStore = new ProjectsEngineStore(dbPath);
    await restartedStore.init();
    stores.push(restartedStore);
    const restartedRepository = new ProjectsEngineRepository(restartedStore);
    expect(
      restartedRepository.listArtifacts("dispatch-1").map((artifact) => artifact.artifactId),
    ).toEqual(
      expect.arrayContaining(["dispatch-1:summary", "dispatch-1:stdout", "dispatch-1:patch"]),
    );
    expect(restartedRepository.listWorkspaceMutations("dispatch-1:patch")).toHaveLength(1);
  });

  test("records failed dispatches when the backend throws", async () => {
    const repository = await createRepository();
    const now = Date.now();

    repository.upsertProject({
      projectId: "project-2",
      name: "Aria",
      slug: "aria-fail",
      description: null,
      createdAt: now,
      updatedAt: now,
    });
    repository.upsertThread({
      threadId: "thread-2",
      projectId: "project-2",
      taskId: null,
      repoId: null,
      title: "Failing dispatch",
      status: "queued",
      threadType: "remote_project",
      createdAt: now,
      updatedAt: now,
    });
    repository.upsertDispatch({
      dispatchId: "dispatch-2",
      projectId: "project-2",
      taskId: null,
      threadId: "thread-2",
      jobId: null,
      repoId: null,
      worktreeId: null,
      status: "queued",
      requestedBackend: "aria",
      requestedModel: null,
      executionSessionId: null,
      summary: null,
      error: null,
      createdAt: now,
      acceptedAt: null,
      completedAt: null,
    });

    const backend = createFakeBackend({
      async execute(request, observer) {
        await observer?.onEvent?.({
          type: "execution.started",
          backend: "aria",
          executionId: request.executionId,
          timestamp: now + 1,
          metadata: request.metadata,
        });
        throw new Error("backend exploded");
      },
    });

    await expect(
      runDispatchExecution(createFakeRuntime(), repository, "dispatch-2", {
        backendRegistry: new Map([["aria", backend]]),
      }),
    ).rejects.toThrow("backend exploded");

    const dispatch = repository.getDispatch("dispatch-2");
    expect(dispatch?.status).toBe("failed");
    expect(dispatch?.executionSessionId?.startsWith("dispatch:dispatch-2")).toBe(true);
    expect(dispatch?.error).toBe("backend exploded");
    expect(dispatch?.acceptedAt).toBeNumber();
    expect(dispatch?.completedAt).toBeNumber();
  });
});
