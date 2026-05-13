import { Bash, InMemoryFs, type CustomCommand, type IFileSystem } from "just-bash";
import {
  DEFAULT_SANDBOX_PROVIDER,
  unsupportedSandboxResult,
  type SandboxExecutionRequest,
  type SandboxExecutionResult,
  type SandboxProvider,
} from "@aria/sandbox";

export const JUSTBASH_SUPPORTED_ACTIONS = [
  "exec",
  "read_file",
  "write_file",
  "list_files",
] as const;

export interface JustBashSandboxProviderOptions {
  cwd?: string;
  fs?: IFileSystem;
  customCommands?: CustomCommand[];
  allowlistedNetwork?: string[];
}

export function createJustBashSandboxProvider(
  options: JustBashSandboxProviderOptions = {},
): SandboxProvider {
  const fs = options.fs ?? new InMemoryFs();
  const cwd = options.cwd ?? "/workspace";
  const bash = new Bash({
    fs,
    cwd,
    customCommands: options.customCommands,
    network:
      options.allowlistedNetwork && options.allowlistedNetwork.length > 0
        ? { allowedUrlPrefixes: options.allowlistedNetwork }
        : undefined,
  });

  return {
    name: DEFAULT_SANDBOX_PROVIDER,
    supportedActions: JUSTBASH_SUPPORTED_ACTIONS,
    async execute(request: SandboxExecutionRequest): Promise<SandboxExecutionResult> {
      switch (request.action) {
        case "exec": {
          if (!request.command) {
            return {
              provider: DEFAULT_SANDBOX_PROVIDER,
              status: "failed",
              exitCode: 2,
              stderr: "Missing command",
            };
          }
          const result = await bash.exec(request.command, {
            cwd: request.cwd ?? cwd,
            env: request.env,
            signal: request.signal,
          });
          return {
            provider: DEFAULT_SANDBOX_PROVIDER,
            status: result.exitCode === 0 ? "completed" : "failed",
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
          };
        }
        case "read_file":
          return {
            provider: DEFAULT_SANDBOX_PROVIDER,
            status: "completed",
            result: await fs.readFile(requiredPath(request)),
          };
        case "write_file":
          await fs.writeFile(requiredPath(request), request.content ?? "");
          return {
            provider: DEFAULT_SANDBOX_PROVIDER,
            status: "completed",
          };
        case "list_files":
          return {
            provider: DEFAULT_SANDBOX_PROVIDER,
            status: "completed",
            result: await fs.readdir(request.path ?? cwd),
          };
        default:
          return unsupportedSandboxResult(DEFAULT_SANDBOX_PROVIDER, request.action);
      }
    },
  };
}

function requiredPath(request: SandboxExecutionRequest): string {
  if (!request.path) {
    throw new Error(`Missing path for ${request.action}`);
  }
  return request.path;
}
