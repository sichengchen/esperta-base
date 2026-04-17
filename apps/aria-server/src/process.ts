import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, openSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { HOME_ENV_VAR } from "@aria/server/brand";

export const ARIA_SERVER_DAEMON_COMMAND = "__server_host";

const ARIA_SERVER_MAIN_SOURCE_ENTRY = fileURLToPath(new URL("./main.ts", import.meta.url));

export interface AriaServerDaemonProcessSpec {
  executable: string;
  args: string[];
  mode: "app_entry" | "cli_hidden_command";
}

export interface ResolveAriaServerDaemonProcessSpecOptions {
  execPath?: string;
  cliEntrypoint?: string;
  appEntrypoint?: string;
}

export interface SpawnAriaServerDaemonHostOptions extends ResolveAriaServerDaemonProcessSpecOptions {
  runtimeHome: string;
  logFile: string;
  env?: NodeJS.ProcessEnv;
}

export function resolveAriaServerDaemonProcessSpec(
  options: ResolveAriaServerDaemonProcessSpecOptions = {},
): AriaServerDaemonProcessSpec {
  const executable = options.execPath ?? process.execPath;
  const appEntrypoint = options.appEntrypoint ?? ARIA_SERVER_MAIN_SOURCE_ENTRY;

  if (existsSync(appEntrypoint)) {
    return {
      executable,
      args: [appEntrypoint],
      mode: "app_entry",
    };
  }

  const cliEntrypoint = options.cliEntrypoint ?? process.argv[1];
  if (!cliEntrypoint) {
    throw new Error("Unable to resolve an Aria daemon entrypoint");
  }

  return {
    executable,
    args: [cliEntrypoint, ARIA_SERVER_DAEMON_COMMAND],
    mode: "cli_hidden_command",
  };
}

export function spawnAriaServerDaemonHost(options: SpawnAriaServerDaemonHostOptions): ChildProcess {
  const logFd = openSync(options.logFile, "a");
  const processSpec = resolveAriaServerDaemonProcessSpec(options);
  const child = spawn(processSpec.executable, processSpec.args, {
    detached: true,
    stdio: ["ignore", logFd, logFd],
    env: {
      ...(options.env ?? process.env),
      [HOME_ENV_VAR]: options.runtimeHome,
    },
  });

  child.unref();
  return child;
}
