import { describe, expect, test } from "bun:test";
import { ToolLoopDetector, capToolResultSize } from "../packages/agent-aria/src/index.js";

describe("@aria/agent-aria package entrypoints", () => {
  test("re-exports tool loop detector", () => {
    const detector = new ToolLoopDetector({ warnThreshold: 2, blockThreshold: 3 });
    expect(detector.checkBeforeExecution("read", { path: "README.md" }).level).toBe("ok");
    expect(detector.recordResult("read", { path: "README.md" }, "same result").level).toBe("ok");
    expect(detector.recordResult("read", { path: "README.md" }, "same result").level).toBe("warn");
  });

  test("re-exports tool result guard", () => {
    const capped = capToolResultSize({ content: "x".repeat(60_000), isError: false }, 50_000);
    expect(capped.content.length).toBeLessThan(60_000);
    expect(capped.content).toContain("truncated");
  });
});
