import { Database as Sqlite } from "bun:sqlite";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { ProjectsEngineStore } from "../packages/projects-engine/src/store.js";
import { createLegacyLinearThreadExternalRefs } from "../packages/projects-engine/src/external-refs.js";

interface LegacyProjectRow {
  id: string;
  name: string;
  repo_url: string;
  base_branch: string;
}

interface LegacyThreadRow {
  id: string;
  project_id: string;
  linear_issue_id: string;
  linear_identifier: string;
  linear_session_id: string | null;
  title: string;
  status: string;
  worktree_path: string | null;
  branch_name: string | null;
  created_at: string;
  updated_at: string;
}

interface LegacyJobRow {
  id: string;
  thread_id: string;
  author: string | null;
  body: string;
  created_at: string;
}

function asTimestamp(value: string): number {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? Date.now() : timestamp;
}

function usage(): never {
  console.error("Usage: bun run scripts/migrate-legacy-esperta-code.ts <legacy-db-path> [aria-db-path]");
  process.exit(1);
}

const legacyDbPath = process.argv[2];
const ariaDbPath = process.argv[3] ?? join(process.env.ARIA_HOME ?? join(process.env.HOME ?? "", ".aria"), "aria.db");

if (!legacyDbPath) {
  usage();
}

const legacyDb = new Sqlite(legacyDbPath, { readonly: true });
const store = new ProjectsEngineStore(ariaDbPath);
await store.init();

const legacyProjects = legacyDb.prepare(`
  SELECT id, name, repo_url, base_branch
  FROM projects
  ORDER BY created_at ASC
`).all() as LegacyProjectRow[];

for (const project of legacyProjects) {
  const now = Date.now();
  const repoId = `repo:${project.id}`;
  store.upsertProject({
    projectId: project.id,
    name: project.name,
    slug: project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    description: null,
    createdAt: now,
    updatedAt: now,
  });
  store.upsertRepo({
    repoId,
    projectId: project.id,
    name: project.name,
    remoteUrl: project.repo_url,
    defaultBranch: project.base_branch,
    createdAt: now,
    updatedAt: now,
  });
}

const legacyThreads = legacyDb.prepare(`
  SELECT id, project_id, linear_issue_id, linear_identifier, linear_session_id, title, status, worktree_path, branch_name, created_at, updated_at
  FROM threads
  ORDER BY created_at ASC
`).all() as LegacyThreadRow[];

for (const thread of legacyThreads) {
  const repoId = `repo:${thread.project_id}`;
  const createdAt = asTimestamp(thread.created_at);
  const updatedAt = asTimestamp(thread.updated_at);
  const taskId = `task:${thread.id}`;
  store.upsertTask({
    taskId,
    projectId: thread.project_id,
    repoId,
    title: thread.title,
    description: null,
    status: thread.status === "completed" ? "done" : thread.status === "stopped" ? "cancelled" : "backlog",
    createdAt,
    updatedAt,
  });
  store.upsertThread({
    threadId: thread.id,
    projectId: thread.project_id,
    taskId,
    repoId,
    title: thread.title,
    status: thread.status === "completed" ? "done" : thread.status === "running_dirty" ? "dirty" : thread.status === "stopped" ? "cancelled" : "idle",
    createdAt,
    updatedAt,
  });

  if (thread.worktree_path && thread.branch_name) {
    store.upsertWorktree({
      worktreeId: `worktree:${thread.id}`,
      repoId,
      threadId: thread.id,
      dispatchId: null,
      path: thread.worktree_path,
      branchName: thread.branch_name,
      baseRef: "legacy",
      status: "retained",
      createdAt,
      expiresAt: null,
      prunedAt: null,
    });
  }

  for (const ref of createLegacyLinearThreadExternalRefs({
    projectId: thread.project_id,
    threadId: thread.id,
    linearIssueId: thread.linear_issue_id,
    linearIdentifier: thread.linear_identifier,
    linearSessionId: thread.linear_session_id,
    metadataJson: null,
    createdAt,
    updatedAt,
  })) {
    store.upsertExternalRef(ref);
  }
}

const legacyJobs = legacyDb.prepare(`
  SELECT id, thread_id, author, body, created_at
  FROM jobs
  ORDER BY created_at ASC
`).all() as LegacyJobRow[];

for (const job of legacyJobs) {
  store.upsertJob({
    jobId: job.id || randomUUID(),
    threadId: job.thread_id,
    author: job.author === "agent" ? "agent" : "user",
    body: job.body,
    createdAt: asTimestamp(job.created_at),
  });
}

legacyDb.close();
store.close();

console.log(`Imported ${legacyProjects.length} legacy projects, ${legacyThreads.length} threads, and ${legacyJobs.length} jobs into ${ariaDbPath}`);
