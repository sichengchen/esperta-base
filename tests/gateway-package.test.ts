import { describe, expect, test } from "bun:test";

import { AuthManager } from "../packages/gateway/src/auth.js";
import { DEFAULT_TASK_TIER, router } from "../packages/gateway/src/index.js";

describe("@aria/gateway package entrypoints", () => {
  test("re-exports gateway auth manager", () => {
    expect(typeof AuthManager).toBe("function");
  });

  test("re-exports router helpers", () => {
    expect(DEFAULT_TASK_TIER.chat).toBe("performance");
    expect(typeof router).toBe("function");
  });
});
