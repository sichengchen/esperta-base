import { randomUUID } from "node:crypto";
import { RelayStore } from "./store.js";
import type {
  RelayApprovalResponse,
  RelayAttachmentRequest,
  RelayDeviceRecord,
  RelayFollowUpMessage,
  RelayQueuedEventRecord,
  RelaySessionAttachmentRecord,
} from "./types.js";

export class RelayService {
  constructor(private readonly store: RelayStore) {}

  async registerDevice(record: Omit<RelayDeviceRecord, "pairingToken"> & { pairingToken?: string | null }): Promise<RelayDeviceRecord> {
    const state = await this.store.load();
    const next: RelayDeviceRecord = {
      ...record,
      pairingToken: record.pairingToken ?? randomUUID(),
    };
    const existing = state.devices.findIndex((device) => device.deviceId === record.deviceId);
    if (existing >= 0) {
      state.devices[existing] = next;
    } else {
      state.devices.push(next);
    }
    await this.store.save(state);
    return next;
  }

  async revokeDevice(deviceId: string, revokedAt = Date.now()): Promise<RelayDeviceRecord> {
    const state = await this.store.load();
    const existing = state.devices.find((device) => device.deviceId === deviceId);
    if (!existing) {
      throw new Error(`Device not found: ${deviceId}`);
    }
    const updated = { ...existing, revokedAt };
    state.devices = state.devices.map((device) => device.deviceId === deviceId ? updated : device);
    await this.store.save(state);
    return updated;
  }

  async listDevices(): Promise<RelayDeviceRecord[]> {
    const state = await this.store.load();
    return [...state.devices].sort((a, b) => b.pairedAt - a.pairedAt);
  }

  async attachSession(
    request: RelayAttachmentRequest,
    options: { canSendMessages?: boolean; canRespondToApprovals?: boolean } = {},
    attachedAt = Date.now(),
  ): Promise<RelaySessionAttachmentRecord> {
    const state = await this.store.load();
    const device = state.devices.find((entry) => entry.deviceId === request.deviceId);
    if (!device || device.revokedAt) {
      throw new Error(`Device not found or revoked: ${request.deviceId}`);
    }

    const existing = state.attachments.find((attachment) =>
      attachment.deviceId === request.deviceId &&
      attachment.sessionId === request.sessionId &&
      !attachment.detachedAt,
    );

    const attachment: RelaySessionAttachmentRecord = existing ?? {
      attachmentId: randomUUID(),
      deviceId: request.deviceId,
      sessionId: request.sessionId,
      attachedAt,
      detachedAt: null,
      canSendMessages: options.canSendMessages ?? true,
      canRespondToApprovals: options.canRespondToApprovals ?? true,
    };

    state.attachments = existing
      ? state.attachments.map((entry) => entry.attachmentId === attachment.attachmentId ? attachment : entry)
      : [...state.attachments, attachment];
    await this.store.save(state);
    return attachment;
  }

  async detachSession(deviceId: string, sessionId: string, detachedAt = Date.now()): Promise<RelaySessionAttachmentRecord | null> {
    const state = await this.store.load();
    const existing = state.attachments.find((attachment) =>
      attachment.deviceId === deviceId &&
      attachment.sessionId === sessionId &&
      !attachment.detachedAt,
    );
    if (!existing) {
      return null;
    }

    const updated = { ...existing, detachedAt };
    state.attachments = state.attachments.map((attachment) =>
      attachment.attachmentId === updated.attachmentId ? updated : attachment,
    );
    await this.store.save(state);
    return updated;
  }

  async listAttachments(deviceId?: string): Promise<RelaySessionAttachmentRecord[]> {
    const state = await this.store.load();
    return state.attachments
      .filter((attachment) => !deviceId || attachment.deviceId === deviceId)
      .sort((a, b) => b.attachedAt - a.attachedAt);
  }

  async queueFollowUp(message: RelayFollowUpMessage, createdAt = Date.now()): Promise<RelayQueuedEventRecord> {
    if (!(await this.canAttach({ deviceId: message.deviceId, sessionId: message.sessionId }))) {
      throw new Error(`Device ${message.deviceId} is not attached to session ${message.sessionId}`);
    }

    const state = await this.store.load();
    const event: RelayQueuedEventRecord = {
      eventId: randomUUID(),
      deviceId: message.deviceId,
      sessionId: message.sessionId,
      type: "follow_up",
      payloadJson: JSON.stringify({ message: message.message }),
      createdAt,
      deliveredAt: null,
    };
    state.events.push(event);
    await this.store.save(state);
    return event;
  }

  async queueApprovalResponse(response: RelayApprovalResponse, createdAt = Date.now()): Promise<RelayQueuedEventRecord> {
    if (!(await this.canRespondToApproval(response))) {
      throw new Error(`Device ${response.deviceId} cannot respond to approvals for session ${response.sessionId}`);
    }

    const state = await this.store.load();
    const event: RelayQueuedEventRecord = {
      eventId: randomUUID(),
      deviceId: response.deviceId,
      sessionId: response.sessionId,
      type: "approval_response",
      payloadJson: JSON.stringify({
        toolCallId: response.toolCallId,
        approved: response.approved,
      }),
      createdAt,
      deliveredAt: null,
    };
    state.events.push(event);
    await this.store.save(state);
    return event;
  }

  async listEvents(deviceId?: string, includeDelivered = true): Promise<RelayQueuedEventRecord[]> {
    const state = await this.store.load();
    return state.events
      .filter((event) => !deviceId || event.deviceId === deviceId)
      .filter((event) => includeDelivered || !event.deliveredAt)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  async markDelivered(eventId: string, deliveredAt = Date.now()): Promise<RelayQueuedEventRecord> {
    const state = await this.store.load();
    const existing = state.events.find((event) => event.eventId === eventId);
    if (!existing) {
      throw new Error(`Relay event not found: ${eventId}`);
    }
    const updated = { ...existing, deliveredAt };
    state.events = state.events.map((event) => event.eventId === eventId ? updated : event);
    await this.store.save(state);
    return updated;
  }

  async canAttach(request: RelayAttachmentRequest): Promise<boolean> {
    const state = await this.store.load();
    const device = state.devices.find((entry) => entry.deviceId === request.deviceId);
    return Boolean(device && !device.revokedAt && request.sessionId);
  }

  async canRespondToApproval(response: RelayApprovalResponse): Promise<boolean> {
    const state = await this.store.load();
    const device = state.devices.find((entry) => entry.deviceId === response.deviceId);
    if (!device || device.revokedAt || !response.sessionId || !response.toolCallId) {
      return false;
    }

    return state.attachments.some((attachment) =>
      attachment.deviceId === response.deviceId &&
      attachment.sessionId === response.sessionId &&
      !attachment.detachedAt &&
      attachment.canRespondToApprovals,
    );
  }
}
