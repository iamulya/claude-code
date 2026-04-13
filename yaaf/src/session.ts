/**
 * Session — conversation persistence and crash recovery.
 *
 * Serializes the full conversation history to a `.jsonl` file, one JSON
 * object per line. On restart, `Session.resume()` loads the prior messages
 * so the agent continues exactly where it left off.
 *
  * `.jsonl` transcript format in `src/utils/sessionStorage.ts`.
 *
 * @example
 * ```ts
 * // First run — creates a new session
 * const session = Session.create('my-agent');
 *
 * const agent = new Agent({
 *   systemPrompt: '...',
 *   session,
 * });
 *
 * // Later run — resumes from disk
 * const session = await Session.resume('my-agent');
 * // agent.messageCount > 0 — history is restored
 * ```
 */

import * as crypto from 'crypto'
import * as fsp from 'fs/promises'
import * as path from 'path'
import type { ChatMessage } from './agents/runner.js'

// ── Types ─────────────────────────────────────────────────────────────────────

type SessionRecord =
  | { type: 'message'; message: ChatMessage }
  | { type: 'compact'; summary: string; timestamp: string }
  | { type: 'meta'; id: string; createdAt: string; version: number }

// ── Session ───────────────────────────────────────────────────────────────────

export class Session {
  private readonly _id: string
  private readonly _filePath: string
  private _messages: ChatMessage[] = []
  private _initialized = false

  private constructor(id: string, filePath: string) {
    this._id = id
    this._filePath = filePath
  }

  // ── Factory ───────────────────────────────────────────────────────────────

  /**
   * Create a new session. If `id` is omitted, a random UUID is generated.
   * The session file is not written until the first `append()`.
   */
  static create(id?: string, dir?: string): Session {
    const sessionId = id ?? crypto.randomUUID()
    const filePath = Session.resolvePath(sessionId, dir)
    return new Session(sessionId, filePath)
  }

  /**
   * Resume an existing session from disk, restoring its conversation history.
   * Throws if the session file does not exist.
   */
  static async resume(id: string, dir?: string): Promise<Session> {
    const filePath = Session.resolvePath(id, dir)
    const session = new Session(id, filePath)
    await session.load()
    return session
  }

  /**
   * Resume if exists, create otherwise. Useful for agent startup sequences.
   */
  static async resumeOrCreate(id: string, dir?: string): Promise<Session> {
    try {
      return await Session.resume(id, dir)
    } catch {
      return Session.create(id, dir)
    }
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
        }
        // 'compact' and 'meta' records are informational only
      } catch {
        // Skip malformed lines
      }
    }
    this._initialized = true
  }

  private async writeLines(lines: string[]): Promise<void> {
    await fsp.mkdir(path.dirname(this._filePath), { recursive: true })
    await fsp.appendFile(this._filePath, lines.join('\n') + '\n', 'utf8')
  }
}

// ── List / cleanup helpers ────────────────────────────────────────────────────

/** List all session IDs in a directory. */
export async function listSessions(dir?: string): Promise<string[]> {
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
