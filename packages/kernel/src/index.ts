import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { Database } from "bun:sqlite";

export interface KernelCommand<TPayload = unknown> {
  type: string;
  payload: TPayload;
  idempotencyKey?: string;
}

export interface KernelQuery<TPayload = unknown> {
  type: string;
  payload: TPayload;
}

export interface UnitOfWork {
  transact<T>(work: () => Promise<T> | T): Promise<T>;
}

export class ImmediateUnitOfWork implements UnitOfWork {
  async transact<T>(work: () => Promise<T> | T): Promise<T> {
    return work();
  }
}

export interface KernelStore {
  getIdempotencyResult(key: string): unknown | undefined;
  setIdempotencyResult(key: string, result: unknown): void;
  enqueueWorkflowTask(task: WorkflowTask): void;
  listWorkflowTasks(status?: WorkflowTask["status"]): WorkflowTask[];
  markWorkflowTask(id: string, status: WorkflowTask["status"]): WorkflowTask | undefined;
  enqueueOutboxMessage(message: OutboxMessage): void;
  listOutboxMessages(topic?: string): OutboxMessage[];
  deleteOutboxMessage(id: string): void;
  drainOutboxMessages(topic?: string): OutboxMessage[];
  close?(): void;
}

export class InMemoryKernelStore implements KernelStore {
  private readonly idempotencyResults = new Map<string, unknown>();
  private readonly workflowTasks = new Map<string, WorkflowTask>();
  private readonly outboxMessages: OutboxMessage[] = [];

  getIdempotencyResult(key: string): unknown | undefined {
    return this.idempotencyResults.get(key);
  }

  setIdempotencyResult(key: string, result: unknown): void {
    this.idempotencyResults.set(key, result);
  }

  enqueueWorkflowTask(task: WorkflowTask): void {
    this.workflowTasks.set(task.id, task);
  }

  listWorkflowTasks(status?: WorkflowTask["status"]): WorkflowTask[] {
    return [...this.workflowTasks.values()].filter((task) => !status || task.status === status);
  }

  markWorkflowTask(id: string, status: WorkflowTask["status"]): WorkflowTask | undefined {
    const task = this.workflowTasks.get(id);
    if (!task) return undefined;
    const next = {
      ...task,
      status,
      attempts: status === "running" ? task.attempts + 1 : task.attempts,
    };
    this.workflowTasks.set(id, next);
    return next;
  }

  enqueueOutboxMessage(message: OutboxMessage): void {
    this.outboxMessages.push(message);
  }

  listOutboxMessages(topic?: string): OutboxMessage[] {
    return this.outboxMessages.filter((message) => !topic || message.topic === topic);
  }

  deleteOutboxMessage(id: string): void {
    const index = this.outboxMessages.findIndex((message) => message.id === id);
    if (index !== -1) {
      this.outboxMessages.splice(index, 1);
    }
  }

  drainOutboxMessages(topic?: string): OutboxMessage[] {
    const messages = this.listOutboxMessages(topic);
    for (const message of messages) {
      this.deleteOutboxMessage(message.id);
    }
    return messages;
  }
}

export class IdempotencyStore<TResult = unknown> {
  constructor(private readonly store: KernelStore = new InMemoryKernelStore()) {}

  get(key: string): TResult | undefined {
    return this.store.getIdempotencyResult(key) as TResult | undefined;
  }

  set(key: string, result: TResult): void {
    this.store.setIdempotencyResult(key, result);
  }
}

export type CommandHandler<TCommand extends KernelCommand = KernelCommand, TResult = unknown> = (
  command: TCommand,
  context: KernelExecutionContext,
) => Promise<TResult> | TResult;

export type QueryHandler<TQuery extends KernelQuery = KernelQuery, TResult = unknown> = (
  query: TQuery,
  context: KernelExecutionContext,
) => Promise<TResult> | TResult;

export interface KernelExecutionContext {
  unitOfWork: UnitOfWork;
  outbox: Outbox;
  workflows: WorkflowEngine;
}

export class CommandBus {
  private readonly handlers = new Map<string, CommandHandler>();

  constructor(
    private readonly context: KernelExecutionContext,
    private readonly idempotency = new IdempotencyStore(),
  ) {}

  register<TCommand extends KernelCommand, TResult>(
    type: TCommand["type"],
    handler: CommandHandler<TCommand, TResult>,
  ): void {
    this.handlers.set(type, handler as CommandHandler);
  }

  async execute<TResult = unknown>(command: KernelCommand): Promise<TResult> {
    if (command.idempotencyKey) {
      const existing = this.idempotency.get(command.idempotencyKey) as TResult | undefined;
      if (existing !== undefined) return existing;
    }

    const handler = this.handlers.get(command.type);
    if (!handler) throw new Error(`No command handler registered for ${command.type}`);

    const result = await this.context.unitOfWork.transact(() => handler(command, this.context));
    if (command.idempotencyKey) {
      this.idempotency.set(command.idempotencyKey, result);
    }
    return result as TResult;
  }
}

export class QueryBus {
  private readonly handlers = new Map<string, QueryHandler>();

  constructor(private readonly context: KernelExecutionContext) {}

  register<TQuery extends KernelQuery, TResult>(
    type: TQuery["type"],
    handler: QueryHandler<TQuery, TResult>,
  ): void {
    this.handlers.set(type, handler as QueryHandler);
  }

  async execute<TResult = unknown>(query: KernelQuery): Promise<TResult> {
    const handler = this.handlers.get(query.type);
    if (!handler) throw new Error(`No query handler registered for ${query.type}`);
    return handler(query, this.context) as Promise<TResult>;
  }
}

export interface WorkflowTask<TPayload = unknown> {
  id: string;
  workflowType: string;
  aggregateId: string;
  runAt: string;
  status: "pending" | "running" | "completed" | "failed";
  attempts: number;
  payload: TPayload;
}

export class WorkflowEngine {
  constructor(private readonly store: KernelStore = new InMemoryKernelStore()) {}

  enqueue(task: Omit<WorkflowTask, "status" | "attempts">): WorkflowTask {
    const record: WorkflowTask = { ...task, status: "pending", attempts: 0 };
    this.store.enqueueWorkflowTask(record);
    return record;
  }

  list(status?: WorkflowTask["status"]): WorkflowTask[] {
    return this.store.listWorkflowTasks(status);
  }

  mark(id: string, status: WorkflowTask["status"]): WorkflowTask | undefined {
    return this.store.markWorkflowTask(id, status);
  }
}

export interface OutboxMessage<TPayload = unknown> {
  id: string;
  topic: string;
  payload: TPayload;
  createdAt: string;
}

export class Outbox {
  constructor(private readonly store: KernelStore = new InMemoryKernelStore()) {}

  enqueue(message: OutboxMessage): void {
    this.store.enqueueOutboxMessage(message);
  }

  list(topic?: string): OutboxMessage[] {
    return this.store.listOutboxMessages(topic);
  }

  ack(id: string): void {
    this.store.deleteOutboxMessage(id);
  }

  drain(topic?: string): OutboxMessage[] {
    return this.store.drainOutboxMessages(topic);
  }
}

export class JobScheduler {
  constructor(private readonly workflows: WorkflowEngine) {}

  schedule(task: Omit<WorkflowTask, "status" | "attempts">): WorkflowTask {
    return this.workflows.enqueue(task);
  }
}

const KERNEL_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS kernel_idempotency (
  key TEXT PRIMARY KEY,
  result_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS kernel_workflow_tasks (
  id TEXT PRIMARY KEY,
  workflow_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  run_at TEXT NOT NULL,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS kernel_outbox_messages (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_kernel_workflow_status_run_at
  ON kernel_workflow_tasks(status, run_at);
CREATE INDEX IF NOT EXISTS idx_kernel_outbox_created
  ON kernel_outbox_messages(created_at);
`;

function parseJson(value: string): unknown {
  return JSON.parse(value) as unknown;
}

export class SqliteKernelStore implements KernelStore {
  private readonly db: Database;

  constructor(dbPath: string) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.exec("PRAGMA journal_mode=WAL");
    this.db.exec(KERNEL_SCHEMA_SQL);
  }

  getIdempotencyResult(key: string): unknown | undefined {
    const row = this.db
      .prepare("SELECT result_json FROM kernel_idempotency WHERE key = ?")
      .get(key) as { result_json: string } | undefined;
    return row ? parseJson(row.result_json) : undefined;
  }

  setIdempotencyResult(key: string, result: unknown): void {
    this.db
      .prepare(
        `
        INSERT INTO kernel_idempotency (key, result_json, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          result_json = excluded.result_json,
          updated_at = excluded.updated_at
      `,
      )
      .run(key, JSON.stringify(result), new Date().toISOString());
  }

  enqueueWorkflowTask(task: WorkflowTask): void {
    this.db
      .prepare(
        `
        INSERT INTO kernel_workflow_tasks (
          id, workflow_type, aggregate_id, run_at, status, attempts, payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          workflow_type = excluded.workflow_type,
          aggregate_id = excluded.aggregate_id,
          run_at = excluded.run_at,
          status = excluded.status,
          attempts = excluded.attempts,
          payload_json = excluded.payload_json
      `,
      )
      .run(
        task.id,
        task.workflowType,
        task.aggregateId,
        task.runAt,
        task.status,
        task.attempts,
        JSON.stringify(task.payload),
      );
  }

  listWorkflowTasks(status?: WorkflowTask["status"]): WorkflowTask[] {
    const rows = (
      status
        ? this.db
            .prepare(
              `
              SELECT id, workflow_type, aggregate_id, run_at, status, attempts, payload_json
              FROM kernel_workflow_tasks
              WHERE status = ?
              ORDER BY run_at ASC, id ASC
            `,
            )
            .all(status)
        : this.db
            .prepare(
              `
              SELECT id, workflow_type, aggregate_id, run_at, status, attempts, payload_json
              FROM kernel_workflow_tasks
              ORDER BY run_at ASC, id ASC
            `,
            )
            .all()
    ) as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      id: String(row.id),
      workflowType: String(row.workflow_type),
      aggregateId: String(row.aggregate_id),
      runAt: String(row.run_at),
      status: String(row.status) as WorkflowTask["status"],
      attempts: Number(row.attempts),
      payload: parseJson(String(row.payload_json)),
    }));
  }

  markWorkflowTask(id: string, status: WorkflowTask["status"]): WorkflowTask | undefined {
    const existing = this.listWorkflowTasks().find((task) => task.id === id);
    if (!existing) return undefined;
    const next = {
      ...existing,
      status,
      attempts: status === "running" ? existing.attempts + 1 : existing.attempts,
    };
    this.enqueueWorkflowTask(next);
    return next;
  }

  enqueueOutboxMessage(message: OutboxMessage): void {
    this.db
      .prepare(
        `
        INSERT INTO kernel_outbox_messages (id, topic, payload_json, created_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          topic = excluded.topic,
          payload_json = excluded.payload_json,
          created_at = excluded.created_at
      `,
      )
      .run(message.id, message.topic, JSON.stringify(message.payload), message.createdAt);
  }

  listOutboxMessages(topic?: string): OutboxMessage[] {
    const rows = this.db
      .prepare(
        `
        SELECT id, topic, payload_json, created_at
        FROM kernel_outbox_messages
        WHERE (? IS NULL OR topic = ?)
        ORDER BY created_at ASC, id ASC
      `,
      )
      .all(topic ?? null, topic ?? null) as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      id: String(row.id),
      topic: String(row.topic),
      payload: parseJson(String(row.payload_json)),
      createdAt: String(row.created_at),
    }));
  }

  deleteOutboxMessage(id: string): void {
    this.db.prepare("DELETE FROM kernel_outbox_messages WHERE id = ?").run(id);
  }

  drainOutboxMessages(topic?: string): OutboxMessage[] {
    const messages = this.listOutboxMessages(topic);
    const tx = this.db.transaction(() => {
      for (const message of messages) {
        this.deleteOutboxMessage(message.id);
      }
    });
    tx();
    return messages;
  }

  close(): void {
    this.db.close(false);
  }
}

export interface KernelRuntime {
  store: KernelStore;
  unitOfWork: UnitOfWork;
  workflows: WorkflowEngine;
  outbox: Outbox;
  commands: CommandBus;
  queries: QueryBus;
  scheduler: JobScheduler;
  close(): void;
}

export function createKernelRuntime(store: KernelStore = new InMemoryKernelStore()): KernelRuntime {
  const workflows = new WorkflowEngine(store);
  const outbox = new Outbox(store);
  const context = {
    unitOfWork: new ImmediateUnitOfWork(),
    workflows,
    outbox,
  };
  return {
    store,
    unitOfWork: context.unitOfWork,
    workflows,
    outbox,
    commands: new CommandBus(context, new IdempotencyStore(store)),
    queries: new QueryBus(context),
    scheduler: new JobScheduler(workflows),
    close() {
      store.close?.();
    },
  };
}
