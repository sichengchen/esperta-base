import { writeFile } from "node:fs/promises";
import { join } from "node:path";

/** A scheduled task definition */
export interface ScheduledTask {
  name: string;
  /** Cron expression: "minute hour day month weekday" (5 fields) */
  schedule: string;
  /** Handler to execute */
  handler: () => Promise<void> | void;
  /** Whether this is a built-in task (cannot be removed via API) */
  builtin?: boolean;
  /** Optional prompt to send to agent (for user-defined tasks) */
  prompt?: string;
}

interface RegisteredTask extends ScheduledTask {
  lastRun: number;
}

/** Parse a cron field value (supports *, numbers, and */N step) */
function matchesCronField(field: string, value: number): boolean {
  if (field === "*") return true;

  // Step syntax: */5 means every 5
  if (field.startsWith("*/")) {
    const step = parseInt(field.slice(2), 10);
    if (isNaN(step) || step <= 0) return false;
    return value % step === 0;
  }

  // Comma-separated values: 1,15,30
  const parts = field.split(",");
  return parts.some((p) => parseInt(p.trim(), 10) === value);
}

/** Check if a cron expression matches a given date */
export function matchesCron(expression: string, date: Date): boolean {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) return false;

  const [minute, hour, day, month, weekday] = fields as [string, string, string, string, string];

  return (
    matchesCronField(minute, date.getMinutes()) &&
    matchesCronField(hour, date.getHours()) &&
    matchesCronField(day, date.getDate()) &&
    matchesCronField(month, date.getMonth() + 1) &&
    matchesCronField(weekday, date.getDay())
  );
}

/** Lightweight interval-based cron scheduler */
export class Scheduler {
  private tasks = new Map<string, RegisteredTask>();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private readonly checkIntervalMs: number;

  constructor(checkIntervalMs = 60_000) {
    this.checkIntervalMs = checkIntervalMs;
  }

  /** Register a recurring task */
  register(task: ScheduledTask): void {
    this.tasks.set(task.name, { ...task, lastRun: 0 });
  }

  /** Remove a task by name (cannot remove built-in tasks) */
  unregister(name: string): boolean {
    const task = this.tasks.get(name);
    if (!task) return false;
    if (task.builtin) return false;
    this.tasks.delete(name);
    return true;
  }

  /** List all registered tasks */
  list(): Array<{ name: string; schedule: string; builtin: boolean; prompt?: string }> {
    return Array.from(this.tasks.values()).map((t) => ({
      name: t.name,
      schedule: t.schedule,
      builtin: t.builtin ?? false,
      prompt: t.prompt,
    }));
  }

  /** Start the scheduler — checks every minute */
  start(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.tick(), this.checkIntervalMs);
  }

  /** Stop the scheduler */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /** Manual tick — check and run matching tasks */
  async tick(): Promise<void> {
    const now = new Date();
    const nowMinute = Math.floor(now.getTime() / 60_000);

    for (const task of this.tasks.values()) {
      // Skip if already ran this minute
      if (task.lastRun === nowMinute) continue;

      if (matchesCron(task.schedule, now)) {
        task.lastRun = nowMinute;
        try {
          await task.handler();
        } catch (err) {
          console.error(`[scheduler] Task "${task.name}" failed:`, err);
        }
      }
    }
  }

  get size(): number {
    return this.tasks.size;
  }
}

// --- Built-in tasks ---

/** Create heartbeat task: writes timestamp to engine.heartbeat */
export function createHeartbeatTask(saHome: string): ScheduledTask {
  return {
    name: "heartbeat",
    schedule: "*/5 * * * *",
    builtin: true,
    async handler() {
      const heartbeatFile = join(saHome, "engine.heartbeat");
      const data = JSON.stringify({
        timestamp: new Date().toISOString(),
        pid: process.pid,
        memory: process.memoryUsage().heapUsed,
      });
      await writeFile(heartbeatFile, data + "\n");
    },
  };
}
