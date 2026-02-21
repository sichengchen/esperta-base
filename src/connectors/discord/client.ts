import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { createEngineClient } from "@sa/shared/client.js";
import { AuthManager } from "@sa/engine/auth.js";

const DEFAULT_HTTP_PORT = 7420;

function readEngineUrl(): string {
  const saHome = process.env.SA_HOME ?? join(homedir(), ".sa");
  const urlFile = join(saHome, "engine.url");
  if (existsSync(urlFile)) {
    return readFileSync(urlFile, "utf-8").trim();
  }
  return `http://127.0.0.1:${DEFAULT_HTTP_PORT}`;
}

/** Create a tRPC client for Discord Connector */
export function createDiscordClient() {
  const httpUrl = readEngineUrl();
  const url = new URL(httpUrl);
  const wsPort = parseInt(url.port, 10) + 1;
  const wsUrl = `ws://${url.hostname}:${wsPort}`;
  const token = AuthManager.readTokenFromFile() ?? undefined;

  return createEngineClient({ httpUrl, wsUrl, token });
}
