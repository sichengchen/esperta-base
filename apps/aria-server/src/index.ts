import {
  ariaNodeHost,
  createAriaNodeDaemonHostBootstrap,
  createAriaNodeHostBootstrap,
  runAriaNodeDaemonHost,
  runAriaNodeHost,
  type AriaNodeDaemonHostBootstrap,
  type AriaNodeHostBootstrap,
  type RunAriaNodeHostOptions,
} from "aria-node";
import { ARIA_SERVER_DAEMON_COMMAND, spawnAriaServerDaemonHost } from "./process.js";

export * from "@aria/node-runtime";
export * from "./process.js";

export const ariaServerHost = {
  ...ariaNodeHost,
  id: "aria-server",
  packageName: "aria-server",
  shellPackage: "@aria/node-runtime",
  sharedPackages: ["@aria/node-runtime", "@aria/node-host", "@aria/gateway"],
} as const;

export interface AriaServerHostBootstrap extends Omit<AriaNodeHostBootstrap, "host"> {
  host: typeof ariaServerHost;
}

export function createAriaServerHostBootstrap(runtimeHome?: string): AriaServerHostBootstrap {
  return {
    ...createAriaNodeHostBootstrap(runtimeHome),
    host: ariaServerHost,
  };
}

export interface AriaServerDaemonHostBootstrap extends Omit<
  AriaNodeDaemonHostBootstrap,
  "host" | "hiddenCommand"
> {
  host: typeof ariaServerHost;
  hiddenCommand: typeof ARIA_SERVER_DAEMON_COMMAND;
}

export function createAriaServerDaemonHostBootstrap(
  runtimeHome?: string,
): AriaServerDaemonHostBootstrap {
  return {
    ...createAriaNodeDaemonHostBootstrap(runtimeHome),
    host: ariaServerHost,
    hiddenCommand: ARIA_SERVER_DAEMON_COMMAND,
  };
}

export type RunAriaServerHostOptions = RunAriaNodeHostOptions;

export function runAriaServerHost(options: RunAriaServerHostOptions = {}) {
  return runAriaNodeHost(options);
}

export function runAriaServerDaemonHost(options: RunAriaServerHostOptions = {}) {
  return runAriaNodeDaemonHost(options);
}

export { ARIA_SERVER_DAEMON_COMMAND, spawnAriaServerDaemonHost };
