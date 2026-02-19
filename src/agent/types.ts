import type { TSchema } from "@sinclair/typebox";
import type { ModelRouter } from "../router/index.js";

/** A tool implementation that the agent can invoke */
export interface ToolImpl<TParams extends TSchema = TSchema> {
  name: string;
  description: string;
  parameters: TParams;
  execute: (args: Record<string, unknown>) => Promise<ToolResult>;
}

export interface ToolResult {
  content: string;
  isError?: boolean;
}

export interface AgentOptions {
  router: ModelRouter;
  tools?: ToolImpl[];
  systemPrompt?: string;
  maxToolRounds?: number;
}

/** Events emitted by the agent during streaming */
export type AgentEvent =
  | { type: "text_delta"; delta: string }
  | { type: "thinking_delta"; delta: string }
  | { type: "tool_start"; name: string; id: string }
  | { type: "tool_end"; name: string; id: string; result: ToolResult }
  | { type: "done"; stopReason: string }
  | { type: "error"; message: string };
