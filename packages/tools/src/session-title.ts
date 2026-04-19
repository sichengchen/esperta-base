import { Type } from "@mariozechner/pi-ai";
import type { ToolImpl } from "@aria/agent-aria";

type SessionTitleToolDeps = {
  setTitle?: (title: string) => Promise<string> | string;
};

export function createSessionTitleTool(deps: SessionTitleToolDeps = {}): ToolImpl {
  return {
    name: "set_session_title",
    description:
      "Set a durable title for the current session. Use this when the user explicitly asks to rename the conversation or when a short task label would make the session easier to find later.",
    summary:
      "Rename the current session with a short durable title for sidebars, history, and archives.",
    dangerLevel: "safe",
    parameters: Type.Object({
      title: Type.String({
        description:
          "A concise session title. Prefer 2 to 6 words that describe the task or outcome.",
      }),
    }),
    async execute(args) {
      const title = String(args.title ?? "").trim();
      if (!title) {
        return { content: "Session title cannot be empty.", isError: true };
      }
      if (!deps.setTitle) {
        return {
          content: "Session title updates are not available in this context.",
          isError: true,
        };
      }

      const savedTitle = await deps.setTitle(title);
      return { content: `Session title updated to: ${savedTitle}` };
    },
  };
}
