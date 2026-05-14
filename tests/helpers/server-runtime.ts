import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { join } from "node:path";
import { Agent } from "@aria/agent";
import { AutomationRegistry, Scheduler, createHeartbeatTask } from "@aria/automation";
import { AuditLogger } from "@aria/audit";
import { AuthManager } from "@aria/gateway/auth";
import { ModelRouter } from "@aria/gateway/router";
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
import type { KnownProvider } from "@mariozechner/pi-ai";

const allocatedGatewayPorts = new Set<number>();
const MIN_TEST_GATEWAY_PORT = 49_152;
const MAX_TEST_GATEWAY_PORT = 60_998;

async function bindPort(port: number): Promise<ReturnType<typeof createServer> | null> {
  return await new Promise((resolve) => {
    const server = createServer();
    server.unref();
    server.once("error", () => resolve(null));
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

export async function getAvailableGatewayPortPair(): Promise<number> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate =
      MIN_TEST_GATEWAY_PORT +
      Math.floor(Math.random() * ((MAX_TEST_GATEWAY_PORT - MIN_TEST_GATEWAY_PORT) / 2)) * 2;
    if (allocatedGatewayPorts.has(candidate) || allocatedGatewayPorts.has(candidate + 1)) {
      continue;
    }

    const httpServer = await bindPort(candidate);
    if (!httpServer) continue;
    const wsServer = await bindPort(candidate + 1);
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    if (!wsServer) continue;
    await new Promise<void>((resolve) => wsServer.close(() => resolve()));

    allocatedGatewayPorts.add(candidate);
    allocatedGatewayPorts.add(candidate + 1);
    return candidate;
  }

  throw new Error("Unable to find an available adjacent HTTP/WS port pair");
}

export interface CreateTestRuntimeOptions {
  preserveFiles?: boolean;
}

export async function createTestRuntime(
  runtimeHome: string,
  options: CreateTestRuntimeOptions = {},
): Promise<EngineRuntime> {
  await mkdir(join(runtimeHome, "memory"), { recursive: true });
  if (!options.preserveFiles) {
    await writeFile(
      join(runtimeHome, "IDENTITY.md"),
      "# Test Agent\n\n## Personality\nTest\n\n## System Prompt\nYou are a test agent.\n",
    );
    await writeFile(
      join(runtimeHome, "config.json"),
      JSON.stringify({
        version: 3,
        runtime: {
          activeModel: "test-model",
          telegramBotTokenEnvVar: "TEST_BOT_TOKEN",
          memory: { enabled: true, directory: "memory" },
        },
        providers: [{ id: "anthropic", type: "anthropic", apiKeyEnvVar: "TEST_API_KEY" }],
        models: [
          {
            name: "test-model",
            provider: "anthropic",
            model: "claude-sonnet-4-5-20250514",
            temperature: 0.7,
            maxTokens: 1024,
          },
        ],
        defaultModel: "test-model",
      }),
    );
  }

  process.env.TEST_API_KEY = "test-key-for-router-init";

  const config = new ConfigManager(runtimeHome);
  await config.load();

  const router = ModelRouter.fromConfig(
    {
      providers: [
        {
          id: "anthropic",
          type: "anthropic" as KnownProvider,
          apiKeyEnvVar: "TEST_API_KEY",
        },
      ],
      models: [
        {
          name: "test-model",
          provider: "anthropic",
          model: "claude-sonnet-4-5-20250514",
          temperature: 0.7,
        },
      ],
      defaultModel: "test-model",
    },
    null,
  );

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

  const mainSession = sessions.create("main", "engine");
  const skills = new SkillRegistry();
  const scheduler = new Scheduler();
  scheduler.register(createHeartbeatTask(runtimeHome, null));

  const runtime: EngineRuntime = {
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
    tools: [],
    promptEngine: {
      buildBasePrompt: async () => "Test agent.",
      buildSessionPrompt: async () => "Test agent.",
    } as any,
    systemPrompt: "Test agent.",
    sessions,
    auth,
    skills,
    scheduler,
    transcriber: { transcribe: async () => "", backend: null } as any,
    audit: new AuditLogger(runtimeHome),
    securityMode: new SecurityModeManager(),
    agentName: "Test",
    mainSessionId: mainSession.id,
    createSessionTitleTool,
    createSessionToolEnvironment,
    listToolsets: () => listToolsets([]),
    executeToolWithCapability: async (request) => request.execute(),
    async refreshSystemPrompt() {
      return "Test agent.";
    },
    async close() {
      scheduler.stop();
      store.close();
      archive.close();
      await auth.cleanup();
    },
    createAgent(_onToolApproval?: any, modelOverride?: string) {
      return new Agent({
        router,
        tools: [],
        getSystemPrompt: () => "Test",
        modelOverride,
      });
    },
  };
  new AutomationRegistry(runtime).restoreFromRuntimeConfig();
  return runtime;
}
