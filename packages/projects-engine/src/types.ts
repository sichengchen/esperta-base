export type ProjectsExternalSystem = "linear" | "github" | "git" | "unknown";

export interface ProjectRecord {
  projectId: string;
  name: string;
  slug: string;
  description?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface RepoRecord {
  repoId: string;
  projectId: string;
  name: string;
  remoteUrl: string;
  defaultBranch: string;
  createdAt: number;
  updatedAt: number;
}

export type TaskStatus = "backlog" | "ready" | "in_progress" | "blocked" | "done" | "cancelled";

export interface TaskRecord {
  taskId: string;
  projectId: string;
  repoId?: string | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  createdAt: number;
  updatedAt: number;
}

export type ThreadStatus = "idle" | "queued" | "running" | "dirty" | "blocked" | "done" | "failed" | "cancelled";

export interface ThreadRecord {
  threadId: string;
  projectId: string;
  taskId?: string | null;
  repoId?: string | null;
  title: string;
  status: ThreadStatus;
  createdAt: number;
  updatedAt: number;
}

export type JobAuthor = "user" | "agent" | "system" | "external";

export interface JobRecord {
  jobId: string;
  threadId: string;
  author: JobAuthor;
  body: string;
  createdAt: number;
}

export type DispatchStatus = "queued" | "accepted" | "running" | "waiting_approval" | "completed" | "failed" | "cancelled";

export interface DispatchRecord {
  dispatchId: string;
  projectId: string;
  taskId?: string | null;
  threadId: string;
  jobId?: string | null;
  repoId?: string | null;
  worktreeId?: string | null;
  status: DispatchStatus;
  requestedBackend?: string | null;
  requestedModel?: string | null;
  executionSessionId?: string | null;
  summary?: string | null;
  error?: string | null;
  createdAt: number;
  acceptedAt?: number | null;
  completedAt?: number | null;
}

export type WorktreeStatus = "active" | "retained" | "pruned" | "failed";

export interface WorktreeRecord {
  worktreeId: string;
  repoId: string;
  threadId?: string | null;
  dispatchId?: string | null;
  path: string;
  branchName: string;
  baseRef: string;
  status: WorktreeStatus;
  createdAt: number;
  expiresAt?: number | null;
  prunedAt?: number | null;
}

export type ReviewStatus = "pending" | "changes_requested" | "approved" | "dismissed";

export interface ReviewRecord {
  reviewId: string;
  dispatchId: string;
  threadId: string;
  reviewType: "self" | "human" | "external";
  status: ReviewStatus;
  summary?: string | null;
  artifactJson?: string | null;
  createdAt: number;
  resolvedAt?: number | null;
}

export type PublishRunStatus = "pending" | "pushed" | "pr_created" | "merged" | "failed" | "cancelled";

export interface PublishRunRecord {
  publishRunId: string;
  dispatchId: string;
  threadId: string;
  repoId: string;
  branchName: string;
  remoteName: string;
  status: PublishRunStatus;
  commitSha?: string | null;
  prUrl?: string | null;
  metadataJson?: string | null;
  createdAt: number;
  completedAt?: number | null;
}

export interface ExternalRefRecord {
  externalRefId: string;
  ownerType: "project" | "task" | "thread" | "review" | "publish_run";
  ownerId: string;
  system: ProjectsExternalSystem;
  externalId: string;
  externalKey?: string | null;
  sessionId?: string | null;
  metadataJson?: string | null;
  createdAt: number;
  updatedAt: number;
}
