export const DEFAULT_SANDBOX_PROVIDER = "justbash" as const;

export type SandboxProviderName = string;
export type SandboxAction =
  | "exec"
  | "read_file"
  | "write_file"
  | "list_files"
  | "create_artifact"
  | "apply_patch";

export interface SandboxProviderSelection {
  runProvider?: SandboxProviderName | null;
  projectProvider?: SandboxProviderName | null;
  nodeProvider?: SandboxProviderName | null;
  defaultProvider?: SandboxProviderName | null;
}

export interface SandboxExecutionRequest {
  action: SandboxAction;
  provider?: SandboxProviderName | null;
  toolName: string;
  command?: string;
  cwd?: string;
  env?: Record<string, string>;
  signal?: AbortSignal;
  path?: string;
  content?: string | Uint8Array;
  metadata?: Record<string, unknown>;
}

export interface SandboxExecutionResult {
  provider: SandboxProviderName;
  status: "completed" | "unsupported" | "failed";
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  result?: unknown;
  artifacts?: string[];
  message?: string;
}

export interface SandboxProvider {
  name: SandboxProviderName;
  supportedActions: readonly SandboxAction[];
  execute(request: SandboxExecutionRequest): Promise<SandboxExecutionResult>;
}

export interface SandboxManagerOptions {
  providers?: Iterable<SandboxProvider>;
  selection?: SandboxProviderSelection;
}

export function resolveSandboxProviderName(
  selection: SandboxProviderSelection = {},
): SandboxProviderName {
  return (
    selection.runProvider ??
    selection.projectProvider ??
    selection.nodeProvider ??
    selection.defaultProvider ??
    DEFAULT_SANDBOX_PROVIDER
  );
}

export function unsupportedSandboxResult(
  provider: SandboxProviderName,
  action: SandboxAction,
): SandboxExecutionResult {
  return {
    provider,
    status: "unsupported",
    exitCode: 126,
    stderr:
      "This action requires a different sandbox provider. Switch this run, project, or node to a full sandbox provider when available.",
    message: `${provider} does not support ${action}`,
  };
}

export class SandboxManager {
  private readonly providers = new Map<SandboxProviderName, SandboxProvider>();
  private selection: SandboxProviderSelection;

  constructor(options: SandboxManagerOptions = {}) {
    this.selection = options.selection ?? {};
    for (const provider of options.providers ?? []) {
      this.register(provider);
    }
  }

  register(provider: SandboxProvider): void {
    this.providers.set(provider.name, provider);
  }

  configure(selection: SandboxProviderSelection): void {
    this.selection = selection;
  }

  getConfiguredProviderName(requestProvider?: SandboxProviderName | null): SandboxProviderName {
    return resolveSandboxProviderName({
      ...this.selection,
      runProvider: requestProvider ?? this.selection.runProvider,
    });
  }

  async execute(request: SandboxExecutionRequest): Promise<SandboxExecutionResult> {
    const providerName = this.getConfiguredProviderName(request.provider);
    const provider = this.providers.get(providerName);
    if (!provider || !provider.supportedActions.includes(request.action)) {
      return unsupportedSandboxResult(providerName, request.action);
    }
    return provider.execute({ ...request, provider: providerName });
  }
}
