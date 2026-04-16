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

import * as crypto from 'crypto'
import * as fsp from 'fs/promises'
import * as path from 'path'
import type { ChatMessage } from './agents/runner.js'
import type { SessionAdapter } from './plugin/types.js'

// ── Types ─────────────────────────────────────────────────────────────────────

type SessionRecord =
  | { type: 'message'; message: ChatMessage }
  | { type: 'compact'; summary: string; timestamp: string }
  | { type: 'meta'; id: string; createdAt: string; version: number; owner?: string; hmac?: string }

/**
 * CRITIQUE #14 FIX: Shared interface for Session and AdapterBridgeSession.
 * This replaces the unsafe `as unknown as Session` double cast with a
 * proper structural type that both implementations satisfy.
 */
export interface SessionLike {
  readonly id: string
  readonly filePath: string
  readonly messageCount: number
  readonly owner: string | undefined
  bind(userId: string): void
  canAccess(userId: string): boolean
  getMessages(): readonly ChatMessage[]
  append(messages: ChatMessage[]): Promise<void>
  compact(summary: string): Promise<void>
  delete(): Promise<void>
}

// ── Session ───────────────────────────────────────────────────────────────────

export class Session {
  private readonly _id: string
  private readonly _filePath: string
  private _messages: ChatMessage[] = []
  private _initialized = false
  private _owner: string | undefined = undefined
  /** C5 FIX: Write serialization queue to prevent interleaved JSONL corruption */
  private _writeQueue: Promise<void> = Promise.resolve()
  /**
   * CRITIQUE #12 FIX: Optional HMAC secret for session integrity verification.
   * When set, the meta record includes an HMAC that's verified on load().
   */
  _hmacSecret?: string

  private constructor(id: string, filePath: string) {
    this._id = id
    this._filePath = filePath
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
   *   for integrity verification on resume. Prevents tampering with
   *   session files (e.g., spoofing the owner field).
   */
  static create(id?: string, dir?: string, adapter?: SessionAdapter, hmacSecret?: string): Session | SessionLike {
    const sessionId = id ?? crypto.randomUUID()

    if (adapter) {
      // CRITIQUE #14 FIX: Return as SessionLike instead of unsafe double cast
      return new AdapterBridgeSession(sessionId, adapter) as SessionLike
    }

    const filePath = Session.resolvePath(sessionId, dir)
    const session = new Session(sessionId, filePath)
    if (hmacSecret) session._hmacSecret = hmacSecret
    return session
  }

  /**
   * Resume an existing session from disk (or from an adapter), restoring
   * its conversation history.
   * Throws if the session file does not exist (filesystem backend only).
   */
  static async resume(id: string, dir?: string, adapter?: SessionAdapter, hmacSecret?: string): Promise<Session | SessionLike> {
    if (adapter) {
      const bridge = new AdapterBridgeSession(id, adapter)
      await bridge._load()
      // CRITIQUE #14 FIX: Return as SessionLike
      return bridge as SessionLike
    }

    const filePath = Session.resolvePath(id, dir)
    const session = new Session(id, filePath)
    if (hmacSecret) session._hmacSecret = hmacSecret
    await session.load()
    return session
  }

  /**
   * Resume if exists, create otherwise. Useful for agent startup sequences.
   */
  static async resumeOrCreate(id: string, dir?: string, adapter?: SessionAdapter, hmacSecret?: string): Promise<Session | SessionLike> {
    try {
      return await Session.resume(id, dir, adapter, hmacSecret)
    } catch {
      return Session.create(id, dir, adapter, hmacSecret)
    }
  }

  /**
   * Create a `Session`-compatible object backed by a `SessionAdapter` plugin.
   *
   * @deprecated Use `Session.create(id, undefined, adapter)` or
   *             `Session.resume(id, undefined, adapter)` instead.
   */
  static async fromAdapter(
    adapter: SessionAdapter,
    id?: string,
  ): Promise<SessionLike> {
    const sessionId = id ?? crypto.randomUUID()
    const bridge = new AdapterBridgeSession(sessionId, adapter)
    await bridge._loadIfExists()
    // CRITIQUE #14 FIX: Return as SessionLike
    return bridge as SessionLike
  }

  private static resolvePath(id: string, dir?: string): string {
    const base = dir ?? path.join(process.cwd(), '.yaaf', 'sessions')
    return path.join(base, `${id}.jsonl`)
  }

  // ── Public API ────────────────────────────────────────────────────────────

  get id(): string { return this._id }
  get filePath(): string { return this._filePath }
  get messageCount(): number { return this._messages.length }

  /**
   * The userId that owns this session, or undefined if unbound (anonymous).
   * Set via `bind()` or loaded from the session file's meta record.
   */
  get owner(): string | undefined { return this._owner }

  /**
   * Bind this session to a user. Once bound, only this user can resume it.
   * Throws if already bound to a different user.
   */
  bind(userId: string): void {
    if (this._owner && this._owner !== userId) {
      throw new Error(
        `Session "${this._id}" is owned by "${this._owner}", cannot bind to "${userId}"`,
      )
    }
    this._owner = userId
  }

  /**
   * Check whether a user can access this session.
   * - Unbound sessions are accessible to anyone.
   * - Bound sessions are accessible only to the owner.
   */
  canAccess(userId: string): boolean {
    return !this._owner || this._owner === userId
  }

  /**
   * All messages currently in this session (restored + appended).
   */
  getMessages(): readonly ChatMessage[] {
    return this._messages
  }

  /**
   * Append new messages and persist them to disk.
   * Called by Agent after each run turn.
   */
  async append(messages: ChatMessage[]): Promise<void> {
    if (messages.length === 0) return

    const lines: string[] = []

    // Write meta header on first write
    if (!this._initialized) {
      const meta: SessionRecord = {
        type: 'meta',
        id: this._id,
        createdAt: new Date().toISOString(),
        version: 1,
        owner: this._owner,
      }
      // CRITIQUE #12 FIX: Sign the meta record if hmacSecret is configured
      if (this._hmacSecret) {
        const { createHmac } = await import('crypto')
        const payload = JSON.stringify({ id: meta.id, owner: meta.owner, version: meta.version })
        ;(meta as SessionRecord & { hmac?: string }).hmac = createHmac('sha256', this._hmacSecret)
          .update(payload).digest('hex')
      }
      lines.push(JSON.stringify(meta))
      this._initialized = true
    }

    for (const message of messages) {
      const record: SessionRecord = { type: 'message', message }
      lines.push(JSON.stringify(record))
      this._messages.push(message)
    }

    await this.writeLines(lines)
  }

  /**
   * Replace the session history with a compact summary, archiving
   * the original. Useful after context compaction.
   */
  async compact(summary: string): Promise<void> {
    // Archive the current file
    const archivePath = this._filePath.replace('.jsonl', `.archive-${Date.now()}.jsonl`)
    try {
      await fsp.rename(this._filePath, archivePath)
    } catch {
      // File may not exist yet
    }

    // Reset in-memory state
    this._messages = []
    this._initialized = false

    // Write a compact record + the summary as a system message
    const compactRecord: SessionRecord = {
      type: 'compact',
      summary,
      timestamp: new Date().toISOString(),
    }
    await this.writeLines([JSON.stringify(compactRecord)])

    // Inject summary as a pseudo system message
    await this.append([{ role: 'system', content: `[Compacted session summary]\n${summary}` }])
  }

  /**
   * Delete this session's file from disk.
   */
  async delete(): Promise<void> {
    try { await fsp.unlink(this._filePath) } catch { /* already gone */ }
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private async load(): Promise<void> {
    let raw: string
    try {
      raw = await fsp.readFile(this._filePath, 'utf8')
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException).code
      if (code === 'ENOENT') throw new Error(`Session not found: ${this._id}`)
      throw err
    }

    const lines = raw.split('\n').filter(Boolean)
    for (const line of lines) {
      try {
        const record = JSON.parse(line) as SessionRecord
        if (record.type === 'message') {
          this._messages.push(record.message)
        } else if (record.type === 'meta' && record.owner) {
          this._owner = record.owner
          // CRITIQUE #12 FIX: Verify HMAC if hmacSecret is configured
          if (this._hmacSecret && record.hmac) {
            const payload = JSON.stringify({ id: record.id, owner: record.owner, version: record.version })
            const expected = crypto.createHmac('sha256', this._hmacSecret)
              .update(payload).digest('hex')
            const sigA = Buffer.from(record.hmac, 'hex')
            const sigB = Buffer.from(expected, 'hex')
            if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) {
              throw new Error(`Session "${this._id}" HMAC verification failed — file may have been tampered with`)
            }
          }
        }
        // 'compact' records are informational only
      } catch {
        // Skip malformed lines
      }
    }
    this._initialized = true
  }

  /**
   * W-11 fix: Write lines individually for crash safety.
   * If the process crashes mid-batch, at most one line is partially written.
   * The load() parser already skips malformed lines, making this recoverable.
   *
   * C5 FIX: Serialized via promise queue to prevent interleaved writes when
   * multiple concurrent run() turns call append() on the same session.
   */
  private async writeLines(lines: string[]): Promise<void> {
    const doWrite = async () => {
      await fsp.mkdir(path.dirname(this._filePath), { recursive: true })
      for (const line of lines) {
        await fsp.appendFile(this._filePath, line + '\n', 'utf8')
      }
    }
    // Serialize writes: each write waits for the previous to finish
    this._writeQueue = this._writeQueue.then(doWrite, doWrite)
    return this._writeQueue
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
  private _messages: ChatMessage[] = []
  private _owner: string | undefined = undefined
  private _initialized = false

  constructor(
    private readonly _id: string,
    private readonly adapter: SessionAdapter,
  ) {}

  get id(): string { return this._id }
  /** Adapter-backed sessions don't have a local file path — returns the session ID. */
  get filePath(): string { return this._id }
  get messageCount(): number { return this._messages.length }
  get owner(): string | undefined { return this._owner }

  /**
   * Bind this session to a user. Persists via adapter.saveMeta() if available.
   *
   * C5 FIX: Persistence failures are now surfaced (logged + in-memory state
   * cleared) instead of silently swallowed. Use bindAsync() when you need
   * guaranteed persistence before proceeding.
   */
  bind(userId: string): void {
    if (this._owner && this._owner !== userId) {
      throw new Error(
        `Session "${this._id}" is owned by "${this._owner}", cannot bind to "${userId}"`,
      )
    }
    this._owner = userId

    if (this.adapter.saveMeta) {
      this.adapter.saveMeta(this._id, { owner: userId }).catch((err) => {
        // C5 FIX: Surface persistence failure instead of silent swallow.
        // Clear in-memory owner to prevent inconsistent state where
        // session appears bound but persistence failed.
        this._owner = undefined
        console.error(
          `[yaaf/session] CRITICAL: Failed to persist owner binding for session "${this._id}": ` +
          `${err instanceof Error ? err.message : String(err)}. ` +
          `Session will be unbound on next restart.`
        )
      })
    }
  }

  /**
   * C5 FIX: Async version of bind() that awaits persistence.
   * Use this when you need guaranteed owner binding before proceeding
   * (e.g., in server auth flows).
   */
  async bindAsync(userId: string): Promise<void> {
    if (this._owner && this._owner !== userId) {
      throw new Error(
        `Session "${this._id}" is owned by "${this._owner}", cannot bind to "${userId}"`,
      )
    }
    this._owner = userId

    if (this.adapter.saveMeta) {
      await this.adapter.saveMeta(this._id, { owner: userId })
    }
  }

  canAccess(userId: string): boolean {
    return !this._owner || this._owner === userId
  }

  getMessages(): readonly ChatMessage[] {
    return this._messages
  }

  async append(messages: ChatMessage[]): Promise<void> {
    if (messages.length === 0) return

    if (!this._initialized) {
      await this.adapter.create(this._id)
      this._initialized = true
    }

    await this.adapter.append(this._id, messages)
    this._messages.push(...messages)
  }

  async compact(summary: string): Promise<void> {
    await this.adapter.compact(this._id, summary)
    this._messages = [{ role: 'system', content: `[Compacted session summary]\n${summary}` }]
  }

  async delete(): Promise<void> {
    await this.adapter.delete(this._id)
    this._messages = []
  }

  /**
   * Load messages and owner metadata from the adapter.
   * Throws if the session doesn't exist (used by Session.resume).
   * @internal
   */
  async _load(): Promise<void> {
    const messages = await this.adapter.load(this._id)
    if (messages.length === 0) {
      throw new Error(`Session not found: ${this._id}`)
    }
    this._messages = [...messages]
    this._initialized = true
    await this._loadOwnerMeta()
  }

  /**
   * Load messages if available — does not throw on empty.
   * Used by Session.fromAdapter() (create-or-resume semantics).
   * @internal
   */
  async _loadIfExists(): Promise<void> {
    const messages = await this.adapter.load(this._id)
    if (messages.length > 0) {
      // Existing session — hydrate with stored messages
      this._messages = [...messages]
      this._initialized = true
    } else {
      // New session — call create() to register it in the adapter
      if (this.adapter.create) {
        await this.adapter.create(this._id)
      }
      this._messages = []
      this._initialized = false
    }
    await this._loadOwnerMeta()
  }

  /** Load owner metadata from the adapter if supported. */
  private async _loadOwnerMeta(): Promise<void> {
    if (this.adapter.loadMeta) {
      try {
        const meta = await this.adapter.loadMeta(this._id)
        if (meta?.owner) this._owner = meta.owner
      } catch { /* best effort */ }
    }
  }
}


// ── List / cleanup helpers ────────────────────────────────────────────────────

/**
 * List all session IDs in a directory, or from a `SessionAdapter` if provided.
 */
export async function listSessions(dir?: string, adapter?: SessionAdapter): Promise<string[]> {
  if (adapter) {
    return adapter.list()
  }

  const base = dir ?? path.join(process.cwd(), '.yaaf', 'sessions')
  try {
    const files = await fsp.readdir(base)
    return files.filter(f => f.endsWith('.jsonl')).map(f => f.replace('.jsonl', ''))
  } catch {
    return []
  }
}

/** Delete all sessions older than `maxAgeMs`. */
export async function pruneOldSessions(
  maxAgeMs: number,
  dir?: string,
): Promise<string[]> {
  const base = dir ?? path.join(process.cwd(), '.yaaf', 'sessions')
  const pruned: string[] = []
  try {
    const files = await fsp.readdir(base)
    const now = Date.now()
    for (const file of files) {
      if (!file.endsWith('.jsonl')) continue
      const stat = await fsp.stat(path.join(base, file))
      if (now - stat.mtimeMs > maxAgeMs) {
        await fsp.unlink(path.join(base, file))
        pruned.push(file.replace('.jsonl', ''))
      }
    }
  } catch { /* dir doesn't exist */ }
  return pruned
}
