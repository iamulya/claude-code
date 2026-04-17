/**
 * L3-01: Session Persistence — Lifecycle & Durability
 *
 * Validates that session state survives write, reload, concurrent access,
 * compaction, and (importantly) that encryption is correctly applied
 * throughout the full session lifecycle including compact().
 *
 * Bug #10 regression: compact() was writing plaintext records even when
 * the session had an encryptionKey, creating mixed plaintext/ciphertext files.
 */

import { describe, it, expect, afterEach } from "vitest";
import { Session } from "../../../session.js";
import { createTestDir } from "../_fixtures/helpers.js";
import { readFile } from "node:fs/promises";
import type { ChatMessage } from "../../../agents/runner.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

let cleanups: Array<() => void> = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups = [];
});

function tmpDir() {
  const t = createTestDir("l3-session-");
  cleanups.push(t.cleanup);
  return t.dir;
}

const MSG_USER: ChatMessage = { role: "user", content: "Hello" };
const MSG_ASST: ChatMessage = { role: "assistant", content: "Hi there!" };
const MSG_USER2: ChatMessage = { role: "user", content: "What is 2+2?" };
const MSG_ASST2: ChatMessage = { role: "assistant", content: "4" };

describe("L3-01: Session Persistence", () => {
  // ── Basic Roundtrip ─────────────────────────────────────────────────────────

  it("writes messages and reads them back identically", async () => {
    const dir = tmpDir();
    const id = "roundtrip-test";

    // Create and populate
    const session = (await Session.createAsync(id, dir)) as Session;
    await session.append([MSG_USER, MSG_ASST]);

    // Resume in a new instance
    const resumed = (await Session.resume(id, dir)) as Session;
    const msgs = resumed.getMessages();

    expect(msgs).toHaveLength(2);
    expect(msgs[0]!.role).toBe("user");
    expect(msgs[0]!.content).toBe("Hello");
    expect(msgs[1]!.role).toBe("assistant");
    expect(msgs[1]!.content).toBe("Hi there!");
  });

  it("preserves message order across 100 messages", async () => {
    const dir = tmpDir();
    const id = "order-test";

    const session = (await Session.createAsync(id, dir)) as Session;
    const messages: ChatMessage[] = [];
    for (let i = 0; i < 100; i++) {
      messages.push({ role: i % 2 === 0 ? "user" : "assistant", content: `msg-${i}` });
    }
    await session.append(messages);

    const resumed = (await Session.resume(id, dir)) as Session;
    const loaded = resumed.getMessages();
    expect(loaded).toHaveLength(100);
    for (let i = 0; i < 100; i++) {
      expect(loaded[i]!.content).toBe(`msg-${i}`);
    }
  });

  // ── Session Ownership ───────────────────────────────────────────────────────

  it("persists owner binding across resume", async () => {
    const dir = tmpDir();
    const id = "owner-test";

    const session = (await Session.createAsync(id, dir)) as Session;
    session.bind("user-alice");
    await session.append([MSG_USER]);

    const resumed = (await Session.resume(id, dir)) as Session;
    expect(resumed.owner).toBe("user-alice");
    expect(resumed.canAccess("user-alice")).toBe(true);
    expect(resumed.canAccess("user-bob")).toBe(false);
  });

  // ── HMAC Integrity ──────────────────────────────────────────────────────────

  it("verifies HMAC on resume — tampered files are rejected", async () => {
    const dir = tmpDir();
    const id = "hmac-test";
    const secret = "test-hmac-secret";

    const session = (await Session.createAsync(id, dir, undefined, secret)) as Session;
    await session.append([MSG_USER]);

    // Tamper: read the file and modify the message content while keeping valid JSON
    const filePath = session.filePath;
    let raw = await readFile(filePath, "utf8");
    const lines = raw.split("\n").filter(Boolean);
    // Find the message line (last line) and parse it
    const lastLine = lines[lines.length - 1]!;
    const record = JSON.parse(lastLine);
    // Tamper with the message content but keep the old HMAC
    record.message.content = "TAMPERED CONTENT";
    lines[lines.length - 1] = JSON.stringify(record);
    const { writeFile: wf } = await import("node:fs/promises");
    await wf(filePath, lines.join("\n") + "\n", "utf8");

    // Resume should throw due to HMAC mismatch
    await expect(Session.resume(id, dir, undefined, secret)).rejects.toThrow(/HMAC|tamper/i);
  });

  // ── Encryption ──────────────────────────────────────────────────────────────

  it("encrypts all lines when encryptionKey is set", async () => {
    const dir = tmpDir();
    const id = "encrypt-test";
    const key = "my-secret-encryption-key-for-test";

    const session = (await Session.createAsync(id, dir, undefined, undefined, key)) as Session;
    await session.append([MSG_USER, MSG_ASST]);

    // Read raw file — all lines should start with ENC.
    const raw = await readFile(session.filePath, "utf8");
    const lines = raw.split("\n").filter(Boolean);
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line.startsWith("ENC.")).toBe(true);
    }

    // Resume with the same key should work
    const resumed = (await Session.resume(id, dir, undefined, undefined, key)) as Session;
    expect(resumed.getMessages()).toHaveLength(2);
    expect(resumed.getMessages()[0]!.content).toBe("Hello");
  });

  it("resume with wrong encryptionKey throws", async () => {
    const dir = tmpDir();
    const id = "wrong-key-test";

    const session = (await Session.createAsync(
      id,
      dir,
      undefined,
      undefined,
      "correct-key",
    )) as Session;
    await session.append([MSG_USER]);

    await expect(
      Session.resume(id, dir, undefined, undefined, "wrong-key"),
    ).rejects.toThrow(/decrypt|wrong.*key|tampered/i);
  });

  // ── Compaction ──────────────────────────────────────────────────────────────

  it("compact() preserves session continuity", async () => {
    const dir = tmpDir();
    const id = "compact-test";

    const session = (await Session.createAsync(id, dir)) as Session;
    await session.append([MSG_USER, MSG_ASST, MSG_USER2, MSG_ASST2]);
    expect(session.messageCount).toBe(4);

    // Compact
    await session.compact("Summary: User asked greeting and math question.");

    // In-memory state should be reset to 1 summary message
    expect(session.messageCount).toBe(1);
    expect(session.getMessages()[0]!.content).toContain("Summary:");

    // Resume should see the compact state
    const resumed = (await Session.resume(id, dir)) as Session;
    expect(resumed.messageCount).toBe(1);
    expect(resumed.getMessages()[0]!.content).toContain("Summary:");
  });

  it("Bug #10 regression: compact() encrypts records when encryptionKey is set", async () => {
    const dir = tmpDir();
    const id = "compact-encrypt-test";
    const key = "compact-encryption-key-test-12345";

    const session = (await Session.createAsync(id, dir, undefined, undefined, key)) as Session;
    await session.append([MSG_USER, MSG_ASST]);
    await session.compact("Encrypted compact summary.");

    // Read raw file — ALL lines (including compact records) must be encrypted
    const raw = await readFile(session.filePath, "utf8");
    const lines = raw.split("\n").filter(Boolean);
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line.startsWith("ENC.")).toBe(true);
    }

    // Verify we can resume and read the compacted data
    const resumed = (await Session.resume(id, dir, undefined, undefined, key)) as Session;
    expect(resumed.messageCount).toBe(1);
    expect(resumed.getMessages()[0]!.content).toContain("Encrypted compact summary");
  });

  // ── Concurrent Writes ───────────────────────────────────────────────────────

  it("concurrent appends do not corrupt the file", async () => {
    const dir = tmpDir();
    const id = "concurrent-test";

    const session = (await Session.createAsync(id, dir)) as Session;

    // Fire 10 concurrent appends
    const promises = Array.from({ length: 10 }, (_, i) =>
      session.append([{ role: "user", content: `concurrent-msg-${i}` }]),
    );
    await Promise.all(promises);

    // Resume and verify all messages are present
    const resumed = (await Session.resume(id, dir)) as Session;
    expect(resumed.messageCount).toBe(10);

    // All messages should be present (order may vary due to concurrent scheduling)
    const contents = resumed.getMessages().map((m) => m.content);
    for (let i = 0; i < 10; i++) {
      expect(contents).toContain(`concurrent-msg-${i}`);
    }
  });

  // ── Large Sessions ──────────────────────────────────────────────────────────

  it("write/read 1000 messages in < 2000ms", async () => {
    const dir = tmpDir();
    const id = "perf-test";

    const messages: ChatMessage[] = Array.from({ length: 1000 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: `Message number ${i}: ${"x".repeat(50)}`,
    }));

    const t0 = Date.now();
    const session = (await Session.createAsync(id, dir)) as Session;
    await session.append(messages);

    const resumed = (await Session.resume(id, dir)) as Session;
    const elapsed = Date.now() - t0;

    expect(resumed.messageCount).toBe(1000);
    expect(elapsed).toBeLessThan(2000);
  });

  // ── Delete ──────────────────────────────────────────────────────────────────

  it("delete() removes the session file", async () => {
    const dir = tmpDir();
    const id = "delete-test";

    const session = (await Session.createAsync(id, dir)) as Session;
    await session.append([MSG_USER]);
    await session.delete();

    // Resume should fail with ENOENT
    await expect(Session.resume(id, dir)).rejects.toThrow(/not found/i);
  });

  // ── resumeOrCreate ──────────────────────────────────────────────────────────

  it("resumeOrCreate creates when session does not exist", async () => {
    const dir = tmpDir();
    const id = "resume-or-create-test";

    const session = (await Session.resumeOrCreate(id, dir)) as Session;
    await session.append([MSG_USER]);

    const resumed = (await Session.resume(id, dir)) as Session;
    expect(resumed.messageCount).toBe(1);
  });
});
