import { Type } from "@mariozechner/pi-ai";
import type { ToolImpl } from "../agent/types.js";
import type { MemoryManager } from "../memory/index.js";

export function createMemoryReadTool(memory: MemoryManager): ToolImpl {
  return {
    name: "memory_read",
    description:
      "Read the full content of a specific memory file by topic key or journal date.",
    summary:
      "Read a memory entry by key or journal date. Use after memory_search to get full context.",
    dangerLevel: "safe",
    parameters: Type.Object({
      key: Type.String({
        description:
          'Topic key (e.g. "user-preferences") or journal date (e.g. "2026-02-22")',
      }),
    }),
    async execute(args) {
      const key = args.key as string;

      try {
        // Check if it's a journal date (YYYY-MM-DD format)
        if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
          const content = await memory.getJournal(key);
          if (content === null) {
            return { content: `No journal entry for: ${key}` };
          }
          return { content };
        }

        // Otherwise, treat as a topic key
        const content = await memory.get(key);
        if (content === null) {
          return { content: `No memory found for key: ${key}` };
        }
        return { content };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: `Error reading memory: ${msg}`, isError: true };
      }
    },
  };
}
