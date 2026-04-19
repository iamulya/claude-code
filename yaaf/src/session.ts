/**
 * Session — conversation persistence and crash recovery.
 *
 * Serializes the full conversation history to a `.jsonl` file, one JSON
 * object per line. On restart, `Session.resume()` loads the prior messages
 * so the agent continues exactly where it left off.
 *
 * When a `SessionAdapter` plugin is provided (Redis, Postgres, DynamoDB, etc.),
 * all persistence is delegated to the adapter instead of the local filesystem.
 *
 * @example
 * ```ts
 * // First run — creates a new session (filesystem)
 * const session = Session.create('my-agent');
 *
 * // With an adapter plugin
 * const adapter = pluginHost.getSessionAdapter()
 * const session = await Session.create('my-agent', undefined, adapter);
 *
 * // Resume — works with either backend
 * const session = await Session.resume('my-agent');
 * ```
 */

import * as crypto from "crypto";
import * as fsp from "fs/promises";
import * as path from "path";
import type { ChatMessage } from "./agents/runner.js";
import type { SessionAdapter } from "./plugin/types.js";

// ── Types ─────────────────────────────────────────────────────────────────────

type SessionRecord =
  | { type: "message"; message: ChatMessage }
  | { type: "compact"; summary: string; timestamp: string }
  | { type: "meta"; id: string; createdAt: string; version: number; owner?: string; hmac?: string }
  /**
   * Plan record — stores the most-recently-set plan text into the session
   * JSONL stream so it survives compaction and crash recovery.
   *
   * Only the *last* plan record encountered during load() wins; earlier records
   * are superseded (plans are replaced, not versioned).
   */
  | { type: "plan"; plan: string; timestamp: string };

/**
 * Shared interface for Session and AdapterBridgeSession.
 * This replaces the unsafe `as unknown as Session` double cast with a
 * proper structural type that both implementations satisfy.
 */
export interface SessionLike {
  readonly id: string;
  readonly filePath: string;
  readonly messageCount: number;
  readonly owner: string | undefined;
  bind(userId: string): void;
  canAccess(userId: string): boolean;
  getMessages(): readonly ChatMessage[];
  append(messages: ChatMessage[]): Promise<void>;
  compact(summary: string): Promise<void>;
  delete(): Promise<void>;
  /**
   * Save a plan string into this session so it survives compaction and
   * crash recovery. The plan is appended as a `plan` record in the JSONL
   * stream (filesystem backend) or kept in-memory and re-written into the
   * compact record (adapter backend).
   *
   * Subsequent calls overwrite the previous plan — only one plan per session
   * is kept (the most-recently-set one).
   *
   * @example
   * ```ts
   * // Store the plan after the approval gate:
   * await session.setPlan(approvedPlan)
   *
   * // Retrieve it during the execution phase:
   * const plan = session.getPlan() // → string | null
   * ```
   */
  setPlan(plan: string): Promise<void>;
  /**
   * Retrieve the plan stored in this session, or `null` if no plan has
   * been set yet (or the session was loaded without a plan record).
   */
  getPlan(): string | null;
}

// ── Session ───────────────────────────────────────────────────────────────────

export class Session {
  private readonly _id: string;
  private readonly _filePath: string;
  private _messages: ChatMessage[] = [];
  private _initialized = false;
  private _owner: string | undefined = undefined;
  /**
   * In-memory plan store. Populated from the JSONL stream on resume,
   * written via setPlan(). The most-recently-set plan wins.
   */
  private _plan: string | null = null;
  /** Write serialization queue to prevent interleaved JSONL corruption */
  private _writeQueue: Promise<void> = Promise.resolve();
  /**
   * SS-2 FIX: Cap the number of outstanding writes to prevent unbounded memory
   * growth under rapid concurrent appends (e.g., many tool-result messages).
   */
  private _pendingWrites = 0;
  private static readonly MAX_PENDING_WRITES = 20;
  /**
   * Optional HMAC secret for session integrity verification.
   * When set, the meta record AND each individual message record include an HMAC.
   */
  _hmacSecret?: string;
  /**
   * S1-A FIX: Optional AES-256-GCM encryption key for session files at rest.
   * When set, every line written to the JSONL file is individually encrypted
   * with a unique 12-byte IV so individual lines can still be skipped on parse error.
   * Stored as a 32-byte Buffer derived from the caller-supplied key material.
   */
  private _encKey?: Buffer;

  private constructor(id: string, filePath: string) {
    this._id = id;
    this._filePath = filePath;
  }

  // ── Encryption helpers ────────────────────────────────────────────────────

  /**
   * S1-A: Derive a 32-byte AES key from caller-supplied material.
   * - 64-char hex string → used directly (no derivation needed)
   * - Anything else → scrypt(password, sessionId-based salt, 32)
   */
  private static async deriveKey(keyMaterial: string, sessionId: string): Promise<Buffer> {
    if (/^[0-9a-fA-F]{64}$/.test(keyMaterial)) {
      return Buffer.from(keyMaterial, "hex");
    }
    // scrypt with a deterministic per-session salt so resuming a session with
    // the same password always produces the same key.
    const salt = crypto.createHash("sha256").update(`yaaf-session-${sessionId}`).digest();
    return new Promise<Buffer>((resolve, reject) => {
      crypto.scrypt(keyMaterial, salt, 32, (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      });
    });
  }

  /**
   * S1-A: Encrypt a plaintext JSONL line. Format:
   * ENC.<iv_hex>.<authTag_hex>.<ciphertext_hex>
   * The ENC. prefix marks the line as encrypted so load() can distinguish
   * encrypted files from plaintext ones during key rotation.
   */
  private encryptLine(plaintext: string): string {
    if (!this._encKey) return plaintext;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", this._encKey, iv);
    const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `ENC.${iv.toString("hex")}.${tag.toString("hex")}.${enc.toString("hex")}`;
  }

  /**
   * S1-A: Decrypt an encrypted JSONL line. Returns null if the line is not
   * encrypted (backward-compat during key rotation) or throws on auth failure.
   */
  private decryptLine(line: string): string {
    if (!line.startsWith("ENC.")) return line; // plaintext passthrough
    if (!this._encKey) {
      throw new Error(
        `Session "${this._id}" contains encrypted data but no encryptionKey was provided. ` +
          "Provide the same encryptionKey used when the session was created.",
      );
    }
    const parts = line.split(".");
    if (parts.length !== 4) throw new Error(`Session "${this._id}" has malformed encrypted line`);
    const iv = Buffer.from(parts[1]!, "hex");
    const tag = Buffer.from(parts[2]!, "hex");
    const ct = Buffer.from(parts[3]!, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", this._encKey, iv);
    decipher.setAuthTag(tag);
    try {
      return decipher.update(ct).toString("utf8") + decipher.final("utf8");
    } catch {
      throw new Error(
        `Session "${this._id}" decryption failed — wrong encryptionKey or tampered data`,
      );
    }
  }

  // ── Factory ───────────────────────────────────────────────────────────────

  /**
   * Create a new session. If `id` is omitted, a random UUID is generated.
   *
   * When a `SessionAdapter` is provided, creates an adapter-backed session
   * (no local files). Otherwise, uses the default JSONL filesystem backend.
   * The session file is not written until the first `append()`.
   *
   * @param hmacSecret — If provided, session meta records include an HMAC
   * for integrity verification on resume. Prevents tampering with
   * session files (e.g., spoofing the owner field).
   * @param encryptionKey — S1-A: If provided, each JSONL line is encrypted
   * with AES-256-GCM. Accepts a 64-hex raw key or a plain password.
   */
  static async createAsync(
    id?: string,
    dir?: string,
    adapter?: SessionAdapter,
    hmacSecret?: string,
    encryptionKey?: string,
  ): Promise<Session | SessionLike> {
    const sessionId = id ?? crypto.randomUUID();
    if (adapter) return new AdapterBridgeSession(sessionId, adapter) as SessionLike;
    const filePath = Session.resolvePath(sessionId, dir);
    const session = new Session(sessionId, filePath);
    if (hmacSecret) session._hmacSecret = hmacSecret;
    if (encryptionKey) session._encKey = await Session.deriveKey(encryptionKey, sessionId);
    return session;
  }

  /**
   * Synchronous create (no encryption). For backward compatibility.
   * @deprecated Prefer createAsync() when using encryptionKey.
   */
  static create(
    id?: string,
    dir?: string,
    adapter?: SessionAdapter,
    hmacSecret?: string,
  ): Session | SessionLike {
    const sessionId = id ?? crypto.randomUUID();
    if (adapter) return new AdapterBridgeSession(sessionId, adapter) as SessionLike;
    const filePath = Session.resolvePath(sessionId, dir);
    const session = new Session(sessionId, filePath);
    if (hmacSecret) session._hmacSecret = hmacSecret;
    return session;
  }

  /**
   * Resume an existing session from disk (or from an adapter), restoring
   * its conversation history.
   * Throws if the session file does not exist (filesystem backend only).
   */
  static async resume(
    id: string,
    dir?: string,
    adapter?: SessionAdapter,
    hmacSecret?: string,
    encryptionKey?: string,
  ): Promise<Session | SessionLike> {
    if (adapter) {
      const bridge = new AdapterBridgeSession(id, adapter);
      await bridge._load();
      return bridge as SessionLike;
    }
    const filePath = Session.resolvePath(id, dir);
    const session = new Session(id, filePath);
    if (hmacSecret) session._hmacSecret = hmacSecret;
    if (encryptionKey) session._encKey = await Session.deriveKey(encryptionKey, id);
    await session.load();
    return session;
  }

  /**
   * Resume if the session file exists, create otherwise.
   * Only swallows ENOENT; all other errors are re-thrown.
   */
  static async resumeOrCreate(
    id: string,
    dir?: string,
    adapter?: SessionAdapter,
    hmacSecret?: string,
    encryptionKey?: string,
  ): Promise<Session | SessionLike> {
    try {
      return await Session.resume(id, dir, adapter, hmacSecret, encryptionKey);
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (
        code === "ENOENT" ||
        (err instanceof Error && err.message.includes("Session not found"))
      ) {
        return Session.createAsync(id, dir, adapter, hmacSecret, encryptionKey);
      }
      throw err;
    }
  }

  /**
   * Create a `Session`-compatible object backed by a `SessionAdapter` plugin.
   *
   * @deprecated Use `Session.create(id, undefined, adapter)` or
   * `Session.resume(id, undefined, adapter)` instead.
   */
  static async fromAdapter(adapter: SessionAdapter, id?: string): Promise<SessionLike> {
    const sessionId = id ?? crypto.randomUUID();
    const bridge = new AdapterBridgeSession(sessionId, adapter);
    await bridge._loadIfExists();
    // Return as SessionLike
    return bridge as SessionLike;
  }

  private static resolvePath(id: string, dir?: string): string {
    const base = dir ?? path.join(process.cwd(), ".yaaf", "sessions");
    // Validate the session ID to prevent path traversal.
    // A session ID like '../../etc/passwd' would otherwise resolve to an
    // arbitrary path outside the sessions directory via path.join().
    Session.validateSessionId(id);
    const resolved = path.resolve(base, `${id}.jsonl`);
    const baseResolved = path.resolve(base);
    if (!resolved.startsWith(baseResolved + path.sep) && resolved !== baseResolved) {
      throw new Error(`Invalid session ID "${id}": resolves outside the sessions directory`);
    }
    return resolved;
  }

  /**
   * Validate that a session ID is a safe filename component.
   * Rejects: path separators, dot-dot sequences, null bytes, and non-printable chars.
   * Allows: UUID-style alphanumerics and hyphens (the typical format).
   */
  private static validateSessionId(id: string): void {
    if (!id || id.length > 256) {
      throw new Error(`Invalid session ID: must be 1–256 characters`);
    }
    // Reject path traversal chars: / \ .. \0
    if (/[\\/]/.test(id) || id.includes("..") || id.includes("\0")) {
      throw new Error(
        `Invalid session ID "${id}": must not contain path separators, ".." or null bytes`,
      );
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  get id(): string {
    return this._id;
  }
  get filePath(): string {
    return this._filePath;
  }
  get messageCount(): number {
    return this._messages.length;
  }

  /**
   * The userId that owns this session, or undefined if unbound (anonymous).
   * Set via `bind()` or loaded from the session file's meta record.
   */
  get owner(): string | undefined {
    return this._owner;
  }

  /**
   * Bind this session to a user. Once bound, only this user can resume it.
   * Throws if already bound to a different user.
   */
  bind(userId: string): void {
    if (this._owner && this._owner !== userId) {
      throw new Error(
        `Session "${this._id}" is owned by "${this._owner}", cannot bind to "${userId}"`,
      );
    }
    this._owner = userId;
  }

  /**
   * Check whether a user can access this session.
   * - Unbound sessions are accessible to anyone.
   * - Bound sessions are accessible only to the owner.
   */
  canAccess(userId: string): boolean {
    return !this._owner || this._owner === userId;
  }

  /**
   * All messages currently in this session (restored + appended).
   */
  getMessages(): readonly ChatMessage[] {
    return this._messages;
  }

  /**
   * Persist a plan into this session.
   *
   * The plan is appended as a `{ type: "plan" }` record in the JSONL stream
   * so it can be restored when the session is resumed after a crash or
   * process restart. It also survives `compact()` — compaction re-writes
   * the plan record into the new compact file before discarding old history.
   *
   * Only the *last* plan record in the stream is used on resume; earlier
   * records are superseded automatically.
   *
   * @example
   * ```ts
   * // After plan approval:
   * await session.setPlan(approvedPlanText)
   *
   * // Later, during execution or a resumed session:
   * const plan = session.getPlan() // → string | null
   * ```
   */
  async setPlan(plan: string): Promise<void> {
    this._plan = plan;
    const record: SessionRecord = {
      type: "plan",
      plan,
      timestamp: new Date().toISOString(),
    };
    await this.writeLines([this.encryptLine(JSON.stringify(record))]);
  }

  /**
   * Return the plan stored in this session, or `null` if none has been set.
   *
   * The plan is populated from the most-recent `plan` record in the JSONL
   * stream when the session is resumed, and updated in-memory whenever
   * `setPlan()` is called during the current process lifetime.
   */
  getPlan(): string | null {
    return this._plan;
  }

  /**
   * Append new messages and persist them to disk.
   * Called by Agent after each run turn.
   */
  async append(messages: ChatMessage[]): Promise<void> {
    if (messages.length === 0) return;

    const lines: string[] = [];

    // Write meta header on first write
    if (!this._initialized) {
      const meta: SessionRecord = {
        type: "meta",
        id: this._id,
        createdAt: new Date().toISOString(),
        version: 1,
        owner: this._owner,
      };
      // Sign the meta record if hmacSecret is configured
      if (this._hmacSecret) {
        const { createHmac } = await import("crypto");
        const payload = JSON.stringify({ id: meta.id, owner: meta.owner, version: meta.version });
        (meta as SessionRecord & { hmac?: string }).hmac = createHmac("sha256", this._hmacSecret)
          .update(payload)
          .digest("hex");
      }
      lines.push(this.encryptLine(JSON.stringify(meta)));
      this._initialized = true;
    }

    for (const message of messages) {
      // SS-1 FIX: Sign each individual message record when hmacSecret is set.
      if (this._hmacSecret) {
        const { createHmac } = await import("crypto");
        const recordPayload = JSON.stringify({ role: message.role, content: message.content });
        const hmac = createHmac("sha256", this._hmacSecret).update(recordPayload).digest("hex");
        const record = { type: "message" as const, message, hmac };
        lines.push(this.encryptLine(JSON.stringify(record)));
      } else {
        const record: SessionRecord = { type: "message", message };
        lines.push(this.encryptLine(JSON.stringify(record)));
      }
      this._messages.push(message);
    }

    await this.writeLines(lines);
  }

  /**
   * Replace the session history with a compact summary, archiving
   * the original. Useful after context compaction.
   *
   * Made atomic to prevent data loss on mid-operation crash.
   *
   * Old (unsafe) order:
   * 1. rename(live → archive) ← live session is now gone
   * 2. write new compact file ← if this fails, session is lost forever
   *
   * New (safe) order:
   * 1. write compact record to a temp file ← crash here: live session still intact
   * 2. rename(live → archive) ← crash here: both files exist; live is recoverable
   * 3. rename(temp → live) ← crash here: temp has new content; archive has old
   *
   * The load() parser already tolerates malformed/missing files, making each
   * step individually recoverable.
   */
  async compact(summary: string): Promise<void> {
    const archiveSuffix = crypto.randomUUID();
    const archivePath = this._filePath.replace(".jsonl", `.archive-${archiveSuffix}.jsonl`);
    const tmpPath = this._filePath + `.compact-${archiveSuffix}.tmp`;

    // Step 1: Write the new compact content to a temp file.
    // The live session file is unchanged at this point — crash here is safe.
    const compactRecord: SessionRecord = {
      type: "compact",
      summary,
      timestamp: new Date().toISOString(),
    };
    const summaryMessage: SessionRecord = {
      type: "message",
      message: { role: "system", content: `[Compacted session summary]\n${summary}` },
    };

    // Build the compact file lines: compact record + summary message + plan (if any)
    let compactContent =
      this.encryptLine(JSON.stringify(compactRecord)) +
      "\n" +
      this.encryptLine(JSON.stringify(summaryMessage)) +
      "\n";

    // Plan survival across compaction: if a plan was set, re-write it into the
    // new compact file so it is available after the compacted session is resumed.
    // Without this, compact() would discard the plan along with the old history.
    if (this._plan !== null) {
      const planRecord: SessionRecord = {
        type: "plan",
        plan: this._plan,
        timestamp: new Date().toISOString(),
      };
      compactContent += this.encryptLine(JSON.stringify(planRecord)) + "\n";
    }

    await fsp.mkdir(path.dirname(tmpPath), { recursive: true });
    await fsp.writeFile(tmpPath, compactContent, "utf8");

    // Step 2: Archive the live session (rename, not copy — atomic on same filesystem).
    // If this fails, tmpPath exists — can be cleaned up; live session is intact.
    try {
      await fsp.rename(this._filePath, archivePath);
    } catch {
      // File may not exist yet (first compact on a fresh session)
      await fsp.unlink(tmpPath).catch(() => {
        /* cleanup temp */
      });
      return;
    }

    // Step 3: Move the prepared temp file into the live position.
    // If this fails, archivePath has the old data; tmpPath has the new compact data.
    // Recovery: rename(tmpPath → _filePath).
    try {
      await fsp.rename(tmpPath, this._filePath);
    } catch (err) {
      // Attempt recovery: restore from archive
      try {
        await fsp.rename(archivePath, this._filePath);
      } catch {
        /* ignore */
      }
      await fsp.unlink(tmpPath).catch(() => {
        /* ignore */
      });
      throw err;
    }

    // Reset in-memory state to match the new compact file
    this._messages = [{ role: "system", content: `[Compacted session summary]\n${summary}` }];
    this._initialized = true;
    // _plan is intentionally left unchanged — it was written into the compact file above
  }

  /**
   * Delete this session's file from disk.
   */
  async delete(): Promise<void> {
    try {
      await fsp.unlink(this._filePath);
    } catch {
      /* already gone */
    }
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private async load(): Promise<void> {
    let raw: string;
    try {
      raw = await fsp.readFile(this._filePath, "utf8");
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT") throw new Error(`Session not found: ${this._id}`);
      throw err;
    }

    const lines = raw.split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        // S1-A FIX: Decrypt the line before parsing. Plaintext lines pass through.
        const plainLine = this.decryptLine(line);
        const record = JSON.parse(plainLine) as SessionRecord;
        if (record.type === "message") {
          // SS-1 FIX (load side): Verify per-message HMAC when hmacSecret is configured.
          // The write side (append) signs each message with an HMAC; we must verify here
          // or an attacker can tamper with individual message content without detection.
          if (this._hmacSecret) {
            const msgRecord = record as SessionRecord & { hmac?: string };
            if (!msgRecord.hmac) {
              throw new Error(
                `Session "${this._id}" message record is missing an HMAC signature. ` +
                  "This may indicate tampering. Load aborted.",
              );
            }
            const recordPayload = JSON.stringify({
              role: record.message.role,
              content: record.message.content,
            });
            const expected = crypto
              .createHmac("sha256", this._hmacSecret)
              .update(recordPayload)
              .digest("hex");
            const sigA = Buffer.from(msgRecord.hmac, "hex");
            const sigB = Buffer.from(expected, "hex");
            if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) {
              throw new Error(
                `Session "${this._id}" message HMAC verification failed — file may have been tampered with`,
              );
            }
          }
          this._messages.push(record.message);
        } else if (record.type === "meta" && record.owner) {
          this._owner = record.owner;
          // Verify HMAC if hmacSecret is configured
          if (this._hmacSecret) {
            const payload = JSON.stringify({
              id: record.id,
              owner: record.owner,
              version: record.version,
            });
            const expected = crypto
              .createHmac("sha256", this._hmacSecret)
              .update(payload)
              .digest("hex");
            // Missing hmac field when a secret IS configured must
            // be treated as a tamper attempt (fail-closed), not silently skipped.
            if (!record.hmac) {
              throw new Error(
                `Session "${this._id}" meta record is missing an HMAC signature. ` +
                  "This may indicate tampering. Load aborted.",
              );
            }
            const sigA = Buffer.from(record.hmac, "hex");
            const sigB = Buffer.from(expected, "hex");
            if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) {
              throw new Error(
                `Session "${this._id}" HMAC verification failed — file may have been tampered with`,
              );
            }
          }
        }
        // 'compact' records are informational only
        if (record.type === "plan") {
          // The last plan record in the file wins — earlier records are superseded.
          this._plan = record.plan;
        }
      } catch (err) {
        // Security errors (HMAC verification failures, tamper detection)
        // must NOT be swallowed here. Only skip genuinely malformed JSON lines.
        // Previously a bare `catch {}` silently accepted tampered session files.
        if (
          err instanceof Error &&
          (err.message.includes("HMAC") ||
            err.message.includes("tamper") ||
            err.message.includes("missing an HMAC"))
        ) {
          throw err;
        }
        // Skip malformed JSON lines (non-security parse errors)
      }
    }
    this._initialized = true;
  }

  /**
   * Write lines individually for crash safety.
   * If the process crashes mid-batch, at most one line is partially written.
   * The load() parser already skips malformed lines, making this recoverable.
   *
   * Serialized via promise queue to prevent interleaved writes when
   * multiple concurrent run() turns call append() on the same session.
   *
   * Backpressure — wait for a write to drain instead of throwing
   * immediately when the queue is full. Under normal load this never fires;
   * under burst I/O the caller experiences ~150ms of backpressure rather than
   * losing data with a hard error.
   */
  private async writeLines(lines: string[], retriesLeft = 3): Promise<void> {
    // SS-2 FIX: Cap outstanding write operations to prevent unbounded queue growth.
    if (this._pendingWrites >= Session.MAX_PENDING_WRITES) {
      if (retriesLeft <= 0) {
        throw new Error(
          `Session "${this._id}" write queue full (${this._pendingWrites} pending) after retries. ` +
            "The filesystem may be overloaded or unresponsive.",
        );
      }
      // Apply backpressure — wait 50ms for a slot to free up then retry.
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
      return this.writeLines(lines, retriesLeft - 1);
    }
    this._pendingWrites++;

    const doWrite = async () => {
      await fsp.mkdir(path.dirname(this._filePath), { recursive: true });
      for (const line of lines) {
        await fsp.appendFile(this._filePath, line + "\n", "utf8");
      }
    };
    // Serialize writes: each write waits for the previous to finish
    this._writeQueue = this._writeQueue.then(doWrite, doWrite);
    try {
      return await this._writeQueue;
    } finally {
      this._pendingWrites--;
    }
  }
}

// ── AdapterBridgeSession ──────────────────────────────────────────────────────

/**
 * Internal — wraps a `SessionAdapter` plugin behind the `Session` public API.
 * Obtained via `Session.create(id, dir, adapter)` or `Session.resume(id, dir, adapter)`.
 *
 * Supports the full Session surface including `owner`/`bind()`/`canAccess()`.
 * Owner metadata is persisted through `adapter.saveMeta()` / `adapter.loadMeta()`.
 * @internal
 */
class AdapterBridgeSession {
  private _messages: ChatMessage[] = [];
  private _owner: string | undefined = undefined;
  private _initialized = false;
  /**
   * In-memory plan store for adapter-backed sessions.
   * Not persisted to the adapter's raw message stream — instead stored in
   * memory and re-written after each append/compact so the adapter can
   * serialize it however it chooses. Adapters that wish to persist the plan
   * across restarts should override saveMeta/loadMeta to include `plan`.
   */
  private _plan: string | null = null;

  constructor(
    private readonly _id: string,
    private readonly adapter: SessionAdapter,
  ) {}

  get id(): string {
    return this._id;
  }
  /** Adapter-backed sessions don't have a local file path — returns the session ID. */
  get filePath(): string {
    return this._id;
  }
  get messageCount(): number {
    return this._messages.length;
  }
  get owner(): string | undefined {
    return this._owner;
  }

  /**
   * Bind this session to a user. Persists via adapter.saveMeta() if available.
   *
   * Persistence failures are now surfaced (logged + in-memory state
   * cleared) instead of silently swallowed. Use bindAsync() when you need
   * guaranteed persistence before proceeding.
   */
  bind(userId: string): void {
    if (this._owner && this._owner !== userId) {
      throw new Error(
        `Session "${this._id}" is owned by "${this._owner}", cannot bind to "${userId}"`,
      );
    }
    this._owner = userId;

    if (this.adapter.saveMeta) {
      this.adapter.saveMeta(this._id, { owner: userId }).catch((err) => {
        // Surface persistence failure instead of silent swallow.
        // Clear in-memory owner to prevent inconsistent state where
        // session appears bound but persistence failed.
        this._owner = undefined;
        console.error(
          `[yaaf/session] CRITICAL: Failed to persist owner binding for session "${this._id}": ` +
            `${err instanceof Error ? err.message : String(err)}. ` +
            `Session will be unbound on next restart.`,
        );
      });
    }
  }

  /**
   * Async version of bind() that awaits persistence.
   * Use this when you need guaranteed owner binding before proceeding
   * (e.g., in server auth flows).
   */
  async bindAsync(userId: string): Promise<void> {
    if (this._owner && this._owner !== userId) {
      throw new Error(
        `Session "${this._id}" is owned by "${this._owner}", cannot bind to "${userId}"`,
      );
    }
    this._owner = userId;

    if (this.adapter.saveMeta) {
      await this.adapter.saveMeta(this._id, { owner: userId });
    }
  }

  canAccess(userId: string): boolean {
    return !this._owner || this._owner === userId;
  }

  getMessages(): readonly ChatMessage[] {
    return this._messages;
  }

  async append(messages: ChatMessage[]): Promise<void> {
    if (messages.length === 0) return;

    if (!this._initialized) {
      await this.adapter.create(this._id);
      this._initialized = true;
    }

    await this.adapter.append(this._id, messages);
    this._messages.push(...messages);
  }

  async compact(summary: string): Promise<void> {
    await this.adapter.compact(this._id, summary);
    this._messages = [{ role: "system", content: `[Compacted session summary]\n${summary}` }];
    // _plan is preserved in-memory across compaction — identical to the
    // filesystem Session behaviour. Adapter implementations that want to
    // persist it across process restarts should implement saveMeta/loadMeta
    // with a `plan` field.
  }

  async delete(): Promise<void> {
    await this.adapter.delete(this._id);
    this._messages = [];
    this._plan = null;
  }

  /**
   * Persist a plan string into this adapter-backed session.
   *
   * For adapter sessions the plan is stored in-memory and optionally persisted
   * via `adapter.saveMeta({ plan })` when the adapter supports it. It survives
   * `compact()` because the in-memory reference is unchanged.
   *
   * To persist the plan across process restarts with an adapter backend,
   * implement `saveMeta` / `loadMeta` in your `SessionAdapter` and include a
   * `plan` field in the metadata object.
   */
  async setPlan(plan: string): Promise<void> {
    this._plan = plan;
    // Best-effort persistence via adapter.saveMeta when available
    if (this.adapter.saveMeta) {
      await this.adapter.saveMeta(this._id, { owner: this._owner, plan } as { owner?: string; plan?: string }).catch((err) => {
        console.error(
          `[yaaf/session] Warning: failed to persist plan for session "${this._id}": ` +
            `${err instanceof Error ? err.message : String(err)}. ` +
            "Plan is available in-memory but will be lost on process restart.",
        );
      });
    }
  }

  /** Return the plan stored in this session, or `null` if none has been set. */
  getPlan(): string | null {
    return this._plan;
  }

  /**
   * Load messages and owner metadata from the adapter.
   * Throws if the session doesn't exist (used by Session.resume).
   * @internal
   */
  async _load(): Promise<void> {
    const messages = await this.adapter.load(this._id);
    if (messages.length === 0) {
      throw new Error(`Session not found: ${this._id}`);
    }
    this._messages = [...messages];
    this._initialized = true;
    await this._loadOwnerMeta();
  }

  /**
   * Load messages if available — does not throw on empty.
   * Used by Session.fromAdapter() (create-or-resume semantics).
   * @internal
   */
  async _loadIfExists(): Promise<void> {
    const messages = await this.adapter.load(this._id);
    if (messages.length > 0) {
      // Existing session — hydrate with stored messages
      this._messages = [...messages];
      this._initialized = true;
    } else {
      // New session — call create() to register it in the adapter
      if (this.adapter.create) {
        await this.adapter.create(this._id);
      }
      this._messages = [];
      this._initialized = false;
    }
    await this._loadOwnerMeta();
  }

  /** Load owner metadata from the adapter if supported. */
  private async _loadOwnerMeta(): Promise<void> {
    if (this.adapter.loadMeta) {
      try {
        const meta = await this.adapter.loadMeta(this._id);
        if (meta?.owner) this._owner = meta.owner;
      } catch {
        /* best effort */
      }
    }
  }
}

// ── List / cleanup helpers ────────────────────────────────────────────────────

/**
 * List all session IDs in a directory, or from a `SessionAdapter` if provided.
 */
export async function listSessions(dir?: string, adapter?: SessionAdapter): Promise<string[]> {
  if (adapter) {
    return adapter.list();
  }

  const base = dir ?? path.join(process.cwd(), ".yaaf", "sessions");
  try {
    const files = await fsp.readdir(base);
    return files.filter((f) => f.endsWith(".jsonl")).map((f) => f.replace(".jsonl", ""));
  } catch {
    return [];
  }
}

/** Delete all sessions older than `maxAgeMs`. */
export async function pruneOldSessions(maxAgeMs: number, dir?: string): Promise<string[]> {
  const base = dir ?? path.join(process.cwd(), ".yaaf", "sessions");
  const pruned: string[] = [];
  try {
    const files = await fsp.readdir(base);
    const now = Date.now();
    for (const file of files) {
      if (!file.endsWith(".jsonl") || file.includes(".archive-")) continue;
      const stat = await fsp.stat(path.join(base, file));
      // BIRTHTIME FIX: Use birthtime (creation time) instead of mtime (last modification).
      // Using mtime is incorrect because:
      // - Reading (resuming) a session can update mtime on some filesystems
      // - compacting a session updates mtime to "now" even if the session is old
      // Birthtime reflects when the session was first created, which is the
      // correct measure of "age" for pruning purposes.
      //
      // Fallback: if birthtime is unavailable (e.g., FAT32, some network filesystems
      // return birthtime === mtime or birthtime === epoch), fall back to mtime.
      const birthtimeMs = stat.birthtimeMs;
      const isValidBirthtime = birthtimeMs > 0 && birthtimeMs !== stat.mtimeMs;
      const ageMs = now - (isValidBirthtime ? birthtimeMs : stat.mtimeMs);
      if (ageMs > maxAgeMs) {
        await fsp.unlink(path.join(base, file));
        pruned.push(file.replace(".jsonl", ""));
      }
    }
  } catch {
    /* dir doesn't exist */
  }
  return pruned;
}

/**
 * ARCHIVE CLEANUP FIX: Delete compact archives older than `maxAgeMs`.
 *
 * Each call to `session.compact()` creates a `.archive-<uuid>.jsonl` file
 * alongside the live session. Without cleanup, these accumulate indefinitely.
 * Call this periodically alongside `pruneOldSessions`.
 *
 * @param maxAgeMs - Delete archives older than this many milliseconds.
 * @param dir - Session directory (default: `.yaaf/sessions` in cwd).
 * @returns Array of deleted archive file basenames.
 */
export async function pruneSessionArchives(maxAgeMs: number, dir?: string): Promise<string[]> {
  const base = dir ?? path.join(process.cwd(), ".yaaf", "sessions");
  const pruned: string[] = [];
  try {
    const files = await fsp.readdir(base);
    const now = Date.now();
    for (const file of files) {
      if (!file.includes(".archive-") || !file.endsWith(".jsonl")) continue;
      const filePath = path.join(base, file);
      const stat = await fsp.stat(filePath);
      // Archives use mtime (safe: archives are never read, only written once)
      if (now - stat.mtimeMs > maxAgeMs) {
        await fsp.unlink(filePath);
        pruned.push(file);
      }
    }
  } catch {
    /* dir doesn't exist */
  }
  return pruned;
}
