import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

const desktopPackageJsonPath = new URL("../apps/aria-desktop/package.json", import.meta.url);
const desktopBuilderConfigPath = new URL(
  "../apps/aria-desktop/electron-builder.json",
  import.meta.url,
);

describe("aria-desktop packaging surface", () => {
  test("declares electron-vite dev/build and distribution scripts for the desktop app", async () => {
    const packageJson = JSON.parse(await readFile(desktopPackageJsonPath, "utf-8")) as {
      main?: string;
      scripts?: Record<string, string>;
    };

    expect(packageJson.main).toBe("./dist/main/index.js");
    expect(packageJson.scripts).toMatchObject({
      prestart: "bun run build",
      dev: "electron-vite dev",
      build: "electron-vite build",
      preview: "electron-vite preview",
      "package:dir": "bun run build && electron-builder --config ./electron-builder.json --dir",
      "dist:mac": "bun run build && electron-builder --config ./electron-builder.json --mac dmg zip",
      "dist:linux": "bun run build && electron-builder --config ./electron-builder.json --linux AppImage zip",
      "dist:win": "bun run build && electron-builder --config ./electron-builder.json --win nsis zip",
      start: "electron .",
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
        "dist/main/**/*",
        "dist/preload/**/*",
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
