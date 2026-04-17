import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  AriaMobileApplicationShell,
  createAriaMobileApplicationBootstrap,
  createAriaMobileApplicationRoot,
} from "aria-mobile";
import { createAriaServerHostBootstrap } from "aria-server";

let testHome: string;

afterEach(async () => {
  if (testHome) {
    await rm(testHome, { recursive: true, force: true });
  }
});

describe("E2E smoke test", () => {
  test("server and mobile compose around one architecture", async () => {
    testHome = await mkdtemp(join(tmpdir(), "aria-e2e-smoke-"));

    const serverHost = createAriaServerHostBootstrap(testHome);
    const mobileTarget = {
      serverId: "published",
      baseUrl: "https://gateway.example.test/home",
      secondaryBaseUrl: "https://gateway.example.test/home",
      preferredAccessMode: "secondary" as const,
    };
    const mobile = createAriaMobileApplicationBootstrap({
      target: mobileTarget,
      initialThread: {
        project: { name: "Aria" },
        thread: {
          threadId: "thread-1",
          title: "Remote review",
          status: "idle",
          threadType: "remote_project",
          agentId: "codex",
        },
      },
    });
    const mobileRoot = createAriaMobileApplicationRoot({
      target: mobileTarget,
      initialThread: {
        project: { name: "Aria" },
        thread: {
          threadId: "thread-1",
          title: "Remote review",
          status: "idle",
          threadType: "remote_project",
          agentId: "codex",
        },
      },
    });

    expect(serverHost.host.shellPackage).toBe("@aria/server");
    expect(serverHost.discoveryPaths.pidFile).toBe(`${testHome}/engine.pid`);
    expect(mobile.bootstrap.access.httpUrl).toBe("https://gateway.example.test/home");
    expect(mobileRoot.type).toBe(AriaMobileApplicationShell);
  });
});
