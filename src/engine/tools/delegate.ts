/**
 * `delegate` tool — spawns a synchronous sub-agent to handle a task.
 */

import { Type } from "@sinclair/typebox";
import type { ToolImpl } from "../agent/types.js";
import type { ModelRouter } from "../router/index.js";
import { SubAgent } from "../agent/sub-agent.js";

export interface DelegateToolDeps {
  router: ModelRouter;
  tools: ToolImpl[];
  /** Default timeout in ms (from config, default: 120_000) */
  defaultTimeoutMs?: number;
}

export function createDelegateTool(deps: DelegateToolDeps): ToolImpl {
  return {
    name: "delegate",
    description: "Delegate a task to a sub-agent that runs to completion and returns the result. Use for parallel-friendly subtasks like research, data gathering, or file analysis. Sub-agents have limited tools (no delegate — no recursion).",
    dangerLevel: "moderate",
    parameters: Type.Object({
      task: Type.String({ description: "The task instruction for the sub-agent" }),
      model: Type.Optional(Type.String({ description: "Model override (default: eco tier)" })),
      tools: Type.Optional(Type.Array(Type.String(), { description: "Tool name allowlist (default: all non-delegate tools)" })),
    }),
    async execute(args: Record<string, unknown>) {
      const task = args.task as string;
      const model = args.model as string | undefined;
      const tools = args.tools as string[] | undefined;

      if (!task) {
        return { content: "Error: task parameter is required", isError: true };
      }

      const subAgentId = `subagent:${crypto.randomUUID()}`;

      const subAgent = new SubAgent(deps.router, deps.tools, {
        id: subAgentId,
        task,
        modelOverride: model,
        tools,
        timeoutMs: deps.defaultTimeoutMs,
      });

      const result = await subAgent.run(task);

      // Format result as structured content
      const lines: string[] = [];
      lines.push(`## Sub-agent result (${result.status})`);
      if (result.error) {
        lines.push(`**Error:** ${result.error}`);
      }
      if (result.output) {
        lines.push(result.output);
      }
      if (result.toolCalls.length > 0) {
        lines.push(`\n**Tool calls:** ${result.toolCalls.map((tc) => tc.name).join(", ")}`);
      }

      return {
        content: lines.join("\n"),
        isError: result.status === "error",
      };
    },
  };
}
