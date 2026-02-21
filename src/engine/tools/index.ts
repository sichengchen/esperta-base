import type { ToolImpl } from "../agent/types.js";
import { readTool } from "./read.js";
import { writeTool } from "./write.js";
import { editTool } from "./edit.js";
import { execTool } from "./exec.js";
import { execStatusTool, execKillTool } from "./exec-background.js";
import { clawHubSearchTool } from "./clawhub-search.js";
import { webFetchTool } from "./web-fetch.js";
import { webSearchTool } from "./web-search.js";
import { reactionTool } from "./reaction.js";

export { readTool } from "./read.js";
export { writeTool } from "./write.js";
export { editTool } from "./edit.js";
export { execTool } from "./exec.js";
export { execStatusTool, execKillTool } from "./exec-background.js";
/** @deprecated Use execTool instead */
export { bashTool } from "./bash.js";
export { clawHubSearchTool } from "./clawhub-search.js";
export { webFetchTool } from "./web-fetch.js";
export { webSearchTool } from "./web-search.js";
export { reactionTool } from "./reaction.js";
export { createClawHubInstallTool } from "./clawhub-install.js";
export { createClawHubUpdateTool } from "./clawhub-update.js";
export { createSetApiKeyTool } from "./set-api-key.js";

export function getBuiltinTools(): ToolImpl[] {
  return [readTool, writeTool, editTool, execTool, execStatusTool, execKillTool, webFetchTool, webSearchTool, reactionTool, clawHubSearchTool];
}

export function formatToolsSection(tools: ToolImpl[]): string {
  const lines = tools.map((t) => `- ${t.name}: ${t.summary ?? t.description}`);
  return `## Available Tools\n${lines.join("\n")}`;
}
