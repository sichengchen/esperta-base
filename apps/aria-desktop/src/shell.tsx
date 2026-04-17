import {
  ariaDesktopContextPanels,
  ariaDesktopNavigation,
  ariaDesktopSpaces,
  createAriaDesktopEnvironmentOption,
  createAriaDesktopShell,
  type CreateAriaDesktopShellOptions,
} from "@aria/desktop";
import type {
  AccessClientTarget,
  AriaChatController,
  AriaChatSessionSummary,
  AriaChatState,
} from "@aria/access-client";
import type { DesktopBridge } from "@aria/desktop-bridge";
import type { ProjectsEngineRepository, ThreadRecord } from "@aria/projects";
import type { ReactElement, ReactNode } from "react";
import { createAriaDesktopApplicationBootstrap, createAriaDesktopAriaThread } from "./app.js";
import type { AriaDesktopLocalProjectState } from "./host.js";

type AriaDesktopProjectThread = NonNullable<
  CreateAriaDesktopShellOptions["projects"]
>[number]["threads"][number];
type AriaDesktopEnvironmentSwitchThread = AriaDesktopProjectThread &
  Pick<ThreadRecord, "workspaceId" | "environmentBindingId">;

export interface CreateAriaDesktopAppShellModelOptions {
  target: AccessClientTarget;
  initialThread?: Parameters<typeof createAriaDesktopApplicationBootstrap>[0]["initialThread"];
  servers?: CreateAriaDesktopShellOptions["servers"];
  activeServerId?: CreateAriaDesktopShellOptions["activeServerId"];
  projects?: CreateAriaDesktopShellOptions["projects"];
  environments?: CreateAriaDesktopShellOptions["environments"];
  activeThreadContext?: CreateAriaDesktopShellOptions["activeThreadContext"];
  activeSpaceId?: (typeof ariaDesktopSpaces)[number]["id"];
  activeContextPanelId?: (typeof ariaDesktopContextPanels)[number]["id"];
  ariaThreadController?: AriaChatController;
  createAriaThreadController?: (target: AccessClientTarget) => AriaChatController;
  ariaThreadState?: AriaChatState;
  desktopBridge?: DesktopBridge;
  projectsRepository?: ProjectsEngineRepository;
  switchThreadEnvironment?: (
    threadId: string,
    environmentId: string,
  ) => AriaDesktopEnvironmentSwitchThread;
  resolveLocalProjectState?: (threadId: string) => AriaDesktopLocalProjectState | undefined;
  activeScreenId?: string;
}

export interface AriaDesktopAppShellSourceOptions extends Omit<
  CreateAriaDesktopAppShellModelOptions,
  "ariaThreadController" | "ariaThreadState"
> {}

export interface AriaDesktopAppShellModel {
  application: ReturnType<typeof createAriaDesktopApplicationBootstrap>["application"];
  bootstrap: ReturnType<typeof createAriaDesktopApplicationBootstrap>;
  shell: ReturnType<typeof createAriaDesktopShell>;
  activeServerId: string;
  activeServerLabel: string;
  activeSpaceId: (typeof ariaDesktopSpaces)[number]["id"];
  activeScreenId: string;
  activeContextPanelId: (typeof ariaDesktopContextPanels)[number]["id"];
  ariaThread: ReturnType<typeof createAriaDesktopAriaThread>;
  ariaRecentSessions: AriaChatSessionSummary[];
  activeLocalProjectState?: AriaDesktopLocalProjectState;
  sourceOptions: AriaDesktopAppShellSourceOptions;
}

function resolveNavigationEntryForSpace(
  spaceId: (typeof ariaDesktopSpaces)[number]["id"],
) {
  return ariaDesktopNavigation.find((entry) => entry.spaceId === spaceId) ?? ariaDesktopNavigation[0];
}

function resolveNavigationEntryForScreen(screenId: string) {
  return ariaDesktopNavigation.find((entry) =>
    entry.screens.some((screen) => screen.id === screenId),
  );
}

function resolveActiveScreenId(params: {
  activeSpaceId: (typeof ariaDesktopSpaces)[number]["id"];
  requestedScreenId?: string;
  hasActiveThread: boolean;
}) {
  const navigation = resolveNavigationEntryForSpace(params.activeSpaceId);
  if (
    params.requestedScreenId &&
    navigation.screens.some((screen) => screen.id === params.requestedScreenId)
  ) {
    return params.requestedScreenId;
  }

  if (params.activeSpaceId === "projects" && params.hasActiveThread) {
    return "thread";
  }

  return navigation.defaultScreenId;
}

function resolveActiveLocalProjectState(
  threadId: string | undefined,
  resolver: ((threadId: string) => AriaDesktopLocalProjectState | undefined) | undefined,
): AriaDesktopLocalProjectState | undefined {
  if (!threadId || !resolver) {
    return undefined;
  }

  return resolver(threadId);
}

function deriveProjectsFromInitialThread(
  initialThread?: CreateAriaDesktopAppShellModelOptions["initialThread"],
): CreateAriaDesktopShellOptions["projects"] {
  if (!initialThread) {
    return undefined;
  }

  return [
    {
      project: initialThread.project,
      threads: [initialThread.thread],
    },
  ];
}

function normalizeDesktopEnvironmentInputs(
  environments?: CreateAriaDesktopShellOptions["environments"],
) {
  return (environments ?? []).map((environment) =>
    "access" in environment ? environment : createAriaDesktopEnvironmentOption(environment),
  );
}

function resolveDesktopEnvironmentLabel(
  environments: CreateAriaDesktopShellOptions["environments"] | undefined,
  environmentId: string | null | undefined,
) {
  if (!environmentId) {
    return undefined;
  }

  return (
    normalizeDesktopEnvironmentInputs(environments).find(
      (environment) => environment.id === environmentId,
    )?.label ?? environmentId
  );
}

function resolveDesktopEnvironmentMode(
  environments: CreateAriaDesktopShellOptions["environments"] | undefined,
  environmentId: string | null | undefined,
) {
  if (!environmentId) {
    return undefined;
  }

  return normalizeDesktopEnvironmentInputs(environments).find(
    (environment) => environment.id === environmentId,
  )?.mode;
}

function deriveActiveThreadFromInitialThread(
  initialThread?: CreateAriaDesktopAppShellModelOptions["initialThread"],
  serverLabel?: string,
  environments?: CreateAriaDesktopShellOptions["environments"],
): CreateAriaDesktopShellOptions["activeThreadContext"] {
  if (!initialThread) {
    return undefined;
  }

  return {
    serverLabel,
    projectLabel: initialThread.project.name,
    thread: initialThread.thread,
    environmentLabel: resolveDesktopEnvironmentLabel(
      environments,
      initialThread.thread.environmentId,
    ),
    agentLabel: initialThread.thread.agentId ?? undefined,
  };
}

function deriveProjectThreadInputs(
  model: AriaDesktopAppShellModel,
): NonNullable<CreateAriaDesktopShellOptions["projects"]> {
  return (
    model.sourceOptions.projects ??
    deriveProjectsFromInitialThread(model.sourceOptions.initialThread) ??
    []
  );
}

function replaceProjectThreadInputs(
  projects: NonNullable<CreateAriaDesktopShellOptions["projects"]>,
  nextThread: AriaDesktopEnvironmentSwitchThread,
): NonNullable<CreateAriaDesktopShellOptions["projects"]> {
  let didReplace = false;

  const nextProjects = projects.map((project) => ({
    ...project,
    threads: project.threads.map((thread) => {
      if (thread.threadId !== nextThread.threadId) {
        return thread;
      }

      didReplace = true;
      return {
        ...thread,
        ...nextThread,
      };
    }),
  }));

  return didReplace ? nextProjects : projects;
}

function replaceInitialThread(
  initialThread: CreateAriaDesktopAppShellModelOptions["initialThread"],
  nextThread: AriaDesktopEnvironmentSwitchThread,
): CreateAriaDesktopAppShellModelOptions["initialThread"] {
  if (!initialThread || initialThread.thread.threadId !== nextThread.threadId) {
    return initialThread;
  }

  return {
    ...initialThread,
    thread: {
      ...initialThread.thread,
      ...nextThread,
    },
  };
}

function deriveActiveThreadFromProjectSelection(
  model: AriaDesktopAppShellModel,
  threadId: string,
): CreateAriaDesktopShellOptions["activeThreadContext"] {
  for (const project of deriveProjectThreadInputs(model)) {
    const thread = project.threads.find((candidate) => candidate.threadId === threadId);
    if (thread) {
      return {
        serverLabel: model.activeServerLabel,
        projectLabel: project.project.name,
        thread,
        environmentLabel: resolveDesktopEnvironmentLabel(
          model.sourceOptions.environments,
          thread.environmentId,
        ),
        agentLabel: thread.agentId ?? undefined,
      };
    }
  }

  return model.sourceOptions.activeThreadContext;
}

function deriveCurrentActiveThreadContext(
  model: AriaDesktopAppShellModel,
): CreateAriaDesktopShellOptions["activeThreadContext"] {
  return (
    model.sourceOptions.activeThreadContext ??
    deriveActiveThreadFromInitialThread(
      model.sourceOptions.initialThread,
      model.activeServerLabel,
      model.sourceOptions.environments,
    )
  );
}

function resolveThreadAfterEnvironmentSelection(
  model: AriaDesktopAppShellModel,
  environmentId: string,
): AriaDesktopEnvironmentSwitchThread | undefined {
  const activeThreadContext = deriveCurrentActiveThreadContext(model);
  if (!activeThreadContext) {
    return undefined;
  }

  if (model.sourceOptions.switchThreadEnvironment) {
    return model.sourceOptions.switchThreadEnvironment(
      activeThreadContext.thread.threadId,
      environmentId,
    );
  }

  const environmentMode = resolveDesktopEnvironmentMode(
    model.sourceOptions.environments,
    environmentId,
  );
  const nextThreadType =
    activeThreadContext.thread.threadType === "local_project" ||
    activeThreadContext.thread.threadType === "remote_project"
      ? environmentMode === "remote"
        ? "remote_project"
        : "local_project"
      : activeThreadContext.thread.threadType;

  return {
    ...activeThreadContext.thread,
    threadType: nextThreadType,
    environmentId,
  };
}

function deriveActiveThreadFromEnvironmentSelection(
  model: AriaDesktopAppShellModel,
  nextThread: AriaDesktopEnvironmentSwitchThread,
): CreateAriaDesktopShellOptions["activeThreadContext"] {
  const activeThreadContext = deriveCurrentActiveThreadContext(model);
  if (!activeThreadContext) {
    return undefined;
  }

  return {
    ...activeThreadContext,
    serverLabel: model.activeServerLabel,
    thread: nextThread,
    environmentLabel: resolveDesktopEnvironmentLabel(
      model.sourceOptions.environments,
      nextThread.environmentId,
    ),
    agentLabel: nextThread.agentId ?? undefined,
  };
}

export function createAriaDesktopAppShellModel(
  options: CreateAriaDesktopAppShellModelOptions,
): AriaDesktopAppShellModel {
  const bootstrap = createAriaDesktopApplicationBootstrap({
    target: options.target,
    initialThread: options.initialThread,
    servers: options.servers,
    activeServerId: options.activeServerId,
    desktopBridge: options.desktopBridge,
    projectsRepository: options.projectsRepository,
  });
  const switchThreadEnvironment =
    options.switchThreadEnvironment ?? bootstrap.projectsControl?.switchThreadEnvironment;
  const resolveLocalProjectState =
    options.resolveLocalProjectState ?? bootstrap.projectsControl?.describeLocalProject;
  const activeThreadContext =
    options.activeThreadContext ??
    deriveActiveThreadFromInitialThread(
      options.initialThread,
      bootstrap.bootstrap.activeServerLabel,
      options.environments,
    );
  const shell = createAriaDesktopShell({
    target: options.target,
    initialThread: options.initialThread,
    servers: options.servers,
    activeServerId: options.activeServerId,
    projects: options.projects ?? deriveProjectsFromInitialThread(options.initialThread),
    environments: options.environments,
    activeThreadContext,
  });

  return {
    application: bootstrap.application,
    bootstrap,
    shell,
    activeServerId: shell.activeServerId,
    activeServerLabel: shell.activeServerLabel,
    activeSpaceId: options.activeSpaceId ?? bootstrap.application.startup.defaultSpaceId,
    activeScreenId: resolveActiveScreenId({
      activeSpaceId: options.activeSpaceId ?? bootstrap.application.startup.defaultSpaceId,
      requestedScreenId: options.activeScreenId,
      hasActiveThread: Boolean(activeThreadContext),
    }),
    activeContextPanelId:
      options.activeContextPanelId ?? bootstrap.application.startup.defaultContextPanelId,
    ariaThread: createAriaDesktopAriaThread(options.target, {
      controller: options.ariaThreadController,
      controllerFactory: options.createAriaThreadController,
      state: options.ariaThreadState,
    }),
    ariaRecentSessions: [],
    activeLocalProjectState: resolveActiveLocalProjectState(
      activeThreadContext?.thread.threadId,
      resolveLocalProjectState,
    ),
    sourceOptions: {
      target: options.target,
      initialThread: options.initialThread,
      servers: options.servers,
      activeServerId: options.activeServerId,
      projects: options.projects,
      environments: options.environments,
      activeThreadContext: options.activeThreadContext,
      activeSpaceId: options.activeSpaceId,
      activeScreenId: options.activeScreenId,
      activeContextPanelId: options.activeContextPanelId,
      createAriaThreadController: options.createAriaThreadController,
      desktopBridge: options.desktopBridge,
      projectsRepository: options.projectsRepository,
      switchThreadEnvironment,
      resolveLocalProjectState,
    },
  };
}

function resolveDesktopServerTarget(
  model: AriaDesktopAppShellModel,
  serverId: string,
): AccessClientTarget | null {
  const explicitServers = model.sourceOptions.servers ?? [];
  for (const entry of explicitServers) {
    const target = "target" in entry ? entry.target : entry;
    if (target.serverId === serverId) {
      return target;
    }
  }

  if (model.sourceOptions.target.serverId === serverId) {
    return model.sourceOptions.target;
  }

  const fallback = model.shell.serverSwitcher.availableServers.find(
    (server) => server.id === serverId,
  );
  if (fallback) {
    return {
      serverId: fallback.id,
      baseUrl: fallback.access.httpUrl,
      token: fallback.access.token,
    };
  }

  return null;
}

export interface AriaDesktopAppShellProps {
  model: AriaDesktopAppShellModel;
  onSwitchServer?(serverId: string): void;
  onSelectSpace?(spaceId: (typeof ariaDesktopSpaces)[number]["id"]): void;
  onSelectScreen?(screenId: string): void;
  onSelectContextPanel?(panelId: (typeof ariaDesktopContextPanels)[number]["id"]): void;
  onOpenAriaSession?(sessionId: string): void;
  onSearchAriaSessions?(query: string): void;
  onSelectProjectThread?(threadId: string): void;
  onSelectThreadEnvironment?(environmentId: string): void;
  onSendAriaMessage?(message: string): void;
  onStopAriaSession?(): void;
  onApproveToolCall?(toolCallId: string, approved: boolean): void;
  onAcceptToolCallForSession?(toolCallId: string): void;
  onAnswerQuestion?(questionId: string, answer: string): void;
}

function section(slot: string, title: string, children: ReactNode): ReactElement {
  return (
    <section data-slot={slot}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function formatDesktopMessageRole(role: string): string {
  switch (role) {
    case "assistant":
      return "Aria";
    case "user":
      return "You";
    case "tool":
      return "Tool";
    case "error":
      return "Error";
    default:
      return role;
  }
}

function renderLocalProjectState(
  state: AriaDesktopAppShellModel["activeLocalProjectState"],
): ReactElement {
  if (!state) {
    return (
      <p className="aria-desktop-empty-copy">
        Attach a local project thread to inspect repository and worktree details.
      </p>
    );
  }

  return (
    <dl className="aria-desktop-definition-list" data-slot="local-project-state">
      <div>
        <dt>Repo:</dt>
        <dd>{state.repoName ?? state.repoId ?? "unknown"}</dd>
      </div>
      <div>
        <dt>Remote:</dt>
        <dd>
          {state.repoRemoteUrl ?? "unknown"}
          {state.repoDefaultBranch ? ` | Default branch: ${state.repoDefaultBranch}` : ""}
        </dd>
      </div>
      <div>
        <dt>Worktree:</dt>
        <dd>{state.worktreePath ?? "not attached"}</dd>
      </div>
      <div>
        <dt>Branch:</dt>
        <dd>
          {state.worktreeBranchName ?? "n/a"}
          {state.worktreeBaseRef ? ` | Base: ${state.worktreeBaseRef}` : ""}
        </dd>
      </div>
      <div>
        <dt>Worktree status:</dt>
        <dd>{state.worktreeStatus ?? "n/a"}</dd>
      </div>
    </dl>
  );
}

function renderInspectorPanel(
  model: AriaDesktopAppShellModel,
  activeThreadScreen: AriaDesktopAppShellModel["shell"]["activeThreadScreen"],
  props: AriaDesktopAppShellProps,
): ReactElement {
  const currentPanel = model.application.contextPanels.find(
    (panel) => panel.id === model.activeContextPanelId,
  );
  const pendingApproval = model.ariaThread.state.pendingApproval;
  const pendingQuestion = model.ariaThread.state.pendingQuestion;
  const approvalMode = model.ariaThread.state.approvalMode ?? "default";
  const securityMode = model.ariaThread.state.securityMode ?? "default";
  const securityModeTTL = model.ariaThread.state.securityModeRemainingTTL;

  switch (model.activeContextPanelId) {
    case "environment":
      return (
        <div className="aria-desktop-inspector-stack">
          <div className="aria-desktop-card aria-desktop-card--soft">
            <div className="aria-desktop-card-eyebrow">{currentPanel?.label ?? "Environment"}</div>
            <strong>
              {activeThreadScreen?.header.environmentLabel ?? "No active environment"}
            </strong>
            <p>
              {activeThreadScreen?.header.serverLabel ?? model.activeServerLabel}
              {activeThreadScreen?.header.agentLabel
                ? ` | Agent: ${activeThreadScreen.header.agentLabel}`
                : ""}
            </p>
          </div>
          {renderLocalProjectState(model.activeLocalProjectState)}
        </div>
      );
    case "approvals":
      return (
        <div className="aria-desktop-inspector-stack">
          <div className="aria-desktop-card aria-desktop-card--soft">
            <div className="aria-desktop-card-eyebrow">{currentPanel?.label ?? "Approvals"}</div>
            <p>Pending approval: {pendingApproval?.toolName ?? "none"}</p>
            <p>Pending question: {pendingQuestion?.question ?? "none"}</p>
            <p>
              Approval mode: {approvalMode} | Security mode: {securityMode}
              {securityModeTTL !== null && securityModeTTL !== undefined
                ? ` (${securityModeTTL}s)`
                : ""}
            </p>
          </div>
          {pendingApproval ? (
            <div className="aria-desktop-button-row">
              <button
                type="button"
                className="aria-desktop-button aria-desktop-button--primary"
                onClick={() => props.onApproveToolCall?.(pendingApproval.toolCallId, true)}
              >
                Approve
              </button>
              <button
                type="button"
                className="aria-desktop-button"
                onClick={() => props.onAcceptToolCallForSession?.(pendingApproval.toolCallId)}
              >
                Allow for session
              </button>
              <button
                type="button"
                className="aria-desktop-button aria-desktop-button--danger"
                onClick={() => props.onApproveToolCall?.(pendingApproval.toolCallId, false)}
              >
                Deny
              </button>
            </div>
          ) : null}
          {pendingQuestion ? (
            <div className="aria-desktop-button-row">
              {(pendingQuestion.options ?? []).map((option) => (
                <button
                  key={option}
                  type="button"
                  className="aria-desktop-button"
                  onClick={() => props.onAnswerQuestion?.(pendingQuestion.questionId, option)}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      );
    case "changes":
      return (
        <div className="aria-desktop-inspector-stack">
          <div className="aria-desktop-card aria-desktop-card--soft">
            <div className="aria-desktop-card-eyebrow">{currentPanel?.label ?? "Changes"}</div>
            <strong>{activeThreadScreen?.header.title ?? "No active thread"}</strong>
            <p>
              {activeThreadScreen?.header.threadTypeLabel ?? "Select a project thread"}
              {activeThreadScreen?.header.statusLabel
                ? ` | ${activeThreadScreen.header.statusLabel}`
                : ""}
            </p>
          </div>
          {renderLocalProjectState(model.activeLocalProjectState)}
        </div>
      );
    case "job":
      return (
        <div className="aria-desktop-inspector-stack">
          <div className="aria-desktop-card aria-desktop-card--soft">
            <div className="aria-desktop-card-eyebrow">{currentPanel?.label ?? "Job State"}</div>
            <p>Aria thread: {model.ariaThread.state.connected ? "connected" : "disconnected"}</p>
            <p>Model: {model.ariaThread.state.modelName}</p>
            <p>Streaming: {model.ariaThread.state.isStreaming ? "yes" : "no"}</p>
            {model.ariaThread.state.streamingText ? (
              <p>Streaming text: {model.ariaThread.state.streamingText}</p>
            ) : null}
            {model.ariaThread.state.lastError ? (
              <p>Error: {model.ariaThread.state.lastError}</p>
            ) : null}
          </div>
        </div>
      );
    case "artifacts":
      return (
        <div className="aria-desktop-inspector-stack">
          <div className="aria-desktop-card aria-desktop-card--soft">
            <div className="aria-desktop-card-eyebrow">{currentPanel?.label ?? "Artifacts"}</div>
            <p>Recent Aria sessions: {model.ariaRecentSessions.length}</p>
            <p>
              {activeThreadScreen?.header.environmentLabel ??
                "Artifacts will appear when runs and sessions attach to this thread."}
            </p>
          </div>
        </div>
      );
    case "review":
    default:
      return (
        <div className="aria-desktop-inspector-stack">
          <div className="aria-desktop-card aria-desktop-card--soft">
            <div className="aria-desktop-card-eyebrow">{currentPanel?.label ?? "Review"}</div>
            <strong>{activeThreadScreen?.header.title ?? "No active thread"}</strong>
            <p>Pending approval: {pendingApproval?.toolName ?? "none"}</p>
            <p>Pending question: {pendingQuestion?.question ?? "none"}</p>
            <p>
              Approval mode: {approvalMode} | Security mode: {securityMode}
              {securityModeTTL !== null && securityModeTTL !== undefined
                ? ` (${securityModeTTL}s)`
                : ""}
            </p>
          </div>
        </div>
      );
  }
}

export function AriaDesktopAppShell(props: AriaDesktopAppShellProps): ReactElement {
  const { model } = props;
  const activeThreadScreen = model.shell.activeThreadScreen;
  const currentThreadId = activeThreadScreen?.header.threadId;
  const activeSpace = model.application.spaces.find((space) => space.id === model.activeSpaceId);
  const activeNavigation = resolveNavigationEntryForSpace(model.activeSpaceId);
  const activeScreen =
    activeNavigation.screens.find((screen) => screen.id === model.activeScreenId) ??
    activeNavigation.screens[0];
  const activePanel = model.application.contextPanels.find(
    (panel) => panel.id === model.activeContextPanelId,
  );
  const recentMessages = model.ariaThread.state.messages.slice(-4);
  const environmentOptions =
    activeThreadScreen?.environmentSwitcher.availableEnvironments ?? model.shell.environments;
  const composerValue = activeThreadScreen
    ? `Continue ${activeThreadScreen.header.title}`
    : "Select a project thread to compose";
  const centerTabs = activeThreadScreen
    ? [
        { id: "projects-root", label: "Projects", active: false },
        { id: activeThreadScreen.header.threadId, label: activeThreadScreen.header.title, active: true },
      ]
    : [{ id: "projects-root", label: "Projects", active: true }];
  const showProjectThreadList =
    model.activeSpaceId === "projects" && model.activeScreenId === "thread-list";
  const showProjectThreadView =
    model.activeSpaceId === "projects" && model.activeScreenId === "thread";
  const showAriaChat = model.activeSpaceId === "aria" && activeScreen?.id === "chat";
  const showAriaInbox = model.activeSpaceId === "aria" && activeScreen?.id === "inbox";
  const showAriaAutomations = model.activeSpaceId === "aria" && activeScreen?.id === "automations";
  const showAriaConnectors = model.activeSpaceId === "aria" && activeScreen?.id === "connectors";

  return (
    <div
      className="aria-desktop-shell"
      data-app-shell={model.application.id}
      data-frame={model.application.frame.kind}
    >
      <header className="aria-desktop-top-chrome" data-slot="top-chrome">
        <div className="aria-desktop-brand">
          <div className="aria-desktop-brand-mark">A</div>
          <div className="aria-desktop-brand-copy">
            <h1>{model.application.displayName}</h1>
            <p>
              {activeThreadScreen
                ? `${activeThreadScreen.header.projectLabel ?? "Projects"} / ${
                    activeThreadScreen.header.title
                  }`
                : "Projects workbench"}
            </p>
          </div>
        </div>

        <div className="aria-desktop-top-meta">
          <div className="aria-desktop-pill-row">
            <span className="aria-desktop-pill">{activeSpace?.label ?? model.activeSpaceId}</span>
            <span className="aria-desktop-pill">
              {activePanel?.label ?? model.activeContextPanelId}
            </span>
            <span
              className={`aria-desktop-pill ${
                model.ariaThread.state.connected ? "is-live" : "is-offline"
              }`}
            >
              {model.ariaThread.state.connected ? "Connected" : "Offline"}
            </span>
          </div>
          <small className="aria-desktop-status-line" data-slot="aria-thread-status">
            Aria thread:{" "}
            {model.ariaThread.state.connected ? model.ariaThread.state.sessionId : "disconnected"}
            {" | "}Model: {model.ariaThread.state.modelName}
            {" | "}Status: {model.ariaThread.state.sessionStatus}
          </small>
        </div>

        <label
          className="aria-desktop-select-field"
          data-slot="server-switcher"
          data-placement={model.application.frame.serverSwitcher.placement}
        >
          {model.application.frame.serverSwitcher.label}
          <select
            aria-label="Server switcher"
            defaultValue={model.activeServerId}
            onChange={(event) => props.onSwitchServer?.(event.currentTarget.value)}
          >
            {model.shell.serverSwitcher.availableServers.map((server) => (
              <option key={server.id} value={server.id}>
                {server.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      <main className="aria-desktop-workbench" data-slot="workbench">
        <aside className="aria-desktop-sidebar" data-slot="sidebar">
          {section(
            "project-sidebar",
            "Workbench",
            <div className="aria-desktop-sidebar-shell">
              <div className="aria-desktop-tab-strip" role="tablist" aria-label="Desktop spaces">
                {model.application.spaces.map((space) => (
                  <button
                    key={space.id}
                    type="button"
                    role="tab"
                    aria-selected={space.id === model.activeSpaceId}
                    className={`aria-desktop-tab ${
                      space.id === model.activeSpaceId ? "is-active" : ""
                    }`}
                  >
                    {space.label}
                  </button>
                ))}
              </div>
              <div className="aria-desktop-pane-caption">
                <span>{activeSpace?.label ?? "Projects"}</span>
                <span>{model.activeServerLabel}</span>
              </div>
            </div>,
          )}
          {section(
            "thread-list",
            "Projects",
            <div>
              {model.shell.projectSidebar.projects.length > 0 ? (
                <div className="aria-desktop-project-groups">
                  {model.shell.projectSidebar.projects.map((project) => (
                    <div key={project.projectLabel} className="aria-desktop-project-group">
                      <div className="aria-desktop-project-group-header">
                        {project.projectLabel}
                      </div>
                      <ul className="aria-desktop-thread-list">
                        {project.threads.map((thread) => (
                          <li key={thread.id}>
                            <button
                              type="button"
                              className={`aria-desktop-thread-button ${
                                thread.id === currentThreadId ? "is-active" : ""
                              }`}
                              data-thread-id={thread.id}
                              onClick={() => props.onSelectProjectThread?.(thread.id)}
                            >
                              <span className="aria-desktop-thread-title">{thread.title}</span>
                              <span className="aria-desktop-thread-meta">
                                {thread.status} · {thread.threadTypeLabel}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="aria-desktop-empty-copy">No project threads yet.</p>
              )}
            </div>,
          )}
        </aside>

        <section className="aria-desktop-center" data-slot="center">
          {section(
            "active-thread-header",
            activeThreadScreen?.header.title ?? "No active thread",
            <div className="aria-desktop-editor-shell">
              <div className="aria-desktop-tab-strip" role="tablist" aria-label="Workspace tabs">
                {centerTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={tab.active}
                    className={`aria-desktop-tab ${tab.active ? "is-active" : ""}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="aria-desktop-pane-header">
                <div className="aria-desktop-thread-header-copy">
                  <p className="aria-desktop-eyebrow">
                    {activeThreadScreen?.header.projectLabel ?? "Select a project thread"}
                  </p>
                  <div className="aria-desktop-pill-row">
                    <span className="aria-desktop-pill">
                      {activeThreadScreen?.header.threadTypeLabel ?? "Thread"}
                    </span>
                    <span className="aria-desktop-pill">
                      {activeThreadScreen?.header.statusLabel ?? "Idle"}
                    </span>
                    {activeThreadScreen?.header.agentLabel ? (
                      <span className="aria-desktop-pill">
                        Agent: {activeThreadScreen.header.agentLabel}
                      </span>
                    ) : null}
                    <span className="aria-desktop-pill">
                      {activeThreadScreen?.header.serverLabel ?? model.activeServerLabel}
                    </span>
                  </div>
                </div>
                <label className="aria-desktop-select-field">
                  <span>{activeThreadScreen?.environmentSwitcher.label ?? "Environment"}</span>
                  <select
                    aria-label="Environment switcher"
                    value={activeThreadScreen?.environmentSwitcher.activeEnvironmentId ?? ""}
                    onChange={(event) =>
                      props.onSelectThreadEnvironment?.(event.currentTarget.value)
                    }
                  >
                    {environmentOptions.map((environment) => (
                      <option key={environment.id} value={environment.id}>
                        {environment.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>,
          )}
          {section(
            "stream",
            "Activity",
            <div className="aria-desktop-stream">
              <div className="aria-desktop-pane-header aria-desktop-pane-header--compact">
                <div className="aria-desktop-stream-summary">
                  <span className="aria-desktop-pill">
                    {activeThreadScreen
                      ? activeThreadScreen.stream.tracks.join(" + ")
                      : "messages + runs"}
                  </span>
                  <span className="aria-desktop-pill">
                    Aria chat messages: {model.ariaThread.state.messages.length}
                  </span>
                  <span className="aria-desktop-pill">
                    Streaming: {model.ariaThread.state.isStreaming ? "yes" : "no"}
                  </span>
                </div>
              </div>

              <div className="aria-desktop-card aria-desktop-card--lead">
                <div className="aria-desktop-card-eyebrow">Latest Aria message</div>
                <p>
                  Latest Aria message:{" "}
                  {model.ariaThread.state.messages.at(-1)?.content ?? "No transcript yet"}
                </p>
              </div>

              {recentMessages.length > 0 ? (
                <ol className="aria-desktop-stream-list">
                  {recentMessages.map((message, index) => (
                    <li
                      key={`${message.role}-${index}-${message.content}`}
                      className={`aria-desktop-stream-item is-${message.role}`}
                    >
                      <div className="aria-desktop-stream-item-head">
                        <span className="aria-desktop-message-role">
                          {formatDesktopMessageRole(message.role)}
                        </span>
                        {"toolName" in message && message.toolName ? (
                          <span className="aria-desktop-message-tool">{message.toolName}</span>
                        ) : null}
                      </div>
                      <p>{message.content}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="aria-desktop-empty-state">
                  <strong>No stream events yet</strong>
                  <p>Select a project thread and start a run to fill the activity stream.</p>
                </div>
              )}

              {model.ariaThread.state.streamingText ? (
                <div className="aria-desktop-card aria-desktop-card--soft">
                  <div className="aria-desktop-card-eyebrow">Streaming text</div>
                  <p>Streaming text: {model.ariaThread.state.streamingText}</p>
                </div>
              ) : null}

              {model.ariaThread.state.pendingApproval ? (
                <div className="aria-desktop-card aria-desktop-card--soft">
                  <div className="aria-desktop-card-eyebrow">Approval required</div>
                  <p>Pending approval: {model.ariaThread.state.pendingApproval.toolName}</p>
                  <div className="aria-desktop-button-row">
                    <button
                      type="button"
                      className="aria-desktop-button aria-desktop-button--primary"
                      onClick={() =>
                        props.onApproveToolCall?.(
                          model.ariaThread.state.pendingApproval!.toolCallId,
                          true,
                        )
                      }
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="aria-desktop-button"
                      onClick={() =>
                        props.onAcceptToolCallForSession?.(
                          model.ariaThread.state.pendingApproval!.toolCallId,
                        )
                      }
                    >
                      Allow for session
                    </button>
                    <button
                      type="button"
                      className="aria-desktop-button aria-desktop-button--danger"
                      onClick={() =>
                        props.onApproveToolCall?.(
                          model.ariaThread.state.pendingApproval!.toolCallId,
                          false,
                        )
                      }
                    >
                      Deny
                    </button>
                  </div>
                </div>
              ) : null}

              {model.ariaThread.state.pendingQuestion ? (
                <div className="aria-desktop-card aria-desktop-card--soft">
                  <div className="aria-desktop-card-eyebrow">Question</div>
                  <p>Pending question: {model.ariaThread.state.pendingQuestion.question}</p>
                  <div className="aria-desktop-button-row">
                    {(model.ariaThread.state.pendingQuestion.options ?? []).map((option) => (
                      <button
                        key={option}
                        type="button"
                        className="aria-desktop-button"
                        onClick={() =>
                          props.onAnswerQuestion?.(
                            model.ariaThread.state.pendingQuestion!.questionId,
                            option,
                          )
                        }
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {model.ariaThread.state.lastError ? (
                <div className="aria-desktop-card aria-desktop-card--error">
                  <div className="aria-desktop-card-eyebrow">Connection</div>
                  <p>Error: {model.ariaThread.state.lastError}</p>
                </div>
              ) : null}
            </div>,
          )}
        </section>

        <aside className="aria-desktop-right-rail" data-slot="right-rail">
          {section(
            "context-panels",
            "Inspector",
            <div className="aria-desktop-inspector">
              <div className="aria-desktop-tab-strip" role="tablist" aria-label="Inspector panels">
                {model.application.contextPanels.map((panel) => (
                  <button
                    key={panel.id}
                    type="button"
                    role="tab"
                    aria-selected={panel.id === model.activeContextPanelId}
                    className={`aria-desktop-tab ${
                      panel.id === model.activeContextPanelId ? "is-active" : ""
                    }`}
                  >
                    {panel.label}
                  </button>
                ))}
              </div>
              {renderInspectorPanel(model, activeThreadScreen, props)}

              <div className="aria-desktop-card aria-desktop-card--soft">
                <div className="aria-desktop-card-eyebrow">Sessions</div>
                <p>Recent Aria sessions: {model.ariaRecentSessions.length}</p>
                <form
                  className="aria-desktop-inline-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = event.currentTarget;
                    const field = form.elements.namedItem("aria-session-search");
                    if (field instanceof HTMLInputElement) {
                      props.onSearchAriaSessions?.(field.value);
                    }
                  }}
                >
                  <input
                    className="aria-desktop-input"
                    name="aria-session-search"
                    defaultValue=""
                    placeholder="Find session"
                  />
                  <button type="submit" className="aria-desktop-button">
                    Search Sessions
                  </button>
                </form>
                {model.ariaRecentSessions.length > 0 ? (
                  <ul className="aria-desktop-session-list">
                    {model.ariaRecentSessions.map((session) => (
                      <li key={session.sessionId} className="aria-desktop-session-item">
                        <div>
                          <strong>
                            {session.sessionId} - {session.archived ? "archived" : "live"}
                          </strong>
                          {session.preview ? <p>{session.preview}</p> : null}
                          {session.summary ? <p>{session.summary}</p> : null}
                        </div>
                        {props.onOpenAriaSession ? (
                          <button
                            type="button"
                            className="aria-desktop-button"
                            data-session-id={session.sessionId}
                            onClick={() => props.onOpenAriaSession?.(session.sessionId)}
                          >
                            Open
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="aria-desktop-empty-copy">No saved sessions yet.</p>
                )}
              </div>
            </div>,
          )}
        </aside>
      </main>

      <footer className="aria-desktop-status-strip" data-slot="status-strip">
        <div className="aria-desktop-composer-meta">
          <span className="aria-desktop-pill">{model.application.frame.composer.placement}</span>
          <span className="aria-desktop-pill">
            {activeThreadScreen?.header.environmentLabel ?? "No active environment"}
          </span>
        </div>
        <form
          className="aria-desktop-composer-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const field = form.elements.namedItem("aria-composer-draft");
            if (field instanceof HTMLTextAreaElement) {
              props.onSendAriaMessage?.(field.value);
            }
          }}
        >
          <textarea
            className="aria-desktop-composer-input"
            name="aria-composer-draft"
            defaultValue={composerValue}
          />
          <div className="aria-desktop-button-row">
            <button type="submit" className="aria-desktop-button aria-desktop-button--primary">
              Send
            </button>
            <button
              type="button"
              className="aria-desktop-button"
              onClick={() => {
                props.onStopAriaSession?.();
              }}
            >
              Stop
            </button>
          </div>
        </form>
      </footer>
    </div>
  );
}

export interface CreateAriaDesktopAppShellOptions extends CreateAriaDesktopAppShellModelOptions {}

function desktopAriaErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function buildDesktopOfflineState(
  model: AriaDesktopAppShellModel,
  error: unknown,
): AriaDesktopAppShellModel["ariaThread"]["state"] {
  const currentState = model.ariaThread.controller.getState();
  const message = `Desktop could not reach Aria Server: ${desktopAriaErrorMessage(error)}`;
  const hasMessage = currentState.messages.some(
    (entry) => entry.role === "error" && entry.content === message,
  );

  return {
    ...currentState,
    connected: false,
    sessionStatus: currentState.sessionId ? currentState.sessionStatus : "disconnected",
    lastError: desktopAriaErrorMessage(error),
    messages: hasMessage
      ? currentState.messages
      : [...currentState.messages, { role: "error", content: message }],
  };
}

async function syncDesktopAriaThreadState(
  model: AriaDesktopAppShellModel,
  action: () => Promise<unknown>,
): Promise<AriaDesktopAppShellModel> {
  try {
    await action();
    return {
      ...model,
      ariaThread: {
        ...model.ariaThread,
        state: model.ariaThread.controller.getState(),
      },
    };
  } catch (error) {
    return {
      ...model,
      ariaThread: {
        ...model.ariaThread,
        state: buildDesktopOfflineState(model, error),
      },
    };
  }
}

export async function connectAriaDesktopAppShellModel(
  model: AriaDesktopAppShellModel,
): Promise<AriaDesktopAppShellModel> {
  return syncDesktopAriaThreadState(model, () => model.ariaThread.controller.connect());
}

export async function createConnectedAriaDesktopAppShellModel(
  options: CreateAriaDesktopAppShellModelOptions,
): Promise<AriaDesktopAppShellModel> {
  return connectAriaDesktopAppShellModel(createAriaDesktopAppShellModel(options));
}

export function createAriaDesktopApplicationShell(
  options: CreateAriaDesktopAppShellModelOptions,
): AriaDesktopAppShellModel {
  return createAriaDesktopAppShellModel(options);
}

export function createAriaDesktopAppShell(options: CreateAriaDesktopAppShellOptions): {
  model: AriaDesktopAppShellModel;
  element: ReactElement;
} {
  const model = createAriaDesktopAppShellModel(options);
  return {
    model,
    element: <AriaDesktopAppShell model={model} />,
  };
}

export async function createConnectedAriaDesktopAppShell(
  options: CreateAriaDesktopAppShellOptions,
): Promise<{ model: AriaDesktopAppShellModel; element: ReactElement }> {
  const model = await createConnectedAriaDesktopAppShellModel(options);

  return {
    model,
    element: <AriaDesktopAppShell model={model} />,
  };
}

export async function sendAriaDesktopAppShellMessage(
  model: AriaDesktopAppShellModel,
  message: string,
): Promise<AriaDesktopAppShellModel> {
  return syncDesktopAriaThreadState(model, () => model.ariaThread.controller.sendMessage(message));
}

export async function stopAriaDesktopAppShell(
  model: AriaDesktopAppShellModel,
): Promise<AriaDesktopAppShellModel> {
  return syncDesktopAriaThreadState(model, () => model.ariaThread.controller.stop());
}

export async function openAriaDesktopAppShellSession(
  model: AriaDesktopAppShellModel,
  sessionId: string,
): Promise<AriaDesktopAppShellModel> {
  return syncDesktopAriaThreadState(model, () =>
    model.ariaThread.controller.openSession(sessionId),
  );
}

export async function approveAriaDesktopAppShellToolCall(
  model: AriaDesktopAppShellModel,
  toolCallId: string,
  approved: boolean,
): Promise<AriaDesktopAppShellModel> {
  return syncDesktopAriaThreadState(model, () =>
    model.ariaThread.controller.approveToolCall(toolCallId, approved),
  );
}

export async function acceptAriaDesktopAppShellToolCallForSession(
  model: AriaDesktopAppShellModel,
  toolCallId: string,
): Promise<AriaDesktopAppShellModel> {
  return syncDesktopAriaThreadState(model, () =>
    model.ariaThread.controller.acceptToolCallForSession(toolCallId),
  );
}

export async function answerAriaDesktopAppShellQuestion(
  model: AriaDesktopAppShellModel,
  questionId: string,
  answer: string,
): Promise<AriaDesktopAppShellModel> {
  return syncDesktopAriaThreadState(model, () =>
    model.ariaThread.controller.answerQuestion(questionId, answer),
  );
}

export async function loadAriaDesktopAppShellRecentSessions(
  model: AriaDesktopAppShellModel,
): Promise<AriaDesktopAppShellModel> {
  try {
    const [live, archived] = await Promise.all([
      model.ariaThread.controller.listSessions(),
      model.ariaThread.controller.listArchivedSessions(),
    ]);

    return {
      ...model,
      ariaRecentSessions: [...live, ...archived],
    };
  } catch (error) {
    return {
      ...model,
      ariaThread: {
        ...model.ariaThread,
        state: buildDesktopOfflineState(model, error),
      },
      ariaRecentSessions: [],
    };
  }
}

export async function searchAriaDesktopAppShellSessions(
  model: AriaDesktopAppShellModel,
  query: string,
): Promise<AriaDesktopAppShellModel> {
  try {
    return {
      ...model,
      ariaRecentSessions: await model.ariaThread.controller.searchSessions(query),
    };
  } catch (error) {
    return {
      ...model,
      ariaThread: {
        ...model.ariaThread,
        state: buildDesktopOfflineState(model, error),
      },
      ariaRecentSessions: [],
    };
  }
}

export async function switchAriaDesktopAppShellServer(
  model: AriaDesktopAppShellModel,
  serverId: string,
): Promise<AriaDesktopAppShellModel> {
  const target = resolveDesktopServerTarget(model, serverId);
  if (!target) {
    return model;
  }

  const rebuilt = createAriaDesktopAppShellModel({
    ...model.sourceOptions,
    target,
    activeServerId: serverId,
  });
  const connected = await connectAriaDesktopAppShellModel(rebuilt);
  return loadAriaDesktopAppShellRecentSessions(connected);
}

export function selectAriaDesktopAppShellThread(
  model: AriaDesktopAppShellModel,
  threadId: string,
): AriaDesktopAppShellModel {
  const activeThreadContext = deriveActiveThreadFromProjectSelection(model, threadId);
  const rebuilt = createAriaDesktopAppShellModel({
    ...model.sourceOptions,
    activeSpaceId: "projects",
    activeThreadContext,
  });

  return {
    ...rebuilt,
    ariaThread: model.ariaThread,
    ariaRecentSessions: model.ariaRecentSessions,
    sourceOptions: {
      ...model.sourceOptions,
      activeThreadContext,
      activeSpaceId: "projects",
    },
  };
}

export function selectAriaDesktopAppShellEnvironment(
  model: AriaDesktopAppShellModel,
  environmentId: string,
): AriaDesktopAppShellModel {
  const nextThread = resolveThreadAfterEnvironmentSelection(model, environmentId);
  if (!nextThread) {
    return model;
  }

  const projects = replaceProjectThreadInputs(deriveProjectThreadInputs(model), nextThread);
  const initialThread = replaceInitialThread(model.sourceOptions.initialThread, nextThread);
  const activeThreadContext = deriveActiveThreadFromEnvironmentSelection(model, nextThread);
  const rebuilt = createAriaDesktopAppShellModel({
    ...model.sourceOptions,
    projects,
    initialThread,
    activeSpaceId: "projects",
    activeThreadContext,
  });

  return {
    ...rebuilt,
    ariaThread: model.ariaThread,
    ariaRecentSessions: model.ariaRecentSessions,
    sourceOptions: {
      ...model.sourceOptions,
      projects,
      initialThread,
      activeThreadContext,
      activeSpaceId: "projects",
    },
  };
}
