import { describe, expect, test } from "bun:test";

import { createSlackConnector } from "../packages/connectors-im/src/slack/index.js";
import { formatToolResult } from "../packages/connectors-im/src/chat-sdk/formatter.js";

describe("@aria/connectors-im package entrypoints", () => {
  test("re-exports chat-sdk formatter helpers", () => {
    expect(formatToolResult("read", "hello", 20)).toContain("hello");
  });

  test("re-exports connector factories", () => {
    expect(typeof createSlackConnector).toBe("function");
  });
});
