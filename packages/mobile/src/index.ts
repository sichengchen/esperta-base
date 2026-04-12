import {
  buildAccessClientConfig,
  type AccessClientTarget,
} from "@aria/access-client";
import {
  createProjectThreadListItem,
  type ProjectThreadListItem,
} from "@aria/ui";
import {
  describeThreadType,
  resolveThreadType,
  type ProjectRecord,
  type ThreadRecord,
  type ThreadType,
} from "@aria/projects";

export const ariaMobileApp = {
  id: "aria-mobile",
  displayName: "Aria Mobile",
  surface: "mobile",
  sharedPackages: [
    "@aria/access-client",
    "@aria/ui",
    "@aria/projects",
    "@aria/protocol",
  ],
  capabilities: [
    "server-access",
    "project-threads",
    "remote-review",
    "approvals",
    "automation",
    "reconnect",
  ],
} as const;

export const ariaMobileTabs = [
  { id: "aria", label: "Aria" },
  { id: "projects", label: "Projects" },
] as const;

export const ariaMobileDetailPresentations = [
  "bottom-sheet",
  "push-screen",
  "segmented-detail-view",
] as const;

export const ariaMobileActionSections = [
  { id: "approvals", label: "Approvals" },
  { id: "automation", label: "Automations" },
  { id: "remote-review", label: "Remote Review" },
  { id: "reconnect", label: "Reconnect" },
  { id: "job-status", label: "Job Status" },
] as const;

export type AriaMobileTab = (typeof ariaMobileTabs)[number];
export type AriaMobileDetailPresentation = (typeof ariaMobileDetailPresentations)[number];
export type AriaMobileActionSection = (typeof ariaMobileActionSections)[number];

export interface AriaMobileProjectThreads {
  projectLabel: string;
  threads: AriaMobileProjectThreadItem[];
}

export interface AriaMobileBootstrap {
  app: typeof ariaMobileApp;
  access: ReturnType<typeof buildAccessClientConfig>;
  initialThread?: AriaMobileProjectThreadItem;
}

export interface AriaMobileThreadSignals {
  approvalLabel?: string;
  automationLabel?: string;
  remoteReviewLabel?: string;
  connectionLabel?: string;
  reconnectLabel?: string;
}

export interface AriaMobileProjectThreadItem extends ProjectThreadListItem, AriaMobileThreadSignals {}

export interface AriaMobileThreadContext {
  threadId: string;
  threadType: ThreadType;
  threadTypeLabel: string;
  remoteStatusLabel?: string;
  connectionLabel?: string;
  approvalLabel?: string;
  automationLabel?: string;
  remoteReviewLabel?: string;
  reconnectLabel?: string;
  sections: typeof ariaMobileActionSections;
}

export interface AriaMobileShellProjectInput {
  project: Pick<ProjectRecord, "name">;
  threads: AriaMobileProjectThreadInput[];
}

export interface AriaMobileShellInitialThread {
  project: Pick<ProjectRecord, "name">;
  thread: AriaMobileProjectThreadInput;
}

export interface AriaMobileProjectThreadInput
  extends Pick<
    ThreadRecord,
    "threadId" | "title" | "status" | "threadType" | "environmentId" | "agentId"
  >,
    AriaMobileThreadSignals {}

export interface CreateAriaMobileShellOptions {
  target: AccessClientTarget;
  projects?: AriaMobileShellProjectInput[];
  initialThread?: AriaMobileShellInitialThread;
  activeThreadContext?: {
    thread: Pick<ThreadRecord, "threadId" | "threadType"> & AriaMobileThreadSignals;
    remoteStatusLabel?: string;
  };
}

export interface AriaMobileShell {
  app: typeof ariaMobileApp;
  tabs: typeof ariaMobileTabs;
  detailPresentations: typeof ariaMobileDetailPresentations;
  actionSections: typeof ariaMobileActionSections;
  access: ReturnType<typeof buildAccessClientConfig>;
  projectThreads: AriaMobileProjectThreads[];
  initialThread?: AriaMobileProjectThreadItem;
  activeThreadContext?: AriaMobileThreadContext;
}

export function createAriaMobileProjectThreadItem(
  project: Pick<ProjectRecord, "name">,
  thread: AriaMobileProjectThreadInput,
): AriaMobileProjectThreadItem {
  const threadItem = createProjectThreadListItem(project, thread);
  return {
    ...threadItem,
    ...(thread.approvalLabel ? { approvalLabel: thread.approvalLabel } : {}),
    ...(thread.automationLabel ? { automationLabel: thread.automationLabel } : {}),
    ...(thread.remoteReviewLabel ? { remoteReviewLabel: thread.remoteReviewLabel } : {}),
    ...(thread.connectionLabel ? { connectionLabel: thread.connectionLabel } : {}),
    ...(thread.reconnectLabel ? { reconnectLabel: thread.reconnectLabel } : {}),
  };
}

export function createAriaMobileProjectThreads(
  projects: Array<{
    project: Pick<ProjectRecord, "name">;
    threads: AriaMobileProjectThreadInput[];
  }>,
): AriaMobileProjectThreads[] {
  return projects.map(({ project, threads }) => ({
    projectLabel: project.name,
    threads: threads.map((thread) => createAriaMobileProjectThreadItem(project, thread)),
  }));
}

export function createAriaMobileThreadContext(input: {
  thread: Pick<ThreadRecord, "threadId" | "threadType"> & AriaMobileThreadSignals;
  remoteStatusLabel?: string;
}): AriaMobileThreadContext {
  const threadType = resolveThreadType(input.thread);
  return {
    threadId: input.thread.threadId,
    threadType,
    threadTypeLabel: describeThreadType(threadType),
    remoteStatusLabel: input.remoteStatusLabel,
    ...(input.thread.connectionLabel ? { connectionLabel: input.thread.connectionLabel } : {}),
    ...(input.thread.approvalLabel ? { approvalLabel: input.thread.approvalLabel } : {}),
    ...(input.thread.automationLabel ? { automationLabel: input.thread.automationLabel } : {}),
    ...(input.thread.remoteReviewLabel ? { remoteReviewLabel: input.thread.remoteReviewLabel } : {}),
    ...(input.thread.reconnectLabel ? { reconnectLabel: input.thread.reconnectLabel } : {}),
    sections: ariaMobileActionSections,
  };
}

export function createAriaMobileBootstrap(
  target: AccessClientTarget,
  initialThread?: {
    project: Pick<ProjectRecord, "name">;
    thread: AriaMobileProjectThreadInput;
  },
): AriaMobileBootstrap {
  return {
    app: ariaMobileApp,
    access: buildAccessClientConfig(target),
    initialThread: initialThread
      ? createAriaMobileProjectThreadItem(initialThread.project, initialThread.thread)
      : undefined,
  };
}

export function createAriaMobileShell(
  options: CreateAriaMobileShellOptions,
): AriaMobileShell {
  const bootstrap = createAriaMobileBootstrap(options.target, options.initialThread);

  return {
    app: bootstrap.app,
    tabs: ariaMobileTabs,
    detailPresentations: ariaMobileDetailPresentations,
    actionSections: ariaMobileActionSections,
    access: bootstrap.access,
    projectThreads: createAriaMobileProjectThreads(options.projects ?? []),
    initialThread: bootstrap.initialThread,
    activeThreadContext: options.activeThreadContext
      ? createAriaMobileThreadContext(options.activeThreadContext)
      : undefined,
  };
}
