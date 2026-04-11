export interface RelayDeviceRecord {
  deviceId: string;
  label: string;
  pairedAt: number;
  pairingToken?: string | null;
  lastSeenAt?: number | null;
  metadataJson?: string | null;
  revokedAt?: number | null;
}

export interface RelaySessionAttachmentRecord {
  attachmentId: string;
  deviceId: string;
  sessionId: string;
  attachedAt: number;
  detachedAt?: number | null;
  canSendMessages: boolean;
  canRespondToApprovals: boolean;
}

export type RelayQueuedEventType = "follow_up" | "approval_response";

export interface RelayQueuedEventRecord {
  eventId: string;
  deviceId: string;
  sessionId: string;
  type: RelayQueuedEventType;
  payloadJson: string;
  createdAt: number;
  deliveredAt?: number | null;
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

export interface RelayFollowUpMessage {
  deviceId: string;
  sessionId: string;
  message: string;
}
