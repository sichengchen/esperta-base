import type { BrowserWindow } from "electron";
import { describe, expect, test, vi } from "vitest";

describe("registerDesktopIpc", () => {
  test("routes desktop project import through the shared service dialog flow", async () => {
    const importResult = {
      archivedThreadIds: [],
      collapsedProjectIds: [],
      pinnedThreadIds: [],
      projects: [],
      selectedProjectId: "project-1",
      selectedThreadId: null,
      selectedThreadState: null,
    };
    const importLocalProjectFromDialog = vi.fn(async () => importResult);
    const focusedWindow = { id: "focused-window" } as unknown as BrowserWindow;

    const { importLocalProjectThroughDesktopService } =
      await import("../apps/aria-desktop/src/main/desktop-ipc-handlers.js");

    expect(
      await importLocalProjectThroughDesktopService(
        {
          importLocalProjectFromDialog,
        },
        {
          getAllWindows: () => [focusedWindow],
          getFocusedWindow: () => focusedWindow,
        },
      ),
    ).toEqual(importResult);
    expect(importLocalProjectFromDialog).toHaveBeenCalledTimes(1);
    expect(importLocalProjectFromDialog).toHaveBeenCalledWith(focusedWindow);
  });
});
