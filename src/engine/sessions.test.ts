import { describe, it, expect, beforeEach } from "bun:test";
import { SessionManager } from "./sessions.js";

describe("SessionManager", () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = new SessionManager();
  });

  describe("destroySession()", () => {
    it("returns true and removes an existing session", () => {
      const session = manager.create("tui", "tui");
      expect(manager.destroySession(session.id)).toBe(true);
      expect(manager.getSession(session.id)).toBeUndefined();
    });

    it("returns false for a non-existent session", () => {
      expect(manager.destroySession("nonexistent:id")).toBe(false);
    });

    it("prevents double-destroy", () => {
      const session = manager.create("tui", "tui");
      expect(manager.destroySession(session.id)).toBe(true);
      expect(manager.destroySession(session.id)).toBe(false);
    });
  });

  describe("create()", () => {
    it("stores sessions retrievable by ID", () => {
      const session = manager.create("tui", "tui");
      expect(manager.getSession(session.id)).toBe(session);
    });

    it("sets connectorType and connectorId", () => {
      const session = manager.create("telegram:789", "telegram");
      expect(session.connectorType).toBe("telegram");
      expect(session.connectorId).toBe("telegram:789");
    });
  });

  describe("listSessions()", () => {
    it("returns all active sessions", () => {
      manager.create("tui", "tui");
      manager.create("telegram:123", "telegram");
      expect(manager.listSessions()).toHaveLength(2);
    });

    it("excludes destroyed sessions", () => {
      const s1 = manager.create("tui", "tui");
      manager.create("telegram:123", "telegram");
      manager.destroySession(s1.id);
      expect(manager.listSessions()).toHaveLength(1);
    });
  });

  describe("touchSession()", () => {
    it("updates lastActiveAt timestamp", async () => {
      const session = manager.create("tui", "tui");
      const before = session.lastActiveAt;
      await new Promise((r) => setTimeout(r, 10));
      manager.touchSession(session.id);
      expect(session.lastActiveAt).toBeGreaterThan(before);
    });
  });
});
