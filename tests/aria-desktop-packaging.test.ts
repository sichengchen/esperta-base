import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

const desktopPackageJsonPath = new URL("../apps/aria-desktop/package.json", import.meta.url);
const desktopBuilderConfigPath = new URL(
  "../apps/aria-desktop/electron-builder.json",
  import.meta.url,
);

describe("aria-desktop packaging surface", () => {
  test("declares dev, host, renderer, smoke-build, and distribution scripts for the desktop app", async () => {
    const packageJson = JSON.parse(await readFile(desktopPackageJsonPath, "utf-8")) as {
      main?: string;
      scripts?: Record<string, string>;
    };

    expect(packageJson.main).toBe("./dist/electron-main.js");
    expect(packageJson.scripts).toMatchObject({
      dev: "bun ./scripts/dev.ts",
      "dev:renderer": "vite --config ./vite.config.ts",
      "dev:host":
        "bun run build:host && ARIA_DESKTOP_DEV_SERVER_URL=http://127.0.0.1:5173 electron ./dist/electron-main.js",
      "build:renderer": "vite build --config ./vite.config.ts",
      "build:host":
        "bun build ./src/electron-main.ts ./src/electron-preload.ts --outdir ./dist --target node --external electron",
      build: "bun run build:renderer && bun run build:host",
      "smoke:build":
        "bun run build && bun -e \"for (const path of ['./dist/electron-main.js', './dist/electron-preload.js', './dist/renderer/index.html']) { if (!(await Bun.file(path).exists())) throw new Error('Missing ' + path) }\"",
      "package:dir":
        "bun run build && bunx electron-builder --config ./electron-builder.json --dir",
      "dist:mac":
        "bun run build && bunx electron-builder --config ./electron-builder.json --mac dmg zip",
      "dist:linux":
        "bun run build && bunx electron-builder --config ./electron-builder.json --linux AppImage zip",
      "dist:win":
        "bun run build && bunx electron-builder --config ./electron-builder.json --win nsis zip",
      start: "bun run build && electron ./dist/electron-main.js",
    });
  });

  test("defines an electron-builder release configuration for desktop distribution", async () => {
    const builderConfig = JSON.parse(await readFile(desktopBuilderConfigPath, "utf-8")) as {
      appId?: string;
      productName?: string;
      directories?: { output?: string };
      files?: string[];
      mac?: { category?: string; target?: string[] };
      linux?: { category?: string; target?: string[] };
      win?: { target?: string[] };
    };

    expect(builderConfig).toMatchObject({
      appId: "dev.esperta.ariadesktop",
      productName: "Aria Desktop",
      directories: {
        output: "release",
      },
      files: [
        "dist/electron-main.js",
        "dist/electron-preload.js",
        "dist/renderer/**/*",
        "package.json",
      ],
      mac: {
        category: "public.app-category.developer-tools",
        target: ["dmg", "zip"],
      },
      linux: {
        category: "Development",
        target: ["AppImage", "zip"],
      },
      win: {
        target: ["nsis", "zip"],
      },
    });
  });
});
