import { Type } from "@mariozechner/pi-ai";
import type { ToolImpl } from "../agent/types.js";
import type { MemoryManager } from "../memory/index.js";

export function createMemoryDeleteTool(memory: MemoryManager): ToolImpl {
  return {
    name: "memory_delete",
    description:
      "Delete a topic memory entry by key. Only works on topic files, not journal or MEMORY.md.",
    summary:
      "Delete a memory topic by key. Cannot delete journal entries or MEMORY.md.",
    dangerLevel: "safe",
    parameters: Type.Object({
      key: Type.String({
        description: "The topic key to delete (e.g. 'user-preferences')",
      }),
    }),
    async execute(args) {
      const key = args.key as string;
      try {
        const deleted = await memory.delete(key);
        if (!deleted) {
          return { content: `No memory found for key: ${key}` };
        }
        return { content: `Deleted memory: ${key}` };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: `Error deleting memory: ${msg}`, isError: true };
      }
    },
  };
}
