import {
  type EnvironmentRecord,
  type ServerRecord,
  type WorkspaceRecord,
  describeThreadType,
  resolveThreadType,
  type ProjectRecord,
  type TaskStatus,
  type ThreadRecord,
  type ThreadStatus,
  type ThreadType,
} from "@aria/projects";

export type {
  ProjectRecord,
  TaskRecord,
  TaskStatus,
  ThreadRecord,
  ThreadStatus,
} from "@aria/projects";

export interface ProjectThreadListItem {
  id: string;
  title: string;
  projectLabel: string;
  status: string;
  threadType: ThreadType;
  threadTypeLabel: string;
  environmentId?: string | null;
  agentId?: string | null;
}

export interface ProjectEnvironmentListItem {
  id: string;
  label: string;
  hostLabel: string;
  mode: EnvironmentRecord["mode"];
  kind: EnvironmentRecord["kind"];
  locator: string;
}

function formatStatusLabel(status: TaskStatus | ThreadStatus): string {
  return status
    .split(/[-_]/g)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function createProjectThreadListItem(
  project: Pick<ProjectRecord, "name">,
  thread: Pick<ThreadRecord, "threadId" | "title" | "status" | "threadType" | "environmentId" | "agentId">,
): ProjectThreadListItem {
  const threadType = resolveThreadType(thread);
  return {
    id: thread.threadId,
    title: thread.title,
    projectLabel: project.name,
    status: formatStatusLabel(thread.status),
    threadType,
    threadTypeLabel: describeThreadType(threadType),
    environmentId: thread.environmentId ?? null,
    agentId: thread.agentId ?? null,
  };
}

export function createStatusBadgeLabel(status: TaskStatus | ThreadStatus): string {
  return formatStatusLabel(status);
}

export function createProjectEnvironmentListItem(
  workspace: Pick<WorkspaceRecord, "workspaceId" | "label">,
  environment: Pick<EnvironmentRecord, "environmentId" | "label" | "mode" | "kind" | "locator">,
  server?: Pick<ServerRecord, "label"> | null,
): ProjectEnvironmentListItem {
  return {
    id: environment.environmentId,
    label: environment.label,
    hostLabel: server?.label ?? workspace.label,
    mode: environment.mode,
    kind: environment.kind,
    locator: environment.locator,
  };
}
