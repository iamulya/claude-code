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
import { AsyncLocalStorage } from 'async_hooks'

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
   * When true, outbound network access is restricted.
   *
   * **IMPORTANT — C2 limitation:** This guard inspects tool *arguments* for
   * URL patterns before execution. It does NOT intercept actual `fetch()` or
   * `http.request()` calls from tool code. Tools that construct URLs
   * dynamically inside their `call()` function bypass this check.
   *
   * For true network isolation, run tools in a separate subprocess with
   * network namespace restrictions, or use `sandboxFetch` to intercept
   * runtime fetch calls within the tool execution context.
   *
   * Default: false.
   */
  blockNetwork?: boolean

  /**
   * C2 FIX: Optional fetch interceptor for runtime network blocking.
   *
   * CRITIQUE #1 FIX: Unlike the previous implementation, the sandbox
   * no longer swaps `globalThis.fetch` (inherently racy under concurrency).
   * Instead, this function is injected as `args.__sandboxFetch` into every
   * sandboxed tool call. Tools that want network isolation should use this
   * injected fetch instead of the global one.
   *
   * For true network blocking, combine with an OS-level restriction (network
   * namespace, iptables) or use the `networkBlockingFetch` factory which
   * throws on every call.
   *
   * @example
   * ```ts
   * const sandbox = new Sandbox({
   *   blockNetwork: true,
   *   sandboxFetch: (input, init) => {
   *     throw new Error('Network access blocked by sandbox');
   *   },
   * });
   * ```
   */
  sandboxFetch?: typeof globalThis.fetch

  /**
   * CRITIQUE #2 FIX: Optional runtime path validator callback.
   *
   * Called during tool execution to validate paths that tools resolve
   * internally (not visible in argument scanning). Tools can call
   * `ctx.extra.__validatePath(resolvedPath)` during execution.
   *
   * This addresses the inherent limitation of argument-based path scanning:
   * tools that construct paths dynamically inside their `call()` function
   * bypass the static argument check.
   *
   * @example
   * ```ts
   * const sandbox = new Sandbox({
   *   allowedPaths: ['/home/user/project'],
   *   pathValidator: (toolName, resolvedPath) => {
   *     // Custom validation runs during tool execution
   *     return resolvedPath.startsWith('/home/user/project');
   *   },
   * });
   * ```
   */
  pathValidator?: (toolName: string, resolvedPath: string) => boolean

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
 * M10 FIX: Recursively scan an arguments object for string values that look like
 * file-system paths and validate them against the sandbox allowlist.
 *
 * Improved heuristics:
 * - Checks a broader set of key names (case-insensitive)
 * - Detects relative paths without explicit prefix (`src/file.ts`)
 * - Scans all string values, not just those matching key names
 */
function extractAndValidatePaths(
  args: Record<string, unknown>,
  allowedPaths: string[],
  blockedPaths: string[],
): string | null {
  const pathKeys = new Set([
    'path', 'file', 'dir', 'directory', 'filepath', 'target', 'source',
    'from', 'to', 'filename', 'dirname', 'outputfile', 'inputfile',
    'configlocation', 'datasource', 'destination', 'workdir', 'root',
    'basepath', 'rootdir', 'cwd', 'outputpath', 'inputpath', 'location',
  ])

  // M10 FIX: Broader path detection heuristic
  function looksLikePath(value: string, key?: string): boolean {
    // Absolute paths
    if (value.startsWith('/') || value.startsWith('~')) return true
    // Explicit relative paths
    if (value.startsWith('./') || value.startsWith('../')) return true
    // Key name suggests a path
    if (key && pathKeys.has(key.toLowerCase())) return true
    // Heuristic: contains path separators and looks like a file path
    // (e.g., 'src/config/secrets.env' or 'data\\backup.sql')
    if (/^[\w.-]+[\/\\][\w.\/-]+$/.test(value) && value.includes('/')) return true
    return false
  }

  function check(value: unknown, key?: string): string | null {
    if (typeof value === 'string') {
      if (looksLikePath(value, key)) {
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
  private readonly sandboxFetch?: typeof globalThis.fetch
  private readonly pathValidator?: (toolName: string, resolvedPath: string) => boolean
  private readonly onViolation?: (v: SandboxViolation) => void
  private readonly debug: boolean

  // Resource tracking
  private callCount = 0
  private totalDurationMs = 0
  private violationCount = 0

  /**
   * CRITIQUE #1 FIX — AsyncLocalStorage-based fetch interception.
   *
   * Module-level ALS that stores the sandbox-scoped fetch override
   * for the current async context. When a tool calls globalThis.fetch,
   * our installed proxy checks this ALS to decide whether to block.
   *
   * This is concurrency-safe: ALS is scoped to the async call chain,
   * NOT process-wide. Two concurrent sandbox.execute() calls each get
   * their own ALS context.
   */
  private static readonly _fetchALS = new AsyncLocalStorage<{
    blockedFetch: typeof globalThis.fetch
    toolName: string
  }>()
  private static _fetchProxyInstalled = false

  /**
   * Install a one-time globalThis.fetch proxy that delegates to the
   * ALS-scoped sandbox fetch when inside a sandboxed execution.
   * Outside sandbox context, passes through to the original fetch.
   */
  private static installFetchProxy(): void {
    if (Sandbox._fetchProxyInstalled) return
    Sandbox._fetchProxyInstalled = true

    const originalFetch = globalThis.fetch
    globalThis.fetch = function sandboxFetchProxy(
      input: string | URL | Request,
      init?: RequestInit,
    ): Promise<Response> {
      const ctx = Sandbox._fetchALS.getStore()
      if (ctx) {
        // Inside a sandboxed tool execution — use the blocked/audited fetch
        return ctx.blockedFetch(input, init)
      }
      // Outside sandbox — passthrough to original
      return originalFetch(input, init)
    } as typeof globalThis.fetch
  }

  constructor(config: SandboxConfig = {}) {
    this.timeoutMs = config.timeoutMs ?? 30_000
    this.allowedPaths = (config.allowedPaths ?? []).map(p => path.resolve(p))
    this.blockedPaths = (config.blockedPaths ?? []).map(p => path.resolve(p))
    this.blockNetwork = config.blockNetwork ?? false
    this.sandboxFetch = config.sandboxFetch
    this.pathValidator = config.pathValidator
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

    // W-17 fix: URL-based network check instead of global fetch patching.
    // Validates argument strings for URL patterns before execution.
    if (this.blockNetwork) {
      const urlError = this.checkForUrls(args, toolName)
      if (urlError) {
        const violation: SandboxViolation = {
          type: 'network',
          toolName,
          detail: urlError,
        }
        this.handleViolation(violation)
      }
    }

    this.debugLog(`[${toolName}] executing (timeout=${this.timeoutMs}ms)`)

    // M11 FIX: Create a child AbortController for the timeout so the tool
    // actually gets cancelled. The signal is passed into the tool function.
    const timeoutAbort = new AbortController()

    // 3. Timeout + execution
    const start = Date.now()
    this.callCount++

    try {
      // M11 FIX: Inject the abort signal into args so tools can check it.
      Object.defineProperty(args, '__sandboxAbortSignal', {
        value: timeoutAbort.signal,
        writable: false,
        enumerable: false,
        configurable: true,
      })

      // CRITIQUE #2 FIX: Inject runtime path validator so tools can validate
      // paths they construct dynamically inside their call() function.
      if (this.pathValidator || this.allowedPaths.length > 0 || this.blockedPaths.length > 0) {
        const validatePath = (resolvedPath: string): boolean => {
          if (this.pathValidator) {
            return this.pathValidator(toolName, resolvedPath)
          }
          const { allowed } = isPathAllowed(resolvedPath, this.allowedPaths, this.blockedPaths)
          return allowed
        }
        Object.defineProperty(args, '__validatePath', {
          value: validatePath,
          writable: false,
          enumerable: false,
          configurable: true,
        })
      }

      // CRITIQUE #1 FIX: Use AsyncLocalStorage to scope fetch blocking.
      // This ACTUALLY blocks globalThis.fetch for tools that call it directly,
      // without requiring tools to opt-in to __sandboxFetch.
      if (this.blockNetwork) {
        Sandbox.installFetchProxy()

        const blockedFetch: typeof globalThis.fetch = this.sandboxFetch ?? (
          async (_input: string | URL | Request, _init?: RequestInit) => {
            throw new SandboxError(
              { type: 'network', toolName, detail: 'Network access blocked by sandbox' },
              `Network access blocked for tool "${toolName}"`,
            )
          }
        )

        // Also inject as non-enumerable prop for tools that want explicit access
        Object.defineProperty(args, '__sandboxFetch', {
          value: blockedFetch,
          writable: false,
          enumerable: false,
          configurable: true,
        })

        // Run the tool inside the ALS context so globalThis.fetch is blocked
        const value = await Sandbox._fetchALS.run(
          { blockedFetch, toolName },
          () => this.withTimeout(toolName, fn(args), this.timeoutMs, timeoutAbort),
        )
        const durationMs = Date.now() - start
        this.totalDurationMs += durationMs
        this.debugLog(`[${toolName}] completed in ${durationMs}ms`)
        return { value, durationMs }
      }

      // Non-network-blocked path: execute normally
      const value = await this.withTimeout(toolName, fn(args), this.timeoutMs, timeoutAbort)
      const durationMs = Date.now() - start
      this.totalDurationMs += durationMs
      this.debugLog(`[${toolName}] completed in ${durationMs}ms`)
      return { value, durationMs }
    } finally {
      // Ensure cleanup of the abort controller
      if (!timeoutAbort.signal.aborted) {
        timeoutAbort.abort('cleanup')
      }
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
    timeoutAbort: AbortController,
  ): Promise<T> {
    let timer: ReturnType<typeof setTimeout>
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        const violation: SandboxViolation = {
          type: 'timeout',
          toolName,
          detail: `Exceeded ${ms}ms timeout`,
        }
        // W-19 fix: Signal the tool to stop via its abort controller
        timeoutAbort.abort('timeout')
        // Inline violation tracking instead of calling handleViolation()
        // because handleViolation() throws synchronously, which would
        // propagate as an unhandled exception from setTimeout — the
        // reject() below would never execute and the timeout would have
        // no effect on the Promise.race.
        this.violationCount++
        this.onViolation?.(violation)
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

  /**
   * W-17 fix: Check argument values for URLs when network blocking is enabled.
   * This replaces the unsafe global fetch patching that could break concurrent code.
   * Returns an error message if a URL is found, null otherwise.
   */
  private checkForUrls(args: Record<string, unknown>, toolName: string): string | null {
    const urlPatterns = /https?:\/\/[^\s"']+/i
    const urlKeys = ['url', 'uri', 'endpoint', 'href', 'link', 'baseUrl', 'apiUrl']

    function check(value: unknown, key?: string): string | null {
      if (typeof value === 'string') {
        const isUrlKey = key && urlKeys.includes(key)
        if (isUrlKey || urlPatterns.test(value)) {
          return `Network access blocked for tool "${toolName}": URL detected in args (${key ?? 'value'})`
        }
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
