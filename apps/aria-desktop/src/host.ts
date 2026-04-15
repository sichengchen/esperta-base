import {
  ariaDesktopApp,
  ariaDesktopContextPanels,
  ariaDesktopNavigation,
  ariaDesktopSpaces,
  createAriaDesktopBootstrap,
  type AriaDesktopServerInput,
  type AriaDesktopBootstrap,
} from "@aria/desktop";
import { createDesktopBridge, type DesktopBridge } from "@aria/desktop-bridge";
import type { AccessClientTarget } from "@aria/access-client";
import type { ProjectRecord, ProjectsEngineRepository, ThreadRecord } from "@aria/projects";
import type { WorktreeStatus } from "@aria/workspaces";

export const ariaDesktopHost = {
  id: "aria-desktop",
  packageName: "aria-desktop",
  displayName: "Aria Desktop",
  surface: "desktop",
  shellPackage: "@aria/desktop",
  sharedPackages: ariaDesktopApp.sharedPackages,
  capabilities: ariaDesktopApp.capabilities,
  serverSwitcher: ariaDesktopApp.serverSwitcher,
  navigation: ariaDesktopNavigation,
  spaces: ariaDesktopSpaces,
  contextPanels: ariaDesktopContextPanels,
} as const;

export interface AriaDesktopHostBootstrap {
  host: typeof ariaDesktopHost;
  shell: typeof ariaDesktopApp;
  bootstrap: AriaDesktopBootstrap;
  projectsControl?: AriaDesktopProjectsControl;
}

export interface AriaDesktopProjectsControl {
  readonly bridge: DesktopBridge;
  switchThreadEnvironment(threadId: string, environmentId: string): ThreadRecord;
  describeLocalProject(threadId: string): AriaDesktopLocalProjectState | undefined;
}

export interface AriaDesktopLocalProjectState {
  readonly threadId: string;
  readonly repoId?: string;
  readonly repoName?: string;
  readonly repoRemoteUrl?: string;
  readonly repoDefaultBranch?: string;
  readonly worktreeId?: string;
  readonly worktreePath?: string;
  readonly worktreeBranchName?: string;
  readonly worktreeBaseRef?: string;
  readonly worktreeStatus?: WorktreeStatus;
}

export interface CreateAriaDesktopHostBootstrapOptions {
  target: AccessClientTarget;
  initialThread?: {
    project: Pick<ProjectRecord, "name">;
    thread: Pick<
      ThreadRecord,
      "threadId" | "title" | "status" | "threadType" | "environmentId" | "agentId"
    >;
  };
  servers?: AriaDesktopServerInput[];
  activeServerId?: string;
  desktopBridge?: DesktopBridge;
  projectsRepository?: ProjectsEngineRepository;
}

export function createAriaDesktopProjectsControl(options: {
  desktopBridge?: DesktopBridge;
  projectsRepository?: ProjectsEngineRepository;
}): AriaDesktopProjectsControl | undefined {
  const bridge =
    options.desktopBridge ??
    (options.projectsRepository
      ? createDesktopBridge({ repository: options.projectsRepository })
      : undefined);

  if (!bridge) {
    return undefined;
  }

  return {
    bridge,
    switchThreadEnvironment(threadId, environmentId) {
      return bridge.threadEnvironments.switchThreadEnvironment({
        threadId,
        environmentId,
      }).thread;
    },
    describeLocalProject(threadId) {
      const threadPlan = bridge.planning.getThreadPlan(threadId);
      if (!threadPlan) {
        return undefined;
      }

      const repo = threadPlan.thread.repoId
        ? bridge.git.repos.getRepo(threadPlan.thread.repoId)
        : undefined;
      const worktrees = bridge.git.worktrees.listWorktrees(
        threadPlan.thread.repoId ?? undefined,
        threadId,
      );
      const worktree = worktrees.find((entry) => entry.status !== "pruned") ?? worktrees[0];

      if (!repo && !worktree) {
        return undefined;
      }

      return {
        threadId,
        repoId: repo?.repoId ?? threadPlan.thread.repoId ?? undefined,
        repoName: repo?.name,
        repoRemoteUrl: repo?.remoteUrl,
        repoDefaultBranch: repo?.defaultBranch,
        worktreeId: worktree?.worktreeId,
        worktreePath: worktree?.path,
        worktreeBranchName: worktree?.branchName,
        worktreeBaseRef: worktree?.baseRef,
        worktreeStatus: worktree?.status,
      };
    },
  };
}

export function createAriaDesktopHostBootstrap(
  options: CreateAriaDesktopHostBootstrapOptions,
): AriaDesktopHostBootstrap {
  const projectsControl = createAriaDesktopProjectsControl(options);

  return {
    host: ariaDesktopHost,
    shell: ariaDesktopApp,
    bootstrap: createAriaDesktopBootstrap(
      options.target,
      options.initialThread,
      options.servers,
      options.activeServerId,
    ),
    projectsControl,
  };
}
