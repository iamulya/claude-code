/**
 * TeamMemory — shared memory namespace for multi-agent swarms.
 *
 * Extends MemoryStore with a shared storage directory that multiple agents
 * can read and write concurrently. Each agent has its own private namespace
 * AND access to a shared team namespace, using a two-directory
 * memory model in `src/memdir/teamMemPrompts.ts`.
 *
 * Write routing:
 *  - 'private' scope: written to agentId-specific dir (not shared)
 *  - 'team'    scope: written to shared dir (visible to all agents)
 *
 * @example
 * ```ts
 * const sharedDir = '.yaaf/team-memory';
 *
 * // Worker 1
 * const mem1 = new TeamMemory({ sharedDir, agentId: 'worker-1' });
 * await mem1.save({ key: 'analysis_result', content: '...', scope: 'team' });
 *
 * // Worker 2 — sees the entry above
 * const mem2 = new TeamMemory({ sharedDir, agentId: 'worker-2' });
 * const entries = await mem2.search('analysis');
 * ```
 */

import * as fsp from 'fs/promises'
import * as path from 'path'
import * as crypto from 'crypto'

// ── Types ─────────────────────────────────────────────────────────────────────

export type MemoryScope = 'private' | 'team'

export type TeamMemoryEntry = {
  id: string
  key: string
  content: string
  type: 'user' | 'feedback' | 'project' | 'reference'
  scope: MemoryScope
  agentId: string
  createdAt: string
  updatedAt: string
  tags?: string[]
}

export type TeamMemoryConfig = {
  /** Directory for shared team memory (readable by all agents). */
  sharedDir: string
  /** This agent's unique identifier. Used for private memory isolation. */
  agentId: string
  /** Directory for this agent's private memory. Default: `<sharedDir>/.private/<agentId>` */
  privateDir?: string
}

export type SaveOptions = {
  type?: TeamMemoryEntry['type']
  scope?: MemoryScope
  tags?: string[]
}

export type SearchOptions = {
  /** Which memory spaces to search. Default: both. */
  scope?: MemoryScope | 'all'
  type?: TeamMemoryEntry['type']
  limit?: number
}

// ── TeamMemory ────────────────────────────────────────────────────────────────

export class TeamMemory {
  private readonly sharedDir: string
  private readonly privateDir: string
  private readonly agentId: string

  constructor(config: TeamMemoryConfig) {
    this.agentId = config.agentId
    this.sharedDir = path.resolve(config.sharedDir)
    this.privateDir = config.privateDir
      ? path.resolve(config.privateDir)
      : path.join(this.sharedDir, '.private', config.agentId)
  }

  // ── Write ─────────────────────────────────────────────────────────────────

  /**
   * Save or update a memory entry. If a key already exists (in the target
   * scope), it is overwritten rather than duplicated.
   */
  async save(
    data: { key: string; content: string },
    options: SaveOptions = {},
  ): Promise<TeamMemoryEntry> {
    const scope = options.scope ?? 'team'
    const dir = scope === 'team' ? this.sharedDir : this.privateDir

    await fsp.mkdir(dir, { recursive: true })

    // Check for existing entry with same key to update
    const existing = await this.findByKey(data.key, scope)
    const now = new Date().toISOString()

    const entry: TeamMemoryEntry = {
      id: existing?.id ?? crypto.randomUUID().slice(0, 12),
      key: data.key,
      content: data.content,
      type: options.type ?? 'reference',
      scope,
      agentId: this.agentId,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      tags: options.tags ?? [],
    }

    await fsp.writeFile(
      path.join(dir, `${entry.id}.json`),
      JSON.stringify(entry, null, 2),
      'utf8',
    )

    return entry
  }

  /**
   * Delete a memory entry by id or key+scope.
   */
  async delete(idOrKey: string, scope: MemoryScope = 'team'): Promise<boolean> {
    const entry = await this.findById(idOrKey, scope) ?? await this.findByKey(idOrKey, scope)
    if (!entry) return false
    const dir = entry.scope === 'team' ? this.sharedDir : this.privateDir
    try {
      await fsp.unlink(path.join(dir, `${entry.id}.json`))
      return true
    } catch { return false }
  }

  // ── Read ──────────────────────────────────────────────────────────────────

  /**
   * Get a memory entry by exact key. Searches team scope first, then private.
   */
  async get(key: string, scope?: MemoryScope): Promise<TeamMemoryEntry | undefined> {
    if (scope) return this.findByKey(key, scope)
    return (await this.findByKey(key, 'team')) ?? (await this.findByKey(key, 'private'))
  }

  /**
   * Full-text search across memory entries.
   */
  async search(query: string, options: SearchOptions = {}): Promise<TeamMemoryEntry[]> {
    const scope = options.scope ?? 'all'
    const entries: TeamMemoryEntry[] = []

    if (scope === 'team' || scope === 'all') {
      entries.push(...await this.loadDir(this.sharedDir))
    }
    if (scope === 'private' || scope === 'all') {
      entries.push(...await this.loadDir(this.privateDir))
    }

    const q = query.toLowerCase()
    let results = entries.filter(e =>
      e.key.toLowerCase().includes(q) ||
      e.content.toLowerCase().includes(q) ||
      e.tags?.some(t => t.toLowerCase().includes(q)),
    )

    if (options.type) results = results.filter(e => e.type === options.type)
    if (options.limit) results = results.slice(0, options.limit)

    return results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  /**
   * List all entries, optionally filtered by scope.
   */
  async list(scope: MemoryScope | 'all' = 'all'): Promise<TeamMemoryEntry[]> {
    const entries: TeamMemoryEntry[] = []
    if (scope === 'team' || scope === 'all') entries.push(...await this.loadDir(this.sharedDir))
    if (scope === 'private' || scope === 'all') entries.push(...await this.loadDir(this.privateDir))
    return entries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  /**
   * Build a context-ready summary of team memory for injection into a system prompt.
   * Collapses entries to key: content lines, capped at `maxChars`.
   */
  async buildContext(maxChars = 4_000, scope: MemoryScope | 'all' = 'all'): Promise<string> {
    const entries = await this.list(scope)
    if (entries.length === 0) return ''

    const lines: string[] = ['## Team Memory\n']
    let chars = lines[0]!.length

    for (const entry of entries) {
      const line = `- [${entry.scope}/${entry.type}] **${entry.key}**: ${entry.content}`
      if (chars + line.length > maxChars) break
      lines.push(line)
      chars += line.length + 1
    }

    return lines.join('\n')
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private async loadDir(dir: string): Promise<TeamMemoryEntry[]> {
    try {
      const files = await fsp.readdir(dir)
      const entries: TeamMemoryEntry[] = []
      for (const file of files) {
        if (!file.endsWith('.json') || file.startsWith('.')) continue
        try {
          const raw = await fsp.readFile(path.join(dir, file), 'utf8')
          entries.push(JSON.parse(raw) as TeamMemoryEntry)
        } catch { /* skip corrupt entries */ }
      }
      return entries
    } catch { return [] }
  }

  private async findByKey(key: string, scope: MemoryScope): Promise<TeamMemoryEntry | undefined> {
    const entries = await this.loadDir(scope === 'team' ? this.sharedDir : this.privateDir)
    return entries.find(e => e.key === key)
  }

  private async findById(id: string, scope: MemoryScope): Promise<TeamMemoryEntry | undefined> {
    const entries = await this.loadDir(scope === 'team' ? this.sharedDir : this.privateDir)
    return entries.find(e => e.id === id)
  }
}
