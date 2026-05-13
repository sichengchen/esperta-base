import { startServer, type EngineServer, type EngineServerOptions } from "@aria/gateway/server";
import { startConfiguredConnectors, type ServerConnectorRuntime } from "@aria/server/connectors";
import { createRuntime, type EngineRuntime } from "./runtime.js";
import { CLI_NAME, PRODUCT_NAME, RUNTIME_NAME, getRuntimeHome } from "@aria/node-host/brand";
import { getRuntimeDiscoveryPaths, type RuntimeDiscoveryPaths } from "@aria/node-host/discovery";

export interface AriaNodeRuntimeFactories {
  createRuntime?: () => Promise<EngineRuntime>;
  startServer?: (runtime: EngineRuntime, options?: EngineServerOptions) => Promise<EngineServer>;
  startConnectors?: () => Promise<ServerConnectorRuntime>;
}

export interface StartAriaNodeRuntimeOptions extends EngineServerOptions {
  factories?: AriaNodeRuntimeFactories;
}

export interface AriaNodeRuntimeApp {
  runtime: EngineRuntime;
  server: EngineServer;
  stop(): Promise<void>;
}

export const ariaNodeRuntimeApp = {
  id: "aria-node-runtime",
  displayName: PRODUCT_NAME,
  runtimeName: RUNTIME_NAME,
  cliName: CLI_NAME,
  surface: "node-runtime",
  sharedPackages: ["@aria/node-runtime", "@aria/gateway"],
  capabilities: [
    "aria-agent-host",
    "gateway-api",
    "project-control",
    "remote-job-orchestration",
    "memory",
    "automation",
    "connectors",
    "approvals",
    "audit",
  ],
  ownership: {
    ariaAgent: "node-owned",
    assistantState: "node-owned",
    memory: "node-owned",
    automation: "node-owned",
    connectors: "node-owned",
    inboxApprovals: "node-owned",
    remoteJobs: "node-owned",
    projectLocalExecution: "configured-provider",
  },
} as const;

export interface AriaNodeRuntimeBootstrap {
  app: typeof ariaNodeRuntimeApp;
  runtimeHome: string;
  discovery: RuntimeDiscoveryPaths;
  hostname?: string;
  port?: number;
}

export interface CreateAriaNodeRuntimeBootstrapOptions extends Pick<
  EngineServerOptions,
  "hostname" | "port"
> {
  runtimeHome?: string;
}

export function createAriaNodeRuntimeBootstrap(
  options: CreateAriaNodeRuntimeBootstrapOptions = {},
): AriaNodeRuntimeBootstrap {
  const runtimeHome = options.runtimeHome ?? getRuntimeHome();
  return {
    app: ariaNodeRuntimeApp,
    runtimeHome,
    discovery: getRuntimeDiscoveryPaths(runtimeHome),
    hostname: options.hostname,
    port: options.port,
  };
}

export async function startAriaNodeRuntime(
  options: StartAriaNodeRuntimeOptions = {},
): Promise<AriaNodeRuntimeApp> {
  const { factories, ...serverOptions } = options;
  const createRuntimeImpl = factories?.createRuntime ?? createRuntime;
  const startServerImpl = factories?.startServer ?? startServer;
  const startConnectorsImpl = factories?.startConnectors ?? startConfiguredConnectors;
  const runtime = await createRuntimeImpl();
  let server: EngineServer | null = null;

  try {
    server = await startServerImpl(runtime, serverOptions);
    const activeServer = server;
    const connectors = await startConnectorsImpl();
    return {
      runtime,
      server: activeServer,
      async stop(): Promise<void> {
        await connectors.stop();
        await activeServer.stop();
      },
    };
  } catch (error) {
    if (server) {
      await server.stop();
    } else {
      await runtime.close();
    }
    throw error;
  }
}

export type AriaServerFactories = AriaNodeRuntimeFactories;
export type StartAriaServerOptions = StartAriaNodeRuntimeOptions;
export type AriaServerApp = AriaNodeRuntimeApp;
export type AriaServerBootstrap = AriaNodeRuntimeBootstrap;
export type CreateAriaServerBootstrapOptions = CreateAriaNodeRuntimeBootstrapOptions;

export const ariaServerApp = ariaNodeRuntimeApp;
export const createAriaServerBootstrap = createAriaNodeRuntimeBootstrap;
export const startAriaServer = startAriaNodeRuntime;
