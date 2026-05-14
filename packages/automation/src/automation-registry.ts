import type { EngineRuntime } from "@aria/node-runtime/runtime";
import type { CronTask, WebhookTask } from "./config.js";
import {
  registerCronTask,
  upsertCronTaskRecord,
  upsertHeartbeatTaskRecord,
  upsertWebhookTaskRecord,
} from "./automation.js";

export class AutomationRegistry {
  constructor(private readonly runtime: EngineRuntime) {}

  async syncHeartbeatDefinition(input: {
    enabled: boolean;
    intervalMinutes: number;
    nextRunAt?: string | null;
    lastRunAt?: string | null;
    lastStatus?: "success" | "error" | null;
    lastSummary?: string | null;
  }): Promise<void> {
    await upsertHeartbeatTaskRecord(this.runtime, input);
  }

  async syncCronDefinition(task: CronTask): Promise<void> {
    await upsertCronTaskRecord(this.runtime, task);
    if (task.enabled) {
      registerCronTask(this.runtime, task);
    }
  }

  async syncWebhookDefinition(task: WebhookTask): Promise<void> {
    await upsertWebhookTaskRecord(this.runtime, task);
  }

  async restoreFromRuntimeConfig(): Promise<void> {
    const config = this.runtime.config.getConfigFile();
    const heartbeatTask = this.runtime.scheduler.list().find((task) => task.name === "heartbeat");
    await this.syncHeartbeatDefinition({
      enabled: config.runtime.heartbeat?.enabled ?? true,
      intervalMinutes: config.runtime.heartbeat?.intervalMinutes ?? 30,
      nextRunAt: heartbeatTask?.nextRunAt ?? null,
    });

    for (const task of config.runtime.automation?.cronTasks ?? []) {
      await this.syncCronDefinition(task);
    }

    for (const task of config.runtime.automation?.webhookTasks ?? []) {
      await this.syncWebhookDefinition(task);
    }
  }
}
