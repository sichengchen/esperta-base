import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, openSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { HOME_ENV_VAR } from "./brand.js";

export const ARIA_NODE_DAEMON_COMMAND = "__node_host";

const ARIA_NODE_MAIN_SOURCE_ENTRY = fileURLToPath(
  new URL("../../../apps/aria-node/src/main.ts", import.meta.url),
);
const ARIA_NODE_MAIN_ENTRY_ENV_VAR = "ARIA_NODE_MAIN_ENTRY";

export interface AriaNodeDaemonProcessSpec {
  executable: string;
  args: string[];
  mode: "app_entry" | "cli_hidden_command";
}

export interface ResolveAriaNodeDaemonProcessSpecOptions {
  execPath?: string;
  cliEntrypoint?: string;
  appEntrypoint?: string;
  env?: NodeJS.ProcessEnv;
}

export interface SpawnAriaNodeDaemonHostOptions extends ResolveAriaNodeDaemonProcessSpecOptions {
  runtimeHome: string;
  logFile: string;
  env?: NodeJS.ProcessEnv;
}

function isBunExecutable(executable: string): boolean {
  const name = basename(executable).toLowerCase();
  return name === "bun" || name === "bun.exe";
}

function isElectronExecutable(executable: string): boolean {
  return (
    Boolean(process.versions.electron) || basename(executable).toLowerCase().includes("electron")
  );
}

function resolveBunExecutable(env: NodeJS.ProcessEnv): string {
  const candidates = [env.BUN_EXECUTABLE, env.npm_execpath];
  for (const candidate of candidates) {
    if (candidate && isBunExecutable(candidate)) {
      return candidate;
    }
  }

  if (env.BUN_INSTALL) {
    const installedBun = join(
      env.BUN_INSTALL,
      "bin",
      process.platform === "win32" ? "bun.exe" : "bun",
    );
    if (existsSync(installedBun)) {
      return installedBun;
    }
  }

  return process.platform === "win32" ? "bun.exe" : "bun";
}

function resolveScriptExecutable(
  executable: string,
  scriptPath: string,
  env: NodeJS.ProcessEnv,
): string {
  if (isBunExecutable(executable)) {
    return executable;
  }

  // Electron's executable launches another app instance; the server host needs a script runtime.
  if (
    isElectronExecutable(executable) ||
    scriptPath.endsWith(".ts") ||
    scriptPath.endsWith(".tsx")
  ) {
    return resolveBunExecutable(env);
  }

  return executable;
}

function resolveDefaultAriaNodeMainEntry(env: NodeJS.ProcessEnv): string | null {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    env[ARIA_NODE_MAIN_ENTRY_ENV_VAR],
    ARIA_NODE_MAIN_SOURCE_ENTRY,
    join(moduleDir, "..", "..", "..", "aria-node", "src", "main.ts"),
    env.INIT_CWD ? join(env.INIT_CWD, "apps/aria-node/src/main.ts") : undefined,
    join(process.cwd(), "apps/aria-node/src/main.ts"),
    join(process.cwd(), "../aria-node/src/main.ts"),
  ];

  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function resolveAriaNodeDaemonProcessSpec(
  options: ResolveAriaNodeDaemonProcessSpecOptions = {},
): AriaNodeDaemonProcessSpec {
  const executable = options.execPath ?? process.execPath;
  const env = options.env ?? process.env;
  const appEntrypoint = options.appEntrypoint ?? resolveDefaultAriaNodeMainEntry(env);

  if (appEntrypoint && existsSync(appEntrypoint)) {
    return {
      executable: resolveScriptExecutable(executable, appEntrypoint, env),
      args: [appEntrypoint],
      mode: "app_entry",
    };
  }

  const cliEntrypoint = options.cliEntrypoint ?? process.argv[1];
  if (!cliEntrypoint) {
    throw new Error("Unable to resolve an Aria daemon entrypoint");
  }

  return {
    executable: resolveScriptExecutable(executable, cliEntrypoint, env),
    args: [cliEntrypoint, ARIA_NODE_DAEMON_COMMAND],
    mode: "cli_hidden_command",
  };
}

export function spawnAriaNodeDaemonHost(options: SpawnAriaNodeDaemonHostOptions): ChildProcess {
  mkdirSync(options.runtimeHome, { recursive: true });
  const logFd = openSync(options.logFile, "a");
  const processSpec = resolveAriaNodeDaemonProcessSpec(options);
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
