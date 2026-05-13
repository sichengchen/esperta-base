import {
  ariaNodeRuntimeApp,
  startAriaNodeRuntime,
  type AriaNodeRuntimeApp,
  type StartAriaNodeRuntimeOptions,
} from "@aria/node-runtime";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";
import { CLI_NAME, PRODUCT_NAME, RUNTIME_NAME } from "@aria/node-host/brand";
import { getRuntimeDiscoveryPaths, type RuntimeDiscoveryPaths } from "@aria/node-host/discovery";
import { ARIA_NODE_DAEMON_COMMAND, spawnAriaNodeDaemonHost } from "@aria/node-host/process";

export * from "@aria/node-runtime";
export * from "@aria/node-host/process";

export const ariaNodeHost = {
  id: "aria-node",
  packageName: "aria-node",
  displayName: PRODUCT_NAME,
  surface: "node-runtime",
  shellPackage: "@aria/node-runtime",
  sharedPackages: ["@aria/node-runtime", "@aria/node-host", "@aria/gateway"],
  capabilities: ariaNodeRuntimeApp.capabilities,
  ownership: ariaNodeRuntimeApp.ownership,
  command: CLI_NAME,
} as const;

export interface AriaNodeHostBootstrap {
  host: typeof ariaNodeHost;
  discoveryPaths: RuntimeDiscoveryPaths;
  start(options?: StartAriaNodeRuntimeOptions): Promise<AriaNodeRuntimeApp>;
}

export function createAriaNodeHostBootstrap(runtimeHome?: string): AriaNodeHostBootstrap {
  return {
    host: ariaNodeHost,
    discoveryPaths: getRuntimeDiscoveryPaths(runtimeHome),
    start(options) {
      return startAriaNodeRuntime(options);
    },
  };
}

export interface AriaNodeDaemonHostBootstrap extends AriaNodeHostBootstrap {
  hiddenCommand: typeof ARIA_NODE_DAEMON_COMMAND;
}

export function createAriaNodeDaemonHostBootstrap(
  runtimeHome?: string,
): AriaNodeDaemonHostBootstrap {
  return {
    ...createAriaNodeHostBootstrap(runtimeHome),
    hiddenCommand: ARIA_NODE_DAEMON_COMMAND,
  };
}

export interface RunAriaNodeHostOptions extends StartAriaNodeRuntimeOptions {
  runtimeHome?: string;
}

export function runAriaNodeHost(options: RunAriaNodeHostOptions = {}): Promise<AriaNodeRuntimeApp> {
  const { runtimeHome, ...runtimeOptions } = options;
  return createAriaNodeHostBootstrap(runtimeHome).start(runtimeOptions);
}

export async function runAriaNodeDaemonHost(options: RunAriaNodeHostOptions = {}): Promise<void> {
  const { runtimeHome } = options;
  const bootstrap = createAriaNodeDaemonHostBootstrap(runtimeHome);
  const { pidFile, urlFile, logFile, restartMarkerFile } = bootstrap.discoveryPaths;
  const port = process.env.ARIA_ENGINE_PORT
    ? parseInt(process.env.ARIA_ENGINE_PORT, 10)
    : undefined;

  console.log(`${RUNTIME_NAME} bootstrapping...`);
  const app = await bootstrap.start({ ...options, port });

  const httpUrl = `http://127.0.0.1:${app.server.port}`;
  writeFileSync(pidFile, String(process.pid));
  writeFileSync(urlFile, httpUrl);

  function shutdown() {
    console.log(`\n${RUNTIME_NAME} shutting down...`);
    const shouldRestart = existsSync(restartMarkerFile);
    if (shouldRestart) {
      try {
        unlinkSync(restartMarkerFile);
      } catch {}
    }
    try {
      unlinkSync(pidFile);
    } catch {}
    try {
      unlinkSync(urlFile);
    } catch {}

    const forceTimer = setTimeout(() => process.exit(1), 5000);
    app.stop().then(
      () => {
        clearTimeout(forceTimer);
        if (shouldRestart) {
          const child = spawnAriaNodeDaemonHost({
            runtimeHome: bootstrap.discoveryPaths.runtimeHome,
            logFile,
          });
          console.log(`${RUNTIME_NAME} restarting (new PID: ${child.pid})...`);
        }
        process.exit(0);
      },
      () => {
        clearTimeout(forceTimer);
        process.exit(1);
      },
    );
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
