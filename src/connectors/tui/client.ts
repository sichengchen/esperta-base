import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { createEngineClient } from "../../shared/client.js";
import { AuthManager } from "../../engine/auth.js";

const DEFAULT_HTTP_PORT = 7420;
const DEFAULT_WS_PORT = 7421;

/** Read Engine URL from discovery file, fallback to default */
function readEngineUrl(): string {
  const saHome = process.env.SA_HOME ?? join(homedir(), ".sa");
  const urlFile = join(saHome, "engine.url");
  if (existsSync(urlFile)) {
    return readFileSync(urlFile, "utf-8").trim();
  }
  return `http://127.0.0.1:${DEFAULT_HTTP_PORT}`;
}

/** Create a tRPC client connected to the local Engine */
export function createTuiClient() {
  const httpUrl = readEngineUrl();
  // Derive WS URL from HTTP URL
  const url = new URL(httpUrl);
  const wsPort = parseInt(url.port, 10) + 1;
  const wsUrl = `ws://${url.hostname}:${wsPort}`;

  // Read auth token from file
  const token = AuthManager.readTokenFromFile() ?? undefined;

  return createEngineClient({ httpUrl, wsUrl, token });
}
