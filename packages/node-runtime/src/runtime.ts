import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { DangerLevel, ToolApprovalCallback, ToolImpl, ToolResult } from "@aria/agent";
import { CapabilityBroker, type CapabilityPolicyDecision } from "@aria/capability";
import type { AgentEvent, AskUserCallback } from "@aria/protocol";
import type { Message } from "@mariozechner/pi-ai";
import { SandboxManager, type SandboxAction } from "@aria/sandbox";
import { createJustBashSandboxProvider } from "@aria/sandbox-justbash";
import { Orchestrator } from "@aria/agent/orchestrator";
import { AuditLogger } from "@aria/audit";
import {
  AutomationRegistry,
  Scheduler,
  createHeartbeatTask,
  type AutomationAgentFactory,
} from "@aria/automation";
import { AuthManager } from "@aria/gateway/auth";
import { HandoffService, HandoffStore } from "@aria/handoff";
import { createKernelRuntime, SqliteKernelStore, type KernelRuntime } from "@aria/kernel";
import {
  createAriaHarnessContext,
  type AriaHarnessHost,
  type AriaHarnessSession,
  type HarnessSessionData,
} from "@aria/harness";
import { ModelRouter } from "@aria/gateway/router";
import type { RuntimeBackendAdapter } from "@aria/jobs/runtime-backend";
import { MemoryManager } from "@aria/memory";
import { SkillRegistry } from "@aria/memory/skills";
import { SecurityModeManager } from "@aria/policy";
import { toolIntentRequiresApproval, type ToolIntent } from "@aria/policy";
import { PromptEngine } from "@aria/prompt";
import {
  OperationalStore,
  type ApprovalRecord,
  type ApprovalStatus,
  type PromptCacheRecord,
  type RunEventRecord,
  type ToolCallStatus,
} from "@aria/persistence";
import { ProjectsEngineRepository, ProjectsEngineStore } from "@aria/work";
import {
  askUserTool,
  createDelegateStatusTool,
  createDelegateTool,
  createMemoryDeleteTool,
  createMemoryReadTool,
  createMemorySearchTool,
  createMemoryWriteTool,
  createNotifyTool,
  createSessionTitleTool,
  createReadSkillTool,
  createSetEnvSecretTool,
  createSetEnvVariableTool,
  createSkillManageTool,
  createWebFetchTool,
  createSessionToolEnvironment,
  getBuiltinTools,
  listToolsets,
} from "@aria/tools";
import { MCPManager } from "@aria/server/mcp";
import { createTranscriber, type Transcriber } from "@aria/server/audio";
import { CLI_NAME, getRuntimeHome } from "@aria/node-host/brand";
import { CheckpointManager } from "@aria/server/checkpoints";
import { ConfigManager, DEFAULT_HEARTBEAT_MD } from "@aria/server/config";
import { createProjectsControlTool } from "@aria/server/projects-control-tool";
import { SessionArchiveManager } from "@aria/server/session-archive";
import { SessionManager } from "@aria/server/sessions";

export interface RuntimeAgentSession {
  readonly isRunning: boolean;
  abort(): boolean;
  chat(userText: string): AsyncGenerator<AgentEvent>;
  getMessages(): readonly Message[];
  hydrateHistory(messages: readonly Message[]): void;
}

export interface RuntimeCapabilityToolExecutionRequest {
  sessionId: string;
  runId?: string;
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  dangerLevel: DangerLevel;
  policyDecision: CapabilityPolicyDecision;
  approvalDecision?: "approve_once" | "deny";
  execute: () => Promise<ToolResult>;
}

export interface RuntimeRunStartRequest {
  sessionId: string;
  trigger: string;
  inputText: string;
  parentRunId?: string | null;
}

export interface RuntimeRunFinishRequest {
  runId: string;
  status: "completed" | "failed" | "cancelled" | "interrupted";
  completedAt?: number;
  stopReason?: string;
  errorMessage?: string;
}

export interface RuntimeApprovalPendingRequest {
  approvalId: string;
  runId: string;
  sessionId: string;
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  createdAt?: number;
}

export interface RuntimeApprovalResolveRequest {
  approvalId: string;
  status: Exclude<ApprovalStatus, "pending">;
  resolvedAt?: number;
}

export interface RuntimeApprovalListRequest {
  sessionId?: string;
  status?: ApprovalStatus;
  limit?: number;
}

export interface RuntimeToolCallStartRequest {
  toolCallId: string;
  runId: string;
  sessionId: string;
  toolName: string;
  args: Record<string, unknown>;
  startedAt?: number;
}

export interface RuntimeToolCallEndRequest {
  toolCallId: string;
  status: ToolCallStatus;
  result: { content: string; isError?: boolean };
  endedAt?: number;
}

export interface RuntimeRunEventAppendRequest {
  sessionId?: string | null;
  runId?: string | null;
  type: string;
  data?: Record<string, unknown>;
  createdAt?: number;
}

export interface RuntimePromptCachePutRequest {
  cacheKey: string;
  scope: string;
  content: string;
  metadata?: Record<string, unknown>;
  updatedAt?: number;
}

export interface RuntimeSessionMessagesSyncRequest {
  sessionId: string;
  messages: readonly Message[];
}

export type RuntimeAutomationTaskRecord = ReturnType<
  OperationalStore["listAutomationTasks"]
>[number];
export type RuntimeAutomationRunRecord = ReturnType<OperationalStore["listAutomationRuns"]>[number];
export type RuntimeAutomationTaskType = RuntimeAutomationTaskRecord["taskType"];
export type RuntimeAutomationTaskUpsertRequest = Parameters<
  OperationalStore["upsertAutomationTask"]
>[0];
export type RuntimeAutomationRunStartRequest = Parameters<
  OperationalStore["recordAutomationRunStart"]
>[0];
export type RuntimeAutomationRunFinishRequest = Parameters<
  OperationalStore["finishAutomationRun"]
>[0];
export type RuntimeAutomationDeliveryRecordRequest = Parameters<
  OperationalStore["recordAutomationDelivery"]
>[0];

export interface EngineRuntime {
  config: ConfigManager;
  router: ModelRouter;
  memory: MemoryManager;
  store: OperationalStore;
  archive: SessionArchiveManager;
  checkpoints: CheckpointManager;
  mcp: MCPManager;
  tools: ToolImpl[];
  promptEngine: PromptEngine;
  systemPrompt: string;
  sessions: SessionManager;
  auth: AuthManager;
  skills: SkillRegistry;
  scheduler: Scheduler;
  automationAgentFactory?: AutomationAgentFactory;
  transcriber: Transcriber;
  audit: AuditLogger;
  securityMode: SecurityModeManager;
  projects?: ProjectsEngineRepository;
  handoffs?: HandoffService;
  kernel: KernelRuntime;
  agentName: string;
  mainSessionId: string;
  createSessionTitleTool: typeof createSessionTitleTool;
  createSessionToolEnvironment: typeof createSessionToolEnvironment;
  getProjectsRepository(): Promise<ProjectsEngineRepository>;
  getHandoffService(): Promise<HandoffService>;
  createHarnessSession(options: {
    id: string;
    host: AriaHarnessHost;
    cwd?: string;
    projectRoot?: string;
  }): Promise<AriaHarnessSession>;
  startRun(request: RuntimeRunStartRequest): Promise<string>;
  finishRun(request: RuntimeRunFinishRequest): Promise<void>;
  recordApprovalPending(request: RuntimeApprovalPendingRequest): Promise<void>;
  resolveApproval(request: RuntimeApprovalResolveRequest): Promise<void>;
  listApprovals(request?: RuntimeApprovalListRequest): Promise<ApprovalRecord[]>;
  recordToolCallStart(request: RuntimeToolCallStartRequest): Promise<void>;
  recordToolCallEnd(request: RuntimeToolCallEndRequest): Promise<void>;
  appendRunEvent(request: RuntimeRunEventAppendRequest): Promise<RunEventRecord>;
  getPromptCache(cacheKey: string): Promise<PromptCacheRecord | undefined>;
  putPromptCache(request: RuntimePromptCachePutRequest): Promise<void>;
  syncSessionMessages(request: RuntimeSessionMessagesSyncRequest): Promise<void>;
  getSessionMessages(sessionId: string): Promise<Message[]>;
  upsertAutomationTask(request: RuntimeAutomationTaskUpsertRequest): Promise<void>;
  getAutomationTaskByName(
    taskType: RuntimeAutomationTaskType,
    name: string,
  ): Promise<RuntimeAutomationTaskRecord | undefined>;
  getAutomationTaskBySlug(slug: string): Promise<RuntimeAutomationTaskRecord | undefined>;
  deleteAutomationTask(taskId: string): Promise<boolean>;
  listAutomationTasks(taskType?: RuntimeAutomationTaskType): Promise<RuntimeAutomationTaskRecord[]>;
  recordAutomationRunStart(request: RuntimeAutomationRunStartRequest): Promise<void>;
  finishAutomationRun(request: RuntimeAutomationRunFinishRequest): Promise<void>;
  recordAutomationDelivery(request: RuntimeAutomationDeliveryRecordRequest): Promise<void>;
  listAutomationRuns(taskId?: string, limit?: number): Promise<RuntimeAutomationRunRecord[]>;
  listToolsets(): ReturnType<typeof listToolsets>;
  executeToolWithCapability(request: RuntimeCapabilityToolExecutionRequest): Promise<ToolResult>;
  createAgent(
    onToolApproval?: ToolApprovalCallback,
    modelOverride?: string,
    allowedTools?: string[],
    onAskUser?: AskUserCallback,
  ): RuntimeAgentSession;
  refreshSystemPrompt(): Promise<string>;
  close(): Promise<void>;
}

export async function createRuntime(): Promise<EngineRuntime> {
  const runtimeHome = getRuntimeHome();

  const config = new ConfigManager(runtimeHome);
  const ariaConfig = await config.load();

  const memoryDir = join(config.homeDir, ariaConfig.runtime.memory.directory);
  const memory = new MemoryManager(memoryDir);
  await memory.init();

  const archive = new SessionArchiveManager(config.homeDir);
  await archive.init();
  const store = new OperationalStore(config.homeDir);
  await store.init();
  const projectsStore = new ProjectsEngineStore(join(config.homeDir, "aria.db"));
  await projectsStore.init();
  const projects = new ProjectsEngineRepository(projectsStore);
  const handoffStore = new HandoffStore(join(config.homeDir, "aria.db"));
  await handoffStore.init();
  const handoffs = new HandoffService(handoffStore);
  const kernel = createKernelRuntime(new SqliteKernelStore(join(config.homeDir, "aria.db")));
  kernel.commands.register("runtime.run.start", (command) => {
    const payload = command.payload as RuntimeRunStartRequest & {
      runId: string;
      startedAt: number;
    };
    store.createRun({
      runId: payload.runId,
      sessionId: payload.sessionId,
      trigger: payload.trigger,
      status: "running",
      inputText: payload.inputText,
      startedAt: payload.startedAt,
      parentRunId: payload.parentRunId ?? undefined,
    });
    return { runId: payload.runId };
  });
  kernel.commands.register("runtime.run.finish", (command) => {
    const payload = command.payload as RuntimeRunFinishRequest;
    store.finishRun(payload.runId, {
      status: payload.status,
      completedAt: payload.completedAt ?? Date.now(),
      stopReason: payload.stopReason,
      errorMessage: payload.errorMessage,
    });
    return { runId: payload.runId };
  });
  kernel.commands.register("runtime.approval.pending", (command) => {
    const payload = command.payload as RuntimeApprovalPendingRequest;
    store.recordApprovalPending(payload);
    return { approvalId: payload.approvalId };
  });
  kernel.commands.register("runtime.approval.resolve", (command) => {
    const payload = command.payload as RuntimeApprovalResolveRequest;
    store.resolveApproval(payload.approvalId, payload.status, payload.resolvedAt);
    return { approvalId: payload.approvalId };
  });
  kernel.queries.register("runtime.approvals.list", (query) => {
    const payload = query.payload as RuntimeApprovalListRequest | undefined;
    return store.listApprovals(payload);
  });
  kernel.commands.register("runtime.tool_call.start", (command) => {
    const payload = command.payload as RuntimeToolCallStartRequest;
    store.recordToolCallStart(payload);
    return { toolCallId: payload.toolCallId };
  });
  kernel.commands.register("runtime.tool_call.end", (command) => {
    const payload = command.payload as RuntimeToolCallEndRequest;
    store.recordToolCallEnd(payload);
    return { toolCallId: payload.toolCallId };
  });
  kernel.commands.register("runtime.run_event.append", (command) => {
    const payload = command.payload as RuntimeRunEventAppendRequest;
    return store.appendRunEvent(payload);
  });
  kernel.queries.register("runtime.prompt_cache.get", (query) => {
    return store.getPromptCache(String(query.payload));
  });
  kernel.commands.register("runtime.prompt_cache.put", (command) => {
    const payload = command.payload as RuntimePromptCachePutRequest;
    store.putPromptCache(payload);
    return { cacheKey: payload.cacheKey };
  });
  kernel.commands.register("runtime.session_messages.sync", (command) => {
    const payload = command.payload as RuntimeSessionMessagesSyncRequest;
    store.syncSessionMessages(payload.sessionId, payload.messages);
    return { sessionId: payload.sessionId };
  });
  kernel.queries.register("runtime.session_messages.get", (query) => {
    return store.getSessionMessages(String(query.payload));
  });
  kernel.commands.register("runtime.automation_task.upsert", (command) => {
    const payload = command.payload as RuntimeAutomationTaskUpsertRequest;
    store.upsertAutomationTask(payload);
    return { taskId: payload.taskId };
  });
  kernel.commands.register("runtime.automation_task.delete", (command) => {
    return store.deleteAutomationTask(String(command.payload));
  });
  kernel.queries.register("runtime.automation_task.get_by_name", (query) => {
    const payload = query.payload as { taskType: RuntimeAutomationTaskType; name: string };
    return store.getAutomationTaskByName(payload.taskType, payload.name);
  });
  kernel.queries.register("runtime.automation_task.get_by_slug", (query) => {
    return store.getAutomationTaskBySlug(String(query.payload));
  });
  kernel.queries.register("runtime.automation_tasks.list", (query) => {
    return store.listAutomationTasks(query.payload as RuntimeAutomationTaskType | undefined);
  });
  kernel.commands.register("runtime.automation_run.start", (command) => {
    const payload = command.payload as RuntimeAutomationRunStartRequest;
    store.recordAutomationRunStart(payload);
    return { taskRunId: payload.taskRunId };
  });
  kernel.commands.register("runtime.automation_run.finish", (command) => {
    const payload = command.payload as RuntimeAutomationRunFinishRequest;
    store.finishAutomationRun(payload);
    return { taskRunId: payload.taskRunId };
  });
  kernel.commands.register("runtime.automation_delivery.record", (command) => {
    const payload = command.payload as RuntimeAutomationDeliveryRecordRequest;
    store.recordAutomationDelivery(payload);
    return { taskRunId: payload.taskRunId };
  });
  kernel.queries.register("runtime.automation_runs.list", (query) => {
    const payload = query.payload as { taskId?: string; limit?: number } | undefined;
    return store.listAutomationRuns(payload?.taskId, payload?.limit);
  });

  const checkpoints = new CheckpointManager(config.homeDir, ariaConfig.runtime.checkpoints);
  const mcp = new MCPManager(
    ariaConfig.runtime.mcp?.servers,
    process.env.TERMINAL_CWD ?? process.cwd(),
    store,
  );
  await mcp.init();

  const searchConfig = ariaConfig.runtime.memory.search;
  if (searchConfig) {
    memory.setSearchWeights({
      vectorWeight: searchConfig.vectorWeight,
      textWeight: searchConfig.textWeight,
      temporalDecay: searchConfig.temporalDecay,
    });
  }

  if (ariaConfig.runtime.env) {
    for (const [envVar, value] of Object.entries(ariaConfig.runtime.env)) {
      if (!process.env[envVar] && value) {
        process.env[envVar] = value;
      }
    }
  }

  const secrets = await config.loadSecrets();
  if (secrets?.apiKeys) {
    for (const [envVar, value] of Object.entries(secrets.apiKeys)) {
      if (!process.env[envVar] && value) {
        process.env[envVar] = value;
      }
    }
  }

  for (const provider of ariaConfig.providers) {
    const envVar = provider.apiKeyEnvVar;
    if (!process.env[envVar] && !secrets?.apiKeys[envVar]) {
      console.warn(`[aria] Warning: API key "${envVar}" not found for provider "${provider.id}".`);
      console.warn(`[aria]   Store it with: ${CLI_NAME} onboard (or set_env_secret tool)`);
      if (process.platform === "darwin") {
        console.warn(
          "[aria]   Note: launchd services do not inherit shell env vars - keys must be in secrets.enc",
        );
      }
    }
  }

  const baseConfigFile = config.getConfigFile();
  const router = ModelRouter.fromConfig(
    {
      providers: ariaConfig.providers,
      models: ariaConfig.models,
      defaultModel: ariaConfig.defaultModel,
    },
    secrets,
    async (state) => {
      await config.saveConfig({
        ...baseConfigFile,
        providers: state.providers,
        models: state.models,
        defaultModel: state.defaultModel,
        runtime: { ...baseConfigFile.runtime, activeModel: state.activeModel },
      });
    },
    {
      modelTiers: ariaConfig.runtime.modelTiers,
      taskTierOverrides: ariaConfig.runtime.taskTierOverrides,
      modelAliases: ariaConfig.runtime.modelAliases,
    },
  );

  if (router.hasEmbedding()) {
    const embCfg = router.getEmbeddingConfig()!;
    const embProvider = router.getProvider(embCfg.provider);
    try {
      await memory.setEmbedding({
        embed: (texts) => router.embed(texts),
        provider: embProvider.type,
        model: embCfg.model,
      });
    } catch (error) {
      console.warn(
        "[aria] Failed to initialize embeddings:",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  const skills = new SkillRegistry();
  await skills.loadAll(runtimeHome);
  let runtime: EngineRuntime;

  const tools: ToolImpl[] = [
    ...getBuiltinTools(),
    createWebFetchTool(ariaConfig.runtime.urlPolicy),
    createMemoryWriteTool(memory),
    createMemorySearchTool(memory),
    createMemoryReadTool(memory),
    createMemoryDeleteTool(memory),
    createReadSkillTool(skills),
    createSkillManageTool({
      homeDir: config.homeDir,
      registry: skills,
      onMutate: async () => {
        if (runtime) {
          await runtime.refreshSystemPrompt();
        }
      },
    }),
    createSetEnvSecretTool(config),
    createSetEnvVariableTool(config),
    createNotifyTool(secrets),
    createSessionTitleTool(),
    createProjectsControlTool({
      getRepository: () => projects,
      runDispatch: async (repository, dispatchId) => {
        const { runDispatchExecution } = await import("@aria/jobs/dispatch-runner");
        return runDispatchExecution(runtime, repository, dispatchId, {
          backendRegistry: (
            runtime as EngineRuntime & {
              runtimeBackendRegistry?: Map<string, RuntimeBackendAdapter>;
            }
          ).runtimeBackendRegistry,
        });
      },
    }),
    askUserTool,
    ...mcp.getTools(),
  ];

  const orchestrator = new Orchestrator(router, tools, {
    maxConcurrent: ariaConfig.runtime.orchestration?.maxConcurrent,
    maxSubAgentsPerTurn: ariaConfig.runtime.orchestration?.maxSubAgentsPerTurn,
    resultRetentionMs: ariaConfig.runtime.orchestration?.resultRetentionMs,
    defaultTimeoutMs: ariaConfig.runtime.orchestration?.defaultTimeoutMs,
  });

  tools.push(
    createDelegateTool({
      router,
      tools,
      defaultTimeoutMs: ariaConfig.runtime.orchestration?.defaultTimeoutMs,
      memoryWriteDefault: ariaConfig.runtime.orchestration?.memoryWriteDefault,
      getOrchestrator: () => orchestrator,
    }),
  );

  tools.push(
    createDelegateStatusTool({
      getOrchestrator: () => orchestrator,
    }),
  );

  const promptEngine = new PromptEngine({
    config,
    router,
    memory,
    store,
    skills,
    tools,
  });
  let systemPrompt = await promptEngine.buildBasePrompt();

  const audioConfig = ariaConfig.runtime.audio ?? {
    enabled: true,
    preferLocal: true,
  };
  const transcriber = await createTranscriber({
    preferLocal: audioConfig.preferLocal,
  });
  if (transcriber.backend) {
    console.log(`Audio transcription: ${transcriber.backend}`);
  }

  const sessions = new SessionManager(store);
  const auth = new AuthManager(runtimeHome, ariaConfig.runtime.security, store);
  await auth.init();
  const audit = new AuditLogger(runtimeHome);
  const securityMode = new SecurityModeManager(ariaConfig.runtime.security);
  const capabilitySandbox = new SandboxManager({
    providers: [createJustBashSandboxProvider()],
    selection: { defaultProvider: ariaConfig.runtime.sandbox?.provider },
  });

  function sandboxActionForTool(toolName: string): SandboxAction {
    switch (toolName) {
      case "bash":
      case "exec":
        return "exec";
      case "read":
      case "read_file":
      case "read_skill":
        return "read_file";
      case "write":
      case "edit":
      case "set_session_title":
      case "set_env_secret":
      case "set_env_variable":
      case "memory_write":
      case "memory_delete":
      case "skill_manage":
        return "write_file";
      case "grep":
      case "glob":
      case "memory_search":
      case "memory_read":
        return "list_files";
      default:
        return "create_artifact";
    }
  }

  function sideEffectsForTool(toolName: string, intent: ToolIntent): string[] {
    const effects = new Set<string>();
    if (toolName === "bash" || toolName === "exec") effects.add("execute_shell");
    if (intent.filesystemEffect === "host_read" || intent.filesystemEffect === "virtual") {
      effects.add("read_file");
    }
    if (intent.filesystemEffect === "host_write" || toolName === "write" || toolName === "edit") {
      effects.add("write_file");
    }
    if (intent.network !== "none") effects.add("network_access");
    if (toolName.startsWith("memory_")) effects.add("persist_memory");
    if (toolName === "notify") effects.add("send_message");
    if (toolName === "set_env_secret") effects.add("use_secret");
    if (effects.size === 0) effects.add("runtime_tool");
    return [...effects];
  }

  function createRuntimeHarnessHost(sessionId: string): AriaHarnessHost & {
    rememberApprovedIntent(intent: ToolIntent): void;
    consumeCapabilityApproval(intent: ToolIntent): boolean;
  } {
    const preapprovedToolIntents = new Set<string>();
    const capabilityApprovedToolIntents = new Set<string>();
    const approvalKey = (intent: ToolIntent) =>
      JSON.stringify({
        toolName: intent.toolName,
        environment: intent.environment,
        filesystemEffect: intent.filesystemEffect,
        network: intent.network,
        command: intent.command,
      });
    const host: AriaHarnessHost & {
      rememberApprovedIntent(intent: ToolIntent): void;
      consumeCapabilityApproval(intent: ToolIntent): boolean;
    } = {
      rememberApprovedIntent(intent) {
        if (toolIntentRequiresApproval(intent)) {
          preapprovedToolIntents.add(approvalKey(intent));
          capabilityApprovedToolIntents.add(approvalKey(intent));
        }
      },
      consumeCapabilityApproval(intent) {
        return capabilityApprovedToolIntents.delete(approvalKey(intent));
      },
      resolveModel(input) {
        return router.getModel(input.model);
      },
      async requestToolDecision(intent) {
        if (preapprovedToolIntents.delete(approvalKey(intent))) {
          return { status: "allow" };
        }
        if (toolIntentRequiresApproval(intent)) {
          return { status: "ask", reason: "Runtime approval required for tool intent" };
        }
        return { status: "allow" };
      },
      async recordAudit(event) {
        audit.log({
          session: event.sessionId ?? sessionId,
          connector: "engine",
          event: "tool_call",
          run: event.runId,
          tool: event.toolName,
          summary: event.message,
          environment: event.intent?.environment,
          command: event.intent?.command,
          cwd: event.intent?.cwd,
          leases: event.intent?.leases,
        });
      },
      async appendRunEvent(event) {
        store.appendRunEvent({
          sessionId: event.sessionId ?? sessionId,
          runId: event.runId,
          type: event.type,
          data: event.data,
          createdAt: event.at,
        });
      },
      async loadHarnessSession(id) {
        const cached = store.getPromptCache(`harness-session:${id}`);
        return cached ? (JSON.parse(cached.content) as HarnessSessionData) : null;
      },
      async saveHarnessSession(id, data) {
        store.putPromptCache({
          cacheKey: `harness-session:${id}`,
          scope: "harness_session",
          content: JSON.stringify(data),
          metadata: { sessionId: id },
          updatedAt: data.updatedAt,
        });
      },
      async resolveSecrets(leases) {
        const secrets = await config.loadSecrets();
        const resolved: Record<string, string> = {};
        for (const lease of leases) {
          const value = secrets?.apiKeys?.[lease.ref.name] ?? process.env[lease.ref.name];
          if (value !== undefined) {
            resolved[lease.id] = value;
          }
        }
        return resolved;
      },
    };
    return host;
  }

  function getRuntimeToolIntent(toolName: string, args: Record<string, unknown>): ToolIntent {
    return {
      toolName,
      environment: "default",
      filesystemEffect:
        toolName === "write" || toolName === "edit" || toolName === "exec" || toolName === "bash"
          ? "virtual"
          : "none",
      network: toolName === "web_fetch" || toolName === "web_search" ? "allowlist" : "none",
      leases: Array.isArray(args.leases) ? args.leases.map(String) : [],
      command: typeof args.command === "string" ? args.command : undefined,
      cwd:
        typeof args.cwd === "string"
          ? args.cwd
          : typeof args.workdir === "string"
            ? args.workdir
            : undefined,
    };
  }

  async function executeToolWithCapability(
    request: RuntimeCapabilityToolExecutionRequest,
  ): Promise<ToolResult> {
    const intent = getRuntimeToolIntent(request.toolName, request.args);
    const broker = new CapabilityBroker({
      sandbox: capabilitySandbox,
      decidePolicy: () => request.policyDecision,
      requestApproval: () => request.approvalDecision ?? "deny",
      audit: (event) => {
        audit.log({
          session: request.sessionId,
          connector: "engine",
          event:
            event.type === "approval_decision"
              ? event.decision === "approve_once"
                ? "tool_approval"
                : "tool_denial"
              : "tool_call",
          run: request.runId,
          tool: request.toolName,
          summary: event.type,
          environment: intent.environment,
          command: intent.command,
          cwd: intent.cwd,
          leases: intent.leases,
        });
      },
    });

    const result = await broker.execute({
      intent: {
        identity: {
          sessionId: request.sessionId,
          runId: request.runId,
          toolIntentId: request.toolCallId,
        },
        toolName: request.toolName,
        action: sandboxActionForTool(request.toolName),
        sideEffects: sideEffectsForTool(request.toolName, intent),
        createdAt: new Date().toISOString(),
        input: request.args,
      },
      sandbox: {
        command: intent.command,
        cwd: intent.cwd,
      },
      executeToolRuntime: request.execute,
    });

    if (result.status !== "executed") {
      return {
        content: result.reason ?? `Tool "${request.toolName}" was denied by capability policy.`,
        isError: true,
      };
    }
    return result.toolRuntimeResult as ToolResult;
  }

  function createHarnessRuntimeAgent(options: {
    sessionId: string;
    tools: ToolImpl[];
    getSystemPrompt: () => string;
    modelOverride?: string;
    onToolApproval?: ToolApprovalCallback;
    onAskUser?: AskUserCallback;
  }): RuntimeAgentSession {
    let hydratedMessages: readonly Message[] = [];
    let harnessSession: AriaHarnessSession | null = null;
    const harnessHost = createRuntimeHarnessHost(options.sessionId);
    const toolEnvironment = createSessionToolEnvironment({
      baseTools: options.tools,
      workingDir: process.env.TERMINAL_CWD ?? process.cwd(),
      harnessBuiltins: true,
      harnessHost,
    });
    const harnessSessionPromise = (async () => {
      const ctx = createAriaHarnessContext({
        id: options.sessionId,
        host: harnessHost,
        cwd: toolEnvironment.workingDir,
        projectRoot: toolEnvironment.projectRoot,
      });
      const agent = await ctx.init({
        id: options.sessionId,
        model: options.modelOverride,
        environment: "default",
      });
      const session = await agent.session(options.sessionId);
      if (hydratedMessages.length > 0) {
        session.hydrateHistory(hydratedMessages);
      }
      harnessSession = session;
      return session;
    })();

    return {
      get isRunning() {
        return harnessSession?.isRunning ?? false;
      },
      abort() {
        return harnessSession?.abort() ?? false;
      },
      async *chat(userText: string) {
        const session = await harnessSessionPromise;
        toolEnvironment.newTurn();
        yield* session.chat(userText, {
          router,
          tools: toolEnvironment.tools,
          getSystemPrompt: options.getSystemPrompt,
          modelOverride: options.modelOverride,
          onToolApproval: options.onToolApproval
            ? async (toolName, toolCallId, args) => {
                const approved = await options.onToolApproval!(toolName, toolCallId, args);
                if (approved) {
                  harnessHost.rememberApprovedIntent(getRuntimeToolIntent(toolName, args));
                }
                return approved;
              }
            : undefined,
          executeTool: async ({ toolName, toolCallId, args, execute }) => {
            const dangerLevel =
              toolEnvironment.tools.find((tool) => tool.name === toolName)?.dangerLevel ??
              "dangerous";
            const intent = getRuntimeToolIntent(toolName, args);
            const requiresApproval =
              toolIntentRequiresApproval(intent) || dangerLevel === "dangerous";
            return executeToolWithCapability({
              sessionId: options.sessionId,
              toolCallId,
              toolName,
              args,
              dangerLevel,
              policyDecision: requiresApproval ? "ask" : "allow",
              approvalDecision: harnessHost.consumeCapabilityApproval(intent)
                ? "approve_once"
                : undefined,
              execute,
            });
          },
          onAskUser: options.onAskUser,
        });
      },
      getMessages() {
        return harnessSession?.getMessages() ?? hydratedMessages;
      },
      hydrateHistory(messages: readonly Message[]) {
        hydratedMessages = Array.from(messages);
        harnessSession?.hydrateHistory(messages);
      },
    };
  }

  let mainSession = sessions.getLatest("main");
  if (!mainSession) {
    mainSession = sessions.create("main", "engine");
  }

  const mainAgent = createHarnessRuntimeAgent({
    sessionId: mainSession.id,
    tools,
    getSystemPrompt: () => systemPrompt,
  });
  const notifyTool = tools.find((tool) => tool.name === "notify");

  const heartbeatMdPath = join(
    runtimeHome,
    ariaConfig.runtime.heartbeat?.checklistPath ?? "HEARTBEAT.md",
  );
  if (!existsSync(heartbeatMdPath)) {
    await writeFile(heartbeatMdPath, DEFAULT_HEARTBEAT_MD);
  }

  const scheduler = new Scheduler();
  scheduler.register(
    createHeartbeatTask(
      {
        runtimeHome,
        mainAgent,
        notify: notifyTool
          ? async (message: string) => {
              const args = { message };
              const result = await executeToolWithCapability({
                sessionId: mainSession.id,
                toolCallId: `heartbeat-notify:${crypto.randomUUID()}`,
                toolName: "notify",
                args,
                dangerLevel: notifyTool.dangerLevel,
                policyDecision: "allow",
                execute: () => notifyTool.execute(args),
              });
              if (result.isError) {
                console.warn("[heartbeat] Notify failed:", result.content);
              }
            }
          : undefined,
      },
      null,
      ariaConfig.runtime.heartbeat,
    ),
  );

  const cronTasks = ariaConfig.runtime.automation?.cronTasks ?? [];
  const webhookTasks = ariaConfig.runtime.automation?.webhookTasks ?? [];

  runtime = {
    config,
    router,
    memory,
    store,
    archive,
    checkpoints,
    mcp,
    tools,
    promptEngine,
    systemPrompt,
    sessions,
    auth,
    skills,
    scheduler,
    transcriber,
    audit,
    securityMode,
    projects,
    handoffs,
    kernel,
    agentName: ariaConfig.identity.name,
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
      const result = await kernel.commands.execute<{ runId: string }>({
        type: "runtime.run.start",
        payload: { ...request, runId, startedAt: Date.now() },
        idempotencyKey: `runtime.run.start:${runId}`,
      });
      return result.runId;
    },
    async finishRun(request) {
      await kernel.commands.execute({
        type: "runtime.run.finish",
        payload: request,
        idempotencyKey: `runtime.run.finish:${request.runId}:${request.status}:${request.completedAt ?? ""}`,
      });
    },
    async recordApprovalPending(request) {
      await kernel.commands.execute({
        type: "runtime.approval.pending",
        payload: request,
        idempotencyKey: `runtime.approval.pending:${request.approvalId}`,
      });
    },
    async resolveApproval(request) {
      await kernel.commands.execute({
        type: "runtime.approval.resolve",
        payload: request,
        idempotencyKey: `runtime.approval.resolve:${request.approvalId}:${request.status}:${request.resolvedAt ?? ""}`,
      });
    },
    async listApprovals(request) {
      return kernel.queries.execute({
        type: "runtime.approvals.list",
        payload: request,
      });
    },
    async recordToolCallStart(request) {
      await kernel.commands.execute({
        type: "runtime.tool_call.start",
        payload: request,
        idempotencyKey: `runtime.tool_call.start:${request.toolCallId}`,
      });
    },
    async recordToolCallEnd(request) {
      await kernel.commands.execute({
        type: "runtime.tool_call.end",
        payload: request,
        idempotencyKey: `runtime.tool_call.end:${request.toolCallId}:${request.status}:${request.endedAt ?? ""}`,
      });
    },
    async appendRunEvent(request) {
      return kernel.commands.execute({
        type: "runtime.run_event.append",
        payload: request,
      });
    },
    async getPromptCache(cacheKey) {
      return kernel.queries.execute({
        type: "runtime.prompt_cache.get",
        payload: cacheKey,
      });
    },
    async putPromptCache(request) {
      await kernel.commands.execute({
        type: "runtime.prompt_cache.put",
        payload: request,
        idempotencyKey: `runtime.prompt_cache.put:${request.cacheKey}:${request.updatedAt ?? ""}`,
      });
    },
    async syncSessionMessages(request) {
      await kernel.commands.execute({
        type: "runtime.session_messages.sync",
        payload: request,
      });
    },
    async getSessionMessages(sessionId) {
      return kernel.queries.execute({
        type: "runtime.session_messages.get",
        payload: sessionId,
      });
    },
    async upsertAutomationTask(request) {
      await kernel.commands.execute({
        type: "runtime.automation_task.upsert",
        payload: request,
        idempotencyKey: `runtime.automation_task.upsert:${request.taskId}:${request.updatedAt ?? ""}`,
      });
    },
    async getAutomationTaskByName(taskType, name) {
      return kernel.queries.execute({
        type: "runtime.automation_task.get_by_name",
        payload: { taskType, name },
      });
    },
    async getAutomationTaskBySlug(slug) {
      return kernel.queries.execute({
        type: "runtime.automation_task.get_by_slug",
        payload: slug,
      });
    },
    async deleteAutomationTask(taskId) {
      return kernel.commands.execute({
        type: "runtime.automation_task.delete",
        payload: taskId,
      });
    },
    async listAutomationTasks(taskType) {
      return kernel.queries.execute({
        type: "runtime.automation_tasks.list",
        payload: taskType,
      });
    },
    async recordAutomationRunStart(request) {
      await kernel.commands.execute({
        type: "runtime.automation_run.start",
        payload: request,
        idempotencyKey: `runtime.automation_run.start:${request.taskRunId}`,
      });
    },
    async finishAutomationRun(request) {
      await kernel.commands.execute({
        type: "runtime.automation_run.finish",
        payload: request,
        idempotencyKey: `runtime.automation_run.finish:${request.taskRunId}:${request.status}:${request.completedAt ?? ""}`,
      });
    },
    async recordAutomationDelivery(request) {
      await kernel.commands.execute({
        type: "runtime.automation_delivery.record",
        payload: request,
        idempotencyKey: `runtime.automation_delivery.record:${request.taskRunId}:${request.deliveryStatus}:${request.deliveryAttemptedAt ?? ""}`,
      });
    },
    async listAutomationRuns(taskId, limit) {
      return kernel.queries.execute({
        type: "runtime.automation_runs.list",
        payload: { taskId, limit },
      });
    },
    listToolsets() {
      return listToolsets(runtime.tools);
    },
    executeToolWithCapability,
    async refreshSystemPrompt(): Promise<string> {
      systemPrompt = await promptEngine.buildBasePrompt(true);
      runtime.systemPrompt = systemPrompt;
      return systemPrompt;
    },
    async close(): Promise<void> {
      scheduler.stop();
      await mcp.close();
      handoffs.close();
      kernel.close();
      projects.close();
      archive.close();
      store.close();
      memory.close();
      await auth.cleanup();
    },
    createAgent(
      onToolApproval?: ToolApprovalCallback,
      modelOverride?: string,
      allowedTools?: string[],
      onAskUser?: AskUserCallback,
    ): RuntimeAgentSession {
      const agentTools = allowedTools
        ? tools.filter((tool) => allowedTools.includes(tool.name))
        : tools;
      return createHarnessRuntimeAgent({
        sessionId: `runtime-agent:${crypto.randomUUID()}`,
        tools: agentTools,
        getSystemPrompt: () => runtime.systemPrompt,
        onToolApproval,
        onAskUser,
        modelOverride,
      });
    },
  };

  const automationRegistry = new AutomationRegistry(runtime);
  automationRegistry.restoreFromRuntimeConfig();
  if (cronTasks.length > 0) {
    console.log(`[aria] Restored ${cronTasks.filter((task) => task.enabled).length} cron task(s)`);
  }
  if (webhookTasks.length > 0) {
    console.log(
      `[aria] Restored ${webhookTasks.filter((task) => task.enabled).length} webhook task(s)`,
    );
  }

  scheduler.start();
  return runtime;
}
