# Desktop Remediation Plan

This document records the current desktop audit, the remediation scope, and the
acceptance bar for the next desktop repair pass.

## Audit Findings

The current desktop implementation had four critical problems:

1. The shipped renderer path and the tested shell path diverged.
   - `apps/aria-desktop/src/root.tsx` rendered `DesktopShellUI`.
   - `tests/aria-desktop-*.test.ts` exercised `AriaDesktopAppShell`.
   - The runtime and the tests were therefore validating different UIs.

2. Core visible controls did not map to durable shell transitions.
   - space switching
   - screen switching
   - inspector panel switching
   - workspace management

3. Workspace and environment management existed only in the CLI surface.
   - `aria projects workspace-create`
   - `aria projects environment-create`
   - The desktop shell had no equivalent operator path.

4. Desktop-local project shell state had no runtime persistence path.
   - server-hosted Aria state is already durable through the server
   - desktop-local shell scaffolding needed a local persistence layer for
     project/thread/workspace/environment state until a stronger desktop-local
     projects backend is wired into the Electron runtime

## Remediation Scope

This pass fixes the desktop workbench in four steps:

1. Collapse the renderer onto the tested shell path.
   - `DesktopShellUI` becomes a thin wrapper over `AriaDesktopAppShell`
   - runtime and tests now exercise the same shell

2. Complete the missing shell transitions.
   - select space
   - select screen
   - select inspector panel
   - create project thread
   - create workspace
   - create environment

3. Add desktop-native management flows.
   - project thread creation in the `Projects` space
   - workspace creation in the inspector
   - environment creation in the inspector
   - explicit thread-to-environment switching

4. Persist desktop-local shell state in the renderer.
   - use browser storage for desktop-local shell cache
   - persist project/thread/workspace/environment UI state
   - do not treat browser storage as the source of truth for server-hosted Aria state

## Intentional Interim Choice

The Electron runtime today does not have a Node-compatible durable projects
store wired behind the desktop shell. The existing projects repository uses a
Bun-only storage path in tests and CLI workflows.

To unblock the desktop shell now, this pass uses desktop-local renderer
persistence for shell state.

That is an interim choice with these rules:

- acceptable for desktop-local shell cache and setup state
- not a replacement for server-owned Aria state
- not a replacement for a future desktop-local projects service

## Acceptance Criteria

This remediation is only acceptable when all of the following are true:

- the runtime renderer and the tested shell are the same UI path
- every visible space, screen, and inspector tab drives real shell state
- the desktop can create a project thread without CLI fallback
- the desktop can create a workspace without CLI fallback
- the desktop can create an environment without CLI fallback
- a created environment can be selected from the active thread view
- desktop-local shell state survives a renderer reload through local persistence
- desktop tests cover the new transitions and creation flows
- `bun run check`, `bun run test`, and `bun run build` pass
