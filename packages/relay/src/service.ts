import type { RelayApprovalResponse, RelayAttachmentRequest, RelayDeviceRecord } from "./types.js";

export class RelayService {
  private readonly devices = new Map<string, RelayDeviceRecord>();

  registerDevice(record: RelayDeviceRecord): void {
    this.devices.set(record.deviceId, record);
  }

  revokeDevice(deviceId: string, revokedAt = Date.now()): RelayDeviceRecord {
    const existing = this.devices.get(deviceId);
    if (!existing) {
      throw new Error(`Device not found: ${deviceId}`);
    }
    const updated = { ...existing, revokedAt };
    this.devices.set(deviceId, updated);
    return updated;
  }

  listDevices(): RelayDeviceRecord[] {
    return Array.from(this.devices.values()).sort((a, b) => b.pairedAt - a.pairedAt);
  }

  canAttach(request: RelayAttachmentRequest): boolean {
    const device = this.devices.get(request.deviceId);
    return Boolean(device && !device.revokedAt && request.sessionId);
  }

  canRespondToApproval(response: RelayApprovalResponse): boolean {
    const device = this.devices.get(response.deviceId);
    return Boolean(device && !device.revokedAt && response.sessionId && response.toolCallId);
  }
}
