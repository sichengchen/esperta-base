export const HANDOFF_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS projects_handoffs (
  handoff_id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  source_kind TEXT NOT NULL,
  source_session_id TEXT,
  project_id TEXT NOT NULL,
  task_id TEXT,
  thread_id TEXT,
  created_dispatch_id TEXT,
  status TEXT NOT NULL,
  payload_json TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_projects_handoffs_project_status
  ON projects_handoffs(project_id, status, created_at);
`;
