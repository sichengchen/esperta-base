export type ProjectsExternalSystem = "linear" | "github" | "git" | "unknown";

export interface ProjectRecord {
  projectId: string;
  name: string;
  slug: string;
  description?: string | null;
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

export type {
  DispatchRecord,
  DispatchStatus,
  JobAuthor,
  JobRecord,
} from "../../jobs/src/types.js";

export type {
  RepoRecord,
  WorktreeRecord,
  WorktreeStatus,
} from "../../workspaces/src/types.js";

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
