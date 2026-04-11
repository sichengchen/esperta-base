import type { HandoffRecord, HandoffSubmission } from "./types.js";
import { HandoffStore } from "./store.js";

export class HandoffService {
  constructor(private readonly store: HandoffStore) {}

  async init(): Promise<void> {
    await this.store.init();
  }

  close(): void {
    this.store.close();
  }

  submit(handoffId: string, submission: HandoffSubmission, now = Date.now()): HandoffRecord {
    const existing = this.store.getByIdempotencyKey(submission.idempotencyKey);
    if (existing) {
      return existing;
    }

    const record: HandoffRecord = {
      handoffId,
      idempotencyKey: submission.idempotencyKey,
      sourceKind: submission.sourceKind,
      sourceSessionId: submission.sourceSessionId ?? null,
      projectId: submission.projectId,
      taskId: submission.taskId ?? null,
      threadId: submission.threadId ?? null,
      createdDispatchId: null,
      status: "pending",
      payloadJson: submission.payloadJson ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.store.upsert(record);
    return record;
  }

  attachDispatch(handoffId: string, dispatchId: string, now = Date.now()): HandoffRecord {
    const existing = this.store.list().find((record) => record.handoffId === handoffId);
    if (!existing) {
      throw new Error(`Handoff not found: ${handoffId}`);
    }
    const updated: HandoffRecord = {
      ...existing,
      createdDispatchId: dispatchId,
      status: "dispatch_created",
      updatedAt: now,
    };
    this.store.upsert(updated);
    return updated;
  }
}
