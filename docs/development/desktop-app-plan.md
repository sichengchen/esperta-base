# Aria Desktop v1 - Implementation Plan

## Overview

Build a fully working Superset-style desktop application for Aria with:
- `packages/desktop-ui/` - Shared component library
- **Codex-style sidebar** - Multiple workspaces with nested threads, no file explorer
- **Full terminal** - xterm.js emulation
- **electron-vite** - Modern build system
- **Local-first** - No auth, no onboarding

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Build | electron-vite + electron-builder |
| UI Library | `packages/desktop-ui/` (Tailwind v4 + CSS variables) |
| Components | Custom (Button, Dialog, Tabs, etc.) |
| Routing | TanStack Router (hash-based, no auth) |
| State | Zustand stores |
| Terminal | xterm.js + addons |
| IPC | electron-trpc |
| Editor | `code` CLI for "Open in VS Code" |

---

## Directory Structure

```
esperta-aria/
├── packages/
│   └── desktop-ui/              # NEW
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── styles/
│           │   └── globals.css   # Tailwind + CSS variables
│           └── components/
│               ├── Button/
│               ├── Input/
│               ├── Dialog/
│               ├── Dropdown/
│               ├── Tabs/
│               ├── Select/
│               ├── Tooltip/
│               ├── Badge/
│               ├── Card/
│               ├── ScrollArea/
│               ├── Separator/
│               └── Toast/
│
└── apps/
    └── aria-desktop/
        ├── electron.vite.config.ts
        ├── electron-builder.ts
        ├── package.json
        └── src/
            ├── main/                     # Electron main
            │   ├── index.ts
            │   ├── ipc.ts
            │   └── windows/
            ├── preload/                 # Secure bridge
            │   └── index.ts
            └── renderer/                # React UI
                ├── index.html
                ├── index.tsx
                ├── routes/
                │   ├── __root.tsx
                │   ├── -layout.tsx
                │   ├── page.tsx
                │   ├── _workspace/
                │   │   ├── layout.tsx
                │   │   └── page.tsx
                │   └── not-found.tsx
                ├── components/
                │   ├── AppFrame/
                │   ├── Sidebar/
                │   │   ├── SidebarHeader
                │   │   ├── WorkspaceSelector
                │   │   ├── WorkspaceSection
                │   │   └── ThreadList
                │   ├── WorkspaceView/
                │   ├── ResizablePanel/
                │   ├── TabBar/
                │   ├── TabContent/
                │   ├── ChatInterface/
                │   ├── Terminal/
                │   ├── CommandPalette/
                │   └── StatusIndicator/
                ├── stores/
                │   ├── sidebar.ts
                │   ├── tabs.ts
                │   ├── theme.ts
                │   ├── workspace.ts
                │   ├── terminal.ts
                │   └── thread.ts
                ├── hooks/
                ├── lib/
                │   └── electron.ts
                └── styles/
```

---

## Key Design Decisions

| Decision | Choice |
|----------|--------|
| UI Package | `packages/desktop-ui/` |
| File Explorer | **None** - Codex-style sidebar only |
| Sidebar Content | Workspaces → Threads (nested) |
| Open in Editor | `code --goto <file>:<line>` via IPC |
| Auth/Onboarding | **None** - local-first |
| Routing | Single layout, no auth guards |
| Theme | Dark (default) + Light via CSS variables |

---

## Implementation Phases

### Phase 1: Package Setup

**Duration:** 2 weeks

| Step | Action | Deliverable |
|------|--------|-------------|
| 1.1 | Create `packages/desktop-ui/` scaffold | Package with package.json, tsconfig, basic structure |
| 1.2 | Set up Tailwind CSS v4 + CSS variables | `globals.css` with dark/light theme tokens |
| 1.3 | Install dependencies | tailwindcss, clsx, tailwind-merge, sonner, lucide-react |
| 1.4 | Create electron.vite.config.ts | Unified build for main/preload/renderer |
| 1.5 | Verify empty shell builds | `bun run dev` works without errors |

### Phase 2: Main Process

**Duration:** 2 weeks

| Step | Action | Deliverable |
|------|--------|-------------|
| 2.1 | Create main/index.ts | App lifecycle, window creation |
| 2.2 | Implement BrowserWindow factory | Proper webPreferences (contextIsolation, sandbox) |
| 2.3 | Create IPC registry | Main process IPC handlers |
| 2.4 | Implement preload bridge | contextBridge with invoke/on/send |
| 2.5 | Add window controls IPC | minimize, maximize, close handlers |

### Phase 3: Base Components

**Duration:** 2 weeks

| Step | Action | Deliverable |
|------|--------|-------------|
| 3.1 | Button | Variants: primary, secondary, ghost, danger |
| 3.2 | Input | text, password, search variants |
| 3.3 | Dialog | Modal with backdrop, focus trap |
| 3.4 | Dropdown | Menu with items, separators |
| 3.5 | Tabs | TabList, Tab, TabPanel with ARIA |
| 3.6 | Select | Custom select with options |
| 3.7 | Tooltip | Hover tooltips with positioning |
| 3.8 | Badge | Status indicators |
| 3.9 | Card | Container component |
| 3.10 | ScrollArea | Custom scrollbar styling |

### Phase 4: AppFrame + Sidebar

**Duration:** 2 weeks

| Step | Action | Deliverable |
|------|--------|-------------|
| 4.1 | AppFrame component | Main shell with three-pane CSS Grid layout |
| 4.2 | Sidebar resizable | ResizablePanel with drag handle |
| 4.3 | SidebarHeader | Workspace switcher dropdown |
| 4.4 | WorkspaceSelector | Dropdown to switch between workspaces |
| 4.5 | WorkspaceSection | Collapsible workspace item |
| 4.6 | ThreadList | Nested thread items under workspace |
| 4.7 | SidebarFooter | Settings button, theme toggle |
| 4.8 | Zustand sidebarStore | isOpen, width, mode state |

### Phase 5: TabBar + Chat

**Duration:** 2 weeks

| Step | Action | Deliverable |
|------|--------|-------------|
| 5.1 | TabBar component | Horizontal tab list with close buttons |
| 5.2 | TabContent | Pane content container |
| 5.3 | Zustand tabsStore | tabs[], activeTabId, pane layouts |
| 5.4 | ChatInterface | Message list with roles |
| 5.5 | MessageItem | User/assistant/tool/error rendering |
| 5.6 | ApprovalCard | Tool approval prompts |
| 5.7 | QuestionCard | Question/answer prompts |
| 5.8 | Zustand threadStore | connected, messages[], pendingApproval |

### Phase 6: Terminal

**Duration:** 2 weeks

| Step | Action | Deliverable |
|------|--------|-------------|
| 6.1 | xterm.js integration | @xterm/xterm + addons (fit, web-links) |
| 6.2 | Terminal component | xterm wrapper with theme sync |
| 6.3 | PTY spawn via IPC | terminal:spawn handler in main |
| 6.4 | Terminal write IPC | terminal:write for input |
| 6.5 | Terminal data IPC | terminal:data for output streaming |
| 6.6 | Terminal resize IPC | terminal:resize on window resize |
| 6.7 | Zustand terminalStore | terminal instances, sessions |

### Phase 7: Command Palette + Polish

**Duration:** 2 weeks

| Step | Action | Deliverable |
|------|--------|-------------|
| 7.1 | CommandPalette | Cmd+K with fuzzy search |
| 7.2 | StatusIndicator | Connection status, model name |
| 7.3 | Theme toggle | Dark/light/system via ThemeStore |
| 7.4 | Settings page | Preferences UI |
| 7.5 | Keyboard shortcuts | Global hotkey registration |

### Phase 8: Packaging

**Duration:** 2 weeks

| Step | Action | Deliverable |
|------|--------|-------------|
| 8.1 | electron-builder.ts config | Platform-specific settings |
| 8.2 | macOS build | DMG + ZIP with entitlements |
| 8.3 | Linux build | AppImage + deb |
| 8.4 | Windows build | NSIS + ZIP |
| 8.5 | Testing | Smoke tests on all platforms |

**Total: ~14 weeks**

---

## IPC Channels

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `window:minimize` | R → M | Minimize window |
| `window:maximize` | R → M | Toggle maximize |
| `window:close` | R → M | Close window |
| `editor:open` | R → M | `code --goto <path>:<line>` |
| `terminal:spawn` | R → M | Create PTY |
| `terminal:write` | R → M | Write to PTY |
| `terminal:data` | M → R | PTY output |
| `terminal:resize` | R → M | Resize PTY |
| `terminal:kill` | R → M | Kill PTY |

---

## Sidebar Behavior (Codex Pattern)

```
┌─────────────────────────────────────┐
│ ▼ Workspace 1              [+]     │
│   ├─ Thread: Fix login bug          │
│   ├─ Thread: Add dark mode   [>]    │  ← "Open in editor" opens VS Code
│   └─ Thread: API refactor           │
│                                     │
│ ▶ Workspace 2              [+]      │
│   └─ Thread: Dashboard UI           │
│                                     │
│ ▼ Workspace 3              [+]      │
│                                     │
├─────────────────────────────────────┤
│ [⚙️]  [🌙/☀️]                         │
└─────────────────────────────────────┘
```

- Click workspace → expand/collapse threads
- Click thread → open in main area (TabContent)
- Click [>] or button → `code --goto <path>` for that thread's context
- Theme toggle → dark/light

---

## Dependencies

### `packages/desktop-ui/`

```json
{
  "dependencies": {
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.5.0",
    "sonner": "^1.5.0",
    "lucide-react": "^0.400.0",
    "tw-animate-css": "^0.2.0"
  }
}
```

### `apps/aria-desktop/`

```json
{
  "dependencies": {
    "@xterm/xterm": "^5.5.0",
    "@xterm/addon-fit": "^0.10.0",
    "@xterm/addon-web-links": "^0.11.0",
    "@tanstack/react-router": "^1.50.0",
    "@tanstack/react-query": "^5.50.0",
    "zustand": "^5.0.0",
    "react-dnd": "^16.0.0",
    "react-dnd-html5-backend": "^16.0.0",
    "react-mosaic-component": "^6.0.0",
    "electron-store": "^10.0.0",
    "@aria/desktop-ui": "workspace:*"
  }
}
```

---

## Build Commands

```bash
bun run dev          # electron-vite dev (hot reload)
bun run build        # Build all (main + preload + renderer)
bun run package      # electron-builder package
bun run release      # Build + package for distribution
```

---

## Platform Targets

| Platform | Output |
|----------|--------|
| macOS | `.dmg`, `.zip` |
| Linux | `.AppImage`, `.deb` |
| Windows | `.nsis`, `.zip` |

---

## Implementation Status

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Package Setup | ✅ Complete | `desktop-ui` package scaffolded with electron-vite config |
| Phase 2: Main Process | ✅ Complete | `electron-main.ts`, `electron-preload.ts` with IPC registry |
| Phase 3: Base Components | ✅ Complete | Button, Input, Dialog, Dropdown, Tabs, Select, Tooltip, Badge, Card, ScrollArea, Separator, Toast |
| Phase 4: AppFrame + Sidebar | ✅ Complete | AppFrame, Sidebar, WorkspaceSection, ThreadList |
| Phase 5: TabBar + Chat | ✅ Complete | TabBar, TabContent components created; DesktopShellUI updated with workspace tabs |
| Phase 6: Terminal | ✅ Complete | xterm.js with PTY via IPC; Terminal component, terminalStore, IPC handlers |
| Phase 7: Command Palette + Polish | ✅ Complete | CommandPalette with fuzzy search, StatusIndicator, SettingsDialog |
| Phase 8: Packaging | ✅ Complete | electron-builder.json configured for macOS dmg/zip, Linux AppImage/zip, Windows nsis/zip |

---

## References

- Superset Desktop App: https://github.com/superset-sh/superset/tree/main/apps/desktop
- electron-vite: https://electron-vite.github.io/
- TanStack Router: https://tanstack.com/router/
- Zustand: https://zustand.docs.pmnd.rs/
- xterm.js: https://xtermjs.org/
