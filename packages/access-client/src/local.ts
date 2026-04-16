import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createEngineClient, type ClientOptions } from "./client.js";

const DEFAULT_LOCAL_HTTP_PORT = 7420;
const DEFAULT_RUNTIME_HOME_DIR = ".aria";
const RUNTIME_HOME_ENV_VAR = "ARIA_HOME";

function resolveLocalRuntimeHome(runtimeHome?: string): string {
  return (
    runtimeHome ?? process.env[RUNTIME_HOME_ENV_VAR] ?? join(homedir(), DEFAULT_RUNTIME_HOME_DIR)
  );
}

export function buildLocalAccessClientOptions(runtimeHome?: string): ClientOptions {
  const resolvedRuntimeHome = resolveLocalRuntimeHome(runtimeHome);
  const urlFile = join(resolvedRuntimeHome, "engine.url");
  const httpUrl = existsSync(urlFile)
    ? readFileSync(urlFile, "utf-8").trim()
    : `http://127.0.0.1:${DEFAULT_LOCAL_HTTP_PORT}`;
  const url = new URL(httpUrl);
  const wsPort = parseInt(url.port, 10) + 1;
  const wsUrl = `ws://${url.hostname}:${wsPort}`;
  const tokenPath = join(resolvedRuntimeHome, "engine.token");
  const token = existsSync(tokenPath) ? readFileSync(tokenPath, "utf-8").trim() : undefined;

  return {
    httpUrl,
    wsUrl,
    token,
  };
}

export function createLocalAccessClient(runtimeHome?: string) {
  return createEngineClient(buildLocalAccessClientOptions(runtimeHome));
}
