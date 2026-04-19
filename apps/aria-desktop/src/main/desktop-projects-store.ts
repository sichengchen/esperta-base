import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { PROJECTS_ENGINE_SCHEMA_SQL } from "../../../../packages/projects/src/schema.js";
import type { AriaDesktopChatMessage } from "../shared/api.js";
import type {
  EnvironmentRecord,
  ProjectRecord,
  RepoRecord,
  ThreadEnvironmentBindingRecord,
  ThreadRecord,
  WorkspaceRecord,
} from "../../../../packages/projects/src/types.js";
import type { DesktopShellStateRow } from "./desktop-projects-shell.js";
import { createDesktopSqliteDatabase, type SqliteDatabaseLike } from "./desktop-sqlite.js";

type SqliteRow = Record<string, unknown>;

function asOptionalText(value: unknown): string | null {
  return value == null ? null : String(value);
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : String(value);
}

function normalizeProjectRow(row: SqliteRow | null | undefined): ProjectRecord | undefined {
  if (!row) {
    return undefined;
  }

  return {
    createdAt: Number(row.created_at),
    description: asOptionalText(row.description),
    name: asText(row.name),
    projectId: asText(row.project_id),
    slug: asText(row.slug),
    updatedAt: Number(row.updated_at),
  };
}

function normalizeWorkspaceRow(row: SqliteRow | null | undefined): WorkspaceRecord | undefined {
  if (!row) {
    return undefined;
  }

  return {
    createdAt: Number(row.created_at),
    host: asText(row.host) as WorkspaceRecord["host"],
    label: asText(row.label),
    serverId: asOptionalText(row.server_id),
    updatedAt: Number(row.updated_at),
    workspaceId: asText(row.workspace_id),
  };
}

function normalizeEnvironmentRow(row: SqliteRow | null | undefined): EnvironmentRecord | undefined {
  if (!row) {
    return undefined;
  }

  return {
    createdAt: Number(row.created_at),
    environmentId: asText(row.environment_id),
    kind: asText(row.kind) as EnvironmentRecord["kind"],
    label: asText(row.label),
    locator: asText(row.locator),
    mode: asText(row.mode) as EnvironmentRecord["mode"],
    projectId: asText(row.project_id),
    updatedAt: Number(row.updated_at),
    workspaceId: asText(row.workspace_id),
  };
}

function normalizeRepoRow(row: SqliteRow | null | undefined): RepoRecord | undefined {
  if (!row) {
    return undefined;
  }

  return {
    createdAt: Number(row.created_at),
    defaultBranch: asText(row.default_branch),
    name: asText(row.name),
    projectId: asText(row.project_id),
    remoteUrl: asText(row.remote_url),
    repoId: asText(row.repo_id),
    updatedAt: Number(row.updated_at),
  };
}

function normalizeThreadRow(row: SqliteRow | null | undefined): ThreadRecord | undefined {
  if (!row) {
    return undefined;
  }

  return {
    agentId: asOptionalText(row.agent_id),
    createdAt: Number(row.created_at),
    environmentBindingId: asOptionalText(row.environment_binding_id),
    environmentId: asOptionalText(row.environment_id),
    projectId: asText(row.project_id),
    repoId: asOptionalText(row.repo_id),
    status: asText(row.status) as ThreadRecord["status"],
    taskId: asOptionalText(row.task_id),
    threadId: asText(row.thread_id),
    threadType: asOptionalText(row.thread_type) as ThreadRecord["threadType"],
    title: asText(row.title),
    updatedAt: Number(row.updated_at),
    workspaceId: asOptionalText(row.workspace_id),
  };
}

function normalizeThreadEnvironmentBindingRow(
  row: SqliteRow | null | undefined,
): ThreadEnvironmentBindingRecord | undefined {
  if (!row) {
    return undefined;
  }

  return {
    attachedAt: Number(row.attached_at),
    bindingId: asText(row.binding_id),
    detachedAt: row.detached_at == null ? null : Number(row.detached_at),
    environmentId: asText(row.environment_id),
    isActive: Boolean(row.is_active),
    projectId: asText(row.project_id),
    reason: asOptionalText(row.reason),
    threadId: asText(row.thread_id),
    workspaceId: asText(row.workspace_id),
  };
}

function normalizeShellStateRow(row: SqliteRow | null | undefined): DesktopShellStateRow | null {
  if (!row) {
    return null;
  }

  let collapsedProjectIds: string[] = [];
  let pinnedThreadIds: string[] = [];
  let archivedThreadIds: string[] = [];
  const rawCollapsedProjectIds = asOptionalText(row.collapsed_project_ids_json);
  const rawPinnedThreadIds = asOptionalText(row.pinned_thread_ids_json);
  const rawArchivedThreadIds = asOptionalText(row.archived_thread_ids_json);

  if (rawCollapsedProjectIds) {
    try {
      const parsed = JSON.parse(rawCollapsedProjectIds) as unknown;

      if (Array.isArray(parsed)) {
        collapsedProjectIds = parsed
          .filter((value): value is string => typeof value === "string")
          .slice();
      }
    } catch {
      collapsedProjectIds = [];
    }
  }

  if (rawPinnedThreadIds) {
    try {
      const parsed = JSON.parse(rawPinnedThreadIds) as unknown;

      if (Array.isArray(parsed)) {
        pinnedThreadIds = parsed
          .filter((value): value is string => typeof value === "string")
          .slice();
      }
    } catch {
      pinnedThreadIds = [];
    }
  }

  if (rawArchivedThreadIds) {
    try {
      const parsed = JSON.parse(rawArchivedThreadIds) as unknown;

      if (Array.isArray(parsed)) {
        archivedThreadIds = parsed
          .filter((value): value is string => typeof value === "string")
          .slice();
      }
    } catch {
      archivedThreadIds = [];
    }
  }

  return {
    archivedThreadIds,
    collapsedProjectIds,
    pinnedThreadIds,
    selectedProjectId: asOptionalText(row.selected_project_id),
    selectedThreadId: asOptionalText(row.selected_thread_id),
    shellId: asText(row.shell_id),
    updatedAt: Number(row.updated_at),
  };
}

export interface DesktopProjectThreadMessageRow {
  messageId: string;
  threadId: string;
  role: AriaDesktopChatMessage["role"];
  content: string;
  toolName: string | null;
  createdAt: number;
}

export interface DesktopProjectThreadStateRow {
  threadId: string;
  backendSessionId: string | null;
  lastError: string | null;
  lastFilesChanged: string[];
  selectedModelId: string | null;
  updatedAt: number;
}

function normalizeProjectThreadMessageRow(
  row: SqliteRow | null | undefined,
): DesktopProjectThreadMessageRow | undefined {
  if (!row) {
    return undefined;
  }

  return {
    content: asText(row.content),
    createdAt: Number(row.created_at),
    messageId: asText(row.message_id),
    role: asText(row.role) as DesktopProjectThreadMessageRow["role"],
    threadId: asText(row.thread_id),
    toolName: asOptionalText(row.tool_name),
  };
}

function normalizeProjectThreadStateRow(
  row: SqliteRow | null | undefined,
): DesktopProjectThreadStateRow | undefined {
  if (!row) {
    return undefined;
  }

  let lastFilesChanged: string[] = [];
  const rawFilesChanged = asOptionalText(row.last_files_changed_json);

  if (rawFilesChanged) {
    try {
      const parsed = JSON.parse(rawFilesChanged) as unknown;
      if (Array.isArray(parsed)) {
        lastFilesChanged = parsed.filter((value): value is string => typeof value === "string");
      }
    } catch {
      lastFilesChanged = [];
    }
  }

  return {
    backendSessionId: asOptionalText(row.backend_session_id),
    lastError: asOptionalText(row.last_error),
    lastFilesChanged,
    selectedModelId: asOptionalText(row.selected_model_id),
    threadId: asText(row.thread_id),
    updatedAt: Number(row.updated_at),
  };
}

export class DesktopProjectsStore {
  private db: SqliteDatabaseLike | null = null;

  constructor(private readonly dbPath: string) {}

  init(): void {
    if (this.db) {
      return;
    }

    mkdirSync(dirname(this.dbPath), { recursive: true });
    this.db = createDesktopSqliteDatabase(this.dbPath);
    this.db.exec("PRAGMA foreign_keys = ON");
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec(PROJECTS_ENGINE_SCHEMA_SQL);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS desktop_shell_state (
        shell_id TEXT PRIMARY KEY,
        selected_project_id TEXT,
        selected_thread_id TEXT,
        collapsed_project_ids_json TEXT NOT NULL,
        pinned_thread_ids_json TEXT NOT NULL DEFAULT '[]',
        archived_thread_ids_json TEXT NOT NULL DEFAULT '[]',
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS desktop_project_thread_messages (
        message_id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        tool_name TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (thread_id) REFERENCES projects_threads(thread_id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS desktop_project_thread_state (
        thread_id TEXT PRIMARY KEY,
        backend_session_id TEXT,
        last_error TEXT,
        last_files_changed_json TEXT NOT NULL,
        selected_model_id TEXT,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (thread_id) REFERENCES projects_threads(thread_id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_desktop_project_thread_messages_thread_created
        ON desktop_project_thread_messages(thread_id, created_at);
    `);
    try {
      this.db.exec(`
        ALTER TABLE desktop_project_thread_state
        ADD COLUMN selected_model_id TEXT;
      `);
    } catch {
      // Column already exists in upgraded databases.
    }
    try {
      this.db.exec(`
        ALTER TABLE desktop_shell_state
        ADD COLUMN pinned_thread_ids_json TEXT NOT NULL DEFAULT '[]';
      `);
    } catch {
      // Column already exists in upgraded databases.
    }
    try {
      this.db.exec(`
        ALTER TABLE desktop_shell_state
        ADD COLUMN archived_thread_ids_json TEXT NOT NULL DEFAULT '[]';
      `);
    } catch {
      // Column already exists in upgraded databases.
    }
  }

  close(): void {
    this.db?.close();
    this.db = null;
  }

  private getDb(): SqliteDatabaseLike {
    if (!this.db) {
      throw new Error("Desktop projects store not initialized");
    }

    return this.db;
  }

  listProjects(): ProjectRecord[] {
    return this.getDb()
      .prepare(
        `
          SELECT project_id, name, slug, description, created_at, updated_at
          FROM projects_projects
          ORDER BY updated_at DESC, created_at DESC
        `,
      )
      .all()
      .map((row) => normalizeProjectRow(row as SqliteRow))
      .filter((row): row is ProjectRecord => Boolean(row));
  }

  getProject(projectId: string): ProjectRecord | undefined {
    return normalizeProjectRow(
      this.getDb()
        .prepare(
          `
            SELECT project_id, name, slug, description, created_at, updated_at
            FROM projects_projects
            WHERE project_id = ?
          `,
        )
        .get(projectId) as SqliteRow | undefined,
    );
  }

  getProjectBySlug(slug: string): ProjectRecord | undefined {
    return normalizeProjectRow(
      this.getDb()
        .prepare(
          `
            SELECT project_id, name, slug, description, created_at, updated_at
            FROM projects_projects
            WHERE slug = ?
          `,
        )
        .get(slug) as SqliteRow | undefined,
    );
  }

  upsertProject(project: ProjectRecord): void {
    this.getDb()
      .prepare(
        `
          INSERT INTO projects_projects (
            project_id, name, slug, description, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(project_id) DO UPDATE SET
            name = excluded.name,
            slug = excluded.slug,
            description = excluded.description,
            created_at = excluded.created_at,
            updated_at = excluded.updated_at
        `,
      )
      .run(
        project.projectId,
        project.name,
        project.slug,
        project.description ?? null,
        project.createdAt,
        project.updatedAt,
      );
  }

  listWorkspaces(): WorkspaceRecord[] {
    return this.getDb()
      .prepare(
        `
          SELECT workspace_id, host, server_id, label, created_at, updated_at
          FROM projects_workspaces
          ORDER BY updated_at DESC, created_at DESC
        `,
      )
      .all()
      .map((row) => normalizeWorkspaceRow(row as SqliteRow))
      .filter((row): row is WorkspaceRecord => Boolean(row));
  }

  getWorkspace(workspaceId: string): WorkspaceRecord | undefined {
    return normalizeWorkspaceRow(
      this.getDb()
        .prepare(
          `
            SELECT workspace_id, host, server_id, label, created_at, updated_at
            FROM projects_workspaces
            WHERE workspace_id = ?
          `,
        )
        .get(workspaceId) as SqliteRow | undefined,
    );
  }

  upsertWorkspace(workspace: WorkspaceRecord): void {
    this.getDb()
      .prepare(
        `
          INSERT INTO projects_workspaces (
            workspace_id, host, server_id, label, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(workspace_id) DO UPDATE SET
            host = excluded.host,
            server_id = excluded.server_id,
            label = excluded.label,
            created_at = excluded.created_at,
            updated_at = excluded.updated_at
        `,
      )
      .run(
        workspace.workspaceId,
        workspace.host,
        workspace.serverId ?? null,
        workspace.label,
        workspace.createdAt,
        workspace.updatedAt,
      );
  }

  listEnvironments(projectId?: string): EnvironmentRecord[] {
    const rows = projectId
      ? this.getDb()
          .prepare(
            `
              SELECT environment_id, workspace_id, project_id, label, mode, kind, locator,
                     created_at, updated_at
              FROM projects_environments
              WHERE project_id = ?
              ORDER BY updated_at DESC, created_at DESC
            `,
          )
          .all(projectId)
      : this.getDb()
          .prepare(
            `
              SELECT environment_id, workspace_id, project_id, label, mode, kind, locator,
                     created_at, updated_at
              FROM projects_environments
              ORDER BY updated_at DESC, created_at DESC
            `,
          )
          .all();

    return rows
      .map((row) => normalizeEnvironmentRow(row as SqliteRow))
      .filter((row): row is EnvironmentRecord => Boolean(row));
  }

  getEnvironment(environmentId: string): EnvironmentRecord | undefined {
    return normalizeEnvironmentRow(
      this.getDb()
        .prepare(
          `
            SELECT environment_id, workspace_id, project_id, label, mode, kind, locator,
                   created_at, updated_at
            FROM projects_environments
            WHERE environment_id = ?
          `,
        )
        .get(environmentId) as SqliteRow | undefined,
    );
  }

  findEnvironmentByLocator(locator: string): EnvironmentRecord | undefined {
    return normalizeEnvironmentRow(
      this.getDb()
        .prepare(
          `
            SELECT environment_id, workspace_id, project_id, label, mode, kind, locator,
                   created_at, updated_at
            FROM projects_environments
            WHERE locator = ?
            ORDER BY updated_at DESC, created_at DESC
            LIMIT 1
          `,
        )
        .get(locator) as SqliteRow | undefined,
    );
  }

  upsertEnvironment(environment: EnvironmentRecord): void {
    this.getDb()
      .prepare(
        `
          INSERT INTO projects_environments (
            environment_id, workspace_id, project_id, label, mode, kind, locator, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(environment_id) DO UPDATE SET
            workspace_id = excluded.workspace_id,
            project_id = excluded.project_id,
            label = excluded.label,
            mode = excluded.mode,
            kind = excluded.kind,
            locator = excluded.locator,
            created_at = excluded.created_at,
            updated_at = excluded.updated_at
        `,
      )
      .run(
        environment.environmentId,
        environment.workspaceId,
        environment.projectId,
        environment.label,
        environment.mode,
        environment.kind,
        environment.locator,
        environment.createdAt,
        environment.updatedAt,
      );
  }

  listRepos(projectId?: string): RepoRecord[] {
    const rows = projectId
      ? this.getDb()
          .prepare(
            `
              SELECT repo_id, project_id, name, remote_url, default_branch, created_at, updated_at
              FROM projects_repos
              WHERE project_id = ?
              ORDER BY updated_at DESC, created_at DESC
            `,
          )
          .all(projectId)
      : this.getDb()
          .prepare(
            `
              SELECT repo_id, project_id, name, remote_url, default_branch, created_at, updated_at
              FROM projects_repos
              ORDER BY updated_at DESC, created_at DESC
            `,
          )
          .all();

    return rows
      .map((row) => normalizeRepoRow(row as SqliteRow))
      .filter((row): row is RepoRecord => Boolean(row));
  }

  upsertRepo(repo: RepoRecord): void {
    this.getDb()
      .prepare(
        `
          INSERT INTO projects_repos (
            repo_id, project_id, name, remote_url, default_branch, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(repo_id) DO UPDATE SET
            project_id = excluded.project_id,
            name = excluded.name,
            remote_url = excluded.remote_url,
            default_branch = excluded.default_branch,
            created_at = excluded.created_at,
            updated_at = excluded.updated_at
        `,
      )
      .run(
        repo.repoId,
        repo.projectId,
        repo.name,
        repo.remoteUrl,
        repo.defaultBranch,
        repo.createdAt,
        repo.updatedAt,
      );
  }

  listThreads(projectId?: string): ThreadRecord[] {
    const rows = projectId
      ? this.getDb()
          .prepare(
            `
              SELECT thread_id, project_id, task_id, repo_id, title, status, thread_type, workspace_id,
                     environment_id, environment_binding_id, agent_id, created_at, updated_at
              FROM projects_threads
              WHERE project_id = ?
              ORDER BY updated_at DESC, created_at DESC
            `,
          )
          .all(projectId)
      : this.getDb()
          .prepare(
            `
              SELECT thread_id, project_id, task_id, repo_id, title, status, thread_type, workspace_id,
                     environment_id, environment_binding_id, agent_id, created_at, updated_at
              FROM projects_threads
              ORDER BY updated_at DESC, created_at DESC
            `,
          )
          .all();

    return rows
      .map((row) => normalizeThreadRow(row as SqliteRow))
      .filter((row): row is ThreadRecord => Boolean(row));
  }

  getThread(threadId: string): ThreadRecord | undefined {
    return normalizeThreadRow(
      this.getDb()
        .prepare(
          `
            SELECT thread_id, project_id, task_id, repo_id, title, status, thread_type, workspace_id,
                   environment_id, environment_binding_id, agent_id, created_at, updated_at
            FROM projects_threads
            WHERE thread_id = ?
          `,
        )
        .get(threadId) as SqliteRow | undefined,
    );
  }

  upsertThread(thread: ThreadRecord): void {
    this.getDb()
      .prepare(
        `
          INSERT INTO projects_threads (
            thread_id, project_id, task_id, repo_id, title, status, thread_type, workspace_id,
            environment_id, environment_binding_id, agent_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(thread_id) DO UPDATE SET
            project_id = excluded.project_id,
            task_id = excluded.task_id,
            repo_id = excluded.repo_id,
            title = excluded.title,
            status = excluded.status,
            thread_type = excluded.thread_type,
            workspace_id = excluded.workspace_id,
            environment_id = excluded.environment_id,
            environment_binding_id = excluded.environment_binding_id,
            agent_id = excluded.agent_id,
            created_at = excluded.created_at,
            updated_at = excluded.updated_at
        `,
      )
      .run(
        thread.threadId,
        thread.projectId,
        thread.taskId ?? null,
        thread.repoId ?? null,
        thread.title,
        thread.status,
        thread.threadType ?? null,
        thread.workspaceId ?? null,
        thread.environmentId ?? null,
        thread.environmentBindingId ?? null,
        thread.agentId ?? null,
        thread.createdAt,
        thread.updatedAt,
      );
  }

  listThreadEnvironmentBindings(threadId?: string): ThreadEnvironmentBindingRecord[] {
    const rows = threadId
      ? this.getDb()
          .prepare(
            `
              SELECT binding_id, thread_id, project_id, workspace_id, environment_id, attached_at,
                     detached_at, is_active, reason
              FROM projects_thread_environment_bindings
              WHERE thread_id = ?
              ORDER BY attached_at DESC
            `,
          )
          .all(threadId)
      : this.getDb()
          .prepare(
            `
              SELECT binding_id, thread_id, project_id, workspace_id, environment_id, attached_at,
                     detached_at, is_active, reason
              FROM projects_thread_environment_bindings
              ORDER BY attached_at DESC
            `,
          )
          .all();

    return rows
      .map((row) => normalizeThreadEnvironmentBindingRow(row as SqliteRow))
      .filter((row): row is ThreadEnvironmentBindingRecord => Boolean(row));
  }

  getActiveThreadEnvironmentBinding(threadId: string): ThreadEnvironmentBindingRecord | undefined {
    return normalizeThreadEnvironmentBindingRow(
      this.getDb()
        .prepare(
          `
            SELECT binding_id, thread_id, project_id, workspace_id, environment_id, attached_at,
                   detached_at, is_active, reason
            FROM projects_thread_environment_bindings
            WHERE thread_id = ? AND is_active = 1
            ORDER BY attached_at DESC
            LIMIT 1
          `,
        )
        .get(threadId) as SqliteRow | undefined,
    );
  }

  upsertThreadEnvironmentBinding(binding: ThreadEnvironmentBindingRecord): void {
    if (binding.isActive) {
      this.getDb()
        .prepare(
          `
            UPDATE projects_thread_environment_bindings
            SET is_active = 0, detached_at = ?
            WHERE thread_id = ? AND binding_id != ? AND is_active = 1
          `,
        )
        .run(binding.attachedAt, binding.threadId, binding.bindingId);
    }

    this.getDb()
      .prepare(
        `
          INSERT INTO projects_thread_environment_bindings (
            binding_id, thread_id, project_id, workspace_id, environment_id, attached_at,
            detached_at, is_active, reason
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(binding_id) DO UPDATE SET
            thread_id = excluded.thread_id,
            project_id = excluded.project_id,
            workspace_id = excluded.workspace_id,
            environment_id = excluded.environment_id,
            attached_at = excluded.attached_at,
            detached_at = excluded.detached_at,
            is_active = excluded.is_active,
            reason = excluded.reason
        `,
      )
      .run(
        binding.bindingId,
        binding.threadId,
        binding.projectId,
        binding.workspaceId,
        binding.environmentId,
        binding.attachedAt,
        binding.detachedAt ?? null,
        binding.isActive ? 1 : 0,
        binding.reason ?? null,
      );
  }

  getShellState(): DesktopShellStateRow | null {
    return normalizeShellStateRow(
      this.getDb()
        .prepare(
          `
            SELECT shell_id, selected_project_id, selected_thread_id, collapsed_project_ids_json,
                   pinned_thread_ids_json, archived_thread_ids_json, updated_at
            FROM desktop_shell_state
            LIMIT 1
          `,
        )
        .get() as SqliteRow | undefined,
    );
  }

  upsertShellState(shellState: DesktopShellStateRow): void {
    this.getDb()
      .prepare(
        `
          INSERT INTO desktop_shell_state (
            shell_id, selected_project_id, selected_thread_id, collapsed_project_ids_json,
            pinned_thread_ids_json, archived_thread_ids_json, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(shell_id) DO UPDATE SET
            selected_project_id = excluded.selected_project_id,
            selected_thread_id = excluded.selected_thread_id,
            collapsed_project_ids_json = excluded.collapsed_project_ids_json,
            pinned_thread_ids_json = excluded.pinned_thread_ids_json,
            archived_thread_ids_json = excluded.archived_thread_ids_json,
            updated_at = excluded.updated_at
        `,
      )
      .run(
        shellState.shellId,
        shellState.selectedProjectId ?? null,
        shellState.selectedThreadId ?? null,
        JSON.stringify(shellState.collapsedProjectIds),
        JSON.stringify(shellState.pinnedThreadIds),
        JSON.stringify(shellState.archivedThreadIds),
        shellState.updatedAt,
      );
  }

  listProjectThreadMessages(threadId: string): DesktopProjectThreadMessageRow[] {
    return this.getDb()
      .prepare(
        `
          SELECT message_id, thread_id, role, content, tool_name, created_at
          FROM desktop_project_thread_messages
          WHERE thread_id = ?
          ORDER BY created_at ASC, rowid ASC
        `,
      )
      .all(threadId)
      .map((row) => normalizeProjectThreadMessageRow(row as SqliteRow))
      .filter((row): row is DesktopProjectThreadMessageRow => Boolean(row));
  }

  appendProjectThreadMessage(message: DesktopProjectThreadMessageRow): void {
    this.getDb()
      .prepare(
        `
          INSERT INTO desktop_project_thread_messages (
            message_id, thread_id, role, content, tool_name, created_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        message.messageId,
        message.threadId,
        message.role,
        message.content,
        message.toolName ?? null,
        message.createdAt,
      );
  }

  getProjectThreadState(threadId: string): DesktopProjectThreadStateRow | undefined {
    return normalizeProjectThreadStateRow(
      this.getDb()
        .prepare(
          `
            SELECT thread_id, backend_session_id, last_error, last_files_changed_json, updated_at
                   , selected_model_id
            FROM desktop_project_thread_state
            WHERE thread_id = ?
          `,
        )
        .get(threadId) as SqliteRow | undefined,
    );
  }

  upsertProjectThreadState(state: DesktopProjectThreadStateRow): void {
    this.getDb()
      .prepare(
        `
          INSERT INTO desktop_project_thread_state (
            thread_id, backend_session_id, last_error, last_files_changed_json, selected_model_id, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(thread_id) DO UPDATE SET
            backend_session_id = excluded.backend_session_id,
            last_error = excluded.last_error,
            last_files_changed_json = excluded.last_files_changed_json,
            selected_model_id = excluded.selected_model_id,
            updated_at = excluded.updated_at
        `,
      )
      .run(
        state.threadId,
        state.backendSessionId ?? null,
        state.lastError ?? null,
        JSON.stringify(state.lastFilesChanged),
        state.selectedModelId ?? null,
        state.updatedAt,
      );
  }
}
