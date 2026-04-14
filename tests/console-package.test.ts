import { describe, expect, test } from "bun:test";

import { App } from "../packages/console/src/App.js";
import { handleConsoleWorkflowCommand } from "../packages/console/src/commands.js";
import { createTuiClient } from "../packages/console/src/client.js";

describe("@aria/console package entrypoints", () => {
  test("re-exports App", () => {
    expect(typeof App).toBe("function");
  });

  test("re-exports createTuiClient", () => {
    expect(typeof createTuiClient).toBe("function");
  });

  test("re-exports console workflow helper", () => {
    expect(typeof handleConsoleWorkflowCommand).toBe("function");
  });
});
