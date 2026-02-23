import { Type } from "@mariozechner/pi-ai";
import type { ToolImpl } from "../agent/types.js";
import type { MemoryManager } from "../memory/index.js";

export function createMemoryWriteTool(memory: MemoryManager): ToolImpl {
  return {
    name: "memory_write",
    description:
      "Write to persistent memory. With a key: saves/updates a topic file. Without a key: appends to today's journal.",
    summary:
      "Write to persistent memory — topic files (with key) or daily journal (without key).",
    dangerLevel: "safe",
    parameters: Type.Object({
      content: Type.String({
        description: "The content to write",
      }),
      key: Type.Optional(
        Type.String({
          description:
            "Topic key (e.g. 'user-preferences', 'project-context'). Omit to append to today's journal.",
        }),
      ),
      type: Type.Optional(
        Type.Union([Type.Literal("topic"), Type.Literal("journal")], {
          description:
            'Write target: "topic" (default if key provided) or "journal" (default if no key)',
        }),
      ),
    }),
    async execute(args) {
      const content = args.content as string;
      const key = args.key as string | undefined;
      const writeType = (args.type as string | undefined) ?? (key ? "topic" : "journal");

      try {
        if (writeType === "journal" || !key) {
          await memory.appendJournal(content);
          const date = new Date().toISOString().slice(0, 10);
          return { content: `Appended to journal: ${date}` };
        }
        await memory.save(key, content);
        return { content: `Saved memory: ${key}` };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: `Error writing memory: ${msg}`, isError: true };
      }
    },
  };
}
