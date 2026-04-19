import type {
  EnvironmentRecord,
  ProjectRecord,
  RepoRecord,
  ThreadRecord,
} from "../../../../packages/projects/src/types.js";
import { createProjectThreadListItem } from "../../../../packages/projects/src/view-models.js";
import type {
  AriaDesktopProjectGroup,
  AriaDesktopProjectShellState,
  AriaDesktopProjectThreadState,
  AriaDesktopProjectThreadItem,
} from "../shared/api.js";

export const DESKTOP_LOCAL_WORKSPACE_ID = "desktop-local-workspace";
export const DESKTOP_LOCAL_WORKSPACE_LABEL = "This Device";
export const DESKTOP_SHELL_STATE_ID = "desktop-shell-state";

export interface DesktopShellStateRow {
  shellId: string;
  selectedProjectId: string | null;
  selectedThreadId: string | null;
  collapsedProjectIds: string[];
  pinnedThreadIds: string[];
  archivedThreadIds: string[];
  updatedAt: number;
}

type BuildDesktopProjectShellStateInput = {
  environments: EnvironmentRecord[];
  projects: ProjectRecord[];
  repos: RepoRecord[];
  selectedThreadState?: AriaDesktopProjectThreadState | null;
  shellState: DesktopShellStateRow | null;
  threads: ThreadRecord[];
};

function buildProjectThreadItem(
  project: ProjectRecord,
  thread: ThreadRecord,
  pinnedThreadIds: Set<string>,
): AriaDesktopProjectThreadItem {
  const item = createProjectThreadListItem(project, thread);

  return {
    agentId: item.agentId ?? null,
    environmentId: item.environmentId ?? null,
    pinned: pinnedThreadIds.has(thread.threadId),
    status: thread.status,
    statusLabel: item.status,
    threadId: thread.threadId,
    threadType: item.threadType,
    threadTypeLabel: item.threadTypeLabel,
    title: item.title,
    updatedAt: thread.updatedAt,
  };
}

function buildProjectGroup(
  project: ProjectRecord,
  environments: EnvironmentRecord[],
  archivedThreadIds: Set<string>,
  pinnedThreadIds: Set<string>,
  repos: RepoRecord[],
  threads: ThreadRecord[],
): AriaDesktopProjectGroup {
  const rootPath =
    environments.find(
      (environment) =>
        environment.projectId === project.projectId &&
        environment.mode === "local" &&
        environment.kind === "main",
    )?.locator ??
    environments.find((environment) => environment.projectId === project.projectId)?.locator ??
    null;

  const repoName = repos.find((repo) => repo.projectId === project.projectId)?.name ?? null;

  return {
    name: project.name,
    projectId: project.projectId,
    repoName,
    rootPath,
    threads: threads
      .filter((thread) => thread.projectId === project.projectId)
      .filter((thread) => !archivedThreadIds.has(thread.threadId))
      .sort((left, right) => {
        const leftPinned = pinnedThreadIds.has(left.threadId);
        const rightPinned = pinnedThreadIds.has(right.threadId);

        if (leftPinned !== rightPinned) {
          return leftPinned ? -1 : 1;
        }

        return right.updatedAt - left.updatedAt;
      })
      .map((thread) => buildProjectThreadItem(project, thread, pinnedThreadIds)),
  };
}

export function buildDesktopProjectShellState({
  environments,
  projects,
  repos,
  selectedThreadState = null,
  shellState,
  threads,
}: BuildDesktopProjectShellStateInput): AriaDesktopProjectShellState {
  const pinnedThreadIds = new Set(shellState?.pinnedThreadIds ?? []);
  const archivedThreadIds = new Set(shellState?.archivedThreadIds ?? []);
  const groupedProjects = projects.map((project) =>
    buildProjectGroup(project, environments, archivedThreadIds, pinnedThreadIds, repos, threads),
  );

  const validProjectIds = new Set(groupedProjects.map((project) => project.projectId));
  const normalizedSelectedProjectId = validProjectIds.has(shellState?.selectedProjectId ?? "")
    ? (shellState?.selectedProjectId ?? null)
    : (groupedProjects[0]?.projectId ?? null);

  const selectedProject = groupedProjects.find(
    (project) => project.projectId === normalizedSelectedProjectId,
  );
  const validThreadIds = new Set(selectedProject?.threads.map((thread) => thread.threadId) ?? []);
  const normalizedSelectedThreadId = validThreadIds.has(shellState?.selectedThreadId ?? "")
    ? (shellState?.selectedThreadId ?? null)
    : null;

  return {
    collapsedProjectIds: (shellState?.collapsedProjectIds ?? []).filter((projectId) =>
      validProjectIds.has(projectId),
    ),
    archivedThreadIds: (shellState?.archivedThreadIds ?? []).filter((threadId) =>
      threads.some((thread) => thread.threadId === threadId),
    ),
    pinnedThreadIds: (shellState?.pinnedThreadIds ?? []).filter((threadId) =>
      threads.some((thread) => thread.threadId === threadId),
    ),
    projects: groupedProjects,
    selectedProjectId: normalizedSelectedProjectId,
    selectedThreadId: normalizedSelectedThreadId,
    selectedThreadState:
      selectedThreadState?.threadId === normalizedSelectedThreadId ? selectedThreadState : null,
  };
}
