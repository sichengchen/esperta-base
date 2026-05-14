import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

import { ariaNodeRuntimeApp, createAriaNodeRuntimeBootstrap } from "@aria/node-runtime";

describe("package shell composition", () => {
  test("@aria/node-runtime exposes package-owned runtime metadata and bootstrap discovery", () => {
    const bootstrap = createAriaNodeRuntimeBootstrap({
      runtimeHome: "/tmp/aria-shell-test",
      hostname: "127.0.0.1",
      port: 7420,
    });

    expect(ariaNodeRuntimeApp).toMatchObject({
      id: "aria-node-runtime",
      displayName: "Esperta Aria",
      runtimeName: "Aria Runtime",
      cliName: "aria",
      surface: "node-runtime",
    });
    expect(ariaNodeRuntimeApp.capabilities).toContain("aria-agent-host");
    expect(ariaNodeRuntimeApp.ownership).toMatchObject({
      ariaAgent: "node-owned",
      memory: "node-owned",
      automation: "node-owned",
      connectors: "node-owned",
      projectLocalExecution: "configured-provider",
    });
    expect(ariaNodeRuntimeApp.sharedPackages).toEqual(["@aria/node-runtime", "@aria/gateway"]);
    expect(bootstrap).toMatchObject({
      app: ariaNodeRuntimeApp,
      runtimeHome: "/tmp/aria-shell-test",
      hostname: "127.0.0.1",
      port: 7420,
    });
    expect(bootstrap.discovery).toMatchObject({
      pidFile: "/tmp/aria-shell-test/engine.pid",
      urlFile: "/tmp/aria-shell-test/engine.url",
      logFile: "/tmp/aria-shell-test/engine.log",
      restartMarkerFile: "/tmp/aria-shell-test/engine.restart",
    });
  });

  test("desktop package declares local aria-node supervision dependency", async () => {
    const desktopPackage = JSON.parse(
      await readFile(new URL("../apps/aria-desktop/package.json", import.meta.url), "utf-8"),
    ) as { dependencies?: Record<string, string> };

    expect(desktopPackage.dependencies).toMatchObject({
      "@aria/node-host": "workspace:*",
      "aria-node": "workspace:*",
    });
  });
});
