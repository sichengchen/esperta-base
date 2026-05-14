import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Agent } from "@aria/agent";
import type { ToolImpl } from "@aria/agent";
import { Scheduler, createHeartbeatTask } from "@aria/automation";
import { AuditLogger } from "@aria/audit";
import { AuthManager } from "@aria/gateway/auth";
import { createAriaHarnessContext } from "@aria/harness";
import { HandoffService, HandoffStore } from "@aria/handoff";
import { createKernelRuntime } from "@aria/kernel";
import { SkillRegistry } from "@aria/memory/skills";
import { SecurityModeManager } from "@aria/policy";
import { OperationalStore } from "@aria/persistence/operational-store";
import { CheckpointManager } from "@aria/server/checkpoints";
import { ConfigManager } from "@aria/server/config";
import { MCPManager } from "@aria/server/mcp";
import { SessionArchiveManager } from "@aria/server/session-archive";
import { SessionManager } from "@aria/server/sessions";
import type { EngineRuntime } from "@aria/node-runtime/runtime";
import { createSessionTitleTool, createSessionToolEnvironment, listToolsets } from "@aria/tools";
import { ProjectsEngineRepository, ProjectsEngineStore } from "@aria/work";
import { makeLiveRouter, resolveLiveProviderSelection } from "./live-model.js";

export interface CreateLiveRuntimeOptions {
  tools?: ToolImpl[];
  systemPrompt?: string;
  maxTokens?: number;
}

export async function createLiveRuntime(
  runtimeHome: string,
  options: CreateLiveRuntimeOptions = {},
): Promise<EngineRuntime> {
  const selection = resolveLiveProviderSelection();
  if (!selection) {
    throw new Error("Live runtime requires a configured live provider");
  }

  const systemPrompt =
    options.systemPrompt ?? "Reply briefly. When asked to use a tool, use it without explanation.";

  await mkdir(join(runtimeHome, "memory"), { recursive: true });
  await writeFile(
    join(runtimeHome, "IDENTITY.md"),
    `# Test Agent\n\n## Personality\nTest\n\n## System Prompt\n${systemPrompt}\n`,
  );
  await writeFile(
    join(runtimeHome, "config.json"),
    JSON.stringify({
      version: 3,
      runtime: {
        activeModel: selection.modelName,
        telegramBotTokenEnvVar: "TEST_BOT_TOKEN",
        memory: { enabled: true, directory: "memory" },
        webhook: { enabled: true },
      },
      providers: [
        {
          id: selection.providerId,
          type: selection.providerType,
          apiKeyEnvVar: selection.apiKeyEnvVar,
          ...(selection.baseUrl ? { baseUrl: selection.baseUrl } : {}),
        },
      ],
      models: [
        {
          name: selection.modelName,
          provider: selection.providerId,
          model: selection.modelId,
          temperature: 0,
          maxTokens: options.maxTokens ?? 256,
        },
      ],
      defaultModel: selection.modelName,
    }),
  );

  const config = new ConfigManager(runtimeHome);
  await config.load();

  const router = makeLiveRouter(selection);
  const store = new OperationalStore(runtimeHome);
  await store.init();
  const sessions = new SessionManager(store);
  const auth = new AuthManager(runtimeHome, undefined, store);
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
  const tools = options.tools ?? [];

  return {
    config,
    router,
    memory: {
      init: async () => {},
      loadContext: async () => "",
      listLayer: async () => [],
      listJournalDates: async () => [],
      getLayer: async () => "",
      getJournal: async () => "",
      searchIndex: async () => [],
      getMemoryContext: async () => "",
      persist: async () => {},
    } as any,
    store,
    archive,
    checkpoints,
    mcp,
    tools,
    promptEngine: {
      buildBasePrompt: async () => systemPrompt,
      buildSessionPrompt: async () => systemPrompt,
    } as any,
    systemPrompt,
    sessions,
    auth,
    skills,
    scheduler,
    transcriber: { transcribe: async () => "", backend: null } as any,
    audit: new AuditLogger(runtimeHome),
    securityMode: new SecurityModeManager(),
    kernel: createKernelRuntime(),
    agentName: "Live Test",
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
    async getPromptCache(cacheKey) {
      return store.getPromptCache(cacheKey);
    },
    async putPromptCache(request) {
      store.putPromptCache(request);
    },
    async syncSessionMessages(request) {
      store.syncSessionMessages(request.sessionId, request.messages);
    },
    async getSessionMessages(sessionId) {
      return store.getSessionMessages(sessionId);
    },
    listToolsets: () => listToolsets(tools),
    executeToolWithCapability: async (request) => request.execute(),
    async refreshSystemPrompt() {
      return systemPrompt;
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
        getSystemPrompt: () => systemPrompt,
        onToolApproval,
        modelOverride,
      });
    },
  };
}

export function collectSubscription<TEvent = any>(
  subscribe: (handlers: {
    onData(event: TEvent): void;
    onError(error: unknown): void;
    onComplete(): void;
  }) => { unsubscribe(): void },
  onEvent?: (event: TEvent) => void,
): Promise<TEvent[]> {
  return new Promise((resolve, reject) => {
    const events: TEvent[] = [];
    let subscription: { unsubscribe(): void };
    subscription = subscribe({
      onData(event) {
        events.push(event);
        try {
          onEvent?.(event);
        } catch (error) {
          subscription.unsubscribe();
          reject(error);
        }
      },
      onError(error) {
        reject(error);
      },
      onComplete() {
        resolve(events);
      },
    });
  });
}
