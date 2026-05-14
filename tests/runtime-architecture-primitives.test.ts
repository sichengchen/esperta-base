import { describe, expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CapabilityBroker, type ToolIntentRecord } from "@aria/capability";
import {
  DEFAULT_SANDBOX_PROVIDER,
  SandboxManager,
  resolveSandboxProviderName,
} from "@aria/sandbox";
import { createFullSandboxPlaceholderProvider } from "@aria/sandbox-full";
import { createJustBashSandboxProvider } from "@aria/sandbox-justbash";
import {
  CommandBus,
  ImmediateUnitOfWork,
  JobScheduler,
  Outbox,
  QueryBus,
  SqliteKernelStore,
  WorkflowEngine,
  createKernelRuntime,
} from "@aria/kernel";

function intent(overrides: Partial<ToolIntentRecord> = {}): ToolIntentRecord {
  return {
    identity: { toolIntentId: "intent-1", runId: "run-1", jobId: "job-1" },
    toolName: "bash",
    action: "exec",
    sideEffects: ["execute_shell"],
    createdAt: "2026-05-13T00:00:00.000Z",
    ...overrides,
  };
}

describe("runtime architecture primitives", () => {
  test("sandbox provider selection follows run project node default precedence", () => {
    expect(resolveSandboxProviderName()).toBe(DEFAULT_SANDBOX_PROVIDER);
    expect(resolveSandboxProviderName({ nodeProvider: "node" })).toBe("node");
    expect(resolveSandboxProviderName({ projectProvider: "project", nodeProvider: "node" })).toBe(
      "project",
    );
    expect(
      resolveSandboxProviderName({
        runProvider: "run",
        projectProvider: "project",
        nodeProvider: "node",
      }),
    ).toBe("run");
  });

  test("justbash is the default sandbox and full sandbox remains a placeholder", async () => {
    const manager = new SandboxManager({
      providers: [createJustBashSandboxProvider(), createFullSandboxPlaceholderProvider()],
    });

    const result = await manager.execute({
      action: "exec",
      toolName: "bash",
      command: "echo justbash",
    });

    expect(result).toMatchObject({
      provider: "justbash",
      status: "completed",
      stdout: "justbash\n",
      exitCode: 0,
    });

    const unsupported = await manager.execute({
      provider: "full",
      action: "exec",
      toolName: "bash",
      command: "echo nope",
    });
    expect(unsupported.status).toBe("unsupported");
    expect(unsupported.stderr).toContain("requires a different sandbox provider");
  });

  test("capability broker limits policy and approval decisions to simple values", async () => {
    const auditEvents: string[] = [];
    const broker = new CapabilityBroker({
      sandbox: new SandboxManager({ providers: [createJustBashSandboxProvider()] }),
      decidePolicy: () => "ask",
      requestApproval: () => "approve_once",
      audit: (event) => {
        auditEvents.push(event.type);
      },
    });

    const result = await broker.execute({
      intent: intent(),
      sandbox: { command: "echo approved" },
    });

    expect(result.status).toBe("executed");
    expect(result.policyDecision).toBe("ask");
    expect(result.approvalDecision).toBe("approve_once");
    expect(result.sandboxResult?.stdout).toBe("approved\n");
    expect(auditEvents).toEqual([
      "tool_intent",
      "policy_decision",
      "approval_decision",
      "tool_execution",
    ]);
  });

  test("capability broker can gate tool runtime execution after provider selection", async () => {
    let executed = 0;
    const broker = new CapabilityBroker({
      sandbox: new SandboxManager({
        providers: [createJustBashSandboxProvider()],
        selection: { defaultProvider: "justbash" },
      }),
      decidePolicy: () => "ask",
      requestApproval: () => "approve_once",
    });

    const result = await broker.execute({
      intent: intent({ toolName: "memory_write", action: "write_file" }),
      sandbox: {},
      executeToolRuntime: async () => {
        executed += 1;
        return { content: "stored" };
      },
    });

    expect(executed).toBe(1);
    expect(result).toMatchObject({
      status: "executed",
      policyDecision: "ask",
      approvalDecision: "approve_once",
      sandboxResult: {
        provider: "justbash",
        status: "completed",
        result: { content: "stored" },
      },
      toolRuntimeResult: { content: "stored" },
    });
  });

  test("kernel command bus provides unit of work, idempotency, workflow, and outbox primitives", async () => {
    const workflows = new WorkflowEngine();
    const outbox = new Outbox();
    const context = {
      unitOfWork: new ImmediateUnitOfWork(),
      workflows,
      outbox,
    };
    const commands = new CommandBus(context);
    const queries = new QueryBus(context);
    let commandRuns = 0;

    commands.register("request_run", (command, ctx) => {
      commandRuns += 1;
      ctx.workflows.enqueue({
        id: "workflow-1",
        workflowType: "continue_run_after_model_output",
        aggregateId: "run-1",
        runAt: "2026-05-13T00:00:00.000Z",
        payload: command.payload,
      });
      ctx.outbox.enqueue({
        id: "outbox-1",
        topic: "run.requested",
        payload: command.payload,
        createdAt: "2026-05-13T00:00:00.000Z",
      });
      return { runId: "run-1" };
    });
    queries.register("list_workflows", (_query, ctx) => ctx.workflows.list("pending"));

    const first = await commands.execute({
      type: "request_run",
      payload: { threadId: "thread-1" },
      idempotencyKey: "request-1",
    });
    const second = await commands.execute({
      type: "request_run",
      payload: { threadId: "thread-1" },
      idempotencyKey: "request-1",
    });
    const scheduler = new JobScheduler(workflows);
    scheduler.schedule({
      id: "workflow-2",
      workflowType: "resume_job_after_tool_result",
      aggregateId: "job-1",
      runAt: "2026-05-13T00:00:01.000Z",
      payload: {},
    });

    expect(first).toEqual({ runId: "run-1" });
    expect(second).toEqual({ runId: "run-1" });
    expect(commandRuns).toBe(1);
    expect(await queries.execute({ type: "list_workflows", payload: {} })).toHaveLength(2);
    expect(outbox.drain()).toHaveLength(1);
  });

  test("kernel primitives persist idempotency, workflows, and outbox across restarts", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aria-kernel-test-"));
    const dbPath = join(dir, "kernel.db");
    const first = createKernelRuntime(new SqliteKernelStore(dbPath));

    first.commands.register("request_run", (command, ctx) => {
      ctx.workflows.enqueue({
        id: "workflow-persisted",
        workflowType: "resume_run",
        aggregateId: "run-1",
        runAt: "2026-05-14T00:00:00.000Z",
        payload: command.payload,
      });
      ctx.outbox.enqueue({
        id: "outbox-persisted",
        topic: "run.requested",
        payload: command.payload,
        createdAt: "2026-05-14T00:00:00.000Z",
      });
      return { runId: "run-1" };
    });

    await first.commands.execute({
      type: "request_run",
      payload: { threadId: "thread-1" },
      idempotencyKey: "request-persisted",
    });
    first.close();

    const second = createKernelRuntime(new SqliteKernelStore(dbPath));
    second.commands.register("request_run", () => {
      throw new Error("idempotent command should not re-run after restart");
    });

    await expect(
      second.commands.execute({
        type: "request_run",
        payload: { threadId: "thread-1" },
        idempotencyKey: "request-persisted",
      }),
    ).resolves.toEqual({ runId: "run-1" });
    expect(second.workflows.list("pending")).toEqual([
      expect.objectContaining({
        id: "workflow-persisted",
        payload: { threadId: "thread-1" },
      }),
    ]);
    expect(second.outbox.drain()).toEqual([
      expect.objectContaining({
        id: "outbox-persisted",
        topic: "run.requested",
        payload: { threadId: "thread-1" },
      }),
    ]);
    expect(second.outbox.drain()).toEqual([]);
    second.close();
  });
});
