import { test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Agent } from "@aria/agent";
import { Scheduler, createHeartbeatTask } from "@aria/automation";
import { AuditLogger } from "@aria/audit";
import { createContext } from "@aria/gateway/context";
import { createAppRouter } from "@aria/gateway/procedures";
import { createAriaHarnessContext } from "@aria/harness";
import { HandoffService, HandoffStore } from "@aria/handoff";
import { createKernelRuntime } from "@aria/kernel";
import { SkillRegistry } from "@aria/memory/skills";
import { SecurityModeManager } from "@aria/policy";
import { ConfigManager } from "@aria/server/config";
import { CheckpointManager } from "@aria/server/checkpoints";
import { SessionArchiveManager } from "@aria/server/session-archive";
import { SessionManager } from "@aria/server/sessions";
import type { EngineRuntime } from "@aria/node-runtime/runtime";
import { OperationalStore } from "@aria/persistence/operational-store";
import { MCPManager } from "@aria/server/mcp";
import { AuthManager } from "@aria/gateway/auth";
import type { EngineEvent } from "@aria/protocol";
import { createSessionTitleTool, createSessionToolEnvironment, listToolsets } from "@aria/tools";
import { ProjectsEngineRepository, ProjectsEngineStore } from "@aria/work";
import {
  describeLive,
  getLiveTestLabel,
  makeLiveRouter,
  resolveLiveProviderSelection,
} from "../helpers/live-model.js";
import { echoTool } from "../helpers/test-tools.js";

let testDir: string;
let runtime: EngineRuntime;
let masterToken: string;
const liveSelection = resolveLiveProviderSelection();

async function createLiveTestRuntime(runtimeHome: string): Promise<EngineRuntime> {
  await mkdir(join(runtimeHome, "memory"), { recursive: true });
  await writeFile(
    join(runtimeHome, "IDENTITY.md"),
    "# Test Agent\n\n## Personality\nTest\n\n## System Prompt\nYou are a test agent.\n",
  );
  await writeFile(
    join(runtimeHome, "config.json"),
    JSON.stringify({
      version: 3,
      runtime: {
        activeModel: "haiku",
        telegramBotTokenEnvVar: "TEST_BOT_TOKEN",
        memory: { enabled: true, directory: "memory" },
      },
      providers: [
        {
          id: "anthropic",
          type: "anthropic",
          apiKeyEnvVar: "ANTHROPIC_API_KEY",
        },
      ],
      models: [
        {
          name: "haiku",
          provider: "anthropic",
          model: "claude-3-5-haiku-20241022",
          temperature: 0,
          maxTokens: 128,
        },
      ],
      defaultModel: "haiku",
    }),
  );

  const config = new ConfigManager(runtimeHome);
  await config.load();

  const router = makeLiveRouter();
  const store = new OperationalStore(runtimeHome);
  await store.init();
  const sessions = new SessionManager(store);
  const auth = new AuthManager(runtimeHome);
  await auth.init();
  const archive = new SessionArchiveManager(runtimeHome);
  await archive.init();
  const checkpoints = new CheckpointManager(runtimeHome, {
    enabled: true,
    maxSnapshots: 10,
  });
  const mcp = new MCPManager(undefined, runtimeHome);
  await mcp.init();
  const projectsStore = new ProjectsEngineStore(join(runtimeHome, "aria.db"));
  await projectsStore.init();
  const projects = new ProjectsEngineRepository(projectsStore);
  const handoffStore = new HandoffStore(join(runtimeHome, "aria.db"));
  await handoffStore.init();
  const handoffs = new HandoffService(handoffStore);

  const mainSession = sessions.create("main", "engine");
  const skills = new SkillRegistry();
  const scheduler = new Scheduler();
  scheduler.register(createHeartbeatTask(runtimeHome, null));

  const tools = [echoTool];

  return {
    config,
    router,
    memory: {
      init: async () => {},
      loadContext: async () => "",
      persist: async () => {},
    } as any,
    store,
    archive,
    checkpoints,
    mcp,
    tools,
    promptEngine: {
      buildBasePrompt: async () =>
        "Reply briefly. When asked to use a tool, use it without explanation.",
      buildSessionPrompt: async () =>
        "Reply briefly. When asked to use a tool, use it without explanation.",
    } as any,
    systemPrompt: "Reply briefly. When asked to use a tool, use it without explanation.",
    sessions,
    auth,
    skills,
    scheduler,
    transcriber: { transcribe: async () => "", backend: null } as any,
    audit: new AuditLogger(runtimeHome),
    securityMode: new SecurityModeManager(),
    kernel: createKernelRuntime(),
    agentName: "Test",
    mainSessionId: mainSession.id,
    createSessionTitleTool,
    createSessionToolEnvironment,
    async getProjectsRepository() {
      return projects;
    },
    async getHandoffService() {
      return handoffs;
    },
    async createHarnessSession(options) {
      const harnessContext = createAriaHarnessContext({
        id: options.id,
        host: options.host,
        cwd: options.cwd,
        projectRoot: options.projectRoot,
      });
      const harnessAgent = await harnessContext.init({ id: options.id, environment: "default" });
      return harnessAgent.session(options.id);
    },
    async startRun(request) {
      const runId = crypto.randomUUID();
      store.createRun({
        runId,
        sessionId: request.sessionId,
        trigger: request.trigger,
        status: "running",
        inputText: request.inputText,
        startedAt: Date.now(),
        parentRunId: request.parentRunId ?? undefined,
      });
      return runId;
    },
    async finishRun(request) {
      store.finishRun(request.runId, {
        status: request.status,
        completedAt: request.completedAt ?? Date.now(),
        stopReason: request.stopReason,
        errorMessage: request.errorMessage,
      });
    },
    async recordApprovalPending(request) {
      store.recordApprovalPending(request);
    },
    async resolveApproval(request) {
      store.resolveApproval(request.approvalId, request.status, request.resolvedAt);
    },
    async listApprovals(request) {
      return store.listApprovals(request);
    },
    async recordToolCallStart(request) {
      store.recordToolCallStart(request);
    },
    async recordToolCallEnd(request) {
      store.recordToolCallEnd(request);
    },
    async appendRunEvent(request) {
      return store.appendRunEvent(request);
    },
    listToolsets: () => listToolsets(tools),
    executeToolWithCapability: async (request) => request.execute(),
    async refreshSystemPrompt() {
      return "Reply briefly. When asked to use a tool, use it without explanation.";
    },
    async close() {
      scheduler.stop();
      projects.close();
      handoffs.close();
      store.close();
      archive.close();
      await auth.cleanup();
    },
    createAgent(onToolApproval, modelOverride?: string) {
      return new Agent({
        router,
        tools,
        getSystemPrompt: () => "Reply briefly. Use tools when asked.",
        onToolApproval,
        modelOverride,
      });
    },
  };
}

describeLive("tRPC procedures — live LLM tests", () => {
  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "aria-live-procedures-test-"));
    runtime = await createLiveTestRuntime(testDir);
    masterToken = runtime.auth.getMasterToken();
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  function createCaller() {
    const appRouter = createAppRouter(runtime);
    return appRouter.createCaller(createContext({ rawToken: masterToken }));
  }

  test("chat.stream returns text_delta and done events", async () => {
    const caller = createCaller();
    const { session } = await caller.session.create({
      connectorType: "tui",
      prefix: "tui",
    });

    const events: EngineEvent[] = [];
    const gen = await caller.chat.stream({
      sessionId: session.id,
      message: "Say hello",
    });
    for await (const event of gen) {
      events.push(event);
    }

    const types = events.map((e) => e.type);
    expect(types).toContain("text_delta");
    expect(types.at(-1)).toBe("done");
    expect(types).not.toContain("error");
    expect(getLiveTestLabel(liveSelection)).not.toBe("no-live-provider");
  }, 15_000);

  test("chat.stream with tool use emits tool events for TUI", async () => {
    const caller = createCaller();
    const { session } = await caller.session.create({
      connectorType: "tui",
      prefix: "tui",
    });

    const events: EngineEvent[] = [];
    const gen = await caller.chat.stream({
      sessionId: session.id,
      message: 'Use the echo tool with message "hello from tRPC"',
    });
    for await (const event of gen) {
      events.push(event);
    }

    const types = events.map((e) => e.type);
    // TUI connector should get tool_start events (not IM-filtered)
    expect(types).toContain("tool_start");
    expect(types).toContain("tool_end");
    expect(types.at(-1)).toBe("done");
  }, 30_000);
});
