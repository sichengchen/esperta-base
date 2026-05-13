import {
  unsupportedSandboxResult,
  type SandboxExecutionRequest,
  type SandboxExecutionResult,
  type SandboxProvider,
} from "@aria/sandbox";

export const FULL_SANDBOX_PLACEHOLDER_PROVIDER = "full" as const;

export function createFullSandboxPlaceholderProvider(
  name = FULL_SANDBOX_PLACEHOLDER_PROVIDER,
): SandboxProvider {
  return {
    name,
    supportedActions: [],
    async execute(request: SandboxExecutionRequest): Promise<SandboxExecutionResult> {
      return unsupportedSandboxResult(name, request.action);
    },
  };
}
