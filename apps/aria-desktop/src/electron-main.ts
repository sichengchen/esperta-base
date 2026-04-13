import { app, BrowserWindow } from "electron";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runAriaDesktopElectronHost } from "./electron-host.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const devServerUrl = process.env.ARIA_DESKTOP_DEV_SERVER_URL;

void runAriaDesktopElectronHost(
  {
    platform: process.platform,
    whenReady: () => app.whenReady(),
    onActivate(handler) {
      app.on("activate", handler);
    },
    onWindowAllClosed(handler) {
      app.on("window-all-closed", handler);
    },
    createWindow(options) {
      return new BrowserWindow({
        width: options.width,
        height: options.height,
        minWidth: options.minWidth,
        minHeight: options.minHeight,
        webPreferences: {
          preload: options.preloadPath,
          contextIsolation: true,
          nodeIntegration: false,
        },
      });
    },
    getAllWindows() {
      return BrowserWindow.getAllWindows();
    },
    quit() {
      app.quit();
    },
  },
  {
    distDir: __dirname,
    devServerUrl,
  },
).catch((error) => {
  console.error(
    `[aria-desktop] Failed to start: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
