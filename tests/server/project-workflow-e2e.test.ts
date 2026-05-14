import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Agent } from "@aria/agent";
import { createEngineClient } from "@aria/access-client";
import { startServer, type EngineServer } from "@aria/gateway/server";
import { createAriaRuntimeBackendAdapter } from "@aria/jobs/runtime-backend";
import type { RuntimeBackendExecutionRequest } from "@aria/jobs/runtime-backend";
import { createProjectsControlTool } from "@aria/server/projects-control-tool";
import type { EngineRuntime } from "@aria/node-runtime/runtime";
import { getRuntimeSessionCoordinator } from "@aria/server/session-coordinator";
import { ProjectsEngineRepository, ProjectsEngineStore } from "@aria/work";
import { createTestRuntime, getAvailableGatewayPortPair } from "../helpers/server-runtime.js";

let testDir: string;
let previousAriaHome: string | undefined;
let previousTestApiKey: string | undefined;

async function seedRemoteProjectThread(runtimeHome: string) {
  const store = new ProjectsEngineStore(join(runtimeHome, "aria.db"));
  await store.init();
  const repository = new ProjectsEngineRepository(store);
  const now = Date.now();

  repository.upsertProject({
    projectId: "project-transport",
    name: "Transport Project",
    slug: "transport-project",
    description: null,
    createdAt: now,
    updatedAt: now,
  });
  repository.upsertServer({
    serverId: "server-transport",
    label: "Transport Server",
    primaryBaseUrl: "http://127.0.0.1:7420",
    secondaryBaseUrl: null,
    createdAt: now,
    updatedAt: now,
  });
  repository.upsertWorkspace({
    workspaceId: "workspace-transport",
    host: "aria_server",
    serverId: "server-transport",
    label: "Transport Workspace",
    createdAt: now,
    updatedAt: now,
  });
  repository.upsertEnvironment({
    environmentId: "environment-transport",
    workspaceId: "workspace-transport",
    projectId: "project-transport",
    label: "Transport / main",
    mode: "remote",
    kind: "main",
    locator: "/srv/transport-project",
    createdAt: now,
    updatedAt: now,
  });
  repository.upsertThread({
    threadId: "thread-transport",
    projectId: "project-transport",
    taskId: null,
    repoId: null,
    title: "Remote transport thread",
    status: "queued",
    threadType: "remote_project",
    workspaceId: "workspace-transport",
    environmentId: "environment-transport",
    environmentBindingId: "binding-transport",
    agentId: "aria-agent",
    createdAt: now,
    updatedAt: now,
  });
  repository.upsertThreadEnvironmentBinding({
    bindingId: "binding-transport",
    threadId: "thread-transport",
    projectId: "project-transport",
    workspaceId: "workspace-transport",
    environmentId: "environment-transport",
    attachedAt: now,
    detachedAt: null,
    isActive: true,
    reason: "Transport workflow test",
  });
  repository.upsertJob({
    jobId: "job-transport",
    threadId: "thread-transport",
    author: "user",
    body: "Run through the gateway transport",
    createdAt: now,
  });

  repository.close();
}

function collectStream(
  subscriptionFactory: (handlers: {
    onData(event: any): void;
    onError(error: unknown): void;
    onComplete(): void;
  }) => { unsubscribe(): void },
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const events: any[] = [];
    const subscription = subscriptionFactory({
      onData(event) {
        events.push(event);
      },
      onError(error) {
        reject(error);
      },
      onComplete() {
        resolve(events);
      },
    });
    void subscription;
  });
}

beforeEach(async () => {
  previousAriaHome = process.env.ARIA_HOME;
  previousTestApiKey = process.env.TEST_API_KEY;
  testDir = await mkdtemp(join(tmpdir(), "aria-node-project-workflow-"));
  process.env.ARIA_HOME = testDir;
});

afterEach(async () => {
  if (previousAriaHome === undefined) {
    delete process.env.ARIA_HOME;
  } else {
    process.env.ARIA_HOME = previousAriaHome;
  }

  if (previousTestApiKey === undefined) {
    delete process.env.TEST_API_KEY;
  } else {
    process.env.TEST_API_KEY = previousTestApiKey;
  }

  await rm(testDir, { recursive: true, force: true });
});

describe("server project workflow transport", () => {
  test("queues and runs project work through the Aria projects control tool", async () => {
    const runtime = await createTestRuntime(testDir);
    await seedRemoteProjectThread(testDir);
    const store = new ProjectsEngineStore(join(testDir, "aria.db"));
    await store.init();
    const repository = new ProjectsEngineRepository(store);
    const backendRequests: RuntimeBackendExecutionRequest[] = [];
    const backendRegistry = new Map([
      [
        "aria",
        createAriaRuntimeBackendAdapter({
          driver: {
            async execute(request, observer) {
              backendRequests.push(request);
              await observer?.onEvent?.({
                type: "execution.started",
                backend: "aria",
                executionId: request.executionId,
                timestamp: Date.now(),
                metadata: request.metadata,
              });
              await observer?.onEvent?.({
                type: "execution.completed",
                backend: "aria",
                executionId: request.executionId,
                timestamp: Date.now(),
                status: "succeeded",
                summary: "projects control completed",
                metadata: request.metadata,
              });
              return {
                backend: "aria",
                executionId: request.executionId,
                status: "succeeded",
                exitCode: 0,
                stdout: "projects control completed",
                stderr: "",
                summary: "projects control completed",
                filesChanged: ["src/project-control.ts"],
                metadata: request.metadata,
              };
            },
            async cancel() {},
          },
        }),
      ],
    ]);
    const { runDispatchExecution } = await import("@aria/jobs/dispatch-runner");
    const tool = createProjectsControlTool({
      getRepository: () => repository,
      runDispatch: (repo, dispatchId) =>
        runDispatchExecution(runtime, repo, dispatchId, { backendRegistry }),
    });

    try {
      const result = await tool.execute({
        action: "queue_and_run",
        projectId: "project-transport",
        threadId: "thread-transport",
        dispatchId: "dispatch-projects-control",
        jobBody: "Implement the project control handoff",
      });

      expect(result.isError).toBeUndefined();
      const payload = JSON.parse(result.content);
      expect(payload).toMatchObject({
        action: "queue_and_run",
        projectId: "project-transport",
        threadId: "thread-transport",
        dispatch: {
          dispatchId: "dispatch-projects-control",
          status: "completed",
          requestedBackend: "aria",
          summary: "projects control completed",
        },
        target: {
          threadType: "remote_project",
          workspaceHost: "aria_server",
          environmentMode: "remote",
          activeBinding: {
            bindingId: "binding-transport",
            isActive: true,
          },
        },
        run: {
          status: "succeeded",
          summary: "projects control completed",
        },
      });
      expect(payload.jobId).toEqual(expect.stringContaining("job:"));
      expect(repository.getDispatch("dispatch-projects-control")).toMatchObject({
        dispatchId: "dispatch-projects-control",
        status: "completed",
        jobId: payload.jobId,
      });
      expect(repository.listJobs("thread-transport")).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            jobId: payload.jobId,
            author: "agent",
            body: "Implement the project control handoff",
          }),
        ]),
      );
      expect(backendRequests).toHaveLength(1);
      expect(backendRequests[0]).toMatchObject({
        threadId: "thread-transport",
        metadata: {
          dispatchId: "dispatch-projects-control",
          projectId: "project-transport",
          threadId: "thread-transport",
          jobId: payload.jobId,
          agentId: "aria-agent",
        },
      });
      expect(backendRequests[0]!.prompt).toContain("Implement the project control handoff");
    } finally {
      repository.close();
      await runtime.close();
    }
  });

  test("orchestrates project control from an Aria chat turn and returns the worker summary", async () => {
    const runtime = await createTestRuntime(testDir);
    runtime.memory.getMemoryContext = async () => "Aria private orchestration memory";
    await seedRemoteProjectThread(testDir);
    const store = new ProjectsEngineStore(join(testDir, "aria.db"));
    await store.init();
    const repository = new ProjectsEngineRepository(store);
    const backendRequests: RuntimeBackendExecutionRequest[] = [];
    const backendRegistry = new Map([
      [
        "aria",
        createAriaRuntimeBackendAdapter({
          driver: {
            async execute(request, observer) {
              backendRequests.push(request);
              await observer?.onEvent?.({
                type: "execution.started",
                backend: "aria",
                executionId: request.executionId,
                timestamp: Date.now(),
                metadata: request.metadata,
              });
              await observer?.onEvent?.({
                type: "execution.completed",
                backend: "aria",
                executionId: request.executionId,
                timestamp: Date.now(),
                status: "succeeded",
                summary: "remote worker completed via chat",
                metadata: request.metadata,
              });
              return {
                backend: "aria",
                executionId: request.executionId,
                status: "succeeded",
                exitCode: 0,
                stdout: "remote worker completed via chat",
                stderr: "",
                summary: "remote worker completed via chat",
                filesChanged: ["src/chat-orchestration.ts"],
                metadata: request.metadata,
              };
            },
            async cancel() {},
          },
        }),
      ],
    ]);
    const { runDispatchExecution } = await import("@aria/jobs/dispatch-runner");
    const tool = createProjectsControlTool({
      getRepository: () => repository,
      runDispatch: (repo, dispatchId) =>
        runDispatchExecution(runtime, repo, dispatchId, { backendRegistry }),
    });
    runtime.tools.push(tool);

    const port = await getAvailableGatewayPortPair();
    let server: EngineServer | undefined;

    try {
      server = await startServer(runtime, { hostname: "127.0.0.1", port });
      const client = createEngineClient({
        httpUrl: `http://127.0.0.1:${port}`,
        wsUrl: `ws://127.0.0.1:${port + 1}`,
        token: runtime.auth.getMasterToken(),
      });
      const { session } = await client.session.create.mutate({
        connectorType: "engine",
        prefix: "chat:projects-control",
      });
      const coordinator = getRuntimeSessionCoordinator(runtime);
      const seenPrompts: string[] = [];
      coordinator.sessionAgents.set(session.id, {
        async *chat(prompt: string) {
          seenPrompts.push(prompt);
          const args = {
            action: "queue_and_run",
            projectId: "project-transport",
            threadId: "thread-transport",
            dispatchId: "dispatch-chat-projects-control",
            jobBody: "Implement the chat-driven project handoff",
          };
          yield { type: "tool_start", name: "projects_control", id: "tool-projects", args };
          const result = await tool.execute(args);
          yield { type: "tool_end", name: "projects_control", id: "tool-projects", result };
          const payload = JSON.parse(result.content);
          yield { type: "text_delta", delta: `Project run: ${payload.run.summary}` };
          yield { type: "done", stopReason: "end_turn" };
        },
        getMessages() {
          return [
            { role: "user", content: seenPrompts.at(-1) ?? "", timestamp: 100 },
            {
              role: "assistant",
              content: "Project run: remote worker completed via chat",
              timestamp: 101,
            },
          ];
        },
        abort() {
          return false;
        },
      } as unknown as Agent);

      const events = await collectStream((handlers) =>
        client.chat.stream.subscribe(
          {
            sessionId: session.id,
            message: "Please manage the transport project remotely",
          },
          handlers,
        ),
      );

      expect(events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: "text_delta",
            delta: "Project run: remote worker completed via chat",
          }),
          expect.objectContaining({ type: "done", stopReason: "end_turn" }),
        ]),
      );
      expect(seenPrompts[0]).toContain("Aria private orchestration memory");
      expect(seenPrompts[0]).toContain("Please manage the transport project remotely");
      expect(repository.getDispatch("dispatch-chat-projects-control")).toMatchObject({
        dispatchId: "dispatch-chat-projects-control",
        status: "completed",
        requestedBackend: "aria",
        summary: "remote worker completed via chat",
      });
      expect(repository.listJobs("thread-transport")).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            author: "agent",
            body: "Implement the chat-driven project handoff",
          }),
        ]),
      );
      expect(backendRequests).toHaveLength(1);
      expect(backendRequests[0]).toMatchObject({
        threadId: "thread-transport",
        metadata: {
          dispatchId: "dispatch-chat-projects-control",
          projectId: "project-transport",
          threadId: "thread-transport",
          agentId: "aria-agent",
        },
      });
      expect(backendRequests[0]!.prompt).not.toContain("Aria private orchestration memory");
    } finally {
      await server?.stop();
      repository.close();
      await runtime.close();
    }
  });

  test("requires an explicit active bridge before local project dispatch", async () => {
    const runtime = await createTestRuntime(testDir);
    await seedRemoteProjectThread(testDir);
    const store = new ProjectsEngineStore(join(testDir, "aria.db"));
    await store.init();
    const repository = new ProjectsEngineRepository(store);
    const now = Date.now();
    repository.upsertWorkspace({
      workspaceId: "workspace-local",
      host: "desktop_local",
      serverId: null,
      label: "Local Workspace",
      createdAt: now,
      updatedAt: now,
    });
    repository.upsertEnvironment({
      environmentId: "environment-local",
      workspaceId: "workspace-local",
      projectId: "project-transport",
      label: "Local / main",
      mode: "local",
      kind: "main",
      locator: "/Users/test/project",
      createdAt: now,
      updatedAt: now,
    });
    repository.upsertThread({
      threadId: "thread-local",
      projectId: "project-transport",
      taskId: null,
      repoId: null,
      title: "Local project thread",
      status: "queued",
      threadType: "local_project",
      workspaceId: "workspace-local",
      environmentId: "environment-local",
      environmentBindingId: null,
      agentId: "aria-agent",
      createdAt: now,
      updatedAt: now,
    });
    const tool = createProjectsControlTool({
      getRepository: () => repository,
    });

    try {
      const denied = await tool.execute({
        action: "queue_dispatch",
        projectId: "project-transport",
        threadId: "thread-local",
        dispatchId: "dispatch-local-denied",
        jobBody: "Run locally without a bridge",
      });
      expect(denied.isError).toBe(true);
      expect(JSON.parse(denied.content).error).toContain("active environment bridge");
      expect(repository.getDispatch("dispatch-local-denied")).toBeUndefined();

      repository.upsertThreadEnvironmentBinding({
        bindingId: "binding-local",
        threadId: "thread-local",
        projectId: "project-transport",
        workspaceId: "workspace-local",
        environmentId: "environment-local",
        attachedAt: Date.now(),
        detachedAt: null,
        isActive: true,
        reason: "Operator attached local bridge",
      });

      const allowed = await tool.execute({
        action: "queue_dispatch",
        projectId: "project-transport",
        threadId: "thread-local",
        dispatchId: "dispatch-local-allowed",
        jobBody: "Run locally with a bridge",
      });
      expect(allowed.isError).toBeUndefined();
      expect(JSON.parse(allowed.content)).toMatchObject({
        dispatch: {
          dispatchId: "dispatch-local-allowed",
          status: "queued",
        },
        target: {
          threadType: "local_project",
          workspaceHost: "desktop_local",
          environmentMode: "local",
          activeBinding: {
            bindingId: "binding-local",
            isActive: true,
          },
        },
      });
    } finally {
      repository.close();
      await runtime.close();
    }
  });

  test("opens, queues, cancels, and reconnects a remote project thread over the gateway", async () => {
    const runtime = await createTestRuntime(testDir);
    await seedRemoteProjectThread(testDir);
    const backendRequests: RuntimeBackendExecutionRequest[] = [];
    const cancelledExecutions: string[] = [];
    let resolveRunningStarted!: () => void;
    let resolveRunningCancelled!: () => void;
    const runningStarted = new Promise<void>((resolve) => {
      resolveRunningStarted = resolve;
    });
    const runningCancelled = new Promise<void>((resolve) => {
      resolveRunningCancelled = resolve;
    });
    (
      runtime as EngineRuntime & { runtimeBackendRegistry: Map<string, any> }
    ).runtimeBackendRegistry = new Map([
      [
        "aria",
        createAriaRuntimeBackendAdapter({
          driver: {
            async execute(request, observer) {
              backendRequests.push(request);
              await observer?.onEvent?.({
                type: "execution.started",
                backend: "aria",
                executionId: request.executionId,
                timestamp: Date.now(),
                metadata: request.metadata,
              });
              if (request.metadata?.dispatchId === "dispatch-running-cancel") {
                resolveRunningStarted();
                await runningCancelled;
                await observer?.onEvent?.({
                  type: "execution.completed",
                  backend: "aria",
                  executionId: request.executionId,
                  timestamp: Date.now(),
                  status: "cancelled",
                  summary: "cancelled while running",
                  metadata: request.metadata,
                });
                return {
                  backend: "aria",
                  executionId: request.executionId,
                  status: "cancelled",
                  exitCode: 1,
                  stdout: "",
                  stderr: "cancelled while running",
                  summary: "cancelled while running",
                  filesChanged: [],
                  metadata: request.metadata,
                };
              }
              await observer?.onEvent?.({
                type: "execution.stdout",
                backend: "aria",
                executionId: request.executionId,
                timestamp: Date.now(),
                chunk: "completed through fake backend",
                metadata: request.metadata,
              });
              await observer?.onEvent?.({
                type: "execution.completed",
                backend: "aria",
                executionId: request.executionId,
                timestamp: Date.now(),
                status: "succeeded",
                summary: "completed through fake backend",
                metadata: request.metadata,
              });
              return {
                backend: "aria",
                executionId: request.executionId,
                status: "succeeded",
                exitCode: 0,
                stdout: "completed through fake backend",
                stderr: "",
                summary: "completed through fake backend",
                filesChanged: ["src/changed.ts"],
                metadata: request.metadata,
              };
            },
            async cancel(executionId) {
              cancelledExecutions.push(executionId);
              resolveRunningCancelled();
            },
          },
        }),
      ],
    ]);
    const port = await getAvailableGatewayPortPair();
    let server: EngineServer | undefined;

    try {
      server = await startServer(runtime, { hostname: "127.0.0.1", port });
      const client = createEngineClient({
        httpUrl: `http://127.0.0.1:${port}`,
        wsUrl: `ws://127.0.0.1:${port + 1}`,
        token: runtime.auth.getMasterToken(),
      });

      const health = await client.health.ping.query();
      expect(health.status).toBe("ok");

      const opened = await client.projects.thread.open.query({ threadId: "thread-transport" });
      expect(opened.thread).toMatchObject({
        threadId: "thread-transport",
        threadType: "remote_project",
        agentId: "aria-agent",
      });
      expect(opened.environment).toMatchObject({
        environmentId: "environment-transport",
        mode: "remote",
      });
      expect(opened.workspace).toMatchObject({
        workspaceId: "workspace-transport",
        serverId: "server-transport",
      });

      const handoffPayload = JSON.stringify({
        title: "Imported remote handoff",
        body: "Materialize this handoff through the gateway",
        threadType: "remote_project",
        workspaceId: "workspace-transport",
        environmentId: "environment-transport",
        agentId: "aria-agent",
      });
      const submittedHandoff = await client.projects.handoff.submit.mutate({
        handoffId: "handoff-transport",
        idempotencyKey: "handoff-key-transport",
        sourceKind: "local_session",
        sourceSessionId: "desktop:thread-transport",
        projectId: "project-transport",
        payloadJson: handoffPayload,
      });
      const resubmittedHandoff = await client.projects.handoff.submit.mutate({
        handoffId: "handoff-transport-duplicate",
        idempotencyKey: "handoff-key-transport",
        sourceKind: "local_session",
        sourceSessionId: "desktop:thread-transport",
        projectId: "project-transport",
        payloadJson: handoffPayload,
      });
      expect(resubmittedHandoff.handoff).toEqual(submittedHandoff.handoff);
      expect(submittedHandoff.handoff).toMatchObject({
        handoffId: "handoff-transport",
        idempotencyKey: "handoff-key-transport",
        projectId: "project-transport",
        status: "pending",
      });

      const materializedHandoff = await client.projects.handoff.materialize.mutate({
        handoffId: "handoff-transport",
      });
      expect(materializedHandoff).toMatchObject({
        threadId: "thread:handoff-transport",
        jobId: "job:handoff-transport",
        dispatchId: "dispatch:handoff-transport",
        handoff: {
          handoffId: "handoff-transport",
          status: "dispatch_created",
          createdDispatchId: "dispatch:handoff-transport",
        },
        dispatch: {
          dispatchId: "dispatch:handoff-transport",
          status: "queued",
          requestedBackend: "aria",
        },
        threadState: {
          thread: {
            threadId: "thread:handoff-transport",
            title: "Imported remote handoff",
            threadType: "remote_project",
            agentId: "aria-agent",
          },
          activeBinding: {
            bindingId: "binding:handoff-transport",
            workspaceId: "workspace-transport",
            environmentId: "environment-transport",
            isActive: true,
          },
        },
      });
      expect(materializedHandoff.threadState.jobs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            jobId: "job:handoff-transport",
            author: "external",
            body: "Materialize this handoff through the gateway",
          }),
        ]),
      );
      const listedHandoffs = await client.projects.handoff.list.query({
        projectId: "project-transport",
      });
      expect(listedHandoffs.handoffs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            handoffId: "handoff-transport",
            status: "dispatch_created",
            createdDispatchId: "dispatch:handoff-transport",
          }),
        ]),
      );

      const queued = await client.projects.dispatch.queue.mutate({
        dispatchId: "dispatch-transport",
        projectId: "project-transport",
        threadId: "thread-transport",
        jobId: "job-transport",
      });
      expect(queued.dispatch).toMatchObject({
        dispatchId: "dispatch-transport",
        requestedBackend: "aria",
        status: "queued",
      });
      expect(queued.threadState.dispatches).toHaveLength(1);

      const status = await client.projects.dispatch.status.query({
        dispatchId: "dispatch-transport",
      });
      expect(status.dispatch).toMatchObject({
        dispatchId: "dispatch-transport",
        status: "queued",
      });

      const run = await client.projects.dispatch.run.mutate({
        dispatchId: "dispatch-transport",
      });
      expect(run.result).toMatchObject({
        status: "succeeded",
        summary: "completed through fake backend",
      });
      expect(run.dispatch).toMatchObject({
        dispatchId: "dispatch-transport",
        status: "completed",
        executionSessionId: expect.stringContaining("dispatch:dispatch-transport"),
        summary: "completed through fake backend",
      });
      expect(backendRequests).toHaveLength(1);
      expect(backendRequests[0]).toMatchObject({
        threadId: "thread-transport",
        taskId: null,
        metadata: {
          dispatchId: "dispatch-transport",
          projectId: "project-transport",
          threadId: "thread-transport",
          jobId: "job-transport",
          agentId: "aria-agent",
        },
      });
      expect(backendRequests[0]!.prompt).toContain("Run through the gateway transport");

      const cancelQueued = await client.projects.dispatch.queue.mutate({
        dispatchId: "dispatch-cancel-transport",
        projectId: "project-transport",
        threadId: "thread-transport",
        jobId: "job-transport",
      });
      expect(cancelQueued.dispatch).toMatchObject({
        dispatchId: "dispatch-cancel-transport",
        status: "queued",
      });

      const cancelled = await client.projects.dispatch.cancel.mutate({
        dispatchId: "dispatch-cancel-transport",
        reason: "Transport operator cancelled",
      });
      expect(cancelled.dispatch).toMatchObject({
        dispatchId: "dispatch-cancel-transport",
        status: "cancelled",
        error: "Transport operator cancelled",
      });

      const runningQueued = await client.projects.dispatch.queue.mutate({
        dispatchId: "dispatch-running-cancel",
        projectId: "project-transport",
        threadId: "thread-transport",
        jobId: "job-transport",
      });
      expect(runningQueued.dispatch).toMatchObject({
        dispatchId: "dispatch-running-cancel",
        status: "queued",
      });
      const runningPromise = client.projects.dispatch.run.mutate({
        dispatchId: "dispatch-running-cancel",
      });
      await runningStarted;
      const runningStatus = await client.projects.dispatch.status.query({
        dispatchId: "dispatch-running-cancel",
      });
      expect(runningStatus.dispatch).toMatchObject({
        dispatchId: "dispatch-running-cancel",
        status: "running",
      });
      const runningCancelledResult = await client.projects.dispatch.cancel.mutate({
        dispatchId: "dispatch-running-cancel",
        reason: "Running transport cancel",
      });
      expect(runningCancelledResult.dispatch).toMatchObject({
        dispatchId: "dispatch-running-cancel",
        status: "cancelled",
        error: "Running transport cancel",
      });
      const runningRun = await runningPromise;
      expect(runningRun.result).toMatchObject({
        status: "cancelled",
        summary: "cancelled while running",
      });
      expect(runningRun.dispatch).toMatchObject({
        dispatchId: "dispatch-running-cancel",
        status: "cancelled",
        error: "Running transport cancel",
      });
      expect(cancelledExecutions).toEqual([
        expect.stringContaining("dispatch:dispatch-running-cancel"),
      ]);

      const reconnected = await client.projects.thread.reconnect.query({
        threadId: "thread-transport",
      });
      expect(reconnected.dispatches).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            dispatchId: "dispatch-transport",
            status: "completed",
          }),
          expect.objectContaining({
            dispatchId: "dispatch-cancel-transport",
            status: "cancelled",
          }),
          expect.objectContaining({
            dispatchId: "dispatch-running-cancel",
            status: "cancelled",
          }),
        ]),
      );
      expect(reconnected.dispatches).toHaveLength(3);
      expect(reconnected.activeBinding).toMatchObject({
        bindingId: "binding-transport",
        isActive: true,
      });

      const completedStatus = await client.projects.dispatch.status.query({
        dispatchId: "dispatch-transport",
      });
      expect(completedStatus.dispatch).toMatchObject({
        dispatchId: "dispatch-transport",
        status: "completed",
      });
      expect(completedStatus.threadState.dispatches).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            dispatchId: "dispatch-transport",
            status: "completed",
          }),
          expect.objectContaining({
            dispatchId: "dispatch-cancel-transport",
            status: "cancelled",
          }),
        ]),
      );

      const wsEvents = await new Promise<any[]>((resolve, reject) => {
        const events: any[] = [];
        const subscription = client.chat.stream.subscribe(
          { sessionId: "missing-session", message: "hello over websocket" },
          {
            onData(event) {
              events.push(event);
              if (event.type === "error") {
                subscription.unsubscribe();
                resolve(events);
              }
            },
            onError: reject,
            onComplete() {
              resolve(events);
            },
          },
        );
      });
      expect(wsEvents).toEqual([
        expect.objectContaining({
          type: "error",
          sessionId: "missing-session",
          source: "chat",
        }),
      ]);
    } finally {
      await server?.stop();
    }
  });
});
