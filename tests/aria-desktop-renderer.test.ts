import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type {
  AriaDesktopAriaShellState,
  AriaDesktopSettingsState,
} from "../apps/aria-desktop/src/shared/api.js";
import {
  AriaChatView,
  AriaSidebar,
  ProjectSidebar,
  SettingsView,
  ThreadView,
} from "../apps/aria-desktop/src/renderer/src/components/DesktopWorkbenchApp.js";
import {
  applyComposerPromptSuggestion,
  buildComposerPromptSuggestions,
  resolveComposerPromptQuery,
} from "../apps/aria-desktop/src/renderer/src/components/AriaChatComposer.js";
import { AriaMessageItem } from "../apps/aria-desktop/src/renderer/src/components/AriaMessageItem.js";
import { DesktopSpaceTabs } from "../apps/aria-desktop/src/renderer/src/components/DesktopSpaceTabs.js";

const DESKTOP_RENDERER_ROOT = new URL("../apps/aria-desktop/src/renderer/src/", import.meta.url);

function readDesktopRendererSource(relativePath: string): string {
  return readFileSync(new URL(relativePath, DESKTOP_RENDERER_ROOT), "utf8");
}

function listDesktopRendererSources(directory = DESKTOP_RENDERER_ROOT): URL[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const child = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);

    if (entry.isDirectory()) {
      return listDesktopRendererSources(child);
    }

    return entry.name.endsWith(".ts") || entry.name.endsWith(".tsx") ? [child] : [];
  });
}

const SAMPLE_ARIA_STATE: AriaDesktopAriaShellState = {
  automations: {
    lastError: null,
    runs: [],
    selectedTaskId: null,
    tasks: [],
  },
  chat: {
    agentName: "Esperta Aria",
    approvalMode: "ask",
    connected: true,
    isStreaming: false,
    lastError: null,
    messages: [],
    modelName: "sonnet",
    pendingApproval: null,
    pendingQuestion: null,
    securityMode: "default",
    securityModeRemainingTTL: null,
    sessionId: "chat-1",
    sessionStatus: "resumed",
    streamingText: "",
    streamingPhase: null,
  },
  chatSessions: [
    {
      archived: false,
      connectorId: "desktop",
      connectorType: "tui",
      lastActiveAt: 100,
      preview: "Draft release notes",
      sessionId: "chat-1",
      summary: null,
      title: "Draft release notes",
    },
    {
      archived: true,
      connectorId: "desktop",
      connectorType: "tui",
      lastActiveAt: 99,
      preview: "Older archived chat",
      sessionId: "chat-archived",
      summary: "Older archived chat",
      title: "Archived chat",
    },
  ],
  connectorSessions: [],
  connectors: {
    agentName: "Esperta Aria",
    approvalMode: "ask",
    connected: false,
    isStreaming: false,
    lastError: null,
    messages: [],
    modelName: "unknown",
    pendingApproval: null,
    pendingQuestion: null,
    securityMode: "default",
    securityModeRemainingTTL: null,
    sessionId: null,
    sessionStatus: "disconnected",
    streamingText: "",
    streamingPhase: null,
  },
  selectedAriaScreen: null,
  selectedAriaSessionId: "chat-1",
  serverLabel: "Local Server",
};

const SAMPLE_SETTINGS_STATE: AriaDesktopSettingsState = {
  about: {
    channel: "Desktop",
    cliName: "aria",
    productName: "Esperta Aria",
    runtimeName: "Aria Runtime",
  },
  connectors: [
    {
      approval: "ask",
      configured: true,
      label: "Slack",
      name: "slack",
      secrets: [
        { configured: true, key: "SLACK_BOT_TOKEN", label: "Bot Token", maskedValue: "****1234" },
      ],
    },
    {
      approval: "ask",
      configured: false,
      label: "Discord",
      name: "discord",
      secrets: [],
    },
  ],
  desktop: {
    compactMode: true,
    defaultSpace: "projects",
    settingsPath: "/tmp/aria-desktop-settings.json",
    startAtLogin: false,
    theme: "system",
  },
  lastError: null,
  runtime: {
    activeModel: "sonnet",
    checkpointMaxSnapshots: 50,
    checkpointsEnabled: true,
    connectorApproval: "ask",
    connectorVerbosity: "silent",
    contextFilesEnabled: true,
    cronTaskCount: 1,
    defaultModel: "sonnet",
    heartbeatEnabled: true,
    heartbeatIntervalMinutes: 30,
    homeDir: "/tmp/.aria",
    journalEnabled: true,
    mcpServerCount: 2,
    memoryDirectory: "memory",
    memoryEnabled: true,
    modelTiers: {
      performance: "sonnet",
    },
    models: [
      {
        label: "sonnet (anthropic/claude-sonnet)",
        model: "claude-sonnet",
        name: "sonnet",
        provider: "anthropic",
        selected: true,
        tiers: ["performance"],
        type: "chat",
      },
    ],
    providerPresets: [
      {
        apiKeyEnvVar: "ANTHROPIC_API_KEY",
        id: "anthropic",
        label: "Anthropic",
        type: "anthropic",
      },
    ],
    providers: [
      {
        apiKeyConfigured: true,
        apiKeyEnvVar: "ANTHROPIC_API_KEY",
        id: "anthropic",
        label: "Anthropic",
        modelCount: 1,
        type: "anthropic",
      },
    ],
    providerCount: 1,
    securityMode: "default",
    tuiApproval: "never",
    tuiVerbosity: "minimal",
    webhookApproval: "never",
    webhookEnabled: false,
    webhookTaskCount: 0,
  },
};

const SAMPLE_PROJECT = {
  name: "desktop-shell",
  projectId: "project-1",
  repoName: "desktop-shell",
  rootPath: "/tmp/desktop-shell",
  threads: [
    {
      agentId: "aria-agent",
      environmentId: "env-1",
      status: "dirty" as const,
      statusLabel: "Dirty",
      threadId: "thread-1",
      threadType: "local_project" as const,
      threadTypeLabel: "Local Project",
      title: "Desktop Projects Aria",
      updatedAt: 100,
    },
  ],
};

const SAMPLE_PROJECT_THREAD_STATE = {
  agentId: "aria-agent",
  agentLabel: "Aria Agent",
  backendSessionId: "ses_1",
  changedFiles: ["src/desktop.tsx"],
  chat: {
    agentName: "Aria Agent",
    approvalMode: "never" as const,
    connected: true,
    isStreaming: false,
    lastError: null,
    messages: [
      {
        content: "Plan the Projects chat surface",
        id: "project-user-1",
        role: "user" as const,
        toolName: null,
      },
      {
        content: "Implemented the local agent view.",
        id: "project-assistant-1",
        role: "assistant" as const,
        toolName: null,
      },
    ],
    modelName: "OpenAI / GPT-5",
    pendingApproval: null,
    pendingQuestion: null,
    securityMode: "default" as const,
    securityModeRemainingTTL: null,
    sessionId: "thread-1",
    sessionStatus: "resumed" as const,
    streamingText: "",
    streamingPhase: null,
  },
  environmentId: "env-1",
  environmentLabel: "This Device / main",
  environmentLocator: "/tmp/desktop-shell",
  availableBranches: [
    {
      description: undefined,
      environmentId: "env-1",
      label: "This Device / main",
      locator: "/tmp/desktop-shell",
      selected: true,
      value: "main",
    },
  ],
  availableModels: [
    {
      label: "Default",
      modelId: null,
      modelLabel: "Default",
      providerLabel: null,
      selected: true,
    },
  ],
  modelId: null,
  modelLabel: "Default",
  promptSuggestions: {
    files: [
      {
        detail: "This Device / main",
        label: "README.md",
        value: "README.md",
      },
      {
        detail: "This Device / main",
        label: "src/desktop.tsx",
        value: "src/desktop.tsx",
      },
    ],
    skills: [
      {
        description: "Keep desktop chrome compact.",
        label: "desktop-ux",
        value: "desktop-ux",
      },
    ],
  },
  projectId: "project-1",
  projectName: "desktop-shell",
  status: "dirty" as const,
  statusLabel: "Dirty",
  threadId: "thread-1",
  threadType: "local_project" as const,
  threadTypeLabel: "Local Project",
  title: "Desktop Projects Aria",
};

describe("desktop aria renderer", () => {
  test("adopts shadcn/ui Base UI components for desktop stateful primitives", () => {
    const componentsConfig = JSON.parse(
      readFileSync(new URL("../apps/aria-desktop/components.json", import.meta.url), "utf8"),
    ) as {
      aliases?: Record<string, string>;
      iconLibrary?: string;
      style?: string;
      tailwind?: { baseColor?: string; css?: string; cssVariables?: boolean };
    };
    const desktopPackage = JSON.parse(
      readFileSync(new URL("../apps/aria-desktop/package.json", import.meta.url), "utf8"),
    ) as { dependencies?: Record<string, string> };
    const designSource = readFileSync(new URL("../DESIGN.md", import.meta.url), "utf8");
    const workbenchSource = readDesktopRendererSource("components/DesktopWorkbenchApp.tsx");
    const desktopIconSource = readDesktopRendererSource("components/DesktopIcon.tsx");
    const collapsibleSource = readDesktopRendererSource("components/DesktopCollapsibleSection.tsx");
    const tabsSource = readDesktopRendererSource("components/DesktopSpaceTabs.tsx");
    const layoutToggleSource = readDesktopRendererSource("components/LayoutToggleIconButton.tsx");
    const iconButtonSource = readDesktopRendererSource("components/DesktopIconButton.tsx");
    const sidebarButtonSource = readDesktopRendererSource("components/DesktopSidebarButton.tsx");
    const stylesSource = readDesktopRendererSource("styles.css");
    const rendererSources = listDesktopRendererSources().map((fileUrl) =>
      readFileSync(fileUrl, "utf8"),
    );
    const uiSources = [
      "components/ui/alert.tsx",
      "components/ui/alert-dialog.tsx",
      "components/ui/badge.tsx",
      "components/ui/button.tsx",
      "components/ui/button-group.tsx",
      "components/ui/card.tsx",
      "components/ui/collapsible.tsx",
      "components/ui/dialog.tsx",
      "components/ui/dropdown-menu.tsx",
      "components/ui/empty.tsx",
      "components/ui/field.tsx",
      "components/ui/input-group.tsx",
      "components/ui/input.tsx",
      "components/ui/item.tsx",
      "components/ui/label.tsx",
      "components/ui/select.tsx",
      "components/ui/separator.tsx",
      "components/ui/sheet.tsx",
      "components/ui/sidebar.tsx",
      "components/ui/spinner.tsx",
      "components/ui/switch.tsx",
      "components/ui/tabs.tsx",
      "components/ui/textarea.tsx",
      "components/ui/toggle.tsx",
      "components/ui/toggle-group.tsx",
      "components/ui/tooltip.tsx",
    ].map((path) => readDesktopRendererSource(path));

    expect(componentsConfig.style).toBe("base-nova");
    expect(componentsConfig.iconLibrary).toBe("hugeicons");
    expect(componentsConfig.tailwind?.baseColor).toBe("neutral");
    expect(componentsConfig.tailwind?.css).toBe("src/renderer/src/styles.css");
    expect(componentsConfig.tailwind?.cssVariables).toBe(true);
    expect(componentsConfig.aliases?.ui).toBe("src/renderer/src/components/ui");
    expect(desktopPackage.dependencies?.["@hugeicons/core-free-icons"]).toBeDefined();
    expect(desktopPackage.dependencies?.["@hugeicons/react"]).toBeDefined();
    expect(desktopPackage.dependencies?.["lucide-react"]).toBeUndefined();
    expect(desktopIconSource).toContain("@hugeicons/core-free-icons");
    expect(desktopIconSource).toContain("@hugeicons/react");
    expect(rendererSources.join("\n")).not.toContain("lucide-react");

    expect(tabsSource).toContain("./ui/tabs.js");
    expect(collapsibleSource).toContain("./ui/collapsible.js");
    expect(layoutToggleSource).toContain("./ui/toggle.js");
    expect(workbenchSource).toContain("./ui/dialog.js");
    expect(workbenchSource).toContain("./ui/dropdown-menu.js");
    expect(workbenchSource).toContain("./ui/select.js");
    expect(workbenchSource).toContain("./ui/sheet.js");
    expect(workbenchSource).toContain("./ui/switch.js");
    expect(workbenchSource).toContain("./ui/button.js");
    expect(workbenchSource).toContain("./ui/input.js");
    expect(workbenchSource).toContain("./ui/badge.js");
    expect(workbenchSource).toContain("./ui/card.js");
    expect(workbenchSource).toContain("./ui/alert.js");
    expect(workbenchSource).toContain("./ui/alert-dialog.js");
    expect(workbenchSource).toContain("./ui/button-group.js");
    expect(workbenchSource).toContain("./ui/empty.js");
    expect(workbenchSource).toContain("./ui/field.js");
    expect(workbenchSource).toContain("./ui/input-group.js");
    expect(workbenchSource).toContain("./ui/item.js");
    expect(workbenchSource).toContain("./ui/sidebar.js");
    expect(workbenchSource).toContain("./ui/spinner.js");
    expect(workbenchSource).not.toContain("./ui/toggle-group.js");
    expect(workbenchSource).not.toContain("TabsContent");
    expect(workbenchSource).not.toContain("TabsList");
    expect(workbenchSource).not.toContain("TabsTrigger");
    expect(workbenchSource).toContain("<SidebarMenuButton");
    expect(iconButtonSource).toContain("./ui/button.js");
    expect(iconButtonSource).toContain("./ui/tooltip.js");
    expect(sidebarButtonSource).toContain("./ui/button.js");

    expect(uiSources.join("\n")).toContain("@base-ui/react/alert-dialog");
    expect(uiSources.join("\n")).toContain("@base-ui/react/button");
    expect(uiSources.join("\n")).toContain("@base-ui/react/tabs");
    expect(uiSources.join("\n")).toContain("@base-ui/react/input");
    expect(uiSources.join("\n")).toContain("@base-ui/react/collapsible");
    expect(uiSources.join("\n")).toContain("@base-ui/react/dialog");
    expect(uiSources.join("\n")).toContain("@base-ui/react/menu");
    expect(uiSources.join("\n")).toContain("@base-ui/react/select");
    expect(uiSources.join("\n")).toContain("@base-ui/react/separator");
    expect(uiSources.join("\n")).toContain("@base-ui/react/switch");
    expect(uiSources.join("\n")).toContain("@base-ui/react/toggle");
    expect(uiSources.join("\n")).toContain("@base-ui/react/toggle-group");
    expect(uiSources.join("\n")).toContain("@base-ui/react/tooltip");
    expect(uiSources.join("\n")).toContain("@base-ui/react/use-render");
    expect(uiSources.join("\n")).toContain('data-slot="dialog-content"');
    expect(uiSources.join("\n")).toContain('data-slot="dropdown-menu-content"');
    expect(uiSources.join("\n")).toContain('data-slot="select-trigger"');
    expect(uiSources.join("\n")).toContain('data-slot="button"');
    expect(uiSources.join("\n")).toContain('data-slot="input"');
    expect(uiSources.join("\n")).toContain('data-slot="input-group"');
    expect(uiSources.join("\n")).toContain('slot: "badge"');
    expect(uiSources.join("\n")).toContain('data-slot="card"');
    expect(uiSources.join("\n")).toContain('data-slot="label"');
    expect(uiSources.join("\n")).toContain('data-slot="separator"');
    expect(uiSources.join("\n")).toContain('data-slot="alert"');
    expect(uiSources.join("\n")).toContain('data-slot="alert-dialog"');
    expect(uiSources.join("\n")).toContain('data-slot="empty"');
    expect(uiSources.join("\n")).toContain('data-slot="field"');
    expect(uiSources.join("\n")).toContain('data-slot="sidebar-provider"');
    expect(uiSources.join("\n")).toContain('data-slot="sidebar"');
    expect(uiSources.join("\n")).toContain('data-slot="sidebar-menu"');
    expect(uiSources.join("\n")).toContain('data-slot="sidebar-inset"');
    expect(uiSources.join("\n")).toContain('slot: "item"');
    expect(workbenchSource).toContain("<Card");
    expect(workbenchSource).toContain("<Alert");
    expect(workbenchSource).toContain("<AlertDialog");
    expect(workbenchSource).toContain("<ButtonGroup");
    expect(workbenchSource).toContain("<Empty");
    expect(workbenchSource).toContain("<Field");
    expect(workbenchSource).toContain("<InputGroup");
    expect(workbenchSource).toContain("<Item");
    expect(workbenchSource).toContain("<ItemActions");
    expect(workbenchSource).toContain("<FieldSeparator");
    expect(workbenchSource).toContain("<SidebarProvider");
    expect(workbenchSource).toContain("<SidebarGroup");
    expect(workbenchSource).toContain("<SidebarMenu");
    expect(workbenchSource).toContain("<SidebarInset");
    expect(workbenchSource).toContain("<Spinner");
    expect(workbenchSource).toContain("<SelectTrigger");
    expect(workbenchSource).toContain("<SelectGroup");
    expect(workbenchSource).toContain("<SheetContent>");
    expect(workbenchSource).toContain("<SheetFooter");
    expect(workbenchSource).toContain("<FieldGroup");
    expect(iconButtonSource).toContain("<Tooltip");

    const directPrimitiveImportFiles = listDesktopRendererSources()
      .filter((fileUrl) => !fileUrl.pathname.includes("/components/ui/"))
      .filter((fileUrl) => readFileSync(fileUrl, "utf8").includes("@base-ui/react"))
      .map((fileUrl) => fileUrl.pathname);

    expect(directPrimitiveImportFiles).toEqual([]);
    expect(stylesSource).toContain('@import "tailwindcss"');
    expect(stylesSource).toContain("@theme inline");
    expect(stylesSource).toContain('font-family: "Inter"');
    expect(stylesSource).toContain("--color-background: var(--background)");
    expect(stylesSource).toContain("--background: oklch(1 0 0)");
    expect(stylesSource).toContain("--foreground: oklch(0.141 0.005 285.823)");
    expect(stylesSource).toContain("--chart-1: oklch(0.21 0.006 285.885)");
    expect(stylesSource).toContain("--chart-5: oklch(0.92 0.004 286.32)");
    expect(stylesSource).toContain("--desktop-background: var(--background)");
    expect(stylesSource).toContain("--radius: 8px");
    expect(stylesSource).not.toContain('.settings-row[data-slot="item"]');
    expect(stylesSource).not.toContain(
      "grid-template-columns: minmax(170px, 220px) minmax(0, 1fr)",
    );
    expect(stylesSource).not.toContain(
      "grid-template-columns: minmax(184px, 212px) minmax(0, 1fr)",
    );
    expect(stylesSource).not.toContain(".settings-toggle {");
    expect(stylesSource).not.toContain(".settings-panel");
    expect(stylesSource).not.toContain(".settings-row");
    expect(stylesSource).not.toContain(".settings-select");
    expect(stylesSource).not.toContain(".settings-text-input");
    expect(stylesSource).not.toContain(".settings-number-input");
    expect(stylesSource).not.toContain(".settings-inline-controls");
    expect(stylesSource).not.toContain(".settings-secret");
    expect(stylesSource).not.toContain(".settings-wizard");
    expect(stylesSource).not.toContain(".settings-sheet");
    expect(stylesSource).not.toContain(".settings-design-canvas");
    expect(stylesSource).not.toContain(".settings-shell");
    expect(stylesSource).not.toContain(".settings-sidebar");
    expect(stylesSource).not.toContain(".settings-content");
    expect(stylesSource).not.toContain(".settings-segment");
    expect(stylesSource).not.toContain(".settings-segment-option");
    expect(workbenchSource).not.toContain('className="settings-sheet"');
    expect(workbenchSource).not.toContain('className="settings-wizard"');
    expect(workbenchSource).not.toContain('className="settings-row"');
    expect(workbenchSource).not.toContain('className="settings-select"');
    expect(workbenchSource).not.toContain('className="settings-design-canvas"');
    expect(workbenchSource).not.toContain('className="settings-shell"');
    expect(workbenchSource).not.toContain('className="settings-sidebar"');
    expect(workbenchSource).not.toContain('className="settings-content"');
    expect(workbenchSource).not.toContain('className="settings-segment"');
    expect(workbenchSource).not.toContain("SettingsSegment");
    expect(workbenchSource).not.toContain("<ToggleGroup");
    expect(workbenchSource).not.toContain("spacing={1}");
    expect(designSource).toContain("Style: `Mira`");
    expect(designSource).toContain("Base Color: `Neutral`");
    expect(designSource).toContain("Theme: `Neutral`");
    expect(designSource).toContain("Chart Color: `Neutral`");
    expect(designSource).toContain("Heading: `Inter`");
    expect(designSource).toContain("Font: `Inter`");
    expect(designSource).toContain("Icon Library: `HugeIcons`");
    expect(designSource).toContain("Radius: `Default`");
    expect(designSource).toContain("Menu: `Default / Solid`");
    expect(designSource).toContain("Menu Accent: `Subtle`");
    expect(designSource).toContain("Desktop Portal Stacking Is Owned By shadcn/Base Primitives");
    expect(designSource).toContain("Desktop Settings Preserve shadcn Component Chrome");
    expect(designSource).toContain("Desktop Settings Follow Official shadcn Block Shells");
    expect(designSource).toContain("sets use shadcn `Select`");
    expect(designSource).toContain(
      "Settings CSS must not define settings-specific global selectors",
    );
    expect(designSource).not.toContain("segmented controls for short mutually exclusive choices");
    expect(stylesSource).not.toContain(".settings-sheet-backdrop");
    expect(stylesSource).not.toContain("z-index: 31");
    expect(stylesSource).not.toContain("z-index: 21");
    expect(workbenchSource).not.toContain('role="menu"');
    expect(workbenchSource).not.toContain('role="dialog"');
    expect(workbenchSource).not.toContain("aria-haspopup");
    expect(workbenchSource).not.toContain("aria-modal");
    expect(workbenchSource).not.toContain("<select");
    expect(iconButtonSource).not.toContain("aria-pressed");
  });

  test("renders desktop space tabs with operator-facing labels", () => {
    const html = renderToStaticMarkup(
      React.createElement(DesktopSpaceTabs, {
        activeSpace: "projects",
        onSelectSpace: () => {},
      }),
    );

    expect(html).toContain("Chat");
    expect(html).toContain("Projects");
    expect(html).not.toContain("Everyday");
    expect(html).not.toContain("Aria");
  });

  test("renders the aria sidebar in the required order", () => {
    const html = renderToStaticMarkup(
      React.createElement(AriaSidebar, {
        ariaState: SAMPLE_ARIA_STATE,
        ariaRuntimeConnected: true,
        pinnedSessionIds: [],
        onArchiveChatSession: () => {},
        onCreateChat: () => {},
        onOpenSettings: () => {},
        onSearchChatSessions: () => {},
        onSelectChatSession: () => {},
        onSelectConnectorScreen: () => {},
        onSelectScreen: () => {},
        onTogglePinnedChatSession: () => {},
        settingsActive: false,
      }),
    );

    expect(html.indexOf("Automations")).toBeLessThan(html.indexOf("Connectors"));
    expect(html.indexOf("Connectors")).toBeLessThan(html.indexOf("Chat"));
    expect(html.indexOf("Chat")).toBeLessThan(html.indexOf("Settings"));
    expect(html).toContain("Draft release notes");
    expect(html).not.toContain("Archived chat");
    expect(html).toContain("Pin Draft release notes");
    expect(html).toContain("Archive Draft release notes");
  });

  test("renders project thread row pin and archive actions", () => {
    const html = renderToStaticMarkup(
      React.createElement(ProjectSidebar, {
        collapsedProjectIds: [],
        onArchiveThread: () => {},
        onCreateThread: () => {},
        onOpenSettings: () => {},
        onSelectProject: () => {},
        onSelectThread: () => {},
        onTogglePinnedThread: () => {},
        onToggleProject: () => {},
        projects: [
          {
            ...SAMPLE_PROJECT,
            threads: [
              {
                ...SAMPLE_PROJECT.threads[0],
                pinned: true,
              },
            ],
          },
        ],
        selectedProjectId: "project-1",
        selectedThreadId: "thread-1",
        settingsActive: false,
      }),
    );

    expect(html).toContain("Unpin Desktop Projects Aria");
    expect(html).toContain("Archive Desktop Projects Aria");
  });

  test("renders desktop settings from durable settings state", () => {
    const html = renderToStaticMarkup(
      React.createElement(SettingsView, {
        onUpdate: () => {},
        settingsState: SAMPLE_SETTINGS_STATE,
      }),
    );

    expect(html).toContain('data-slot="sidebar-provider"');
    expect(html).toContain('data-slot="sidebar"');
    expect(html).toContain('data-slot="sidebar-menu"');
    expect(html).toContain('data-slot="sidebar-menu-button"');
    expect(html).toContain('data-slot="sidebar-inset"');
    expect(html).not.toContain('data-slot="tabs-content"');
    expect(html).toContain('data-slot="select-trigger"');
    expect(html).not.toContain('data-slot="toggle-group"');
    expect(html).not.toContain('data-slot="toggle-group-item"');
    expect(html).toContain('data-slot="field-group"');
    expect(html).toContain('data-slot="field"');
    expect(html).toContain("Default Space");
    expect(html).toContain("Start At Login");
    expect(html).toContain("Runtime");
    expect(html).toContain("Models");
    expect(html).toContain("Security");
    expect(html).toContain("Providers");
    expect(html).toContain("Connectors");
    expect(html).toContain("Memory &amp; Skills");
  });

  test("renders settings add flows with sheet launchers", () => {
    const providerHtml = renderToStaticMarkup(
      React.createElement(SettingsView, {
        initialSectionId: "providers",
        onUpdate: () => {},
        settingsState: SAMPLE_SETTINGS_STATE,
      }),
    );
    const modelHtml = renderToStaticMarkup(
      React.createElement(SettingsView, {
        initialSectionId: "models",
        onUpdate: () => {},
        settingsState: SAMPLE_SETTINGS_STATE,
      }),
    );
    const connectorHtml = renderToStaticMarkup(
      React.createElement(SettingsView, {
        initialSectionId: "connectors",
        onUpdate: () => {},
        settingsState: SAMPLE_SETTINGS_STATE,
      }),
    );

    expect(providerHtml).toContain("Add Provider");
    expect(providerHtml).not.toContain("settings-wizard");
    expect(providerHtml).not.toContain("settings-sheet");
    expect(providerHtml).not.toContain("Provider Credentials Review");
    expect(modelHtml).toContain("Add Model");
    expect(modelHtml).toContain("Model Configuration");
    expect(modelHtml).toContain("Model List");
    expect(modelHtml).not.toContain("Type Model Tuning Review");
    expect(connectorHtml).toContain("Configure");
    expect(connectorHtml).toContain("Connector List");
    expect(connectorHtml).toContain("Connector Preferences");
    expect(connectorHtml).not.toContain("Connector Policy Credentials Review");
    expect(connectorHtml).toContain("Connector Verbosity");
  });

  test("renders the empty chat state as a centered composer with send button", () => {
    const html = renderToStaticMarkup(
      React.createElement(AriaChatView, {
        chat: SAMPLE_ARIA_STATE.chat,
        emptyPlaceholder: "Message Aria",
        onAcceptForSession: () => {},
        onAnswerQuestion: () => {},
        onApproveToolCall: () => {},
        onSendMessage: () => {},
      }),
    );

    expect(html).toContain("aria-chat-composer is-centered");
    expect(html).toContain("Send");
    expect(html).not.toContain("What should we work on?");
  });

  test("resolves and applies inline project prompt references for skills and files", () => {
    const skillQuery = resolveComposerPromptQuery("Use $desk", "Use $desk".length);
    const fileQuery = resolveComposerPromptQuery("Check @src/des", "Check @src/des".length);

    const skillSuggestions = buildComposerPromptSuggestions(
      SAMPLE_PROJECT_THREAD_STATE.promptSuggestions,
      skillQuery,
    );
    const fileSuggestions = buildComposerPromptSuggestions(
      SAMPLE_PROJECT_THREAD_STATE.promptSuggestions,
      fileQuery,
    );

    expect(skillSuggestions[0]?.replacement).toBe("$desktop-ux");
    expect(fileSuggestions[0]?.replacement).toBe("@src/desktop.tsx");

    expect(applyComposerPromptSuggestion("Use $desk", skillQuery!, skillSuggestions[0]!)).toEqual({
      nextCursor: "Use $desktop-ux ".length,
      nextValue: "Use $desktop-ux ",
    });
    expect(
      applyComposerPromptSuggestion("Check @src/des next", fileQuery!, fileSuggestions[0]!),
    ).toEqual({
      nextCursor: "Check @src/desktop.tsx ".length,
      nextValue: "Check @src/desktop.tsx next",
    });
  });

  test("renders assistant messages centered and user messages in bubbles", () => {
    const assistantHtml = renderToStaticMarkup(
      React.createElement(AriaMessageItem, {
        message: {
          content: "**Bold** reply",
          id: "assistant-1",
          role: "assistant",
          toolName: null,
        },
      }),
    );
    const userHtml = renderToStaticMarkup(
      React.createElement(AriaMessageItem, {
        message: {
          content: "A user message",
          id: "user-1",
          role: "user",
          toolName: null,
        },
      }),
    );

    expect(assistantHtml).toContain("aria-message-assistant-content");
    expect(assistantHtml).toContain("<strong>Bold</strong>");
    expect(userHtml).toContain("aria-message-user-content");
    expect(userHtml).toContain("aria-message-user-bubble");
    expect(userHtml).toContain("A user message");
  });

  test("renders tool messages as compact system rows", () => {
    const toolHtml = renderToStaticMarkup(
      React.createElement(AriaMessageItem, {
        message: {
          content: "Calling ask_user...",
          id: "tool-1",
          role: "tool",
          toolName: "ask_user",
        },
      }),
    );

    expect(toolHtml).toContain("aria-message-system-content");
    expect(toolHtml).toContain("Question");
    expect(toolHtml).toContain("Waiting for input");
    expect(toolHtml).not.toContain("ask_user");
  });

  test("renders a thinking state instead of the empty composer while the first response is streaming", () => {
    const html = renderToStaticMarkup(
      React.createElement(AriaChatView, {
        chat: {
          ...SAMPLE_ARIA_STATE.chat,
          isStreaming: true,
          streamingPhase: "thinking",
          streamingText: "",
        },
        emptyPlaceholder: "Message Aria",
        onAcceptForSession: () => {},
        onAnswerQuestion: () => {},
        onApproveToolCall: () => {},
        onSendMessage: () => {},
      }),
    );

    expect(html).toContain("aria-streaming-status");
    expect(html).toContain("Thinking");
    expect(html).not.toContain("aria-chat-composer is-centered");
  });

  test("renders archived sessions as read-only with a new chat action", () => {
    const html = renderToStaticMarkup(
      React.createElement(AriaChatView, {
        chat: {
          ...SAMPLE_ARIA_STATE.chat,
          messages: [
            {
              content: "Archived answer",
              id: "assistant-archived",
              role: "assistant",
              toolName: null,
            },
          ],
        },
        emptyPlaceholder: "Message Aria",
        isArchived: true,
        onAcceptForSession: () => {},
        onAnswerQuestion: () => {},
        onApproveToolCall: () => {},
        onSendMessage: () => {},
      }),
    );

    expect(html).toContain("archived session");
    expect(html).not.toContain("New chat");
    expect(html).not.toContain("aria-chat-composer-shell");
  });

  test("renders project threads with the reused chat interface and thread metadata", () => {
    const html = renderToStaticMarkup(
      React.createElement(ThreadView, {
        onCreateBranch: () => {},
        onImportProject: () => {},
        onSetModel: () => {},
        onSendMessage: () => {},
        onSwitchEnvironment: () => {},
        selectedProject: SAMPLE_PROJECT,
        selectedThreadState: SAMPLE_PROJECT_THREAD_STATE,
      }),
    );

    expect(html).not.toContain("project-thread-header");
    expect(html).toContain("project-thread-composer-trigger");
    expect(html).toContain("Branch: main");
    expect(html).toContain("main");
    expect(html).not.toContain("This Device / main");
    expect(html).not.toContain("Select coding agent:");
    expect(html).toContain("Model: Default");
    expect(html).toContain("aria-chat-view");
    expect(html).toContain("Message Aria");
    expect(html).not.toContain("Message Aria Agent");
    expect(html).toContain("aria-message-user-bubble");
    expect(html).toContain("Implemented the local agent view.");
  });

  test("renders pending ask-user prompts above the composer with composer-aligned chrome", () => {
    const html = renderToStaticMarkup(
      React.createElement(AriaChatView, {
        chat: {
          ...SAMPLE_ARIA_STATE.chat,
          messages: [
            {
              content: "Calling ask_user...",
              id: "tool-ask-user",
              role: "tool",
              toolName: "ask_user",
            },
          ],
          pendingQuestion: {
            question: "What would you like to call this session?",
            questionId: "question-1",
          },
        },
        emptyPlaceholder: "Message Aria",
        onAcceptForSession: () => {},
        onAnswerQuestion: () => {},
        onApproveToolCall: () => {},
        onSendMessage: () => {},
      }),
    );

    expect(html).toContain("aria-question-prompt");
    expect(html).toContain("What would you like to call this session?");
    expect(html).toContain("aria-question-prompt-shell");
    expect(html).toContain("Submit answer");
  });

  test("renders pending approvals above the composer with compact action buttons", () => {
    const html = renderToStaticMarkup(
      React.createElement(AriaChatView, {
        chat: {
          ...SAMPLE_ARIA_STATE.chat,
          messages: [
            {
              content: "Calling ask_user...",
              id: "tool-approval",
              role: "tool",
              toolName: "ask_user",
            },
          ],
          pendingApproval: {
            args: { title: "Functionality" },
            toolCallId: "tool-call-1",
            toolName: "ask_user",
          },
        },
        emptyPlaceholder: "Message Aria",
        onAcceptForSession: () => {},
        onAnswerQuestion: () => {},
        onApproveToolCall: () => {},
        onSendMessage: () => {},
      }),
    );

    expect(html).toContain("aria-action-prompt");
    expect(html).toContain("Allow session");
    expect(html).toContain("Approve");
    expect(html).not.toContain("aria-inline-card");
  });
});
