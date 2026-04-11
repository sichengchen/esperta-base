import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { RelayService } from "../packages/relay/src/service.js";
import { RelayStore } from "../packages/relay/src/store.js";

async function createRelayService(): Promise<RelayService> {
  const dir = await mkdtemp(join(tmpdir(), "aria-relay-"));
  return new RelayService(new RelayStore(join(dir, "relay-state.json")));
}

describe("RelayService", () => {
  test("persists devices, attachments, and queued events", async () => {
    const relay = await createRelayService();

    const device = await relay.registerDevice({
      deviceId: "device-1",
      label: "Phone",
      pairedAt: Date.now(),
      revokedAt: null,
    });
    expect(device.pairingToken).toBeString();

    const attachment = await relay.attachSession({
      deviceId: "device-1",
      sessionId: "session-1",
    });
    expect(attachment.sessionId).toBe("session-1");

    const followUp = await relay.queueFollowUp({
      deviceId: "device-1",
      sessionId: "session-1",
      message: "Continue the work.",
    });
    const approval = await relay.queueApprovalResponse({
      deviceId: "device-1",
      sessionId: "session-1",
      toolCallId: "tool-1",
      approved: true,
    });

    expect(followUp.type).toBe("follow_up");
    expect(approval.type).toBe("approval_response");
    expect((await relay.listEvents("device-1", false))).toHaveLength(2);

    await relay.markDelivered(followUp.eventId);
    expect((await relay.listEvents("device-1", false))).toHaveLength(1);

    await relay.detachSession("device-1", "session-1");
    expect(await relay.canRespondToApproval({
      deviceId: "device-1",
      sessionId: "session-1",
      toolCallId: "tool-1",
      approved: true,
    })).toBe(false);
  });
});
