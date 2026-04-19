import { describe, expect, test } from "bun:test";
import { createSessionTitleTool } from "../packages/tools/src/session-title.js";

describe("set_session_title tool", () => {
  test("updates the current session title through the bound callback", async () => {
    let savedTitle = "";
    const tool = createSessionTitleTool({
      setTitle: async (title) => {
        savedTitle = title;
        return title;
      },
    });

    const result = await tool.execute({ title: "Desktop spacing fix" });

    expect(savedTitle).toBe("Desktop spacing fix");
    expect(result).toEqual({
      content: "Session title updated to: Desktop spacing fix",
    });
  });

  test("rejects empty titles", async () => {
    const tool = createSessionTitleTool({
      setTitle: async (title) => title,
    });

    const result = await tool.execute({ title: "   " });

    expect(result.isError).toBe(true);
    expect(result.content).toContain("cannot be empty");
  });
});
