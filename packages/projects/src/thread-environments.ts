import { randomUUID } from "node:crypto";
import type { ProjectsEngineRepository } from "./repository.js";
import type { ThreadEnvironmentBindingRecord, ThreadRecord } from "./types.js";

export interface SwitchThreadEnvironmentInput {
  bindingId?: string;
  threadId: string;
  environmentId: string;
  reason?: string | null;
}

export interface SwitchThreadEnvironmentResult {
  thread: ThreadRecord;
  activeBinding: ThreadEnvironmentBindingRecord;
  history: ThreadEnvironmentBindingRecord[];
}

function resolveSwitchedThreadType(thread: ThreadRecord, environmentMode: "local" | "remote") {
  if (
    thread.threadType &&
    thread.threadType !== "local_project" &&
    thread.threadType !== "remote_project"
  ) {
    throw new Error(`Thread does not support environment switching: ${thread.threadId}`);
  }

  return environmentMode === "remote" ? "remote_project" : "local_project";
}

export class ProjectsThreadEnvironmentService {
  constructor(private readonly repository: ProjectsEngineRepository) {}

  switchThreadEnvironment(
    input: SwitchThreadEnvironmentInput,
    now = Date.now(),
  ): SwitchThreadEnvironmentResult {
    const thread = this.repository.getThread(input.threadId);
    if (!thread) {
      throw new Error(`Thread not found: ${input.threadId}`);
    }

    const environment = this.repository.getEnvironment(input.environmentId);
    if (!environment) {
      throw new Error(`Environment not found: ${input.environmentId}`);
    }

    if (environment.projectId !== thread.projectId) {
      throw new Error(
        `Environment ${environment.environmentId} does not belong to thread project ${thread.projectId}`,
      );
    }

    const currentActiveBinding = this.repository.getActiveThreadEnvironmentBinding(thread.threadId);
    const activeBinding =
      currentActiveBinding?.environmentId === environment.environmentId
        ? currentActiveBinding
        : {
            bindingId: input.bindingId ?? randomUUID(),
            threadId: thread.threadId,
            projectId: thread.projectId,
            workspaceId: environment.workspaceId,
            environmentId: environment.environmentId,
            attachedAt: now,
            detachedAt: null,
            isActive: true,
            reason: input.reason ?? null,
          };

    if (activeBinding !== currentActiveBinding) {
      this.repository.upsertThreadEnvironmentBinding(activeBinding);
    }

    const updatedThread: ThreadRecord = {
      ...thread,
      workspaceId: environment.workspaceId,
      environmentId: environment.environmentId,
      environmentBindingId: activeBinding.bindingId,
      threadType: resolveSwitchedThreadType(thread, environment.mode),
      updatedAt: now,
    };
    this.repository.upsertThread(updatedThread);

    return {
      thread: this.repository.getThread(thread.threadId) ?? updatedThread,
      activeBinding:
        this.repository.getActiveThreadEnvironmentBinding(thread.threadId) ?? activeBinding,
      history: this.repository.listThreadEnvironmentBindings(thread.threadId),
    };
  }

  listThreadEnvironmentBindings(threadId: string): ThreadEnvironmentBindingRecord[] {
    return this.repository.listThreadEnvironmentBindings(threadId);
  }
}
