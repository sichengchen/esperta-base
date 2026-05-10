import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const workspaceRootDir = fileURLToPath(new URL("../../", import.meta.url));
const tsconfig = JSON.parse(
  readFileSync(new URL("../../tsconfig.json", import.meta.url), "utf-8"),
) as {
  compilerOptions?: {
    paths?: Record<string, string[]>;
  };
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const workspaceAliases = Object.entries(tsconfig.compilerOptions?.paths ?? {}).flatMap(
  ([key, targets]) => {
    const target = targets[0];

    if (!target) {
      return [];
    }

    if (key.endsWith("/*") && target.endsWith("/*")) {
      const sourceBase = key.slice(0, -2);
      const targetBase = resolve(workspaceRootDir, target.slice(0, -2));

      return [
        {
          find: new RegExp(`^${escapeRegex(sourceBase)}/(.*?)(?:\\.js)?$`),
          replacement: `${targetBase}/$1`,
        },
      ];
    }

    return [
      {
        find: new RegExp(`^${escapeRegex(key)}(?:\\.js)?$`),
        replacement: resolve(workspaceRootDir, target),
      },
    ];
  },
);

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: workspaceAliases,
    },
    build: {
      outDir: "dist/main",
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: workspaceAliases,
    },
    build: {
      outDir: "dist/preload",
    },
  },
  renderer: {
    root: resolve(rootDir, "src/renderer"),
    plugins: [react(), tailwindcss()],
    server: {
      host: "127.0.0.1",
      port: 5173,
      strictPort: true,
      hmr: {
        host: "127.0.0.1",
        port: 5173,
        protocol: "ws",
      },
      watch: {
        usePolling: true,
        interval: 100,
      },
    },
    resolve: {
      alias: [
        ...workspaceAliases,
        {
          find: "src",
          replacement: resolve(rootDir, "src"),
        },
        {
          find: "@renderer",
          replacement: resolve(rootDir, "src/renderer/src"),
        },
      ],
    },
    build: {
      outDir: resolve(rootDir, "dist/renderer"),
    },
  },
});
