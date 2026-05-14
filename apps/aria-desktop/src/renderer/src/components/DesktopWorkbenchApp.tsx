import {
  Archive,
  ArrowUp,
  Bot,
  Brain,
  ChevronDown,
  ChevronRight,
  Clock3,
  Database,
  FolderPlus,
  GitBranch,
  HardDrive,
  LockKeyhole,
  MessageSquarePlus,
  Pin,
  Plug2,
  Plus,
  Search,
  Server,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  X,
} from "./DesktopIcon.js";
import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import type {
  AriaDesktopAriaShellState,
  AriaDesktopAriaScreen,
  AriaDesktopSettingsApprovalMode,
  AriaDesktopSettingsConnectorType,
  AriaDesktopSettingsPatch,
  AriaDesktopSettingsProviderModelsResult,
  AriaDesktopSettingsProviderType,
  AriaDesktopSettingsState,
  AriaDesktopProjectGroup,
  AriaDesktopProjectShellState,
  AriaDesktopProjectThreadItem,
  AriaDesktopProjectThreadState,
} from "../../../shared/api.js";
import { DesktopBaseLayout, type DesktopBaseLayoutToolbarItem } from "./DesktopBaseLayout.js";
import { DesktopSpaceTabs, type DesktopSpace } from "./DesktopSpaceTabs.js";
import { DesktopSidebarButton } from "./DesktopSidebarButton.js";
import { DesktopIconButton } from "./DesktopIconButton.js";
import { DesktopCollapsibleSection } from "./DesktopCollapsibleSection.js";
import { DesktopSidebarSectionHeader } from "./DesktopSidebarSectionHeader.js";
import { DesktopThreadListItem } from "./DesktopThreadListItem.js";
import { AriaChatThreadSection } from "./AriaChatThreadSection.js";
import { AriaChatComposer } from "./AriaChatComposer.js";
import { formatToolDisplayName } from "./AriaMessageItem.js";
import { AriaMessageStream } from "./AriaMessageStream.js";
import { useTransientScrollbar } from "./useTransientScrollbar.js";
import { Alert, AlertDescription } from "./ui/alert.js";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog.js";
import { Badge } from "./ui/badge.js";
import { Button } from "./ui/button.js";
import { ButtonGroup } from "./ui/button-group.js";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card.js";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "./ui/dialog.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu.js";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "./ui/empty.js";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
  FieldTitle,
} from "./ui/field.js";
import { Input } from "./ui/input.js";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "./ui/input-group.js";
import { Item, ItemActions, ItemContent, ItemGroup, ItemTitle } from "./ui/item.js";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select.js";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "./ui/sheet.js";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "./ui/sidebar.js";
import { Spinner } from "./ui/spinner.js";
import { Switch } from "./ui/switch.js";

const EMPTY_SHELL_STATE: AriaDesktopProjectShellState = {
  archivedThreadIds: [],
  collapsedProjectIds: [],
  pinnedThreadIds: [],
  projects: [],
  selectedProjectId: null,
  selectedThreadId: null,
  selectedThreadState: null,
};

const EMPTY_ARIA_STATE: AriaDesktopAriaShellState = {
  automations: {
    lastError: null,
    runs: [],
    selectedTaskId: null,
    tasks: [],
  },
  chat: {
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
  chatSessions: [],
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
  selectedAriaSessionId: null,
  serverLabel: "Local Server",
};

const EMPTY_SETTINGS_STATE: AriaDesktopSettingsState = {
  about: {
    channel: "Desktop",
    cliName: "aria",
    productName: "Esperta Aria",
    runtimeName: "Aria Runtime",
  },
  connectors: [],
  desktop: {
    compactMode: true,
    defaultSpace: "projects",
    settingsPath: "",
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
    cronTaskCount: 0,
    defaultModel: "sonnet",
    heartbeatEnabled: true,
    heartbeatIntervalMinutes: 30,
    homeDir: "~/.aria",
    journalEnabled: true,
    mcpServerCount: 0,
    memoryDirectory: "memory",
    memoryEnabled: true,
    modelTiers: {},
    models: [],
    providerPresets: [],
    providers: [],
    providerCount: 0,
    securityMode: "default",
    tuiApproval: "never",
    tuiVerbosity: "minimal",
    webhookApproval: "never",
    webhookEnabled: false,
    webhookTaskCount: 0,
  },
};

const DEFAULT_BRANCH_PREFIX = "aria/";

function formatRelativeUpdatedAt(updatedAt?: number | null): string | null {
  if (!updatedAt) {
    return null;
  }

  const differenceMs = Date.now() - updatedAt;
  if (differenceMs < 60_000) {
    return "now";
  }

  const differenceMinutes = Math.floor(differenceMs / 60_000);
  if (differenceMinutes < 60) {
    return `${differenceMinutes}m`;
  }

  const differenceHours = Math.floor(differenceMinutes / 60);
  if (differenceHours < 24) {
    return `${differenceHours}h`;
  }

  return `${Math.floor(differenceHours / 24)}d`;
}

function isEmptyChat(
  state: AriaDesktopAriaShellState["chat"] | AriaDesktopAriaShellState["connectors"],
): boolean {
  return state.messages.length === 0 && !state.streamingText && !state.isStreaming;
}

function isAriaRuntimeConnected(state: AriaDesktopAriaShellState): boolean {
  return state.chat.connected;
}

function getActiveAriaSessionTitle(
  sessions:
    | AriaDesktopAriaShellState["chatSessions"]
    | AriaDesktopAriaShellState["connectorSessions"],
  sessionId: string | null,
): string | null {
  if (!sessionId) {
    return null;
  }

  return sessions.find((session) => session.sessionId === sessionId)?.title ?? null;
}

function summarizeConnectorStatuses(
  sessions: AriaDesktopAriaShellState["connectorSessions"],
): Array<{
  connectorType: string;
  count: number;
  lastActiveAt: number | null;
}> {
  const byType = new Map<
    string,
    { connectorType: string; count: number; lastActiveAt: number | null }
  >();

  for (const session of sessions) {
    const existing = byType.get(session.connectorType);
    if (!existing) {
      byType.set(session.connectorType, {
        connectorType: session.connectorType,
        count: 1,
        lastActiveAt: session.lastActiveAt ?? null,
      });
      continue;
    }

    existing.count += 1;
    if ((session.lastActiveAt ?? 0) > (existing.lastActiveAt ?? 0)) {
      existing.lastActiveAt = session.lastActiveAt ?? null;
    }
  }

  return Array.from(byType.values()).sort(
    (left, right) => (right.lastActiveAt ?? 0) - (left.lastActiveAt ?? 0),
  );
}

function buildOptimisticMessage(content: string) {
  return {
    content,
    id: `optimistic-user:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    role: "user" as const,
    toolName: null,
  };
}

function ComposerContextMenu({
  activeLabel,
  align = "start",
  icon,
  menuLabel,
  onSelect,
  options,
}: {
  activeLabel: string;
  align?: "end" | "start";
  icon: ReactNode;
  menuLabel: string;
  onSelect: (id: string) => void;
  options: Array<{
    description?: string | null;
    id: string;
    label: string;
    secondaryLabel?: string | null;
    selected: boolean;
  }>;
}) {
  const selectedOption = options.find((option) => option.selected);

  return (
    <div className={`project-thread-composer-menu is-${align}`}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          render={
            <Button
              className="project-thread-composer-trigger"
              size="sm"
              type="button"
              variant="ghost"
            />
          }
          aria-label={`${menuLabel}: ${activeLabel}`}
        >
          {icon}
          <span className="project-thread-composer-trigger-label">{activeLabel}</span>
          <ChevronDown aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={align}
          className="project-thread-composer-dropdown"
          sideOffset={8}
          aria-label={menuLabel}
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel className="project-thread-composer-dropdown-title">
              {menuLabel}
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              className="project-thread-composer-dropdown-options desktop-scroll-region"
              value={selectedOption?.id}
              onValueChange={(value) => {
                if (typeof value === "string" && value !== selectedOption?.id) {
                  onSelect(value);
                }
              }}
            >
              {options.map((option) => (
                <DropdownMenuRadioItem
                  key={option.id}
                  closeOnClick
                  className="project-thread-composer-option"
                  label={option.label}
                  value={option.id}
                >
                  <span className="project-thread-composer-option-copy">
                    <span className="project-thread-composer-option-label">{option.label}</span>
                    {option.secondaryLabel ? (
                      <span className="project-thread-composer-option-secondary">
                        {option.secondaryLabel}
                      </span>
                    ) : null}
                    {option.description ? (
                      <span className="project-thread-composer-option-secondary">
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function BranchComposerMenu({
  activeLabel,
  onCreateBranch,
  onSelect,
  options,
}: {
  activeLabel: string;
  onCreateBranch: (branchName: string) => void;
  onSelect: (environmentId: string) => void;
  options: Array<{
    description?: string | null;
    id: string;
    label: string;
    selected: boolean;
  }>;
}) {
  const [branchName, setBranchName] = useState("");
  const [branchQuery, setBranchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (menuOpen || dialogOpen) {
      return;
    }

    setBranchName("");
    setBranchQuery("");
  }, [dialogOpen, menuOpen]);

  useEffect(() => {
    if (!dialogOpen) {
      return;
    }

    setBranchName((current) => current || DEFAULT_BRANCH_PREFIX);
  }, [dialogOpen]);

  function openBranchDialog(): void {
    setMenuOpen(false);
    setDialogOpen(true);
  }

  function applyDefaultPrefix(): void {
    setBranchName((current) => {
      const trimmed = current.trim();
      if (!trimmed) {
        return DEFAULT_BRANCH_PREFIX;
      }

      if (trimmed.startsWith(DEFAULT_BRANCH_PREFIX)) {
        return trimmed;
      }

      return `${DEFAULT_BRANCH_PREFIX}${trimmed.replace(/^\/+/, "")}`;
    });
    inputRef.current?.focus();
  }

  function submitBranch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const trimmedBranchName = branchName.trim();
    if (!trimmedBranchName) {
      return;
    }

    setDialogOpen(false);
    setBranchName("");
    onCreateBranch(trimmedBranchName);
  }

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(branchQuery.trim().toLowerCase()),
  );
  const selectedOption = options.find((option) => option.selected);

  return (
    <div className="project-thread-composer-menu">
      <DropdownMenu modal={false} open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger
          render={
            <Button
              className="project-thread-composer-trigger"
              size="sm"
              type="button"
              variant="ghost"
            />
          }
          aria-label={`Branch: ${activeLabel}`}
        >
          <GitBranch aria-hidden="true" />
          <span className="project-thread-composer-trigger-label">{activeLabel}</span>
          <ChevronDown aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="project-thread-composer-dropdown"
          sideOffset={8}
          aria-label="Branch"
        >
          <InputGroup className="project-thread-composer-branch-search">
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              className="project-thread-composer-branch-search-input"
              type="text"
              value={branchQuery}
              placeholder="Search branches"
              aria-label="Search branches"
              onChange={(event) => setBranchQuery(event.target.value)}
            />
          </InputGroup>
          <DropdownMenuGroup>
            <DropdownMenuLabel className="project-thread-composer-dropdown-section-label">
              Branches
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              className="project-thread-composer-dropdown-options desktop-scroll-region"
              value={selectedOption?.id}
              onValueChange={(value) => {
                if (typeof value === "string" && value !== selectedOption?.id) {
                  setMenuOpen(false);
                  onSelect(value);
                }
              }}
            >
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <DropdownMenuRadioItem
                    key={option.id}
                    closeOnClick
                    className="project-thread-composer-option"
                    label={option.label}
                    value={option.id}
                  >
                    <span className="project-thread-composer-option-copy">
                      <span className="project-thread-composer-option-leading">
                        <GitBranch aria-hidden="true" />
                      </span>
                      <span className="project-thread-composer-option-label">{option.label}</span>
                    </span>
                  </DropdownMenuRadioItem>
                ))
              ) : (
                <Empty className="project-thread-composer-empty">
                  <EmptyHeader>
                    <EmptyTitle>No matching branches</EmptyTitle>
                  </EmptyHeader>
                </Empty>
              )}
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup className="project-thread-composer-dropdown-footer">
            <DropdownMenuItem
              className="project-thread-composer-create-branch"
              onClick={openBranchDialog}
            >
              <Plus aria-hidden="true" />
              <span>Create and checkout new branch...</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setBranchName("");
          }
        }}
      >
        <DialogContent
          className="project-thread-branch-popover"
          initialFocus={inputRef}
          showCloseButton={false}
        >
          <form className="project-thread-branch-popover-form" onSubmit={submitBranch}>
            <div className="project-thread-branch-popover-header">
              <DialogTitle className="project-thread-branch-popover-title">
                Create and checkout branch
              </DialogTitle>
              <DialogClose
                render={
                  <Button
                    className="project-thread-branch-popover-close"
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  />
                }
                aria-label="Close branch popover"
              >
                <X aria-hidden="true" />
              </DialogClose>
            </div>
            <FieldGroup className="project-thread-branch-popover-body">
              <div className="project-thread-branch-popover-label-row">
                <FieldLabel
                  className="project-thread-branch-popover-label"
                  htmlFor="project-thread-branch-name"
                >
                  Branch name
                </FieldLabel>
                <Button
                  type="button"
                  className="project-thread-branch-popover-prefix"
                  size="sm"
                  variant="ghost"
                  onClick={applyDefaultPrefix}
                >
                  Set prefix
                </Button>
              </div>
              <Field>
                <Input
                  id="project-thread-branch-name"
                  ref={inputRef}
                  className="project-thread-branch-popover-input"
                  type="text"
                  value={branchName}
                  placeholder={`${DEFAULT_BRANCH_PREFIX}create-and-checkout-branch`}
                  onChange={(event) => setBranchName(event.target.value)}
                />
              </Field>
            </FieldGroup>
            <div className="project-thread-branch-popover-actions">
              <Button
                type="submit"
                className="project-thread-branch-popover-button is-primary"
                disabled={branchName.trim().length === 0}
                size="sm"
              >
                Create and checkout
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type ThreadViewProps = {
  onCreateBranch: (threadId: string, branchName: string) => void;
  onImportProject: () => void;
  onSetModel: (threadId: string, modelId: string | null) => void;
  onSendMessage: (threadId: string, message: string) => void;
  onSwitchEnvironment: (threadId: string, environmentId: string) => void;
  selectedProject: AriaDesktopProjectGroup | null;
  selectedThreadState: AriaDesktopProjectThreadState | null;
};

export function ThreadView({
  onCreateBranch,
  onImportProject,
  onSetModel,
  onSendMessage,
  onSwitchEnvironment,
  selectedProject,
  selectedThreadState,
}: ThreadViewProps) {
  if (!selectedProject) {
    return (
      <div className="workbench-surface thread-empty-state">
        <Empty className="workbench-empty">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderPlus aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Projects</EmptyTitle>
            <EmptyDescription>Import a local project to start a workbench thread.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              type="button"
              className="thread-empty-state-action"
              onClick={onImportProject}
              variant="outline"
            >
              <FolderPlus aria-hidden="true" />
              <span>Import project</span>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  if (!selectedThreadState) {
    return (
      <div className="workbench-surface thread-empty-state">
        <Empty className="workbench-empty">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageSquarePlus aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{selectedProject.name}</EmptyTitle>
            <EmptyDescription>Create a thread from the project row to start work.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }
  const selectedBranch =
    selectedThreadState.availableBranches.find((option) => option.selected) ??
    selectedThreadState.availableBranches[0] ??
    null;
  const selectedModel =
    selectedThreadState.availableModels.find((option) => option.selected) ??
    selectedThreadState.availableModels[0] ??
    null;

  return (
    <div className="workbench-surface project-thread-view">
      <AriaChatView
        chat={selectedThreadState.chat}
        composerFooterEnd={
          selectedModel ? (
            <ComposerContextMenu
              activeLabel={selectedModel.modelLabel ?? selectedModel.label}
              align="end"
              icon={<Sparkles aria-hidden="true" />}
              menuLabel="Model"
              onSelect={(modelId) => onSetModel(selectedThreadState.threadId, modelId || null)}
              options={selectedThreadState.availableModels.map((option) => ({
                description: null,
                id: option.modelId ?? "",
                label: option.modelLabel ?? option.label,
                secondaryLabel: option.providerLabel ?? null,
                selected: option.selected,
              }))}
            />
          ) : null
        }
        composerFooterStart={
          selectedBranch ? (
            <BranchComposerMenu
              activeLabel={selectedBranch.value}
              onCreateBranch={(branchName) =>
                onCreateBranch(selectedThreadState.threadId, branchName)
              }
              onSelect={(environmentId) =>
                onSwitchEnvironment(selectedThreadState.threadId, environmentId)
              }
              options={selectedThreadState.availableBranches.map((option) => ({
                id: option.environmentId,
                label: option.value,
                selected: option.selected,
              }))}
            />
          ) : null
        }
        emptyPlaceholder="Message Aria"
        onAcceptForSession={() => {}}
        onAnswerQuestion={() => {}}
        onApproveToolCall={() => {}}
        promptSuggestions={selectedThreadState.promptSuggestions}
        onSendMessage={(message) => onSendMessage(selectedThreadState.threadId, message)}
      />
    </div>
  );
}

type SettingsSectionId =
  | "general"
  | "providers"
  | "models"
  | "security"
  | "runtime"
  | "memory"
  | "automation"
  | "connectors"
  | "data"
  | "about";

const SETTINGS_SECTIONS: Array<{
  icon: ReactNode;
  id: SettingsSectionId;
  label: string;
}> = [
  {
    icon: <SlidersHorizontal aria-hidden="true" />,
    id: "general",
    label: "General",
  },
  { icon: <Server aria-hidden="true" />, id: "runtime", label: "Runtime" },
  { icon: <Plug2 aria-hidden="true" />, id: "providers", label: "Providers" },
  { icon: <Bot aria-hidden="true" />, id: "models", label: "Models" },
  {
    icon: <LockKeyhole aria-hidden="true" />,
    id: "security",
    label: "Security",
  },
  {
    icon: <Brain aria-hidden="true" />,
    id: "memory",
    label: "Memory & Skills",
  },
  {
    icon: <Clock3 aria-hidden="true" />,
    id: "automation",
    label: "Automations",
  },
  { icon: <Plug2 aria-hidden="true" />, id: "connectors", label: "Connectors" },
  { icon: <HardDrive aria-hidden="true" />, id: "data", label: "Data" },
  { icon: <Database aria-hidden="true" />, id: "about", label: "About" },
];

type SettingsUpdateHandler = (patch: AriaDesktopSettingsPatch) => Promise<void> | void;
type SettingsProviderModelsHandler = (
  providerId: string,
) => Promise<AriaDesktopSettingsProviderModelsResult>;

const EMPTY_SETTINGS_PROVIDER_MODELS: AriaDesktopSettingsProviderModelsResult = {
  error: "Model list unavailable.",
  models: [],
  providerId: "",
  source: "provider",
};

async function unavailableSettingsProviderModels(
  providerId: string,
): Promise<AriaDesktopSettingsProviderModelsResult> {
  return { ...EMPTY_SETTINGS_PROVIDER_MODELS, providerId };
}

function SettingsToggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return <Switch aria-label={label} checked={checked} onCheckedChange={onChange} size="sm" />;
}

function SettingsSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <Select<string>
      disabled={options.length === 0}
      items={options}
      onValueChange={(nextValue) => {
        if (typeof nextValue === "string") {
          onChange(nextValue);
        }
      }}
      value={value}
    >
      <SelectTrigger aria-label={label} size="sm">
        <SelectValue>
          {(selectedValue: string | null) =>
            options.find((option) => option.value === selectedValue)?.label ??
            selectedOption?.label ??
            ""
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end" sideOffset={6}>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} label={option.label} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function SettingsNumberInput({
  label,
  min = 1,
  onChange,
  value,
}: {
  label: string;
  min?: number;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <Input
      aria-label={label}
      className="max-w-20 text-right"
      min={min}
      onChange={(event) => onChange(Number(event.target.value))}
      type="number"
      value={value}
    />
  );
}

function SettingsTextInput({
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "password" | "text";
  value: string;
}) {
  return (
    <Input
      aria-label={label}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      type={type}
      value={value}
    />
  );
}

function SettingsActionButton({
  children,
  disabled = false,
  icon,
  onClick,
  variant = "outline",
}: {
  children: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
  onClick: () => Promise<void> | void;
  variant?: "default" | "ghost" | "outline" | "secondary";
}) {
  return (
    <Button disabled={disabled} onClick={onClick} size="sm" type="button" variant={variant}>
      {icon ? <span data-icon="inline-start">{icon}</span> : null}
      {children}
    </Button>
  );
}

function SettingsDeleteAction({
  disabled = false,
  itemLabel,
  onConfirm,
}: {
  disabled?: boolean;
  itemLabel: string;
  onConfirm: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        disabled={disabled}
        render={<Button disabled={disabled} size="sm" type="button" variant="outline" />}
      >
        Delete
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {itemLabel}?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the local settings entry. Existing runtime files are left untouched.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              setOpen(false);
              void onConfirm();
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SettingsInlineControls({ children }: { children: ReactNode }) {
  return <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">{children}</div>;
}

function SettingsRow({
  children,
  label,
  value,
}: {
  children?: ReactNode;
  label: string;
  value?: ReactNode;
}) {
  const control = children ?? value;
  const controlContent =
    typeof control === "string" || typeof control === "number" ? (
      <FieldDescription>{control}</FieldDescription>
    ) : (
      control
    );

  return (
    <Field orientation="responsive" className="py-2">
      <FieldContent>
        <FieldTitle>{label}</FieldTitle>
      </FieldContent>
      <div className="flex min-w-0 justify-start @md/field-group:justify-end">{controlContent}</div>
    </Field>
  );
}

function SettingsPanel({
  action,
  children,
  section,
}: {
  action?: ReactNode;
  children: ReactNode;
  section: (typeof SETTINGS_SECTIONS)[number];
}) {
  return (
    <Card className="w-full" size="sm" aria-labelledby={`settings-panel-${section.id}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span aria-hidden="true">{section.icon}</span>
          <span id={`settings-panel-${section.id}`}>{section.label}</span>
        </CardTitle>
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent>
        <FieldGroup>{children}</FieldGroup>
      </CardContent>
    </Card>
  );
}

function SettingsSectionHeading({ children }: { children: ReactNode }) {
  return <FieldSeparator>{children}</FieldSeparator>;
}

function SettingsSheet({
  children,
  onClose,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}

const SETTINGS_THEME_OPTIONS = [
  { label: "System", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
];
const SETTINGS_SPACE_OPTIONS = [
  { label: "Projects", value: "projects" },
  { label: "Chat", value: "chat" },
];
const SETTINGS_APPROVAL_OPTIONS = [
  { label: "Ask", value: "ask" },
  { label: "Never", value: "never" },
  { label: "Always", value: "always" },
];
const SETTINGS_SECURITY_OPTIONS = [
  { label: "Default", value: "default" },
  { label: "Trusted", value: "trusted" },
  { label: "Unrestricted", value: "unrestricted" },
];
const SETTINGS_VERBOSITY_OPTIONS = [
  { label: "Silent", value: "silent" },
  { label: "Minimal", value: "minimal" },
  { label: "Verbose", value: "verbose" },
];
const SETTINGS_MODEL_TIER_OPTIONS = [
  { label: "Performance", value: "performance" },
  { label: "Normal", value: "normal" },
  { label: "Eco", value: "eco" },
];
const SETTINGS_MODEL_TYPE_OPTIONS = [
  { label: "Chat", value: "chat" },
  { label: "Embedding", value: "embedding" },
];
const SETTINGS_PROVIDER_TYPE_OPTIONS: Array<{
  label: string;
  value: AriaDesktopSettingsProviderType;
}> = [
  { label: "Anthropic", value: "anthropic" },
  { label: "OpenAI", value: "openai" },
  { label: "Google", value: "google" },
  { label: "OpenRouter", value: "openrouter" },
  { label: "Nvidia", value: "nvidia" },
  { label: "OpenAI Compatible", value: "openai-compat" },
];

function SettingsSecretEditor({
  maskedValue,
  onSave,
  secretLabel,
}: {
  maskedValue: string | null;
  onSave: (value: string | null) => void;
  secretLabel: string;
}) {
  const [value, setValue] = useState("");

  return (
    <InputGroup>
      <InputGroupAddon>
        <InputGroupText>{maskedValue ?? "Not set"}</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        aria-label={secretLabel}
        autoComplete="off"
        onChange={(event) => setValue(event.target.value)}
        placeholder="New value"
        type="password"
        value={value}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          disabled={value.trim() === ""}
          onClick={() => {
            onSave(value);
            setValue("");
          }}
        >
          Save
        </InputGroupButton>
        <InputGroupButton onClick={() => onSave(null)}>Clear</InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}

function SettingsWizard({
  activeStepIndex,
  canContinue,
  children,
  finishDisabled,
  finishLabel,
  onBack,
  onCancel,
  onFinish,
  onNext,
  steps,
  title,
}: {
  activeStepIndex: number;
  canContinue: boolean;
  children: ReactNode;
  finishDisabled: boolean;
  finishLabel: string;
  onBack: () => void;
  onCancel: () => void;
  onFinish: () => Promise<void> | void;
  onNext: () => void;
  steps: string[];
  title: string;
}) {
  const isLastStep = activeStepIndex === steps.length - 1;

  return (
    <>
      <FieldGroup className="min-h-0 flex-1 overflow-auto px-4 pb-4">
        <Field>
          <FieldLabel className="sr-only">{title} progress</FieldLabel>
          <div className="flex flex-wrap gap-2" aria-label={`${title} steps`}>
            {steps.map((step, index) => (
              <Badge key={step} variant={index <= activeStepIndex ? "default" : "outline"}>
                {index + 1} {step}
              </Badge>
            ))}
          </div>
        </Field>
        <FieldSeparator />
        <FieldGroup>{children}</FieldGroup>
      </FieldGroup>
      <SheetFooter className="items-end">
        <ButtonGroup>
          <Button onClick={onCancel} size="sm" type="button" variant="outline">
            Reset
          </Button>
          <Button
            disabled={activeStepIndex === 0}
            onClick={onBack}
            size="sm"
            type="button"
            variant="outline"
          >
            Back
          </Button>
          {isLastStep ? (
            <Button disabled={finishDisabled} onClick={onFinish} size="sm" type="button">
              {finishLabel}
            </Button>
          ) : (
            <Button disabled={!canContinue} onClick={onNext} size="sm" type="button">
              Next
            </Button>
          )}
        </ButtonGroup>
      </SheetFooter>
    </>
  );
}

function SettingsReviewRows({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <FieldGroup>
      {items.map((item) => (
        <SettingsRow key={item.label} label={item.label} value={item.value} />
      ))}
    </FieldGroup>
  );
}

function getInitialProviderPresetId(settingsState: AriaDesktopSettingsState): string {
  const configuredProviderIds = new Set(
    settingsState.runtime.providers.map((provider) => provider.id),
  );
  return (
    settingsState.runtime.providerPresets.find((preset) => !configuredProviderIds.has(preset.id))
      ?.id ?? "custom"
  );
}

function ProviderSetupWizard({
  onUpdate,
  settingsState,
}: {
  onUpdate: SettingsUpdateHandler;
  settingsState: AriaDesktopSettingsState;
}) {
  const initialPresetId = getInitialProviderPresetId(settingsState);
  const [step, setStep] = useState(0);
  const [presetId, setPresetId] = useState(initialPresetId);
  const selectedPreset =
    settingsState.runtime.providerPresets.find((preset) => preset.id === presetId) ?? null;
  const [customId, setCustomId] = useState("");
  const [customType, setCustomType] = useState<AriaDesktopSettingsProviderType>("openai-compat");
  const [customEnvVar, setCustomEnvVar] = useState("");
  const [customBaseUrl, setCustomBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const id = selectedPreset?.id ?? customId.trim();
  const apiKeyEnvVar = selectedPreset?.apiKeyEnvVar ?? customEnvVar.trim();
  const type = selectedPreset?.type ?? customType;
  const baseUrl = selectedPreset?.baseUrl ?? customBaseUrl.trim();
  const alreadyExists = settingsState.runtime.providers.some((provider) => provider.id === id);
  const steps = ["Provider", "Credentials", "Review"];
  const canContinue =
    step === 0 ? Boolean(id && type && !alreadyExists) : step === 1 ? Boolean(apiKeyEnvVar) : true;

  useEffect(() => {
    if (selectedPreset && alreadyExists && initialPresetId !== presetId) {
      setPresetId(initialPresetId);
    }
  }, [alreadyExists, initialPresetId, presetId, selectedPreset]);

  function resetProviderWizard(): void {
    setStep(0);
    setPresetId(initialPresetId);
    setCustomId("");
    setCustomType("openai-compat");
    setCustomEnvVar("");
    setCustomBaseUrl("");
    setApiKey("");
  }

  async function addProvider(): Promise<void> {
    await onUpdate({
      provider: {
        add: {
          apiKey,
          apiKeyEnvVar,
          baseUrl,
          id,
          type,
        },
      },
    });
    resetProviderWizard();
  }

  return (
    <SettingsWizard
      activeStepIndex={step}
      canContinue={canContinue}
      finishDisabled={!id || !apiKeyEnvVar || alreadyExists}
      finishLabel="Add Provider"
      onBack={() => setStep((current) => Math.max(0, current - 1))}
      onCancel={resetProviderWizard}
      onFinish={addProvider}
      onNext={() => setStep((current) => Math.min(steps.length - 1, current + 1))}
      steps={steps}
      title="Add Provider"
    >
      {step === 0 ? (
        <>
          <SettingsRow label="Preset">
            <SettingsSelect
              label="Provider Preset"
              onChange={setPresetId}
              options={[
                ...settingsState.runtime.providerPresets.map((preset) => ({
                  label: preset.label,
                  value: preset.id,
                })),
                { label: "Custom", value: "custom" },
              ]}
              value={presetId}
            />
          </SettingsRow>
          {!selectedPreset ? (
            <>
              <SettingsRow label="Provider ID">
                <SettingsTextInput label="Provider ID" onChange={setCustomId} value={customId} />
              </SettingsRow>
              <SettingsRow label="Provider Type">
                <SettingsSelect
                  label="Provider Type"
                  onChange={(value) => setCustomType(value as AriaDesktopSettingsProviderType)}
                  options={SETTINGS_PROVIDER_TYPE_OPTIONS}
                  value={customType}
                />
              </SettingsRow>
            </>
          ) : null}
          <SettingsRow
            label="Status"
            value={
              <Badge variant={alreadyExists ? "outline" : "secondary"}>
                {alreadyExists ? "Already Exists" : "Available"}
              </Badge>
            }
          />
        </>
      ) : null}
      {step === 1 ? (
        <>
          {!selectedPreset ? (
            <>
              <SettingsRow label="API Key Env Var">
                <SettingsTextInput
                  label="API Key Env Var"
                  onChange={setCustomEnvVar}
                  value={customEnvVar}
                />
              </SettingsRow>
              <SettingsRow label="Base URL">
                <SettingsTextInput
                  label="Base URL"
                  onChange={setCustomBaseUrl}
                  value={customBaseUrl}
                />
              </SettingsRow>
            </>
          ) : null}
          {selectedPreset?.baseUrl ? (
            <SettingsRow label="Base URL" value={selectedPreset.baseUrl} />
          ) : null}
          <SettingsRow label="API Key">
            <SettingsTextInput
              label="Provider API Key"
              onChange={setApiKey}
              placeholder="Optional"
              type="password"
              value={apiKey}
            />
          </SettingsRow>
        </>
      ) : null}
      {step === 2 ? (
        <SettingsReviewRows
          items={[
            { label: "Provider", value: id || "Missing" },
            { label: "Type", value: type },
            { label: "API Key Env Var", value: apiKeyEnvVar || "Missing" },
            { label: "Base URL", value: baseUrl || "Default" },
            { label: "Secret", value: apiKey.trim() ? "Set" : "Skip" },
          ]}
        />
      ) : null}
    </SettingsWizard>
  );
}

function ModelSetupWizard({
  onFetchProviderModels = unavailableSettingsProviderModels,
  onUpdate,
  settingsState,
}: {
  onFetchProviderModels?: SettingsProviderModelsHandler;
  onUpdate: SettingsUpdateHandler;
  settingsState: AriaDesktopSettingsState;
}) {
  const firstProviderId = settingsState.runtime.providers[0]?.id ?? "";
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [provider, setProvider] = useState(firstProviderId);
  const [model, setModel] = useState("");
  const [type, setType] = useState<"chat" | "embedding">("chat");
  const [temperature, setTemperature] = useState("0.7");
  const [maxTokens, setMaxTokens] = useState("8192");
  const [providerModels, setProviderModels] = useState<
    AriaDesktopSettingsProviderModelsResult["models"]
  >([]);
  const [providerModelError, setProviderModelError] = useState<string | null>(null);
  const [providerModelStatus, setProviderModelStatus] = useState<"idle" | "loading" | "ready">(
    "idle",
  );
  const fetchRequestRef = useRef(0);
  const nameExists = settingsState.runtime.models.some((entry) => entry.name === name.trim());
  const selectedProvider =
    settingsState.runtime.providers.find((entry) => entry.id === provider) ?? null;
  const selectedProviderModel = providerModels.find((entry) => entry.id === model) ?? null;
  const modelAlreadyConfigured = providerModels.some(
    (entry) => entry.id === model && entry.configured,
  );
  const steps = ["Type", "Provider", "Model", "Review"];
  const canContinue =
    step === 0
      ? Boolean(type)
      : step === 1
        ? Boolean(provider)
        : step === 2
          ? Boolean(name.trim() && provider && model.trim() && !nameExists)
          : true;

  const inferModelName = useCallback(
    (modelId: string) => {
      const existingNames = new Set(settingsState.runtime.models.map((entry) => entry.name));
      const lastSegment =
        modelId
          .replace(/^models\//, "")
          .split("/")
          .pop() ?? modelId;
      const base = lastSegment
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const stem = base || "model";
      let candidate = stem;
      let suffix = 2;
      while (existingNames.has(candidate)) {
        candidate = `${stem}-${suffix}`;
        suffix += 1;
      }
      return candidate;
    },
    [settingsState.runtime.models],
  );

  const applyModelSelection = useCallback(
    (
      modelId: string,
      options: AriaDesktopSettingsProviderModelsResult["models"] = providerModels,
    ) => {
      setModel(modelId);
      if (!nameTouched) {
        setName(inferModelName(modelId));
      }
      if (type === "chat") {
        const option = options.find((entry) => entry.id === modelId);
        setTemperature("0.7");
        setMaxTokens(String(option?.maxTokens ?? 8192));
      }
    },
    [inferModelName, nameTouched, providerModels, type],
  );

  const loadProviderModels = useCallback(async () => {
    if (!provider) {
      setProviderModels([]);
      setProviderModelError(null);
      setProviderModelStatus("idle");
      return;
    }

    const requestId = fetchRequestRef.current + 1;
    fetchRequestRef.current = requestId;
    setProviderModelStatus("loading");
    setProviderModelError(null);
    try {
      const result = await onFetchProviderModels(provider);
      if (fetchRequestRef.current !== requestId) {
        return;
      }
      setProviderModels(result.models);
      setProviderModelError(result.error);
      setProviderModelStatus("ready");
      if (result.models.length > 0) {
        const preferredModel =
          result.models.find((entry) => !entry.configured)?.id ?? result.models[0]!.id;
        applyModelSelection(model || preferredModel, result.models);
      }
    } catch (error) {
      if (fetchRequestRef.current !== requestId) {
        return;
      }
      setProviderModels([]);
      setProviderModelError(error instanceof Error ? error.message : String(error));
      setProviderModelStatus("ready");
    }
  }, [applyModelSelection, model, onFetchProviderModels, provider]);

  const modelOptions = providerModels.map((entry) => ({
    label: `${entry.id}${entry.configured ? " (configured)" : ""}`,
    value: entry.id,
  }));
  const parameterSummary = type === "chat" ? `temp ${temperature}, max ${maxTokens}` : "Default";
  const statusLabel =
    providerModelStatus === "loading"
      ? "Loading"
      : nameExists
        ? "Name Exists"
        : modelAlreadyConfigured
          ? "Configured"
          : providerModelError
            ? "Manual Entry"
            : "Available";

  useEffect(() => {
    if (!provider && firstProviderId) {
      setProvider(firstProviderId);
    }
  }, [firstProviderId, provider]);

  useEffect(() => {
    if (step === 2) {
      void loadProviderModels();
    }
  }, [provider, step]);

  function resetModelWizard(): void {
    setStep(0);
    setName("");
    setNameTouched(false);
    setProvider(firstProviderId);
    setModel("");
    setType("chat");
    setTemperature("0.7");
    setMaxTokens("8192");
    setProviderModels([]);
    setProviderModelError(null);
    setProviderModelStatus("idle");
  }

  async function addModel(): Promise<void> {
    await onUpdate({
      model: {
        add: {
          maxTokens: type === "chat" ? Number(maxTokens) : null,
          model: model.trim(),
          name: name.trim(),
          provider,
          temperature: type === "chat" ? Number(temperature) : null,
          type,
        },
      },
    });
    resetModelWizard();
  }

  return (
    <SettingsWizard
      activeStepIndex={step}
      canContinue={canContinue}
      finishDisabled={!name.trim() || !provider || !model.trim() || nameExists}
      finishLabel="Add Model"
      onBack={() => setStep((current) => Math.max(0, current - 1))}
      onCancel={resetModelWizard}
      onFinish={addModel}
      onNext={() => setStep((current) => Math.min(steps.length - 1, current + 1))}
      steps={steps}
      title="Add Model"
    >
      {step === 0 ? (
        <SettingsRow label="Model Type">
          <SettingsSelect
            label="Model Type"
            onChange={(value) => setType(value as "chat" | "embedding")}
            options={SETTINGS_MODEL_TYPE_OPTIONS}
            value={type}
          />
        </SettingsRow>
      ) : null}
      {step === 1 ? (
        <>
          <SettingsRow label="Provider">
            <SettingsSelect
              label="Provider"
              onChange={(providerId) => {
                setProvider(providerId);
                setModel("");
                setProviderModels([]);
                setProviderModelError(null);
                setProviderModelStatus("idle");
              }}
              options={settingsState.runtime.providers.map((entry) => ({
                label: entry.label,
                value: entry.id,
              }))}
              value={provider}
            />
          </SettingsRow>
          <SettingsRow
            label="Provider Type"
            value={<Badge variant="secondary">{selectedProvider?.type ?? "Missing"}</Badge>}
          />
        </>
      ) : null}
      {step === 2 ? (
        <>
          {modelOptions.length > 0 ? (
            <SettingsRow label="Provider Model">
              <SettingsSelect
                label="Provider Model"
                onChange={(modelId) => applyModelSelection(modelId)}
                options={modelOptions}
                value={model || modelOptions[0]?.value || ""}
              />
            </SettingsRow>
          ) : (
            <SettingsRow label="Provider Model">
              <SettingsTextInput
                label="Provider Model"
                onChange={(modelId) => {
                  setModel(modelId);
                  if (!nameTouched && modelId.trim()) {
                    setName(inferModelName(modelId));
                  }
                  if (type === "chat") {
                    setTemperature("0.7");
                    setMaxTokens("8192");
                  }
                }}
                placeholder={providerModelStatus === "loading" ? "Loading" : "Model ID"}
                value={model}
              />
            </SettingsRow>
          )}
          <SettingsRow label="Name">
            <SettingsTextInput
              label="Model Name"
              onChange={(nextName) => {
                setNameTouched(true);
                setName(nextName);
              }}
              value={name}
            />
          </SettingsRow>
          <SettingsRow label="Parameters" value={parameterSummary} />
          <SettingsRow label="Status">
            <SettingsInlineControls>
              {providerModelStatus === "loading" ? <Spinner /> : null}
              <Badge variant={nameExists ? "outline" : "secondary"}>{statusLabel}</Badge>
              {selectedProviderModel?.maxTokens ? (
                <Badge variant="outline">{selectedProviderModel.maxTokens} max</Badge>
              ) : null}
              <SettingsActionButton disabled={!provider} onClick={loadProviderModels}>
                Refresh
              </SettingsActionButton>
            </SettingsInlineControls>
          </SettingsRow>
          {providerModelError ? <SettingsRow label="Fetch" value={providerModelError} /> : null}
        </>
      ) : null}
      {step === 3 ? (
        <SettingsReviewRows
          items={[
            { label: "Name", value: name.trim() || "Missing" },
            { label: "Type", value: type },
            { label: "Provider", value: provider || "Missing" },
            { label: "Model ID", value: model.trim() || "Missing" },
            {
              label: "Parameters",
              value: parameterSummary,
            },
          ]}
        />
      ) : null}
    </SettingsWizard>
  );
}

function ConnectorSetupWizard({
  initialConnectorName,
  onUpdate,
  settingsState,
}: {
  initialConnectorName?: AriaDesktopSettingsConnectorType | null;
  onUpdate: SettingsUpdateHandler;
  settingsState: AriaDesktopSettingsState;
}) {
  const firstConnector = settingsState.connectors[0];
  const initialConnector = initialConnectorName ?? firstConnector?.name ?? "";
  const [step, setStep] = useState(0);
  const [connectorName, setConnectorName] = useState(initialConnector);
  const selectedConnector =
    settingsState.connectors.find((connector) => connector.name === connectorName) ??
    firstConnector ??
    null;
  const [approval, setApproval] = useState<AriaDesktopSettingsApprovalMode>(
    selectedConnector?.approval ?? "ask",
  );
  const [webhookEnabled, setWebhookEnabled] = useState(selectedConnector?.webhookEnabled ?? false);
  const [secretDrafts, setSecretDrafts] = useState<Record<string, string | null | undefined>>({});
  const steps = ["Connector", "Policy", "Credentials", "Review"];

  useEffect(() => {
    if (!connectorName && firstConnector) {
      setConnectorName(initialConnector);
    }
  }, [connectorName, firstConnector, initialConnector]);

  useEffect(() => {
    if (selectedConnector) {
      setApproval(selectedConnector.approval);
      setWebhookEnabled(selectedConnector.webhookEnabled ?? false);
      setSecretDrafts({});
    }
  }, [selectedConnector?.name, selectedConnector?.approval, selectedConnector?.webhookEnabled]);

  function resetConnectorWizard(): void {
    setStep(0);
    const resetConnector =
      settingsState.connectors.find((connector) => connector.name === initialConnector) ??
      firstConnector ??
      null;
    setConnectorName(resetConnector?.name ?? "");
    setApproval(resetConnector?.approval ?? "ask");
    setWebhookEnabled(resetConnector?.webhookEnabled ?? false);
    setSecretDrafts({});
  }

  async function saveConnector(): Promise<void> {
    if (!selectedConnector) {
      return;
    }
    await onUpdate({
      connector: {
        setApproval: {
          connector: selectedConnector.name as AriaDesktopSettingsConnectorType,
          mode: approval,
        },
        updateSecrets: Object.entries(secretDrafts)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => ({ key, value: value ?? null })),
        ...(typeof selectedConnector.webhookEnabled === "boolean" ? { webhookEnabled } : {}),
      },
    });
    resetConnectorWizard();
  }

  const secretSummary = selectedConnector?.secrets.length
    ? selectedConnector.secrets
        .map((secret) => {
          const draft = secretDrafts[secret.key];
          if (draft === null) {
            return `${secret.label}: Clear`;
          }
          if (typeof draft === "string" && draft.trim()) {
            return `${secret.label}: Set`;
          }
          return `${secret.label}: Keep`;
        })
        .join(", ")
    : "None";

  return (
    <SettingsWizard
      activeStepIndex={step}
      canContinue={Boolean(selectedConnector)}
      finishDisabled={!selectedConnector}
      finishLabel="Save Connector"
      onBack={() => setStep((current) => Math.max(0, current - 1))}
      onCancel={resetConnectorWizard}
      onFinish={saveConnector}
      onNext={() => setStep((current) => Math.min(steps.length - 1, current + 1))}
      steps={steps}
      title="Configure Connector"
    >
      {step === 0 ? (
        <>
          <SettingsRow label="Connector">
            <SettingsSelect
              label="Connector"
              onChange={setConnectorName}
              options={settingsState.connectors.map((connector) => ({
                label: connector.label,
                value: connector.name,
              }))}
              value={selectedConnector?.name ?? ""}
            />
          </SettingsRow>
          <SettingsRow
            label="Status"
            value={
              <Badge variant={selectedConnector?.configured ? "secondary" : "outline"}>
                {selectedConnector?.configured ? "Configured" : "Not Set"}
              </Badge>
            }
          />
        </>
      ) : null}
      {step === 1 ? (
        <>
          <SettingsRow label="Approval">
            <SettingsSelect
              label="Connector Approval"
              onChange={(mode) => setApproval(mode as AriaDesktopSettingsApprovalMode)}
              options={SETTINGS_APPROVAL_OPTIONS}
              value={approval}
            />
          </SettingsRow>
          {typeof selectedConnector?.webhookEnabled === "boolean" ? (
            <SettingsRow label="Webhook Enabled">
              <SettingsToggle
                checked={webhookEnabled}
                label="Toggle webhook connector"
                onChange={setWebhookEnabled}
              />
            </SettingsRow>
          ) : null}
        </>
      ) : null}
      {step === 2 ? (
        <>
          {selectedConnector?.secrets.length ? (
            selectedConnector.secrets.map((secret) => (
              <SettingsRow key={secret.key} label={secret.label}>
                <SettingsInlineControls>
                  <Badge variant={secret.configured ? "secondary" : "outline"}>
                    {secret.maskedValue ?? "Not set"}
                  </Badge>
                  <ButtonGroup>
                    <SettingsTextInput
                      label={`${selectedConnector.label} ${secret.label}`}
                      onChange={(value) =>
                        setSecretDrafts((current) => ({
                          ...current,
                          [secret.key]: value,
                        }))
                      }
                      placeholder="New value"
                      type="password"
                      value={secretDrafts[secret.key] ?? ""}
                    />
                    <SettingsActionButton
                      onClick={() =>
                        setSecretDrafts((current) => ({
                          ...current,
                          [secret.key]: null,
                        }))
                      }
                    >
                      Clear
                    </SettingsActionButton>
                  </ButtonGroup>
                </SettingsInlineControls>
              </SettingsRow>
            ))
          ) : (
            <SettingsRow label="Credentials" value="None" />
          )}
        </>
      ) : null}
      {step === 3 ? (
        <SettingsReviewRows
          items={[
            {
              label: "Connector",
              value: selectedConnector?.label ?? "Missing",
            },
            { label: "Approval", value: approval },
            {
              label: "Webhook",
              value:
                typeof selectedConnector?.webhookEnabled === "boolean"
                  ? webhookEnabled
                    ? "Enabled"
                    : "Disabled"
                  : "Default",
            },
            { label: "Credentials", value: secretSummary },
          ]}
        />
      ) : null}
    </SettingsWizard>
  );
}

export function SettingsView({
  initialSectionId = "general",
  onFetchProviderModels,
  onUpdate,
  settingsState,
}: {
  initialSectionId?: SettingsSectionId;
  onFetchProviderModels?: SettingsProviderModelsHandler;
  onUpdate: SettingsUpdateHandler;
  settingsState: AriaDesktopSettingsState;
}) {
  const [activeSectionId, setActiveSectionId] = useState<SettingsSectionId>(initialSectionId);
  const [settingsSheet, setSettingsSheet] = useState<"connector" | "model" | "provider" | null>(
    null,
  );
  const [connectorSetupName, setConnectorSetupName] =
    useState<AriaDesktopSettingsConnectorType | null>(null);

  const activeSection =
    SETTINGS_SECTIONS.find((section) => section.id === activeSectionId) ?? SETTINGS_SECTIONS[0];
  const chatModels = settingsState.runtime.models.filter((model) => model.type !== "embedding");
  const modelOptions = chatModels.map((model) => ({
    label: model.label,
    value: model.name,
  }));
  const connectorSetup =
    settingsState.connectors.find((connector) => connector.name === connectorSetupName) ?? null;
  const sectionAction =
    activeSectionId === "providers" ? (
      <SettingsActionButton
        icon={<Plus aria-hidden="true" />}
        onClick={() => setSettingsSheet("provider")}
      >
        Add Provider
      </SettingsActionButton>
    ) : activeSectionId === "models" ? (
      <SettingsActionButton
        icon={<Plus aria-hidden="true" />}
        onClick={() => setSettingsSheet("model")}
      >
        Add Model
      </SettingsActionButton>
    ) : null;

  return (
    <SidebarProvider className="min-h-0 flex-1">
      <Sidebar aria-label="Settings">
        <SidebarHeader>Settings</SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Sections</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu aria-label="Settings sections">
                {SETTINGS_SECTIONS.map((section) => (
                  <SidebarMenuItem key={section.id}>
                    <SidebarMenuButton
                      isActive={section.id === activeSectionId}
                      onClick={() => setActiveSectionId(section.id)}
                      type="button"
                    >
                      <span data-icon="inline-start">{section.icon}</span>
                      <span className="truncate">{section.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="min-h-0 overflow-hidden">
        <div className="min-h-0 overflow-auto p-4 sm:p-6">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
            <SettingsPanel action={sectionAction} section={activeSection}>
              {activeSectionId === "general" ? (
                <>
                  <SettingsRow label="Theme">
                    <SettingsSelect
                      label="Theme"
                      onChange={(theme) =>
                        onUpdate({
                          desktop: {
                            theme: theme as AriaDesktopSettingsState["desktop"]["theme"],
                          },
                        })
                      }
                      options={SETTINGS_THEME_OPTIONS}
                      value={settingsState.desktop.theme}
                    />
                  </SettingsRow>
                  <SettingsRow label="Default Space">
                    <SettingsSelect
                      label="Default Space"
                      onChange={(defaultSpace) =>
                        onUpdate({
                          desktop: {
                            defaultSpace:
                              defaultSpace as AriaDesktopSettingsState["desktop"]["defaultSpace"],
                          },
                        })
                      }
                      options={SETTINGS_SPACE_OPTIONS}
                      value={settingsState.desktop.defaultSpace}
                    />
                  </SettingsRow>
                  <SettingsRow label="Compact Mode">
                    <SettingsToggle
                      checked={settingsState.desktop.compactMode}
                      label="Toggle compact mode"
                      onChange={(compactMode) => onUpdate({ desktop: { compactMode } })}
                    />
                  </SettingsRow>
                  <SettingsRow label="Start At Login">
                    <SettingsToggle
                      checked={settingsState.desktop.startAtLogin}
                      label="Toggle start at login"
                      onChange={(startAtLogin) => onUpdate({ desktop: { startAtLogin } })}
                    />
                  </SettingsRow>
                </>
              ) : null}

              {activeSectionId === "runtime" ? (
                <>
                  <SettingsRow
                    label="Current Node"
                    value={<Badge variant="secondary">This Mac</Badge>}
                  />
                  <SettingsRow
                    label="Runtime Home"
                    value={<code>{settingsState.runtime.homeDir}</code>}
                  />
                  <SettingsRow label="Providers" value={settingsState.runtime.providerCount} />
                  <SettingsRow label="MCP Servers" value={settingsState.runtime.mcpServerCount} />
                  <SettingsRow label="Context Files">
                    <SettingsToggle
                      checked={settingsState.runtime.contextFilesEnabled}
                      label="Toggle context files"
                      onChange={(contextFilesEnabled) =>
                        onUpdate({ runtime: { contextFilesEnabled } })
                      }
                    />
                  </SettingsRow>
                </>
              ) : null}

              {activeSectionId === "providers" ? (
                <>
                  {settingsState.runtime.providers.map((provider) => (
                    <SettingsRow
                      key={provider.id}
                      label={`${provider.label} (${provider.type})`}
                      value={
                        <SettingsInlineControls>
                          <Badge variant={provider.apiKeyConfigured ? "secondary" : "outline"}>
                            {provider.apiKeyConfigured ? provider.apiKeyEnvVar : "No key"}
                          </Badge>
                          <Badge variant="outline">{provider.modelCount} models</Badge>
                          <SettingsSecretEditor
                            maskedValue={provider.apiKeyConfigured ? "Configured" : null}
                            onSave={(value) =>
                              onUpdate({
                                provider: {
                                  updateApiKey: {
                                    envVar: provider.apiKeyEnvVar,
                                    value,
                                  },
                                },
                              })
                            }
                            secretLabel={`${provider.id} API key`}
                          />
                          <SettingsDeleteAction
                            disabled={provider.modelCount > 0}
                            itemLabel={provider.label}
                            onConfirm={() => onUpdate({ provider: { deleteId: provider.id } })}
                          />
                        </SettingsInlineControls>
                      }
                    />
                  ))}
                </>
              ) : null}

              {activeSectionId === "models" ? (
                <>
                  <SettingsSectionHeading>Model Configuration</SettingsSectionHeading>
                  <SettingsRow label="Default Model">
                    <SettingsSelect
                      label="Default Model"
                      onChange={(setDefault) => onUpdate({ model: { setDefault } })}
                      options={modelOptions}
                      value={settingsState.runtime.activeModel}
                    />
                  </SettingsRow>
                  <SettingsRow label="Config Default" value={settingsState.runtime.defaultModel} />
                  {SETTINGS_MODEL_TIER_OPTIONS.map((tier) => (
                    <SettingsRow key={tier.value} label={`${tier.label} Tier`}>
                      <SettingsSelect
                        label={`${tier.label} Tier`}
                        onChange={(modelName) =>
                          onUpdate({
                            model: {
                              setTier: {
                                modelName: modelName || null,
                                tier: tier.value as AriaDesktopSettingsState["runtime"]["models"][number]["tiers"][number],
                              },
                            },
                          })
                        }
                        options={[{ label: "Default", value: "" }, ...modelOptions]}
                        value={
                          settingsState.runtime.modelTiers[
                            tier.value as keyof typeof settingsState.runtime.modelTiers
                          ] ?? ""
                        }
                      />
                    </SettingsRow>
                  ))}
                  <SettingsSectionHeading>Model List</SettingsSectionHeading>
                  {settingsState.runtime.models.map((model) => (
                    <SettingsRow
                      key={model.name}
                      label={`${model.name}${model.selected ? " *" : ""}`}
                      value={
                        <SettingsInlineControls>
                          <Badge variant="secondary">{model.type}</Badge>
                          <Badge variant="outline">{model.provider}</Badge>
                          <span>{model.model}</span>
                          {model.tiers.length > 0 ? (
                            <Badge variant="outline">{model.tiers.join(", ")}</Badge>
                          ) : null}
                          <SettingsDeleteAction
                            disabled={model.selected}
                            itemLabel={model.name}
                            onConfirm={() => onUpdate({ model: { deleteName: model.name } })}
                          />
                        </SettingsInlineControls>
                      }
                    />
                  ))}
                </>
              ) : null}

              {activeSectionId === "security" ? (
                <>
                  <SettingsRow label="Desktop Tool Approval">
                    <SettingsSelect
                      label="Desktop Tool Approval"
                      onChange={(tuiApproval) =>
                        onUpdate({
                          runtime: {
                            tuiApproval:
                              tuiApproval as AriaDesktopSettingsState["runtime"]["tuiApproval"],
                          },
                        })
                      }
                      options={SETTINGS_APPROVAL_OPTIONS}
                      value={settingsState.runtime.tuiApproval}
                    />
                  </SettingsRow>
                  <SettingsRow label="Connector Approval">
                    <SettingsSelect
                      label="Connector Approval"
                      onChange={(connectorApproval) =>
                        onUpdate({
                          runtime: {
                            connectorApproval:
                              connectorApproval as AriaDesktopSettingsState["runtime"]["connectorApproval"],
                          },
                        })
                      }
                      options={SETTINGS_APPROVAL_OPTIONS}
                      value={settingsState.runtime.connectorApproval}
                    />
                  </SettingsRow>
                  <SettingsRow label="Webhook Approval">
                    <SettingsSelect
                      label="Webhook Approval"
                      onChange={(webhookApproval) =>
                        onUpdate({
                          runtime: {
                            webhookApproval:
                              webhookApproval as AriaDesktopSettingsState["runtime"]["webhookApproval"],
                          },
                        })
                      }
                      options={SETTINGS_APPROVAL_OPTIONS}
                      value={settingsState.runtime.webhookApproval}
                    />
                  </SettingsRow>
                  <SettingsRow label="Security Mode">
                    <SettingsSelect
                      label="Security Mode"
                      onChange={(securityMode) =>
                        onUpdate({
                          runtime: {
                            securityMode:
                              securityMode as AriaDesktopSettingsState["runtime"]["securityMode"],
                          },
                        })
                      }
                      options={SETTINGS_SECURITY_OPTIONS}
                      value={settingsState.runtime.securityMode}
                    />
                  </SettingsRow>
                </>
              ) : null}

              {activeSectionId === "memory" ? (
                <>
                  <SettingsRow label="Memory">
                    <SettingsToggle
                      checked={settingsState.runtime.memoryEnabled}
                      label="Toggle memory"
                      onChange={(memoryEnabled) => onUpdate({ runtime: { memoryEnabled } })}
                    />
                  </SettingsRow>
                  <SettingsRow label="Journal">
                    <SettingsToggle
                      checked={settingsState.runtime.journalEnabled}
                      label="Toggle journal"
                      onChange={(journalEnabled) => onUpdate({ runtime: { journalEnabled } })}
                    />
                  </SettingsRow>
                  <SettingsRow
                    label="Memory Directory"
                    value={<code>{settingsState.runtime.memoryDirectory}</code>}
                  />
                  <SettingsRow
                    label="Skill Directory"
                    value={<code>{`${settingsState.runtime.homeDir}/skills`}</code>}
                  />
                </>
              ) : null}

              {activeSectionId === "automation" ? (
                <>
                  <SettingsRow label="Heartbeats">
                    <SettingsToggle
                      checked={settingsState.runtime.heartbeatEnabled}
                      label="Toggle heartbeats"
                      onChange={(heartbeatEnabled) => onUpdate({ runtime: { heartbeatEnabled } })}
                    />
                  </SettingsRow>
                  <SettingsRow label="Heartbeat Minutes">
                    <SettingsNumberInput
                      label="Heartbeat Minutes"
                      min={1}
                      onChange={(heartbeatIntervalMinutes) =>
                        onUpdate({ runtime: { heartbeatIntervalMinutes } })
                      }
                      value={settingsState.runtime.heartbeatIntervalMinutes}
                    />
                  </SettingsRow>
                  <SettingsRow label="Webhook Connector">
                    <SettingsToggle
                      checked={settingsState.runtime.webhookEnabled}
                      label="Toggle webhook connector"
                      onChange={(webhookEnabled) => onUpdate({ runtime: { webhookEnabled } })}
                    />
                  </SettingsRow>
                  <SettingsRow label="Cron Tasks" value={settingsState.runtime.cronTaskCount} />
                  <SettingsRow
                    label="Webhook Tasks"
                    value={settingsState.runtime.webhookTaskCount}
                  />
                </>
              ) : null}

              {activeSectionId === "connectors" ? (
                <>
                  <SettingsRow
                    label="Connector Sessions"
                    value={<Badge variant="secondary">Node-owned</Badge>}
                  />
                  <SettingsSectionHeading>Connector List</SettingsSectionHeading>
                  {settingsState.connectors.map((connector) => (
                    <SettingsRow
                      key={connector.name}
                      label={connector.label}
                      value={
                        <SettingsInlineControls>
                          <Badge variant={connector.configured ? "secondary" : "outline"}>
                            {connector.configured ? "Configured" : "Not Configured"}
                          </Badge>
                          <SettingsActionButton
                            onClick={() => {
                              setConnectorSetupName(
                                connector.name as AriaDesktopSettingsConnectorType,
                              );
                              setSettingsSheet("connector");
                            }}
                          >
                            Configure
                          </SettingsActionButton>
                        </SettingsInlineControls>
                      }
                    />
                  ))}
                  <SettingsSectionHeading>Connector Preferences</SettingsSectionHeading>
                  <SettingsRow label="Connector Verbosity">
                    <SettingsSelect
                      label="Connector Verbosity"
                      onChange={(connectorVerbosity) =>
                        onUpdate({
                          runtime: {
                            connectorVerbosity:
                              connectorVerbosity as AriaDesktopSettingsState["runtime"]["connectorVerbosity"],
                          },
                        })
                      }
                      options={SETTINGS_VERBOSITY_OPTIONS}
                      value={settingsState.runtime.connectorVerbosity}
                    />
                  </SettingsRow>
                  <SettingsRow label="Desktop Verbosity">
                    <SettingsSelect
                      label="Desktop Verbosity"
                      onChange={(tuiVerbosity) =>
                        onUpdate({
                          runtime: {
                            tuiVerbosity:
                              tuiVerbosity as AriaDesktopSettingsState["runtime"]["tuiVerbosity"],
                          },
                        })
                      }
                      options={SETTINGS_VERBOSITY_OPTIONS}
                      value={settingsState.runtime.tuiVerbosity}
                    />
                  </SettingsRow>
                </>
              ) : null}

              {activeSectionId === "data" ? (
                <>
                  <SettingsRow
                    label="Runtime Storage"
                    value={<code>{settingsState.runtime.homeDir}</code>}
                  />
                  <SettingsRow
                    label="Desktop Settings"
                    value={<code>{settingsState.desktop.settingsPath}</code>}
                  />
                  <SettingsRow label="Checkpoints">
                    <SettingsToggle
                      checked={settingsState.runtime.checkpointsEnabled}
                      label="Toggle checkpoints"
                      onChange={(checkpointsEnabled) =>
                        onUpdate({ runtime: { checkpointsEnabled } })
                      }
                    />
                  </SettingsRow>
                  <SettingsRow label="Checkpoint Limit">
                    <SettingsNumberInput
                      label="Checkpoint Limit"
                      min={1}
                      onChange={(checkpointMaxSnapshots) =>
                        onUpdate({ runtime: { checkpointMaxSnapshots } })
                      }
                      value={settingsState.runtime.checkpointMaxSnapshots}
                    />
                  </SettingsRow>
                </>
              ) : null}

              {activeSectionId === "about" ? (
                <>
                  <SettingsRow label="Product" value={settingsState.about.productName} />
                  <SettingsRow label="Runtime" value={settingsState.about.runtimeName} />
                  <SettingsRow label="CLI" value={<code>{settingsState.about.cliName}</code>} />
                  <SettingsRow label="Channel" value={settingsState.about.channel} />
                </>
              ) : null}

              {settingsState.lastError ? (
                <Alert variant="destructive">
                  <AlertDescription>{settingsState.lastError}</AlertDescription>
                </Alert>
              ) : null}
            </SettingsPanel>
          </div>
        </div>
      </SidebarInset>
      {settingsSheet === "provider" ? (
        <SettingsSheet title="Add Provider" onClose={() => setSettingsSheet(null)}>
          <ProviderSetupWizard
            onUpdate={async (patch) => {
              await onUpdate(patch);
              setSettingsSheet(null);
            }}
            settingsState={settingsState}
          />
        </SettingsSheet>
      ) : null}
      {settingsSheet === "model" ? (
        <SettingsSheet title="Add Model" onClose={() => setSettingsSheet(null)}>
          <ModelSetupWizard
            onFetchProviderModels={onFetchProviderModels}
            onUpdate={async (patch) => {
              await onUpdate(patch);
              setSettingsSheet(null);
            }}
            settingsState={settingsState}
          />
        </SettingsSheet>
      ) : null}
      {settingsSheet === "connector" ? (
        <SettingsSheet
          title={`Configure ${connectorSetup?.label ?? "Connector"}`}
          onClose={() => setSettingsSheet(null)}
        >
          <ConnectorSetupWizard
            initialConnectorName={connectorSetupName}
            onUpdate={async (patch) => {
              await onUpdate(patch);
              setSettingsSheet(null);
            }}
            settingsState={settingsState}
          />
        </SettingsSheet>
      ) : null}
    </SidebarProvider>
  );
}

function ThreadInspectorSurface({ thread }: { thread: AriaDesktopProjectThreadState }) {
  return (
    <div className="thread-inspector-surface">
      <dl className="aria-inspector-grid">
        <div>
          <dt>Project</dt>
          <dd>{thread.projectName}</dd>
        </div>
        <div>
          <dt>Agent</dt>
          <dd>{thread.agentLabel ?? "Unknown"}</dd>
        </div>
        <div>
          <dt>Environment</dt>
          <dd>{thread.environmentLabel ?? "Unassigned"}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            <Badge variant="secondary">{thread.statusLabel}</Badge>
          </dd>
        </div>
        <div>
          <dt>Changed Files</dt>
          <dd>
            <Badge variant={thread.changedFiles.length > 0 ? "outline" : "secondary"}>
              {thread.changedFiles.length}
            </Badge>
          </dd>
        </div>
      </dl>
      {thread.changedFiles.length > 0 ? (
        <div className="thread-inspector-file-list">
          {thread.changedFiles.map((filePath) => (
            <div key={filePath} className="thread-inspector-file">
              {filePath}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type ProjectSidebarProps = {
  collapsedProjectIds: string[];
  onArchiveThread: (threadId: string) => void;
  onCreateThread: (projectId: string) => void;
  onOpenSettings: () => void;
  onSelectProject: (projectId: string) => void;
  onSelectThread: (projectId: string, threadId: string) => void;
  onTogglePinnedThread: (threadId: string, pinned: boolean) => void;
  onToggleProject: (projectId: string, collapsed: boolean) => void;
  projects: AriaDesktopProjectGroup[];
  settingsActive: boolean;
  selectedProjectId: string | null;
  selectedThreadId: string | null;
};

export function ProjectSidebar({
  collapsedProjectIds,
  onArchiveThread,
  onCreateThread,
  onOpenSettings,
  onSelectProject,
  onSelectThread,
  onTogglePinnedThread,
  onToggleProject,
  projects,
  settingsActive,
  selectedProjectId,
  selectedThreadId,
}: ProjectSidebarProps) {
  const { onScroll, scrollRef } = useTransientScrollbar<HTMLDivElement>();
  const collapsedProjectIdSet = new Set(collapsedProjectIds);
  const visibleSelectedProjectId = settingsActive ? null : selectedProjectId;
  const visibleSelectedThreadId = settingsActive ? null : selectedThreadId;

  return (
    <div className="desktop-sidebar">
      <div
        ref={scrollRef}
        className="desktop-sidebar-primary desktop-scroll-region"
        onScroll={onScroll}
      >
        {projects.map((project, index) => {
          const isCollapsed = collapsedProjectIdSet.has(project.projectId);
          const isSelectedProject = project.projectId === visibleSelectedProjectId;
          const threadListId = `project-thread-list-${project.projectId}`;

          return (
            <section
              key={project.projectId}
              className={`desktop-thread-section${index > 0 ? " has-divider" : ""}`}
            >
              <DesktopSidebarSectionHeader
                actions={
                  <>
                    <DesktopIconButton
                      controlsId={threadListId}
                      expanded={!isCollapsed}
                      icon={
                        isCollapsed ? (
                          <ChevronRight aria-hidden="true" />
                        ) : (
                          <ChevronDown aria-hidden="true" />
                        )
                      }
                      label={
                        isCollapsed
                          ? `Expand ${project.name} threads`
                          : `Collapse ${project.name} threads`
                      }
                      onClick={() => onToggleProject(project.projectId, !isCollapsed)}
                    />
                    <DesktopIconButton
                      icon={<MessageSquarePlus aria-hidden="true" />}
                      label={`Create thread in ${project.name}`}
                      onClick={() => onCreateThread(project.projectId)}
                    />
                  </>
                }
                title={
                  <Button
                    type="button"
                    className={`desktop-sidebar-section-title-button${isSelectedProject ? " is-active" : ""}`}
                    onClick={() => onSelectProject(project.projectId)}
                    variant="ghost"
                  >
                    {project.name}
                  </Button>
                }
              />

              <DesktopCollapsibleSection
                className="thread-list-disclosure"
                collapsed={isCollapsed}
                id={threadListId}
              >
                <div className="thread-list" role="list">
                  {project.threads.map((thread) => (
                    <DesktopThreadListItem
                      key={thread.threadId}
                      active={thread.threadId === visibleSelectedThreadId}
                      meta={formatRelativeUpdatedAt(thread.updatedAt)}
                      onSelect={() => onSelectThread(project.projectId, thread.threadId)}
                      trailingAction={
                        <div className="thread-list-item-actions">
                          <DesktopIconButton
                            active={Boolean(thread.pinned)}
                            className="thread-list-item-action"
                            icon={<Pin aria-hidden="true" />}
                            label={thread.pinned ? `Unpin ${thread.title}` : `Pin ${thread.title}`}
                            onClick={() => onTogglePinnedThread(thread.threadId, !thread.pinned)}
                          />
                          <DesktopIconButton
                            className="thread-list-item-action"
                            icon={<Archive aria-hidden="true" />}
                            label={`Archive ${thread.title}`}
                            onClick={() => onArchiveThread(thread.threadId)}
                          />
                        </div>
                      }
                      title={thread.title}
                    />
                  ))}
                </div>
              </DesktopCollapsibleSection>
            </section>
          );
        })}
      </div>

      <div className="desktop-sidebar-footer">
        <DesktopSidebarButton
          active={settingsActive}
          icon={<Settings2 aria-hidden="true" />}
          label="Settings"
          onClick={onOpenSettings}
        />
      </div>
    </div>
  );
}

type AriaSidebarProps = {
  ariaState: AriaDesktopAriaShellState;
  ariaRuntimeConnected: boolean;
  pinnedSessionIds?: string[];
  onArchiveChatSession: (sessionId: string) => void;
  onCreateChat: () => void;
  onOpenSettings: () => void;
  onSearchChatSessions: (query: string) => void;
  onSelectChatSession: (sessionId: string) => void;
  onSelectConnectorScreen: () => void;
  onSelectScreen: (screen: AriaDesktopAriaScreen) => void;
  onTogglePinnedChatSession: (sessionId: string) => void;
  settingsActive: boolean;
};

export function AriaSidebar({
  ariaState,
  ariaRuntimeConnected,
  pinnedSessionIds = [],
  onArchiveChatSession,
  onCreateChat,
  onOpenSettings,
  onSearchChatSessions,
  onSelectChatSession,
  onSelectConnectorScreen,
  onSelectScreen,
  onTogglePinnedChatSession,
  settingsActive,
}: AriaSidebarProps) {
  const { onScroll, scrollRef } = useTransientScrollbar<HTMLDivElement>();

  return (
    <div className="desktop-sidebar">
      <div
        ref={scrollRef}
        className="desktop-sidebar-primary desktop-scroll-region"
        onScroll={onScroll}
      >
        <div className="desktop-sidebar-section">
          <DesktopSidebarButton
            active={!settingsActive && ariaState.selectedAriaScreen === "automations"}
            disabled={!ariaRuntimeConnected}
            icon={<Clock3 aria-hidden="true" />}
            label="Automations"
            onClick={() => onSelectScreen("automations")}
          />
          <DesktopSidebarButton
            active={!settingsActive && ariaState.selectedAriaScreen === "connectors"}
            disabled={!ariaRuntimeConnected}
            icon={<Plug2 aria-hidden="true" />}
            label="Connectors"
            onClick={onSelectConnectorScreen}
          />
        </div>

        <div className="desktop-sidebar-divider" />

        <AriaChatThreadSection
          disabled={!ariaRuntimeConnected}
          formatMeta={formatRelativeUpdatedAt}
          pinnedSessionIds={pinnedSessionIds}
          onArchiveSession={onArchiveChatSession}
          onCreateChat={onCreateChat}
          onSelectSession={onSelectChatSession}
          onTogglePinnedSession={onTogglePinnedChatSession}
          selectedSessionId={settingsActive ? null : ariaState.selectedAriaSessionId}
          sessions={ariaState.chatSessions
            .filter((session) => !session.archived)
            .map((session) => ({
              ...session,
              preview: null,
            }))}
        />
      </div>

      <div className="desktop-sidebar-footer">
        <DesktopSidebarButton
          active={settingsActive}
          icon={<Settings2 aria-hidden="true" />}
          label="Settings"
          onClick={onOpenSettings}
        />
      </div>
    </div>
  );
}

function NoAriaRuntimeView() {
  return (
    <div className="workbench-surface thread-empty-state">
      <Empty className="workbench-empty">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Server aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No Aria server connected</EmptyTitle>
          <EmptyDescription>Start or connect the local runtime to use Aria chat.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}

function AriaInspectorSurface({
  chat,
  serverLabel,
}: {
  chat: AriaDesktopAriaShellState["chat"] | AriaDesktopAriaShellState["connectors"];
  serverLabel: string;
}) {
  return (
    <div className="aria-inspector">
      <dl className="aria-inspector-grid">
        <div>
          <dt>Server</dt>
          <dd>{serverLabel}</dd>
        </div>
        <div>
          <dt>Session</dt>
          <dd>{chat.sessionId ?? "None"}</dd>
        </div>
        <div>
          <dt>Model</dt>
          <dd>{chat.modelName}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            <Badge variant="secondary">{chat.sessionStatus}</Badge>
          </dd>
        </div>
      </dl>
    </div>
  );
}

function AriaPendingQuestionPrompt({
  pendingQuestion,
  onAnswerQuestion,
}: {
  onAnswerQuestion: (questionId: string, answer: string) => void;
  pendingQuestion: NonNullable<AriaDesktopAriaShellState["chat"]["pendingQuestion"]>;
}) {
  const [answer, setAnswer] = useState("");

  const hasOptions = Boolean(pendingQuestion.options?.length);

  return (
    <section className="aria-question-prompt">
      <div className="aria-question-prompt-title">{pendingQuestion.question}</div>
      {hasOptions ? (
        <div className="aria-question-prompt-options">
          {pendingQuestion.options!.map((option) => (
            <Button
              key={option}
              type="button"
              className="aria-question-prompt-option"
              variant="outline"
              onClick={() => onAnswerQuestion(pendingQuestion.questionId, option)}
            >
              {option}
            </Button>
          ))}
        </div>
      ) : (
        <form
          className="aria-question-prompt-shell"
          onSubmit={(event) => {
            event.preventDefault();
            if (!answer.trim()) {
              return;
            }
            onAnswerQuestion(pendingQuestion.questionId, answer.trim());
            setAnswer("");
          }}
        >
          <Input
            className="aria-question-prompt-input"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="Type your answer"
          />
          <div className="aria-question-prompt-footer">
            <Button
              type="submit"
              className="aria-chat-composer-submit"
              size="icon"
              aria-label="Submit answer"
            >
              <ArrowUp aria-hidden="true" />
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}

function AriaPendingApprovalPrompt({
  onAcceptForSession,
  onApproveToolCall,
  pendingApproval,
}: {
  onAcceptForSession: (toolCallId: string) => void;
  onApproveToolCall: (toolCallId: string, approved: boolean) => void;
  pendingApproval: NonNullable<AriaDesktopAriaShellState["chat"]["pendingApproval"]>;
}) {
  return (
    <section className="aria-action-prompt">
      <div className="aria-action-prompt-title">
        {formatToolDisplayName(pendingApproval.toolName)}
      </div>
      <pre className="aria-action-prompt-copy">{JSON.stringify(pendingApproval.args, null, 2)}</pre>
      <div className="aria-action-prompt-footer">
        <Button
          type="button"
          className="aria-action-prompt-button"
          variant="outline"
          onClick={() => onApproveToolCall(pendingApproval.toolCallId, false)}
        >
          Deny
        </Button>
        <Button
          type="button"
          className="aria-action-prompt-button"
          variant="secondary"
          onClick={() => onAcceptForSession(pendingApproval.toolCallId)}
        >
          Allow session
        </Button>
        <Button
          type="button"
          className="aria-action-prompt-button is-primary"
          onClick={() => onApproveToolCall(pendingApproval.toolCallId, true)}
        >
          Approve
        </Button>
      </div>
    </section>
  );
}

export function AriaChatView({
  chat,
  composerFooterEnd = null,
  composerFooterStart = null,
  emptyPlaceholder,
  isArchived = false,
  onAcceptForSession,
  onAnswerQuestion,
  onApproveToolCall,
  promptSuggestions = null,
  onSendMessage,
}: {
  chat: AriaDesktopAriaShellState["chat"];
  composerFooterEnd?: ReactNode;
  composerFooterStart?: ReactNode;
  emptyPlaceholder: string;
  isArchived?: boolean;
  onAcceptForSession: (toolCallId: string) => void;
  onAnswerQuestion: (questionId: string, answer: string) => void;
  onApproveToolCall: (toolCallId: string, approved: boolean) => void;
  promptSuggestions?: AriaDesktopProjectThreadState["promptSuggestions"] | null;
  onSendMessage: (message: string) => void;
}) {
  const [optimisticMessages, setOptimisticMessages] = useState<
    ReturnType<typeof buildOptimisticMessage>[]
  >([]);
  const effectiveChat =
    optimisticMessages.length > 0
      ? {
          ...chat,
          messages: [...chat.messages, ...optimisticMessages],
        }
      : chat;

  useEffect(() => {
    setOptimisticMessages((current) =>
      current.filter(
        (pendingMessage) =>
          !chat.messages.some(
            (message) => message.role === "user" && message.content === pendingMessage.content,
          ),
      ),
    );
  }, [chat.messages]);

  function handleSendMessage(message: string): void {
    setOptimisticMessages((current) => [...current, buildOptimisticMessage(message)]);
    onSendMessage(message);
  }

  if (isEmptyChat(effectiveChat)) {
    return (
      <div className="aria-chat-empty-state">
        <AriaChatComposer
          centered
          footerEnd={composerFooterEnd}
          footerStart={composerFooterStart}
          onSend={handleSendMessage}
          placeholder={emptyPlaceholder}
          promptSuggestions={promptSuggestions}
        />
      </div>
    );
  }

  return (
    <div className="aria-chat-view">
      <AriaMessageStream chat={effectiveChat} />
      {chat.pendingApproval ? (
        <AriaPendingApprovalPrompt
          pendingApproval={chat.pendingApproval}
          onAcceptForSession={onAcceptForSession}
          onApproveToolCall={onApproveToolCall}
        />
      ) : null}
      {chat.pendingQuestion ? (
        <AriaPendingQuestionPrompt
          pendingQuestion={chat.pendingQuestion}
          onAnswerQuestion={onAnswerQuestion}
        />
      ) : null}
      {isArchived ? (
        <div className="aria-chat-readonly-label">archived session</div>
      ) : (
        <AriaChatComposer
          footerEnd={composerFooterEnd}
          footerStart={composerFooterStart}
          onSend={handleSendMessage}
          placeholder={emptyPlaceholder}
          promptSuggestions={promptSuggestions}
        />
      )}
    </div>
  );
}

function AutomationsView({
  automations,
  onRefresh,
  onSelectTask,
}: {
  automations: AriaDesktopAriaShellState["automations"];
  onRefresh: () => void;
  onSelectTask: (taskId: string) => void;
}) {
  const selectedTask =
    automations.tasks.find((task) => task.taskId === automations.selectedTaskId) ?? null;

  return (
    <div className="workbench-split-view">
      <section className="workbench-list-panel">
        <div className="workbench-panel-toolbar">
          <span className="workbench-panel-title">Automations</span>
          <Button
            type="button"
            className="aria-toolbar-button"
            size="sm"
            variant="outline"
            onClick={onRefresh}
          >
            Refresh
          </Button>
        </div>
        <ItemGroup className="workbench-list-items">
          {automations.tasks.map((task) => (
            <Item
              key={task.taskId}
              className={`workbench-list-item${task.taskId === automations.selectedTaskId ? " is-active" : ""}`}
              render={<button type="button" />}
              size="sm"
              onClick={() => onSelectTask(task.taskId)}
            >
              <ItemContent>
                <ItemTitle>{task.name}</ItemTitle>
              </ItemContent>
              <ItemActions>
                <Badge variant={task.lastStatus ? "outline" : "secondary"}>
                  {task.lastStatus ?? "idle"}
                </Badge>
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      </section>
      <section className="workbench-detail-panel">
        {selectedTask ? (
          <>
            <div className="workbench-detail-header">
              <h2>{selectedTask.name}</h2>
              <Badge variant="outline">{selectedTask.taskType}</Badge>
            </div>
            <div className="workbench-card-list">
              {automations.runs.map((run) => (
                <Card key={run.taskRunId} className="workbench-card" size="sm">
                  <CardHeader className="workbench-card-header">
                    <CardTitle className="workbench-card-title">{run.trigger}</CardTitle>
                    <CardAction>
                      <Badge variant="secondary">{run.status}</Badge>
                    </CardAction>
                  </CardHeader>
                  <CardContent className="workbench-card-content">
                    <CardDescription>
                      {run.summary ?? run.errorMessage ?? "No summary"}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <div className="thread-empty-state workbench-empty-state">
            <Empty className="workbench-empty">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Clock3 aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>Automations</EmptyTitle>
                <EmptyDescription>
                  {automations.lastError ?? "Select an automation to inspect recent runs."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        )}
      </section>
    </div>
  );
}

function ConnectorsView({
  connectorSessions,
  connectors,
  onSendMessage,
}: {
  connectorSessions: AriaDesktopAriaShellState["connectorSessions"];
  connectors: AriaDesktopAriaShellState["connectors"];
  onSendMessage: (message: string) => void;
}) {
  const connectorStatuses = summarizeConnectorStatuses(connectorSessions);
  const [optimisticMessages, setOptimisticMessages] = useState<
    ReturnType<typeof buildOptimisticMessage>[]
  >([]);
  const effectiveConnectors =
    optimisticMessages.length > 0
      ? {
          ...connectors,
          messages: [...connectors.messages, ...optimisticMessages],
        }
      : connectors;

  useEffect(() => {
    setOptimisticMessages((current) =>
      current.filter(
        (pendingMessage) =>
          !connectors.messages.some(
            (message) => message.role === "user" && message.content === pendingMessage.content,
          ),
      ),
    );
  }, [connectors.messages]);

  if (connectorStatuses.length === 0) {
    return (
      <div className="workbench-surface thread-empty-state">
        <Empty className="workbench-empty">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Plug2 aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Connectors</EmptyTitle>
            <EmptyDescription>No connector activity yet.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="workbench-surface workbench-single-view">
      <section className="workbench-detail-panel">
        <div className="workbench-detail-header">
          <h2>Connectors</h2>
          <Badge variant="outline">Node-owned</Badge>
        </div>
        <div className="workbench-card-list">
          {connectorStatuses.map((status) => (
            <Card key={status.connectorType} className="workbench-card" size="sm">
              <CardHeader className="workbench-card-header">
                <CardTitle className="workbench-card-title">{status.connectorType}</CardTitle>
                <CardAction>
                  <Badge variant="secondary">
                    {formatRelativeUpdatedAt(status.lastActiveAt) ?? "idle"}
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="workbench-card-content">
                <CardDescription>{status.count} threads</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
        {effectiveConnectors.sessionId ? (
          <AriaChatComposer
            onSend={(message) => {
              setOptimisticMessages((current) => [...current, buildOptimisticMessage(message)]);
              onSendMessage(message);
            }}
            placeholder="Reply to connector"
          />
        ) : null}
      </section>
    </div>
  );
}
function getSelectedProject(
  shellState: AriaDesktopProjectShellState,
): AriaDesktopProjectGroup | null {
  return (
    shellState.projects.find((project) => project.projectId === shellState.selectedProjectId) ??
    null
  );
}

export function DesktopWorkbenchApp() {
  const [activeSpace, setActiveSpace] = useState<DesktopSpace>("projects");
  const [ariaState, setAriaState] = useState<AriaDesktopAriaShellState>(EMPTY_ARIA_STATE);
  const [pinnedAriaSessionIds, setPinnedAriaSessionIds] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsState, setSettingsState] =
    useState<AriaDesktopSettingsState>(EMPTY_SETTINGS_STATE);
  const [shellState, setShellState] = useState<AriaDesktopProjectShellState>(EMPTY_SHELL_STATE);

  const selectedProject = getSelectedProject(shellState);
  const selectedThreadState = shellState.selectedThreadState;

  useEffect(() => {
    let isDisposed = false;

    async function loadShells(): Promise<void> {
      if (!window.ariaDesktop) {
        return;
      }

      const [nextShellState, nextAriaState, nextSettingsState] = await Promise.all([
        window.ariaDesktop.getProjectShellState(),
        window.ariaDesktop.getAriaShellState(),
        window.ariaDesktop.getSettingsState(),
      ]);

      if (isDisposed) {
        return;
      }

      startTransition(() => {
        setActiveSpace(nextSettingsState.desktop.defaultSpace === "chat" ? "aria" : "projects");
        setAriaState(nextAriaState);
        setSettingsState(nextSettingsState);
        setShellState(nextShellState);
      });
    }

    void loadShells();

    return () => {
      isDisposed = true;
    };
  }, []);

  useEffect(() => {
    if (!window.ariaDesktop) {
      return;
    }

    return window.ariaDesktop.onProjectShellStateChanged((nextShellState) => {
      startTransition(() => {
        setShellState(nextShellState);
      });
    });
  }, []);

  useEffect(() => {
    if (!window.ariaDesktop) {
      return;
    }

    return window.ariaDesktop.onSettingsStateChanged((nextSettingsState) => {
      startTransition(() => {
        setSettingsState(nextSettingsState);
      });
    });
  }, []);

  useEffect(() => {
    document.body.dataset.desktopTheme = settingsState.desktop.theme;
    document.body.classList.toggle("desktop-compact", settingsState.desktop.compactMode);

    return () => {
      delete document.body.dataset.desktopTheme;
      document.body.classList.remove("desktop-compact");
    };
  }, [settingsState.desktop.compactMode, settingsState.desktop.theme]);

  useEffect(() => {
    if (!window.ariaDesktop) {
      return;
    }

    return window.ariaDesktop.onAriaShellStateChanged((nextAriaState) => {
      startTransition(() => {
        setAriaState(nextAriaState);
      });
    });
  }, []);

  async function applyProjectShellState(
    loader: () => Promise<AriaDesktopProjectShellState>,
  ): Promise<void> {
    if (!window.ariaDesktop) {
      return;
    }

    try {
      const nextShellState = await loader();
      startTransition(() => {
        setActiveSpace("projects");
        setSettingsOpen(false);
        setShellState(nextShellState);
      });
    } catch (error) {
      console.error(error);
    }
  }

  async function applyAriaShellState(
    loader: () => Promise<AriaDesktopAriaShellState>,
  ): Promise<void> {
    if (!window.ariaDesktop) {
      return;
    }

    try {
      const nextAriaState = await loader();
      startTransition(() => {
        setActiveSpace("aria");
        setSettingsOpen(false);
        setAriaState(nextAriaState);
      });
    } catch (error) {
      console.error(error);
    }
  }

  function openSettings(): void {
    startTransition(() => {
      setSettingsOpen(true);
    });
  }

  function updateSettings(patch: AriaDesktopSettingsPatch): Promise<void> {
    if (!window.ariaDesktop) {
      return Promise.resolve();
    }

    return window.ariaDesktop
      .updateSettings(patch)
      .then((nextSettingsState) => {
        startTransition(() => {
          setSettingsState(nextSettingsState);
        });
      })
      .catch((error) => {
        console.error(error);
      });
  }

  function listSettingsProviderModels(
    providerId: string,
  ): Promise<AriaDesktopSettingsProviderModelsResult> {
    if (!window.ariaDesktop) {
      return unavailableSettingsProviderModels(providerId);
    }

    return window.ariaDesktop.listSettingsProviderModels(providerId).catch((error) => ({
      error: error instanceof Error ? error.message : String(error),
      models: [],
      providerId,
      source: "provider" as const,
    }));
  }

  function selectSpace(space: DesktopSpace): void {
    startTransition(() => {
      setActiveSpace(space);
      setSettingsOpen(false);
    });
  }

  function importProject(): void {
    void applyProjectShellState(() => window.ariaDesktop.importLocalProjectFromDialog());
  }

  function createThread(projectId: string): void {
    void applyProjectShellState(() => window.ariaDesktop.createThread(projectId));
  }

  function archiveProjectThread(threadId: string): void {
    void applyProjectShellState(() => window.ariaDesktop.archiveProjectThread(threadId));
  }

  function selectProject(projectId: string): void {
    void applyProjectShellState(() => window.ariaDesktop.selectProject(projectId));
  }

  function selectThread(projectId: string, threadId: string): void {
    void applyProjectShellState(() => window.ariaDesktop.selectThread(projectId, threadId));
  }

  function setProjectThreadPinned(threadId: string, pinned: boolean): void {
    void applyProjectShellState(() => window.ariaDesktop.setProjectThreadPinned(threadId, pinned));
  }

  function toggleProject(projectId: string, collapsed: boolean): void {
    void applyProjectShellState(() => window.ariaDesktop.setProjectCollapsed(projectId, collapsed));
  }

  function createAriaChat(): void {
    void applyAriaShellState(() => window.ariaDesktop.createAriaChatSession());
  }

  function archiveAriaChat(sessionId: string): void {
    void applyAriaShellState(() => window.ariaDesktop.archiveAriaChatSession(sessionId));
  }

  function selectAriaChat(sessionId: string): void {
    void applyAriaShellState(() => window.ariaDesktop.selectAriaChatSession(sessionId));
  }

  function togglePinnedAriaSession(sessionId: string): void {
    startTransition(() => {
      setPinnedAriaSessionIds((current) =>
        current.includes(sessionId)
          ? current.filter((entry) => entry !== sessionId)
          : [...current, sessionId],
      );
    });
  }

  function selectAriaScreen(screen: AriaDesktopAriaScreen): void {
    void applyAriaShellState(() => window.ariaDesktop.selectAriaScreen(screen));
  }

  function refreshAutomations(): void {
    void applyAriaShellState(() => window.ariaDesktop.refreshAutomations());
  }

  function selectAutomationTask(taskId: string): void {
    void applyAriaShellState(() => window.ariaDesktop.selectAutomationTask(taskId));
  }

  function searchChatSessions(query: string): void {
    void applyAriaShellState(() => window.ariaDesktop.searchAriaChatSessions(query));
  }

  function searchConnectorSessions(query: string): void {
    void applyAriaShellState(() => window.ariaDesktop.searchConnectorSessions(query));
  }

  function sendAriaChatMessage(message: string): void {
    void window.ariaDesktop
      .sendAriaChatMessage(message)
      .then((nextAriaState) => {
        startTransition(() => {
          setAriaState(nextAriaState);
        });
      })
      .catch((error) => {
        console.error(error);
      });
  }

  function sendConnectorMessage(message: string): void {
    void window.ariaDesktop
      .sendConnectorMessage(message)
      .then((nextAriaState) => {
        startTransition(() => {
          setAriaState(nextAriaState);
        });
      })
      .catch((error) => {
        console.error(error);
      });
  }

  function sendProjectThreadMessage(threadId: string, message: string): void {
    void window.ariaDesktop
      .sendProjectThreadMessage(threadId, message)
      .then((nextShellState) => {
        startTransition(() => {
          setShellState(nextShellState);
        });
      })
      .catch((error) => {
        console.error(error);
      });
  }

  function createProjectThreadBranch(threadId: string, branchName: string): void {
    void window.ariaDesktop
      .createProjectThreadBranch(threadId, branchName)
      .then((nextShellState) => {
        startTransition(() => {
          setShellState(nextShellState);
        });
      })
      .catch((error) => {
        console.error(error);
      });
  }

  function switchProjectThreadEnvironment(threadId: string, environmentId: string): void {
    void window.ariaDesktop
      .switchProjectThreadEnvironment(threadId, environmentId)
      .then((nextShellState) => {
        startTransition(() => {
          setShellState(nextShellState);
        });
      })
      .catch((error) => {
        console.error(error);
      });
  }

  function setProjectThreadModel(threadId: string, modelId: string | null): void {
    void window.ariaDesktop
      .setProjectThreadModel(threadId, modelId)
      .then((nextShellState) => {
        startTransition(() => {
          setShellState(nextShellState);
        });
      })
      .catch((error) => {
        console.error(error);
      });
  }

  const leftSidebarToolbarItems: DesktopBaseLayoutToolbarItem[] =
    activeSpace === "projects"
      ? [
          {
            content: (
              <DesktopIconButton
                icon={<FolderPlus aria-hidden="true" />}
                label="Import project"
                onClick={importProject}
              />
            ),
            id: "import-project",
          },
        ]
      : [];

  const showAriaChat =
    activeSpace === "aria" && !settingsOpen && ariaState.selectedAriaScreen === null;
  const showConnectorView =
    activeSpace === "aria" && !settingsOpen && ariaState.selectedAriaScreen === "connectors";
  const showAutomationView =
    activeSpace === "aria" && !settingsOpen && ariaState.selectedAriaScreen === "automations";
  const activeAriaChatTitle = getActiveAriaSessionTitle(
    ariaState.chatSessions,
    ariaState.selectedAriaSessionId,
  );
  const activeAriaChatSession =
    ariaState.chatSessions.find(
      (session) => session.sessionId === ariaState.selectedAriaSessionId,
    ) ?? null;
  const activeConnectorTitle = getActiveAriaSessionTitle(
    ariaState.connectorSessions,
    ariaState.connectors.sessionId,
  );
  const ariaRuntimeConnected = isAriaRuntimeConnected(ariaState);

  const toolbarItems: DesktopBaseLayoutToolbarItem[] =
    !settingsOpen && activeSpace === "projects" && selectedProject
      ? [
          {
            content: <span className="desktop-toolbar-context">{selectedProject.name}</span>,
            id: "project-context",
          },
        ]
      : !settingsOpen && activeSpace === "aria"
        ? [
            {
              content: <span className="desktop-toolbar-context">{ariaState.serverLabel}</span>,
              id: "aria-context",
            },
          ]
        : [];

  return (
    <DesktopBaseLayout
      center={
        settingsOpen ? (
          <SettingsView
            onFetchProviderModels={listSettingsProviderModels}
            onUpdate={updateSettings}
            settingsState={settingsState}
          />
        ) : activeSpace === "projects" ? (
          <ThreadView
            onCreateBranch={createProjectThreadBranch}
            onImportProject={importProject}
            onSetModel={setProjectThreadModel}
            onSendMessage={sendProjectThreadMessage}
            onSwitchEnvironment={switchProjectThreadEnvironment}
            selectedProject={selectedProject}
            selectedThreadState={selectedThreadState}
          />
        ) : !ariaRuntimeConnected ? (
          <NoAriaRuntimeView />
        ) : showAutomationView ? (
          <AutomationsView
            automations={ariaState.automations}
            onRefresh={refreshAutomations}
            onSelectTask={selectAutomationTask}
          />
        ) : showConnectorView ? (
          <ConnectorsView
            connectorSessions={ariaState.connectorSessions}
            connectors={ariaState.connectors}
            onSendMessage={sendConnectorMessage}
          />
        ) : (
          <AriaChatView
            chat={ariaState.chat}
            emptyPlaceholder="Message Aria"
            isArchived={Boolean(activeAriaChatSession?.archived)}
            onAcceptForSession={(toolCallId) =>
              void applyAriaShellState(() =>
                window.ariaDesktop.acceptAriaChatToolCallForSession(toolCallId),
              )
            }
            onAnswerQuestion={(questionId, answer) =>
              void applyAriaShellState(() =>
                window.ariaDesktop.answerAriaChatQuestion(questionId, answer),
              )
            }
            onApproveToolCall={(toolCallId, approved) =>
              void applyAriaShellState(() =>
                window.ariaDesktop.approveAriaChatToolCall(toolCallId, approved),
              )
            }
            onSendMessage={sendAriaChatMessage}
          />
        )
      }
      leftSidebar={
        activeSpace === "projects" ? (
          <ProjectSidebar
            collapsedProjectIds={shellState.collapsedProjectIds}
            onArchiveThread={archiveProjectThread}
            onCreateThread={createThread}
            onOpenSettings={openSettings}
            onSelectProject={selectProject}
            onSelectThread={selectThread}
            onTogglePinnedThread={setProjectThreadPinned}
            onToggleProject={toggleProject}
            projects={shellState.projects}
            selectedProjectId={shellState.selectedProjectId}
            selectedThreadId={shellState.selectedThreadId}
            settingsActive={settingsOpen}
          />
        ) : (
          <AriaSidebar
            ariaState={ariaState}
            ariaRuntimeConnected={ariaRuntimeConnected}
            pinnedSessionIds={pinnedAriaSessionIds}
            onArchiveChatSession={archiveAriaChat}
            onCreateChat={createAriaChat}
            onOpenSettings={openSettings}
            onSearchChatSessions={searchChatSessions}
            onSelectChatSession={selectAriaChat}
            onSelectConnectorScreen={() => selectAriaScreen("connectors")}
            onSelectScreen={selectAriaScreen}
            onTogglePinnedChatSession={togglePinnedAriaSession}
            settingsActive={settingsOpen}
          />
        )
      }
      leftSidebarTitle={<DesktopSpaceTabs activeSpace={activeSpace} onSelectSpace={selectSpace} />}
      leftSidebarToolbarItems={leftSidebarToolbarItems}
      rightSidebar={
        settingsOpen ? undefined : activeSpace === "projects" && selectedThreadState ? (
          <ThreadInspectorSurface thread={selectedThreadState} />
        ) : showAriaChat ? (
          <AriaInspectorSurface chat={ariaState.chat} serverLabel={ariaState.serverLabel} />
        ) : undefined
      }
      rightSidebarTitle={
        settingsOpen
          ? undefined
          : activeSpace === "projects" && selectedThreadState
            ? selectedThreadState.title
            : showAriaChat
              ? "Session"
              : undefined
      }
      showMainTopbar={!settingsOpen}
      title={
        activeSpace === "projects"
          ? (selectedThreadState?.title ?? selectedProject?.name ?? "Projects")
          : showAutomationView
            ? "Automations"
            : showConnectorView
              ? (activeConnectorTitle ?? "Connectors")
              : (activeAriaChatTitle ?? "Chat")
      }
      toolbarItems={toolbarItems}
    />
  );
}
