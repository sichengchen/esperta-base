import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  ariaDesktopApp,
  createAriaDesktopBootstrap,
} from "@aria/desktop";
import {
  ariaMobileApp,
  createAriaMobileBootstrap,
} from "@aria/mobile";
import * as desktopAppModule from "../apps/aria-desktop/src/index.js";
import * as mobileAppModule from "../apps/aria-mobile/src/index.js";

function readRepoFile(relativePath: string): string {
  return readFileSync(join(import.meta.dir, "..", relativePath), "utf-8");
}

describe("Phase 8 client shell packages", () => {
  test("@aria/desktop stays a thin shell over shared client, UI, and project seams", () => {
    const bootstrap = createAriaDesktopBootstrap(
      { serverId: "desktop", baseUrl: "http://127.0.0.1:7420/" },
      {
        project: { name: "Aria" },
        thread: { threadId: "thread-1", title: "Desktop shell", status: "running" },
      },
    );

    expect(ariaDesktopApp.sharedPackages).toEqual([
      "@aria/access-client",
      "@aria/desktop-bridge",
      "@aria/ui",
      "@aria/projects",
      "@aria/agents-coding",
      "@aria/protocol",
    ]);
    expect(bootstrap.access).toMatchObject({
      serverId: "desktop",
      httpUrl: "http://127.0.0.1:7420",
      wsUrl: "ws://127.0.0.1:7420",
    });
    expect(bootstrap.initialThread?.status).toBe("Running");
  });

  test("@aria/mobile stays a remote thin shell over shared client, UI, and project seams", () => {
    const bootstrap = createAriaMobileBootstrap(
      { serverId: "mobile", baseUrl: "https://aria.example.test/" },
      {
        project: { name: "Aria" },
        thread: { threadId: "thread-2", title: "Mobile shell", status: "idle" },
      },
    );

    expect(ariaMobileApp.sharedPackages).toEqual([
      "@aria/access-client",
      "@aria/ui",
      "@aria/projects",
      "@aria/protocol",
    ]);
    expect(ariaMobileApp.capabilities).not.toContain("local-bridge");
    expect(bootstrap.access).toMatchObject({
      serverId: "mobile",
      httpUrl: "https://aria.example.test",
      wsUrl: "wss://aria.example.test",
    });
    expect(bootstrap.initialThread?.projectLabel).toBe("Aria");
  });

  test("desktop and mobile apps remain thin wrappers over the new package shells", () => {
    expect(desktopAppModule).toMatchObject({
      ariaDesktopApp,
      createAriaDesktopBootstrap,
    });
    expect(mobileAppModule).toMatchObject({
      ariaMobileApp,
      createAriaMobileBootstrap,
    });

    const desktopAppSource = readRepoFile("apps/aria-desktop/src/index.ts").trim();
    const mobileAppSource = readRepoFile("apps/aria-mobile/src/index.ts").trim();

    expect(desktopAppSource).toBe('export * from "@aria/desktop";');
    expect(mobileAppSource).toBe('export * from "@aria/mobile";');
  });
});
