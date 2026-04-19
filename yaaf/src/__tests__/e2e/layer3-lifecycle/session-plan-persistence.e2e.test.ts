/**
 * Session Plan Persistence Tests
 *
 * Tests for the new session.setPlan() / session.getPlan() API:
 *   - setPlan() stores a plan as a { type: "plan" } JSONL record
 *   - getPlan() returns the most-recently-set plan
 *   - Plan survives compact() (re-written into the compact file)
 *   - Plan is restored on Session.resume() (loaded from JSONL)
 *   - Multiple setPlan() calls: last one wins
 *   - AdapterBridgeSession: in-memory plan storage
 *   - Encryption compatibility: plan record encrypted at rest
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as os from "os";
import * as path from "path";
import * as fsp from "fs/promises";
import { Session, type SessionLike } from "../../../session.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function makeTmpDir(): Promise<string> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "yaaf-session-plan-"));
  return dir;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Session plan persistence", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await makeTmpDir();
  });

  afterEach(async () => {
    await fsp.rm(tmpDir, { recursive: true, force: true });
  });

  // ─── setPlan / getPlan ────────────────────────────────────────────────────

  it("getPlan() returns null before any plan is set", async () => {
    const session = await Session.createAsync("no-plan", tmpDir);
    expect((session as SessionLike).getPlan()).toBeNull();
  });

  it("setPlan() + getPlan() round-trip in-memory", async () => {
    const session = await Session.createAsync("in-memory-plan", tmpDir);
    const s = session as SessionLike;
    await s.setPlan("1. Do A\n2. Do B\n3. Done");
    expect(s.getPlan()).toBe("1. Do A\n2. Do B\n3. Done");
  });

  it("multiple setPlan() calls: last one wins", async () => {
    const session = await Session.createAsync("multi-plan", tmpDir);
    const s = session as SessionLike;
    await s.setPlan("Plan v1");
    await s.setPlan("Plan v2");
    await s.setPlan("Plan v3");
    expect(s.getPlan()).toBe("Plan v3");
  });

  // ─── Persistence (resume) ─────────────────────────────────────────────────

  it("plan is persisted to JSONL and restored on resume()", async () => {
    const id = "persist-plan";
    const planText = "1. Search\n2. Read files\n3. Write patch\n4. Run tests";

    // First session: set plan, then exit
    const s1 = await Session.createAsync(id, tmpDir);
    await (s1 as SessionLike).setPlan(planText);
    // Append at least one message so the file is created
    await s1.append([{ role: "user", content: "hello" }]);

    // Second session: resume and verify plan is restored
    const s2 = await Session.resume(id, tmpDir);
    expect((s2 as SessionLike).getPlan()).toBe(planText);
  });

  it("plan record is the last plan record when multiple plans written", async () => {
    const id = "multi-plan-persist";
    const s1 = await Session.createAsync(id, tmpDir);
    await s1.append([{ role: "user", content: "start" }]);

    // Write two plans — only the last should be restored
    await (s1 as SessionLike).setPlan("First plan");
    await (s1 as SessionLike).setPlan("Second plan (approved)");

    const s2 = await Session.resume(id, tmpDir);
    expect((s2 as SessionLike).getPlan()).toBe("Second plan (approved)");
  });

  // ─── compact() survival ───────────────────────────────────────────────────

  it("plan survives compact(): re-written into the new compact file", async () => {
    const id = "plan-compact";
    const planText = "Approved plan: step 1, step 2, step 3";

    const session = await Session.createAsync(id, tmpDir);
    const s = session as SessionLike;
    await session.append([{ role: "user", content: "do something" }]);
    await s.setPlan(planText);

    // Compact the session (discards old message history)
    await session.compact("Compacted: user asked to do something");

    // Plan should still be retrievable in-memory
    expect(s.getPlan()).toBe(planText);

    // Resume to verify the plan was written into the compact file
    const resumed = await Session.resume(id, tmpDir);
    expect((resumed as SessionLike).getPlan()).toBe(planText);
  });

  it("plan set before compact is also restored from compact file", async () => {
    const id = "plan-before-compact";
    const session = await Session.createAsync(id, tmpDir);
    const s = session as SessionLike;
    await session.append([{ role: "user", content: "msg 1" }]);
    await session.append([{ role: "assistant", content: "reply 1" }]);

    await s.setPlan("Pre-compact plan");
    await session.compact("Compact summary");

    const resumed = await Session.resume(id, tmpDir);
    expect((resumed as SessionLike).getPlan()).toBe("Pre-compact plan");
  });

  it("plan set after compact is persisted normally", async () => {
    const id = "plan-after-compact";
    const session = await Session.createAsync(id, tmpDir);
    const s = session as SessionLike;
    await session.append([{ role: "user", content: "msg" }]);
    await session.compact("Compact");

    // Set plan AFTER compaction (appended to the compact file)
    await s.setPlan("Post-compact plan");

    const resumed = await Session.resume(id, tmpDir);
    expect((resumed as SessionLike).getPlan()).toBe("Post-compact plan");
  });

  // ─── Encryption compatibility ─────────────────────────────────────────────

  it("plan is encrypted at rest and restored correctly with encryptionKey", async () => {
    const id = "plan-encrypted";
    const planText = "Encrypted plan: step A, step B";
    const key = "correct-horse-battery-staple";

    const s1 = await Session.createAsync(id, tmpDir, undefined, undefined, key);
    await s1.append([{ role: "user", content: "encrypted msg" }]);
    await (s1 as SessionLike).setPlan(planText);

    // The file should contain ENC. prefixed lines (not plaintext)
    const fileContent = await fsp.readFile(
      path.join(tmpDir, `${id}.jsonl`),
      "utf8"
    );
    // All data lines should be encrypted
    const dataLines = fileContent.split("\n").filter(Boolean);
    for (const line of dataLines) {
      expect(line.startsWith("ENC.")).toBe(true);
    }

    // Resume with the same key — plan must be decrypted and restored
    const s2 = await Session.resume(id, tmpDir, undefined, undefined, key);
    expect((s2 as SessionLike).getPlan()).toBe(planText);
  });

  // ─── JSONL record type ────────────────────────────────────────────────────

  it('plan record has type="plan" in the JSONL file', async () => {
    const id = "plan-record-type";
    const session = await Session.createAsync(id, tmpDir);
    await session.append([{ role: "user", content: "start" }]);
    await (session as SessionLike).setPlan("Type check plan");

    const raw = await fsp.readFile(path.join(tmpDir, `${id}.jsonl`), "utf8");
    const lines = raw.split("\n").filter(Boolean);
    const planLine = lines.find((l) => {
      try {
        const r = JSON.parse(l);
        return r.type === "plan";
      } catch {
        return false;
      }
    });
    expect(planLine).toBeDefined();
    const record = JSON.parse(planLine!);
    expect(record.plan).toBe("Type check plan");
    expect(typeof record.timestamp).toBe("string");
  });

  // ─── resumeOrCreate ───────────────────────────────────────────────────────

  it("resumeOrCreate restores plan from existing session", async () => {
    const id = "resume-or-create-plan";
    const s1 = await Session.createAsync(id, tmpDir);
    await s1.append([{ role: "user", content: "msg" }]);
    await (s1 as SessionLike).setPlan("Recovered plan");

    const s2 = await Session.resumeOrCreate(id, tmpDir);
    expect((s2 as SessionLike).getPlan()).toBe("Recovered plan");
  });

  it("resumeOrCreate on new session starts with null plan", async () => {
    const s = await Session.resumeOrCreate("brand-new-plan-session", tmpDir);
    expect((s as SessionLike).getPlan()).toBeNull();
  });
});
