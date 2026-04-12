export interface DispatchLaunchRequest {
  dispatchId: string;
  projectId: string;
  taskId?: string | null;
  threadId: string;
  threadType?: string | null;
  jobId?: string | null;
  repoId?: string | null;
  workspaceId?: string | null;
  environmentId?: string | null;
  environmentBindingId?: string | null;
  agentId?: string | null;
  worktreeId?: string | null;
  worktreePath?: string | null;
  requestedBackend?: string | null;
  requestedModel?: string | null;
  attachedSkills?: string[];
  promptOverlay?: string | null;
  toolPolicySnapshotJson?: string | null;
}

export interface DispatchAccepted {
  dispatchId: string;
  executionSessionId: string;
  acceptedAt: number;
  effectiveBackend?: string | null;
  effectiveModel?: string | null;
}

export type DispatchExecutionEventType =
  | "execution.accepted"
  | "execution.running"
  | "execution.waiting_approval"
  | "execution.checkpointed"
  | "execution.completed"
  | "execution.failed"
  | "execution.cancelled";

export interface DispatchExecutionEvent {
  type: DispatchExecutionEventType;
  dispatchId: string;
  executionSessionId: string;
  occurredAt: number;
  summary?: string | null;
  error?: string | null;
  metadataJson?: string | null;
}
