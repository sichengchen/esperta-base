import { describe, expect, test } from "bun:test";
import {
  CLI_NAME,
  PRODUCT_NAME,
  engineCommand,
  ensureEngine,
  getRuntimeDiscoveryPaths,
  startAriaNodeRuntime,
} from "@aria/server";
import {
  ARIA_NODE_DAEMON_COMMAND,
  ariaNodeHost,
  createAriaNodeDaemonHostBootstrap,
  createAriaNodeHostBootstrap,
  resolveAriaNodeDaemonProcessSpec,
  runAriaNodeDaemonHost,
  runAriaNodeHost,
} from "aria-node";
import type { EngineServer } from "@aria/gateway/server";
import type { EngineRuntime } from "@aria/node-runtime/runtime";

describe("node host surface", () => {
  test("starts and stops the node runtime through the public package boundary", async () => {
    const calls: string[] = [];
    let stopCalls = 0;
    let connectorStopCalls = 0;

    const runtime = {
      close: async () => {
        calls.push("runtime.close");
      },
    } as EngineRuntime;

    const server = {
      port: 7420,
      stop: async () => {
        stopCalls += 1;
      },
    } satisfies EngineServer;

    const app = await startAriaNodeRuntime({
      port: 9001,
      hostname: "0.0.0.0",
      factories: {
        async createRuntime() {
          calls.push("createRuntime");
          return runtime;
        },
        async startServer(receivedRuntime, options) {
          calls.push(`startServer:${options?.hostname}:${options?.port}`);
          expect(receivedRuntime).toBe(runtime);
          return server;
        },
        async startConnectors() {
          calls.push("startConnectors");
          return {
            handles: [],
            async stop() {
              connectorStopCalls += 1;
            },
          };
        },
      },
    });

    expect(app.runtime).toBe(runtime);
    expect(app.server).toBe(server);
    expect(calls).toEqual(["createRuntime", "startServer:0.0.0.0:9001", "startConnectors"]);

    await app.stop();
    expect(connectorStopCalls).toBe(1);
    expect(stopCalls).toBe(1);
  });

  test("exposes a thin app wrapper over the node package shell", async () => {
    const bootstrap = createAriaNodeHostBootstrap("/tmp/aria-node-app");

    expect(bootstrap.host).toEqual(ariaNodeHost);
    expect(bootstrap.host).toMatchObject({
      shellPackage: "@aria/node-runtime",
      command: "aria",
      displayName: PRODUCT_NAME,
    });
    expect(bootstrap.host.sharedPackages).toEqual([
      "@aria/node-runtime",
      "@aria/node-host",
      "@aria/gateway",
    ]);
    expect(bootstrap.discoveryPaths).toEqual(getRuntimeDiscoveryPaths("/tmp/aria-node-app"));

    const runtime = { close: async () => {} } as EngineRuntime;
    const server = { port: 7420, stop: async () => {} } satisfies EngineServer;
    const app = await bootstrap.start({
      factories: {
        async createRuntime() {
          return runtime;
        },
        async startServer() {
          return server;
        },
        async startConnectors() {
          return {
            handles: [],
            async stop() {},
          };
        },
      },
    });

    expect(app.runtime).toBe(runtime);
    expect(app.server).toBe(server);
  });

  test("keeps public server command metadata stable", () => {
    expect(typeof ensureEngine).toBe("function");
    expect(typeof engineCommand).toBe("function");
    expect(CLI_NAME).toBe("aria");
    expect(PRODUCT_NAME).toBe("Esperta Aria");
  });

  test("runs the thin app wrapper through the host bootstrap", async () => {
    const runtime = { close: async () => {} } as EngineRuntime;
    const server = { port: 8123, stop: async () => {} } satisfies EngineServer;

    const app = await runAriaNodeHost({
      runtimeHome: "/tmp/aria-node-app",
      port: 8123,
      factories: {
        async createRuntime() {
          return runtime;
        },
        async startServer(receivedRuntime, options) {
          expect(receivedRuntime).toBe(runtime);
          expect(options?.port).toBe(8123);
          return server;
        },
        async startConnectors() {
          return {
            handles: [],
            async stop() {},
          };
        },
      },
    });

    expect(app.runtime).toBe(runtime);
    expect(app.server).toBe(server);
  });

  test("exposes a daemon-host bootstrap over the app wrapper", () => {
    const bootstrap = createAriaNodeDaemonHostBootstrap("/tmp/aria-node-app");
    expect(bootstrap.host).toBe(ariaNodeHost);
    expect(bootstrap.hiddenCommand).toBe(ARIA_NODE_DAEMON_COMMAND);
    expect(bootstrap.discoveryPaths).toEqual(getRuntimeDiscoveryPaths("/tmp/aria-node-app"));
    expect(typeof runAriaNodeDaemonHost).toBe("function");
  });

  test("stops the server if connector auto-start fails after gateway boot", async () => {
    let serverStopCalls = 0;
    let runtimeCloseCalls = 0;

    const runtime = {
      close: async () => {
        runtimeCloseCalls += 1;
      },
    } as EngineRuntime;

    const server = {
      port: 7420,
      stop: async () => {
        serverStopCalls += 1;
      },
    } satisfies EngineServer;

    await expect(
      startAriaNodeRuntime({
        factories: {
          async createRuntime() {
            return runtime;
          },
          async startServer() {
            return server;
          },
          async startConnectors() {
            throw new Error("connector boom");
          },
        },
      }),
    ).rejects.toThrow("connector boom");

    expect(serverStopCalls).toBe(1);
    expect(runtimeCloseCalls).toBe(0);
  });

  test("resolves an app-owned daemon process spec before falling back to the CLI host command", () => {
    expect(
      resolveAriaNodeDaemonProcessSpec({
        execPath: "/usr/local/bin/bun",
        cliEntrypoint: "/tmp/aria-cli.mjs",
        appEntrypoint: "/Users/sichengchen/src/esperta-aria/apps/aria-node/src/main.ts",
      }),
    ).toEqual({
      executable: "/usr/local/bin/bun",
      args: ["/Users/sichengchen/src/esperta-aria/apps/aria-node/src/main.ts"],
      mode: "app_entry",
    });

    expect(
      resolveAriaNodeDaemonProcessSpec({
        execPath: "/usr/local/bin/bun",
        cliEntrypoint: "/tmp/aria-cli.mjs",
        appEntrypoint: "/tmp/missing-aria-node-main.ts",
      }),
    ).toEqual({
      executable: "/usr/local/bin/bun",
      args: ["/tmp/aria-cli.mjs", ARIA_NODE_DAEMON_COMMAND],
      mode: "cli_hidden_command",
    });
  });

  test("uses an explicit node main entry from the environment before CLI fallback", () => {
    expect(
      resolveAriaNodeDaemonProcessSpec({
        execPath: "/Applications/Aria Desktop.app/Contents/MacOS/Electron",
        cliEntrypoint: "/tmp/aria-cli.mjs",
        env: {
          ARIA_NODE_MAIN_ENTRY: "/Users/sichengchen/src/esperta-aria/apps/aria-node/src/main.ts",
          npm_execpath: "/opt/homebrew/bin/bun",
        },
      }),
    ).toEqual({
      executable: "/opt/homebrew/bin/bun",
      args: ["/Users/sichengchen/src/esperta-aria/apps/aria-node/src/main.ts"],
      mode: "app_entry",
    });
  });

  test("does not use Electron as the node daemon executable", () => {
    expect(
      resolveAriaNodeDaemonProcessSpec({
        execPath: "/Applications/Aria Desktop.app/Contents/MacOS/Electron",
        cliEntrypoint: "/tmp/aria-cli.mjs",
        appEntrypoint: "/Users/sichengchen/src/esperta-aria/apps/aria-node/src/main.ts",
        env: { npm_execpath: "/opt/homebrew/bin/bun" },
      }),
    ).toEqual({
      executable: "/opt/homebrew/bin/bun",
      args: ["/Users/sichengchen/src/esperta-aria/apps/aria-node/src/main.ts"],
      mode: "app_entry",
    });

    expect(
      resolveAriaNodeDaemonProcessSpec({
        execPath: "/Applications/Aria Desktop.app/Contents/MacOS/Electron",
        cliEntrypoint: "/tmp/aria-cli.mjs",
        appEntrypoint: "/tmp/missing-aria-node-main.ts",
        env: { npm_execpath: "/opt/homebrew/bin/bun" },
      }),
    ).toEqual({
      executable: "/opt/homebrew/bin/bun",
      args: ["/tmp/aria-cli.mjs", ARIA_NODE_DAEMON_COMMAND],
      mode: "cli_hidden_command",
    });
  });
});
