/**
 * Scratchpad — shared writable directory for cross-agent collaboration.
 *
 * Inspired by the main repo's coordinator scratchpad. Provides a managed
 * temporary directory where multiple agents can read/write files without
 * permission prompts, enabling durable cross-worker knowledge sharing.
 *
 * @example
 * ```ts
 * const scratch = new Scratchpad({ baseDir: '/tmp/yaaf-scratch' });
 *
 * // Agent A writes research findings:
 * await scratch.write('research.md', '## Auth Bug\n...');
 *
 * // Agent B reads them:
 * const findings = await scratch.read('research.md');
 *
 * // List all files:
 * const files = await scratch.list();
 *
 * // Cleanup on session end:
 * await scratch.destroy();
 * ```
 */

import * as fs from 'fs/promises'
import * as path from 'path'

// ── Types ────────────────────────────────────────────────────────────────────

export type ScratchpadConfig = {
  /** Base directory for scratchpad files. Default: OS tmpdir + random suffix. */
  baseDir?: string
  /** Maximum total size in bytes. Default: 50MB. */
  maxTotalBytes?: number
  /** Maximum number of files. Default: 100. */
  maxFiles?: number
}

export type ScratchpadEntry = {
  name: string
  size: number
  lastModified: Date
}

// ── Scratchpad ───────────────────────────────────────────────────────────────

export class Scratchpad {
  readonly dir: string
  private readonly maxTotalBytes: number
  private readonly maxFiles: number
  private initialized = false

  constructor(config: ScratchpadConfig = {}) {
    this.dir = config.baseDir ?? path.join(
      process.env.TMPDIR ?? '/tmp',
      `yaaf-scratch-${Date.now().toString(36)}`,
    )
    this.maxTotalBytes = config.maxTotalBytes ?? 50 * 1024 * 1024
    this.maxFiles = config.maxFiles ?? 100
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────

  /** Ensure the scratchpad directory exists. */
  async init(): Promise<void> {
    if (this.initialized) return
    await fs.mkdir(this.dir, { recursive: true })
    this.initialized = true
  }

  /** Remove the entire scratchpad directory. */
  async destroy(): Promise<void> {
    try {
      await fs.rm(this.dir, { recursive: true, force: true })
    } catch {
      // Best-effort
    }
    this.initialized = false
  }

  // ── File Operations ────────────────────────────────────────────────────

  /** Write a file to the scratchpad. */
  async write(filename: string, content: string | Buffer): Promise<string> {
    await this.init()
    this.validateFilename(filename)

    // Check limits
    const entries = await this.list()
    if (entries.length >= this.maxFiles) {
      throw new Error(`Scratchpad file limit reached (${this.maxFiles})`)
    }

    const totalSize = entries.reduce((sum, e) => sum + e.size, 0)
    const newSize = typeof content === 'string' ? Buffer.byteLength(content) : content.length
    if (totalSize + newSize > this.maxTotalBytes) {
      throw new Error(`Scratchpad size limit reached (${this.maxTotalBytes} bytes)`)
    }

    const filePath = path.join(this.dir, filename)
    // Ensure subdirectories exist
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, content, 'utf-8')
    return filePath
  }

  /** Read a file from the scratchpad. */
  async read(filename: string): Promise<string> {
    await this.init()
    const filePath = path.join(this.dir, filename)
    return fs.readFile(filePath, 'utf-8')
  }

  /** Check if a file exists in the scratchpad. */
  async exists(filename: string): Promise<boolean> {
    try {
      const filePath = path.join(this.dir, filename)
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  /** Delete a file from the scratchpad. */
  async remove(filename: string): Promise<void> {
    const filePath = path.join(this.dir, filename)
    await fs.unlink(filePath)
  }

  /** List all files in the scratchpad. */
  async list(): Promise<ScratchpadEntry[]> {
    await this.init()
    const entries: ScratchpadEntry[] = []

    try {
      await this.walkDir(this.dir, '', entries)
    } catch {
      // Empty directory
    }

    return entries
  }

  /** Get the full path for a scratchpad file. */
  resolve(filename: string): string {
    return path.join(this.dir, filename)
  }

  // ── Internal ───────────────────────────────────────────────────────────

  private async walkDir(base: string, prefix: string, entries: ScratchpadEntry[]): Promise<void> {
    const items = await fs.readdir(base, { withFileTypes: true })
    for (const item of items) {
      const relative = prefix ? `${prefix}/${item.name}` : item.name
      if (item.isDirectory()) {
        await this.walkDir(path.join(base, item.name), relative, entries)
      } else {
        const stat = await fs.stat(path.join(base, item.name))
        entries.push({
          name: relative,
          size: stat.size,
          lastModified: stat.mtime,
        })
      }
    }
  }

  private validateFilename(filename: string): void {
    // Prevent path traversal
    const normalized = path.normalize(filename)
    if (normalized.startsWith('..') || path.isAbsolute(normalized)) {
      throw new Error(`Invalid scratchpad filename: ${filename}`)
    }
  }
}
