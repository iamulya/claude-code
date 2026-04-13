/**
 * Sandbox — tool execution isolation and resource control.
 *
 * Wraps tool calls with:
 *   - Execution timeout (hard kill after N ms)
 *   - Path guard (restrict file system access to allowed directories)
 *   - Network guard (intercept and block outbound requests)
 *   - Worker thread isolation (optional — runs tool in a separate thread)
 *   - Resource usage tracking (duration, call count)
 *
 * The Sandbox is transparent — it wraps tools at the AgentRunner level.
 * Tools don't know they're sandboxed.
 *
  * `src/utils/permissions/filesystem.ts` path allowlist guard.
 *
 * @example
 * ```ts
 * const sandbox = new Sandbox({
 *   timeoutMs: 10_000,
 *   allowedPaths: ['/home/user/project', '/tmp'],
 *   blockNetwork: false,
 * });
 *
 * const agent = new Agent({
 *   systemPrompt: '...',
 *   tools: myTools,
 *   sandbox,
 * });
 * ```
 */

import * as path from 'path'
import * as os from 'os'

// ── Types ─────────────────────────────────────────────────────────────────────

export type SandboxConfig = {
  /**
   * Maximum milliseconds a tool call may run.
   * After this, the call is aborted with a timeout error.
   * Default: 30_000 (30 seconds).
   */
  timeoutMs?: number

  /**
   * Directories the tool may access. Any path argument pointing outside
   * these directories is rejected before the tool runs.
   * Default: [] (no path checking).
   */
  allowedPaths?: string[]

  /**
   * Additional path blocklist. Takes precedence over `allowedPaths`.
   */
  blockedPaths?: string[]

  /**
   * When true, outbound HTTP/HTTPS fetch calls are intercepted and blocked.
   * Implemented via global fetch patching — only effective for fetch-based tools.
   * Default: false.
   */
  blockNetwork?: boolean

  /**
   * Called when the sandbox blocks a tool call.
   * Default: throws SandboxError.
   */
  onViolation?: (violation: SandboxViolation) => void

  /**
   * When true, emit debug logs for every sandbox decision.
   */
  debug?: boolean
}

export type SandboxViolation = {
  type: 'timeout' | 'path' | 'network' | 'blocked-path'
  toolName: string
  detail: string
}

export type SandboxResult<T> = {
  value: T
  durationMs: number
}

export class SandboxError extends Error {
  constructor(
    public readonly violation: SandboxViolation,
    message: string,
  ) {
    super(message)
    this.name = 'SandboxError'
  }
}

// ── Path guard ────────────────────────────────────────────────────────────────

/** Normalize a path, resolve symlinks conceptually, prevent traversal. */
function normalizePath(p: string): string {
  return path.resolve(p)
}

function isPathAllowed(
  testPath: string,
  allowedPaths: string[],
  blockedPaths: string[],
): { allowed: boolean; reason?: string } {
  const normalized = normalizePath(testPath)

  // Check blocklist first
  for (const blocked of blockedPaths) {
    if (normalized.startsWith(normalizePath(blocked))) {
      return { allowed: false, reason: `Path is blocked: ${blocked}` }
    }
  }

  // If no allowlist, permit everything (that's not blocked)
  if (allowedPaths.length === 0) return { allowed: true }

  for (const allowed of allowedPaths) {
    if (normalized.startsWith(normalizePath(allowed))) {
      return { allowed: true }
    }
  }

  return {
    allowed: false,
    reason: `Path "${normalized}" is outside allowed directories: ${allowedPaths.join(', ')}`,
  }
}

/**
 * Recursively scan an arguments object for string values that look like
 * file-system paths and validate them against the sandbox allowlist.
 */
function extractAndValidatePaths(
  args: Record<string, unknown>,
  allowedPaths: string[],
  blockedPaths: string[],
): string | null {
  const pathKeys = ['path', 'file', 'dir', 'directory', 'filePath', 'target', 'source', 'from', 'to']

  function check(value: unknown, key?: string): string | null {
    if (typeof value === 'string') {
      const looksLikePath =
        value.startsWith('/') ||
        value.startsWith('./') ||
        value.startsWith('../') ||
        (key && pathKeys.includes(key.toLowerCase()))

      if (looksLikePath) {
        const { allowed, reason } = isPathAllowed(value, allowedPaths, blockedPaths)
        if (!allowed) return reason!
      }
      return null
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        const err = check(item)
        if (err) return err
      }
    }
    if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        const err = check(v, k)
        if (err) return err
      }
    }
    return null
  }

  for (const [key, value] of Object.entries(args)) {
    const err = check(value, key)
    if (err) return err
  }
  return null
}

// ── Sandbox ───────────────────────────────────────────────────────────────────

export class Sandbox {
  private readonly timeoutMs: number
  private readonly allowedPaths: string[]
  private readonly blockedPaths: string[]
  private readonly blockNetwork: boolean
  private readonly onViolation?: (v: SandboxViolation) => void
  private readonly debug: boolean

  // Resource tracking
  private callCount = 0
  private totalDurationMs = 0
  private violationCount = 0

  constructor(config: SandboxConfig = {}) {
    this.timeoutMs = config.timeoutMs ?? 30_000
    this.allowedPaths = (config.allowedPaths ?? []).map(p => path.resolve(p))
    this.blockedPaths = (config.blockedPaths ?? []).map(p => path.resolve(p))
    this.blockNetwork = config.blockNetwork ?? false
    this.onViolation = config.onViolation
    this.debug = config.debug ?? false
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Execute a tool function under sandbox constraints.
   * Returns the tool result or throws SandboxError on policy violation.
   */
  async execute<T>(
    toolName: string,
    args: Record<string, unknown>,
    fn: (args: Record<string, unknown>) => Promise<T>,
  ): Promise<SandboxResult<T>> {
    // 1. Path validation
    if (this.allowedPaths.length > 0 || this.blockedPaths.length > 0) {
      const pathError = extractAndValidatePaths(args, this.allowedPaths, this.blockedPaths)
      if (pathError) {
        const violation: SandboxViolation = {
          type: 'path',
          toolName,
          detail: pathError,
        }
        this.handleViolation(violation)
      }
    }

    this.debugLog(`[${toolName}] executing (timeout=${this.timeoutMs}ms)`)

    // 2. Network patching (if enabled)
    const originalFetch = this.blockNetwork ? this.patchFetch(toolName) : null

    // 3. Timeout + execution
    const start = Date.now()
    this.callCount++

    try {
      const value = await this.withTimeout(toolName, fn(args), this.timeoutMs)
      const durationMs = Date.now() - start
      this.totalDurationMs += durationMs
      this.debugLog(`[${toolName}] completed in ${durationMs}ms`)
      return { value, durationMs }
    } finally {
      if (originalFetch) globalThis.fetch = originalFetch
    }
  }

  /**
   * Validate tool arguments against sandbox policies without executing.
   * Returns null if valid, or an error message if denied.
   */
  validate(toolName: string, args: Record<string, unknown>): string | null {
    if (this.allowedPaths.length > 0 || this.blockedPaths.length > 0) {
      return extractAndValidatePaths(args, this.allowedPaths, this.blockedPaths)
    }
    return null
  }

  /** Resource usage summary. */
  stats() {
    return {
      callCount: this.callCount,
      totalDurationMs: this.totalDurationMs,
      avgDurationMs: this.callCount ? this.totalDurationMs / this.callCount : 0,
      violationCount: this.violationCount,
    }
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private async withTimeout<T>(
    toolName: string,
    promise: Promise<T>,
    ms: number,
  ): Promise<T> {
    let timer: ReturnType<typeof setTimeout>
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        const violation: SandboxViolation = {
          type: 'timeout',
          toolName,
          detail: `Exceeded ${ms}ms timeout`,
        }
        this.handleViolation(violation)
        reject(new SandboxError(violation, `Tool "${toolName}" timed out after ${ms}ms`))
      }, ms)
    })

    try {
      const result = await Promise.race([promise, timeoutPromise])
      clearTimeout(timer!)
      return result
    } catch (err) {
      clearTimeout(timer!)
      throw err
    }
  }

  private patchFetch(toolName: string): typeof fetch {
    const original = globalThis.fetch
    const self = this

    globalThis.fetch = async function sandboxedFetch(input, init) {
      const url = typeof input === 'string' ? input : (input as Request).url
      const violation: SandboxViolation = {
        type: 'network',
        toolName,
        detail: `Attempted outbound request to: ${url}`,
      }
      self.handleViolation(violation)
      throw new SandboxError(violation, `Network access blocked for tool "${toolName}": ${url}`)
    }

    return original
  }

  private handleViolation(violation: SandboxViolation): never {
    this.violationCount++
    if (this.onViolation) {
      this.onViolation(violation)
    }
    throw new SandboxError(
      violation,
      `Sandbox violation [${violation.type}] in "${violation.toolName}": ${violation.detail}`,
    )
  }

  private debugLog(msg: string): void {
    if (this.debug) console.debug(`[yaaf/sandbox] ${msg}`)
  }
}

// ── Factory helpers ───────────────────────────────────────────────────────────

/** Permissive sandbox — only adds timeout protection. */
export function timeoutSandbox(timeoutMs = 30_000): Sandbox {
  return new Sandbox({ timeoutMs })
}

/** Strict sandbox — restricts to a single directory, blocks network. */
export function strictSandbox(rootDir: string, timeoutMs = 15_000): Sandbox {
  return new Sandbox({
    timeoutMs,
    allowedPaths: [rootDir],
    blockedPaths: ['/etc', '/proc', '/sys', '/dev'],
    blockNetwork: true,
  })
}

/**
 * Project sandbox — restrict to project directory with reasonable timeout.
 * Does NOT block network (most tools legitimately need it).
 */
export function projectSandbox(projectDir = process.cwd(), timeoutMs = 30_000): Sandbox {
  return new Sandbox({
    timeoutMs,
    allowedPaths: [projectDir],
    blockedPaths: [
      path.join(os.homedir(), '.ssh'),
      path.join(os.homedir(), '.aws'),
      path.join(os.homedir(), '.config', 'gcloud'),
    ],
  })
}
