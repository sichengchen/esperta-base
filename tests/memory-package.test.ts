import { describe, expect, test } from "bun:test";
import { chunkMarkdown, MemoryManager } from "../packages/memory/src/index.js";

describe("@aria/memory package entrypoints", () => {
  test("re-exports chunkMarkdown", () => {
    expect(chunkMarkdown("hello world")).toEqual([
      { content: "hello world", lineStart: 1, lineEnd: 1 },
    ]);
  });

  test("re-exports MemoryManager", () => {
    const mgr = new MemoryManager("/tmp/aria-memory-package-test");
    expect(mgr).toBeInstanceOf(MemoryManager);
  });
});
