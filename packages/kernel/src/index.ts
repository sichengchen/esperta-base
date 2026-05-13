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

export class IdempotencyStore<TResult = unknown> {
  private readonly results = new Map<string, TResult>();

  get(key: string): TResult | undefined {
    return this.results.get(key);
  }

  set(key: string, result: TResult): void {
    this.results.set(key, result);
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
  private readonly tasks = new Map<string, WorkflowTask>();

  enqueue(task: Omit<WorkflowTask, "status" | "attempts">): WorkflowTask {
    const record: WorkflowTask = { ...task, status: "pending", attempts: 0 };
    this.tasks.set(record.id, record);
    return record;
  }

  list(status?: WorkflowTask["status"]): WorkflowTask[] {
    return [...this.tasks.values()].filter((task) => !status || task.status === status);
  }

  mark(id: string, status: WorkflowTask["status"]): WorkflowTask | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    const next = {
      ...task,
      status,
      attempts: status === "running" ? task.attempts + 1 : task.attempts,
    };
    this.tasks.set(id, next);
    return next;
  }
}

export interface OutboxMessage<TPayload = unknown> {
  id: string;
  topic: string;
  payload: TPayload;
  createdAt: string;
}

export class Outbox {
  private readonly messages: OutboxMessage[] = [];

  enqueue(message: OutboxMessage): void {
    this.messages.push(message);
  }

  drain(): OutboxMessage[] {
    return this.messages.splice(0);
  }
}

export class JobScheduler {
  constructor(private readonly workflows: WorkflowEngine) {}

  schedule(task: Omit<WorkflowTask, "status" | "attempts">): WorkflowTask {
    return this.workflows.enqueue(task);
  }
}
