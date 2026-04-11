export interface RelayDeviceRecord {
  deviceId: string;
  label: string;
  pairedAt: number;
  revokedAt?: number | null;
}

export interface RelayAttachmentRequest {
  deviceId: string;
  sessionId: string;
  connectorType?: string | null;
}

export interface RelayApprovalResponse {
  deviceId: string;
  sessionId: string;
  toolCallId: string;
  approved: boolean;
}
