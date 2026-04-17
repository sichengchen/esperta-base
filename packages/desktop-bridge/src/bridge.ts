import { createCodingAgentBackendRegistry, type RuntimeBackendAdapter } from "@aria/agents-coding";
import { createDesktopGitBridge, type DesktopGitBridge } from "@aria/desktop-git";
import {
  ProjectsPlanningService,
  ProjectsThreadEnvironmentService,
  type ProjectsEngineRepository,
} from "@aria/projects";

export interface DesktopBridgeOptions {
  readonly repository: ProjectsEngineRepository;
  readonly codingAgents?: Map<string, RuntimeBackendAdapter>;
}

export interface DesktopBridge {
  readonly planning: ProjectsPlanningService;
  readonly threadEnvironments: ProjectsThreadEnvironmentService;
  readonly git: DesktopGitBridge;
  readonly codingAgents: Map<string, RuntimeBackendAdapter>;
}

export function createDesktopBridge(options: DesktopBridgeOptions): DesktopBridge {
  return {
    planning: new ProjectsPlanningService(options.repository),
    threadEnvironments: new ProjectsThreadEnvironmentService(options.repository),
    git: createDesktopGitBridge(options.repository),
    codingAgents: options.codingAgents ?? createCodingAgentBackendRegistry(),
  };
}

export { createCodingAgentBackendRegistry };
export { createDesktopGitBridge } from "@aria/desktop-git";
export { ProjectsPlanningService, ProjectsThreadEnvironmentService } from "@aria/projects";
export type { RuntimeBackendAdapter } from "@aria/agents-coding";
