import { basename } from "node:path";
import { describe, expect, test } from "bun:test";

describe("desktop main paths", () => {
  test("uses the emitted preload module entry", async () => {
    const { getDesktopPreloadPath } =
      await import("../apps/aria-desktop/src/main/desktop-main-paths.js");

    expect(basename(getDesktopPreloadPath("/tmp/aria-desktop/dist/main"))).toBe("index.mjs");
  });
});
