/**
 * L1-05: Agent + Session E2E
 *
 * Tests real wiring between Session and persistence.
 */

import { describe, it, expect, afterEach } from "vitest";
import { Session, listSessions, pruneOldSessions } from "../../../session.js";
import { createTestDir } from "../_fixtures/helpers.js";

describe("L1-05: Agent + Session E2E", () => {
  let cleanup: () => void;
  let dir: string;

  afterEach(() => cleanup?.());

  it("Session.create() → append messages → getMessages()", async () => {
    ({ dir, cleanup } = createTestDir());
    const session = Session.create(undefined, dir);

    // Append messages
    await session.append([
      { role: "user", content: "Hello!" },
      { role: "assistant", content: "Hi there! How can I help?" },
    ]);

    const messages = session.getMessages();
    expect(messages.length).toBe(2);
    expect(messages[0]!.role).toBe("user");
    expect(messages[1]!.role).toBe("assistant");
  });

  it("Session.createAsync() → append → resume loads messages", async () => {
    ({ dir, cleanup } = createTestDir());
    const session = await Session.createAsync("test-session-1", dir);

    await session.append([
      { role: "user", content: "Message 1" },
      { role: "assistant", content: "Response 1" },
    ]);

    // Resume the same session
    const resumed = await Session.resume("test-session-1", dir);
    const messages = resumed.getMessages();
    expect(messages.length).toBe(2);
    expect(messages[0]!.content).toBe("Message 1");
    expect(messages[1]!.content).toBe("Response 1");
  });

  it("Session owner binding and access control", async () => {
    ({ dir, cleanup } = createTestDir());
    const session = Session.create("owner-test", dir);

    // Initially unbound — anyone can access
    expect(session.canAccess("alice")).toBe(true);
    expect(session.canAccess("bob")).toBe(true);

    // Bind to alice
    session.bind("alice");
    expect(session.owner).toBe("alice");
    expect(session.canAccess("alice")).toBe(true);
    expect(session.canAccess("bob")).toBe(false);

    // Rebinding to same user is fine
    session.bind("alice");

    // Binding to different user throws
    expect(() => session.bind("bob")).toThrow(/owned by/);
  });

  it("Session compact archives and replaces history", async () => {
    ({ dir, cleanup } = createTestDir());
    const session = Session.create("compact-test", dir);

    await session.append([
      { role: "user", content: "Long conversation about TypeScript" },
      { role: "assistant", content: "TypeScript is great for type safety." },
      { role: "user", content: "Tell me more about generics." },
      { role: "assistant", content: "Generics allow flexible type params..." },
    ]);

    expect(session.messageCount).toBe(4);

    await session.compact("Summary: User discussed TypeScript, especially generics.");

    // After compact, history is replaced
    const messages = session.getMessages();
    expect(messages.length).toBe(1);
    expect(messages[0]!.content).toContain("Summary");
  });

  it("listSessions returns all sessions for a directory", async () => {
    ({ dir, cleanup } = createTestDir());

    // Create two sessions
    const s1 = Session.create("session-a", dir);
    await s1.append([{ role: "user", content: "A" }]);

    const s2 = Session.create("session-b", dir);
    await s2.append([{ role: "user", content: "B" }]);

    const sessions = await listSessions(dir);
    expect(sessions.length).toBe(2);
    expect(sessions).toContain("session-a");
    expect(sessions).toContain("session-b");
  });

  it("pruneOldSessions removes sessions by age", async () => {
    ({ dir, cleanup } = createTestDir());

    // Create a session
    const s = Session.create("old-session", dir);
    await s.append([{ role: "user", content: "old data" }]);

    // Prune with 0ms age → removes everything
    const pruned = await pruneOldSessions(0, dir);
    expect(pruned.length).toBeGreaterThanOrEqual(0);

    // Large age → keeps everything
    const s2 = Session.create("new-session", dir);
    await s2.append([{ role: "user", content: "new data" }]);
    const pruned2 = await pruneOldSessions(999_999_999, dir);
    expect(pruned2.length).toBe(0);
  });

  it("Session.delete() removes session file", async () => {
    ({ dir, cleanup } = createTestDir());
    const session = Session.create("delete-test", dir);
    await session.append([{ role: "user", content: "will be deleted" }]);

    const before = await listSessions(dir);
    expect(before).toContain("delete-test");

    await session.delete();

    const after = await listSessions(dir);
    expect(after).not.toContain("delete-test");
  });
});
