/**
 * Sandbox — tool execution isolation and resource control.
 *
 * Wraps tool calls with:
 * - Execution timeout (hard kill after N ms)
 * - Path guard (restrict file system access to allowed directories)
 * - Network guard (intercept and block outbound requests)
 * - Worker thread isolation (optional — runs tool in a separate thread)
 * - Resource usage tracking (duration, call count)
 *
 * The Sandbox is transparent — it wraps tools at the AgentRunner level.
 * Tools don't know they're sandboxed.
 *
 * `src/utils/permissions/filesystem.ts` path allowlist guard.
 *
 * @example
 * ```ts
 * const sandbox = new Sandbox({
 * timeoutMs: 10_000,
 * allowedPaths: ['/home/user/project', '/tmp'],
 * blockNetwork: false,
 * });
 *
 * const agent = new Agent({
 * systemPrompt: '...',
 * tools: myTools,
 * sandbox,
 * });
 * ```
 */

import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import { AsyncLocalStorage } from "async_hooks";
import * as httpModule from "http";
import * as httpsModule from "https";
import * as netModule from "net";
import { Worker } from "worker_threads";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SandboxConfig = {
  /**
   * Maximum milliseconds a tool call may run.
   * After this, the call is aborted with a timeout error.
   * Default: 30_000 (30 seconds).
   */
  timeoutMs?: number;

  /**
   * Directories the tool may access. Any path argument pointing outside
   * these directories is rejected before the tool runs.
   * Default: [] (no path checking).
   */
  allowedPaths?: string[];

  /**
   * Additional path blocklist. Takes precedence over `allowedPaths`.
   */
  blockedPaths?: string[];

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
  blockNetwork?: boolean;

  /**
   * Optional fetch interceptor for runtime network blocking.
   *
   * Unlike the previous implementation, the sandbox
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
   * blockNetwork: true,
   * sandboxFetch: (input, init) => {
   * throw new Error('Network access blocked by sandbox');
   * },
   * });
   * ```
   */
  sandboxFetch?: typeof globalThis.fetch;

  /**
   * Optional runtime path validator callback.
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
   * allowedPaths: ['/home/user/project'],
   * pathValidator: (toolName, resolvedPath) => {
   * // Custom validation runs during tool execution
   * return resolvedPath.startsWith('/home/user/project');
   * },
   * });
   * ```
   */
  pathValidator?: (toolName: string, resolvedPath: string) => boolean;

  /**
   * Called when the sandbox blocks a tool call.
   * Default: throws SandboxError.
   */
  onViolation?: (violation: SandboxViolation) => void;

  /**
   * When true, emit debug logs for every sandbox decision.
   */
  debug?: boolean;

  /**
   * Execution runtime for this sandbox.
   *
   * - `'inline'` (default): tool runs in the same thread.
   * Network blocking via ALS + Object.defineProperty. Fast (~0ms overhead).
   * Limitation: net.createConnection may not be interceptible in strict ESM (Node v22+).
   *
   * - `'worker'`: tool runs in a dedicated worker_thread with a fresh module graph.
   * net.createConnection, http.request, https.request are ALL blocked before user code
   * runs (patching always succeeds on a fresh worker module graph).
   * Adds ~5-20ms overhead per tool call (one-time worker creation cost).
   * Recommended for: blockNetwork:true, code-execution tools, high-privilege agents.
   *
   * - `'external'`: tool runs inside an external runtime supplied via `sandboxBackend`.
   * Provides maximum isolation — separate kernel, no shared address space, no shared
   * module graph. Required when `sandboxBackend` is set.
   * Overhead: depends on backend (~5ms for Firecracker snapshot-restore, ~1ms for gVisor).
   *
   * **Worker/external mode constraint:** The tool `fn` must be serializable via
   * `fn.toString()`. Functions that close over non-serializable state (DB connections,
   * sockets, class instances) cannot be transferred. Design tools as pure functions.
   */
  sandboxRuntime?: "inline" | "worker" | "external";

  /**
   * External sandbox backend. Required when `sandboxRuntime: 'external'`.
   *
   * The backend receives the serialized tool function and arguments and runs
   * them in an isolated environment (Firecracker microVM, gVisor, nsjail…).
   *
   * Implementations — plain interface, or optionally `extends PluginBase`:
   * - `FirecrackerSandboxBackend` (`yaaf/integrations/sandbox.firecracker`)
   * - Any object matching `SandboxExternalBackend`
   *
   * @example
   * ```ts
   * // Standalone usage:
   * const backend = new FirecrackerSandboxBackend({ kernelImagePath: '...', rootfsImagePath: '...' })
   * await backend.initialize()
   * const sandbox = new Sandbox({ sandboxRuntime: 'external', sandboxBackend: backend })
   *
   * // Via PluginHost (lifecycle managed, health visible in /health):
   * await host.register(backend)
   * sandbox.setBackend(backend)
   * ```
   */
  sandboxBackend?: SandboxExternalBackend;
};

/**
 * Contract for an external sandbox execution backend.
 *
 * Follows the same pattern as `DistributedIPCBackend` and `DistributedRateLimitBackend`:
 * a plain interface injected into `Sandbox` via config, without coupling to `PluginHost`.
 * The concrete implementation (`FirecrackerSandboxBackend`) can also extend `PluginBase`
 * for optional lifecycle integration — the caller decides which mode to use.
 *
 * @example Redis-like minimal implementation:
 * ```ts
 * class MyGVisorBackend implements SandboxExternalBackend {
 * async execute<T>(toolName, fnSrc, args) {
 * // send to gVisor-wrapped subprocess, return result
 * }
 * async dispose() { \/* cleanup *\/ }
 * }
 * ```
 */
export interface SandboxExternalBackend {
  /**
   * Execute a serialized tool function in the external sandbox.
   *
   * @param toolName - Name of the tool (for logging / timeout errors).
   * @param fnSrc - `fn.toString()` output — must be self-contained (no external closures).
   * @param args - Structurally-cloneable arguments for the tool.
   * @returns The tool's return value, deserialized from the sandbox.
   */
  execute<T>(toolName: string, fnSrc: string, args: Record<string, unknown>): Promise<T>;

  /**
   * Shut down the backend gracefully.
   * Called when the `Sandbox` is no longer needed, or when the
   * owning `PluginHost` is destroyed.
   */
  dispose(): Promise<void>;
}

export type SandboxViolation = {
  type: "timeout" | "path" | "network" | "blocked-path";
  toolName: string;
  detail: string;
};

export type SandboxResult<T> = {
  value: T;
  durationMs: number;
};

export class SandboxError extends Error {
  constructor(
    public readonly violation: SandboxViolation,
    message: string,
  ) {
    super(message);
    this.name = "SandboxError";
  }
}

// ── Path guard ────────────────────────────────────────────────────────────────

/**
 * Normalize a path and resolve symlinks to prevent traversal attacks.
 *
 * Uses fs.realpathSync to resolve symlinks so that a symlink inside an allowed
 * directory that points outside it (e.g., /allowed/link -> /etc/passwd) is
 * caught by the allowlist check.
 *
 * Falls back to path.resolve() for paths that don't exist yet (creation case),
 * so creating new files inside an allowed directory is not broken.
 */
function normalizePath(p: string): string {
  const resolved = path.resolve(p);
  try {
    // Resolve symlinks — catches symlink-based path traversal attacks.
    // This throws ENOENT if the path doesn't exist yet (creation case).
    return fs.realpathSync(resolved);
  } catch {
    // Path doesn't exist yet — walk up to the closest existing ancestor
    // and resolve IT via realpathSync, then re-append the remaining segments.
    // This prevents symlink mismatches on macOS where /var → /private/var:
    // without this fix, an existing allowedPath resolves to /private/var/...
    // but a non-existing testPath falls back to /var/..., breaking the
    // prefix comparison in isPathAllowed().
    let current = resolved;
    const trailing: string[] = [];
    while (current !== path.dirname(current)) {
      const parent = path.dirname(current);
      trailing.unshift(path.basename(current));
      try {
        const realParent = fs.realpathSync(parent);
        return path.join(realParent, ...trailing);
      } catch {
        current = parent;
      }
    }
    // No ancestor exists at all — use lexicographic resolution
    return resolved;
  }
}

function isPathAllowed(
  testPath: string,
  allowedPaths: string[],
  blockedPaths: string[],
): { allowed: boolean; reason?: string } {
  const normalized = normalizePath(testPath);

  // Check blocklist first
  for (const blocked of blockedPaths) {
    if (normalized.startsWith(normalizePath(blocked))) {
      return { allowed: false, reason: `Path is blocked: ${blocked}` };
    }
  }

  // If no allowlist, permit everything (that's not blocked)
  if (allowedPaths.length === 0) return { allowed: true };

  for (const allowed of allowedPaths) {
    // SB-1 FIX: Use exact match OR prefix + separator to prevent prefix-collision
    // attacks where /allowed/project matches /allowed/project-secret.
    // Without the trailing separator, startsWith('/project') would also match
    // '/project2', '/project_secret', etc.
    const normalizedAllowed = normalizePath(allowed);
    if (normalized === normalizedAllowed || normalized.startsWith(normalizedAllowed + path.sep)) {
      return { allowed: true };
    }
  }

  return {
    allowed: false,
    reason: `Path "${normalized}" is outside allowed directories: ${allowedPaths.join(", ")}`,
  };
}

/**
 * Recursively scan an arguments object for string values that look like
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
    "path",
    "file",
    "dir",
    "directory",
    "filepath",
    "target",
    "source",
    "from",
    "to",
    "filename",
    "dirname",
    "outputfile",
    "inputfile",
    "configlocation",
    "datasource",
    "destination",
    "workdir",
    "root",
    "basepath",
    "rootdir",
    "cwd",
    "outputpath",
    "inputpath",
    "location",
  ]);

  // Broader path detection heuristic
  function looksLikePath(value: string, key?: string): boolean {
    // POSIX absolute paths
    if (value.startsWith("/") || value.startsWith("~")) return true;
    // Explicit relative paths
    if (value.startsWith("./") || value.startsWith("../")) return true;
    // Windows-style absolute paths (C:\... or C:/...)
    // These bypassed the heuristic on Windows hosts and when the LLM supplied
    // Windows paths to POSIX-hosted agents (cross-context attacks).
    if (/^[A-Za-z]:[\\/]/.test(value)) return true;
    // Key name suggests a path
    if (key && pathKeys.has(key.toLowerCase())) return true;
    // Heuristic: contains path separators and looks like a file path
    // (e.g., 'src/config/secrets.env' or 'data\\backup.sql')
    if (/^[\w.-]+[\/\\][\w.\/-]+$/.test(value) && value.includes("/")) return true;
    return false;
  }

  function check(value: unknown, key?: string): string | null {
    if (typeof value === "string") {
      if (looksLikePath(value, key)) {
        const { allowed, reason } = isPathAllowed(value, allowedPaths, blockedPaths);
        if (!allowed) return reason!;
      }
      return null;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        const err = check(item);
        if (err) return err;
      }
    }
    if (value && typeof value === "object") {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        const err = check(v, k);
        if (err) return err;
      }
    }
    return null;
  }

  for (const [key, value] of Object.entries(args)) {
    const err = check(value, key);
    if (err) return err;
  }
  return null;
}

// ── Sandbox ───────────────────────────────────────────────────────────────────

export class Sandbox {
  private readonly timeoutMs: number;
  private readonly allowedPaths: string[];
  private readonly blockedPaths: string[];
  private readonly blockNetwork: boolean;
  private readonly sandboxFetch?: typeof globalThis.fetch;
  private readonly pathValidator?: (toolName: string, resolvedPath: string) => boolean;
  private readonly onViolation?: (v: SandboxViolation) => void;
  private readonly debug: boolean;

  // Resource tracking
  private callCount = 0;
  private totalDurationMs = 0;
  private violationCount = 0;

  /**
   *  AsyncLocalStorage-based fetch interception.
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
    blockedFetch: typeof globalThis.fetch;
    toolName: string;
  }>();
  private static _fetchProxyInstalled = false;

  /**
   * Install a one-time globalThis.fetch proxy that delegates to the
   * ALS-scoped sandbox fetch when inside a sandboxed execution.
   * Outside sandbox context, passes through to the original fetch.
   */
  private static installFetchProxy(): void {
    if (Sandbox._fetchProxyInstalled) return;
    Sandbox._fetchProxyInstalled = true;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = function sandboxFetchProxy(
      input: string | URL | Request,
      init?: RequestInit,
    ): Promise<Response> {
      const ctx = Sandbox._fetchALS.getStore();
      if (ctx) {
        // Inside a sandboxed tool execution — use the blocked/audited fetch
        return ctx.blockedFetch(input, init);
      }
      // Outside sandbox — passthrough to original
      return originalFetch(input, init);
    } as typeof globalThis.fetch;
  }

  /**
   * ALS-based node:http / node:https interception.
   *
   * Tools that use `require('http').request()`, `require('https').request()`,
   * or libraries built on them (axios, undici, got in http mode, needle, etc.)
   * bypass `globalThis.fetch`. This proxy intercepts at the `http.request` /
   * `https.request` level using the same ALS context, so blockNetwork:true is
   * enforced for ALL outbound HTTP regardless of the HTTP client library used.
   *
   * **Limitation (documented):** Libraries that open raw TCP sockets via
   * `net.createConnection()` or use WebSockets bypass even this layer.
   * For complete isolation, combine with OS-level network restrictions.
   */
  private static _httpProxyInstalled = false;

  private static installHttpProxy(): void {
    if (Sandbox._httpProxyInstalled) return;
    Sandbox._httpProxyInstalled = true;

    function makeHttpRequestProxy<T extends (...args: never[]) => unknown>(
      original: T,
      label: string,
    ): T {
      return function sandboxHttpProxy(this: unknown, ...args: Parameters<T>): ReturnType<T> {
        const ctx = Sandbox._fetchALS.getStore();
        if (ctx) {
          const err = new SandboxError(
            { type: "network", toolName: ctx.toolName, detail: `${label} blocked by sandbox` },
            `Network access blocked for tool "${ctx.toolName}" (${label}).`,
          );
          // Return a fake EventEmitter that immediately emits 'error'
          // so callers using the callback form get a proper error event.
          const { EventEmitter } = require("events") as typeof import("events");
          const fake = new EventEmitter() as ReturnType<T>;
          process.nextTick(() => (fake as EventEmitter).emit("error", err));
          return fake;
        }
        return (original as (...a: unknown[]) => ReturnType<T>)(...args);
      } as T;
    }

    // Use Object.defineProperty with configurable:true so subsequent
    // reinstallation (e.g. in test suites with module resets) does not throw.
    // Wrapped in try-catch: some Node.js/Vitest environments mark http exports
    // as non-configurable in ESM strict mode, in which case we skip interception
    // and fall back to the documented limitation (combine with OS-level isolation).
    try {
      const origHttpReq = httpModule.request.bind(httpModule);
      const origHttpGet = httpModule.get.bind(httpModule);
      Object.defineProperty(httpModule, "request", {
        value: makeHttpRequestProxy(origHttpReq, "http.request"),
        writable: true,
        configurable: true,
        enumerable: true,
      });
      Object.defineProperty(httpModule, "get", {
        value: makeHttpRequestProxy(origHttpGet, "http.get"),
        writable: true,
        configurable: true,
        enumerable: true,
      });
    } catch {
      console.warn(
        "[yaaf/sandbox] Could not intercept http.request — module exports are non-configurable. " +
          "Network blocking via blockNetwork:true is limited to globalThis.fetch. " +
          "Use OS-level isolation for complete network blocking.",
      );
    }

    try {
      const origHttpsReq = httpsModule.request.bind(httpsModule);
      const origHttpsGet = httpsModule.get.bind(httpsModule);
      Object.defineProperty(httpsModule, "request", {
        value: makeHttpRequestProxy(origHttpsReq, "https.request"),
        writable: true,
        configurable: true,
        enumerable: true,
      });
      Object.defineProperty(httpsModule, "get", {
        value: makeHttpRequestProxy(origHttpsGet, "https.get"),
        writable: true,
        configurable: true,
        enumerable: true,
      });
    } catch {
      console.warn(
        "[yaaf/sandbox] Could not intercept https.request — module exports are non-configurable.",
      );
    }
  }

  /**
   * Intercept node:net to close the TCP + WebSocket bypass.
   *
   * Libraries that use `net.createConnection()` directly (undici, ws, uWebSockets,
   * some axios configurations) bypass both globalThis.fetch and http.request.
   * This proxy intercepts at the lowest practical userland level.
   *
   * **Coverage:**
   * - Raw TCP connections (`net.createConnection()`, `net.connect()`)
   * - WebSocket upgrades (the `ws` package uses `net.createConnection`)
   * - undici (Node's built-in HTTP/2 client uses net.connect in some configs)
   *
   * **Remaining gap (documented):** Code that uses the native `uv_tcp_connect` via
   * native addons or `node:dgram` (UDP) still bypasses this layer.
   * For complete isolation, combine with Docker `--network=none` or seccomp.
   */
  private static _netProxyInstalled = false;

  private static installNetProxy(): void {
    if (Sandbox._netProxyInstalled) return;
    Sandbox._netProxyInstalled = true;

    function makeNetProxy<T extends (...args: never[]) => unknown>(original: T, label: string): T {
      return function sandboxNetProxy(this: unknown, ...args: Parameters<T>): ReturnType<T> {
        const ctx = Sandbox._fetchALS.getStore();
        if (ctx) {
          const err = new SandboxError(
            { type: "network", toolName: ctx.toolName, detail: `${label} blocked by sandbox` },
            `Network access blocked for tool "${ctx.toolName}" (${label}).`,
          );
          // Return a fake Socket-like EventEmitter that immediately emits 'error'
          const { EventEmitter } = require("events") as typeof import("events");
          const fake = new EventEmitter() as ReturnType<T>;
          process.nextTick(() => (fake as EventEmitter).emit("error", err));
          return fake;
        }
        return (original as (...a: unknown[]) => ReturnType<T>)(...args);
      } as T;
    }

    try {
      const origCreate = netModule.createConnection.bind(netModule);
      const origConnect = netModule.connect.bind(netModule);
      Object.defineProperty(netModule, "createConnection", {
        value: makeNetProxy(origCreate, "net.createConnection"),
        writable: true,
        configurable: true,
        enumerable: true,
      });
      Object.defineProperty(netModule, "connect", {
        value: makeNetProxy(origConnect, "net.connect"),
        writable: true,
        configurable: true,
        enumerable: true,
      });
    } catch {
      console.warn(
        "[yaaf/sandbox] Could not intercept net.createConnection — module exports are non-configurable. " +
          "TCP/WebSocket bypass is not blocked. Use OS-level isolation for complete network blocking.",
      );
    }
  }

  constructor(config: SandboxConfig = {}) {
    this.timeoutMs = config.timeoutMs ?? 30_000;
    this.allowedPaths = (config.allowedPaths ?? []).map((p) => path.resolve(p));
    this.blockedPaths = (config.blockedPaths ?? []).map((p) => path.resolve(p));
    this.blockNetwork = config.blockNetwork ?? false;
    this.sandboxFetch = config.sandboxFetch;
    this.pathValidator = config.pathValidator;
    this.onViolation = config.onViolation;
    this.debug = config.debug ?? false;
    this._sandboxRuntime = config.sandboxRuntime ?? "inline";
    this._sandboxBackend = config.sandboxBackend;
  }

  /**
   * Inject or replace the external sandbox backend at runtime.
   * Useful when the backend is registered with PluginHost after Sandbox construction:
   *
   * ```ts
   * await host.register(new FirecrackerSandboxBackend({ ... }))
   * sandbox.setBackend(host.getAdapter('sandbox_backend'))
   * ```
   */
  setBackend(backend: SandboxExternalBackend): void {
    this._sandboxBackend = backend;
  }

  // ── Private fields ───────────────────────────────────────────────────────
  private readonly _sandboxRuntime: "inline" | "worker" | "external";
  private _sandboxBackend?: SandboxExternalBackend;

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
    // External runtime: delegate entirely to the backend (Firecracker, gVisor, …)
    if (this._sandboxRuntime === "external") {
      return this._executeExternal<T>(toolName, args, fn);
    }

    // Worker runtime — delegate to executeInWorker() when configured
    if (this._sandboxRuntime === "worker") {
      return this.executeInWorker<T>(toolName, args, fn);
    }

    // 1. Path validation
    if (this.allowedPaths.length > 0 || this.blockedPaths.length > 0) {
      const pathError = extractAndValidatePaths(args, this.allowedPaths, this.blockedPaths);
      if (pathError) {
        const violation: SandboxViolation = {
          type: "path",
          toolName,
          detail: pathError,
        };
        this.handleViolation(violation);
      }
    }

    // URL-based network check instead of global fetch patching.
    // Validates argument strings for URL patterns before execution.
    if (this.blockNetwork) {
      const urlError = this.checkForUrls(args, toolName);
      if (urlError) {
        const violation: SandboxViolation = {
          type: "network",
          toolName,
          detail: urlError,
        };
        this.handleViolation(violation);
      }
    }

    this.debugLog(`[${toolName}] executing (timeout=${this.timeoutMs}ms)`);

    // Create a child AbortController for the timeout so the tool
    // actually gets cancelled. The signal is passed into the tool function.
    const timeoutAbort = new AbortController();

    // 3. Timeout + execution
    const start = Date.now();
    this.callCount++;

    try {
      // Inject the abort signal into args so tools can check it.
      Object.defineProperty(args, "__sandboxAbortSignal", {
        value: timeoutAbort.signal,
        writable: false,
        enumerable: false,
        configurable: true,
      });

      // Inject runtime path validator so tools can validate
      // paths they construct dynamically inside their call() function.
      if (this.pathValidator || this.allowedPaths.length > 0 || this.blockedPaths.length > 0) {
        const validatePath = (resolvedPath: string): boolean => {
          if (this.pathValidator) {
            return this.pathValidator(toolName, resolvedPath);
          }
          const { allowed } = isPathAllowed(resolvedPath, this.allowedPaths, this.blockedPaths);
          return allowed;
        };
        Object.defineProperty(args, "__validatePath", {
          value: validatePath,
          writable: false,
          enumerable: false,
          configurable: true,
        });
      }

      // Use AsyncLocalStorage to scope fetch blocking.
      // This ACTUALLY blocks globalThis.fetch for tools that call it directly,
      // without requiring tools to opt-in to __sandboxFetch.
      if (this.blockNetwork) {
        Sandbox.installFetchProxy();

        const blockedFetch: typeof globalThis.fetch =
          this.sandboxFetch ??
          (async (_input: string | URL | Request, _init?: RequestInit) => {
            throw new SandboxError(
              { type: "network", toolName, detail: "Network access blocked by sandbox" },
              `Network access blocked for tool "${toolName}"`,
            );
          });

        // Also inject as non-enumerable prop for tools that want explicit access
        Object.defineProperty(args, "__sandboxFetch", {
          value: blockedFetch,
          writable: false,
          enumerable: false,
          configurable: true,
        });

        // Run the tool inside the ALS context so globalThis.fetch + http.request + https.request + net.createConnection are all blocked
        Sandbox.installFetchProxy();
        Sandbox.installHttpProxy();
        Sandbox.installNetProxy();

        const value = await Sandbox._fetchALS.run({ blockedFetch, toolName }, () =>
          this.withTimeout(toolName, fn(args), this.timeoutMs, timeoutAbort),
        );
        const durationMs = Date.now() - start;
        this.totalDurationMs += durationMs;
        this.debugLog(`[${toolName}] completed in ${durationMs}ms`);
        return { value, durationMs };
      }

      // Non-network-blocked path: execute normally
      const value = await this.withTimeout(toolName, fn(args), this.timeoutMs, timeoutAbort);
      const durationMs = Date.now() - start;
      this.totalDurationMs += durationMs;
      this.debugLog(`[${toolName}] completed in ${durationMs}ms`);
      return { value, durationMs };
    } finally {
      // Ensure cleanup of the abort controller
      if (!timeoutAbort.signal.aborted) {
        timeoutAbort.abort("cleanup");
      }
    }
  }

  /**
   * Validate tool arguments against sandbox policies without executing.
   * Returns null if valid, or an error message if denied.
   */
  validate(toolName: string, args: Record<string, unknown>): string | null {
    if (this.allowedPaths.length > 0 || this.blockedPaths.length > 0) {
      return extractAndValidatePaths(args, this.allowedPaths, this.blockedPaths);
    }
    return null;
  }

  /** Resource usage summary. */
  stats() {
    return {
      callCount: this.callCount,
      totalDurationMs: this.totalDurationMs,
      avgDurationMs: this.callCount ? this.totalDurationMs / this.callCount : 0,
      violationCount: this.violationCount,
    };
  }

  /**
   * Execute a tool function via the configured external sandbox backend.
   *
   * Serializes `fn` via `fn.toString()`, sends it and the args to the backend,
   * and wraps the result in a `SandboxResult` with accurate timing.
   *
   * @throws Error if no `sandboxBackend` is configured.
   */
  private async _executeExternal<T>(
    toolName: string,
    args: Record<string, unknown>,
    fn: (args: Record<string, unknown>) => Promise<T>,
  ): Promise<SandboxResult<T>> {
    if (!this._sandboxBackend) {
      throw new Error(
        `[yaaf/sandbox] sandboxRuntime: 'external' requires a sandboxBackend to be set. ` +
          `Pass it via SandboxConfig.sandboxBackend or call sandbox.setBackend(backend).`,
      );
    }

    // Serialize fn — same constraint as worker mode
    let fnSrc: string;
    try {
      fnSrc = fn.toString();
      new Function(`return (${fnSrc})`); // SyntaxError if non-parseable
    } catch (e) {
      throw new Error(
        `[yaaf/sandbox] _executeExternal: fn.toString() is not serializable for tool "${toolName}". ` +
          `External backends require the tool fn to be a self-contained, pure function. ` +
          `Error: ${(e as Error).message}`,
      );
    }

    // Serialize args (strip non-cloneable non-enumerable keys)
    const serializableArgs: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(args)) {
      // Reject: functions (JSON.stringify returns undefined, not throw)
      if (typeof v === "function" || typeof v === "symbol") continue;
      // Reject: anything that doesn't survive a JSON roundtrip (e.g. BigInt, circular)
      try {
        JSON.stringify(v);
        serializableArgs[k] = v;
      } catch {
        /* skip non-serializable values */
      }
    }

    const start = Date.now();
    this.callCount++;
    this.debugLog(
      `[${toolName}] (external) delegating to ${this._sandboxBackend.constructor?.name ?? "SandboxExternalBackend"}`,
    );

    try {
      const value = await this._sandboxBackend.execute<T>(toolName, fnSrc, serializableArgs);
      const durationMs = Date.now() - start;
      this.totalDurationMs += durationMs;
      this.debugLog(`[${toolName}] (external) completed in ${durationMs}ms`);
      return { value, durationMs };
    } catch (err) {
      const durationMs = Date.now() - start;
      this.totalDurationMs += durationMs;
      throw err;
    }
  }

  /**
   * Execute a tool function in a dedicated worker_thread.
   *
   * The worker boots sandbox.worker.ts with a fresh module graph, patches
   * net/http/https BEFORE any user code runs (Object.defineProperty succeeds
   * on fresh workers regardless of ESM strictness), then receives the serialized
   * tool function and executes it.
   *
   * Falls back to inline execution if the function cannot be serialized (e.g.
   * compiled minified code that produces non-parseable fn.toString() output).
   */
  private async executeInWorker<T>(
    toolName: string,
    args: Record<string, unknown>,
    fn: (args: Record<string, unknown>) => Promise<T>,
  ): Promise<SandboxResult<T>> {
    const start = Date.now();
    this.callCount++;

    // Validate fn.toString() is parseable before sending to worker
    let fnSrc: string;
    try {
      fnSrc = fn.toString();
      // Quick sanity check — must produce a parseable expression
      new Function(`return (${fnSrc})`); // throws SyntaxError if not parseable
    } catch (e) {
      console.warn(
        `[yaaf/sandbox] executeInWorker: fn.toString() is not serializable for tool "${toolName}". ` +
          `Falling back to inline mode. ` +
          `(This usually means the function is minified or uses native bindings.) ` +
          `Error: ${(e as Error).message}`,
      );
      // Fallback: run inline with ALS-based blocking
      return this.execute(toolName, args, fn);
    }

    // Construct path to sandbox.worker.js (compiled output mirrors src structure)
    const workerPath = new URL("./sandbox.worker.js", import.meta.url);

    return new Promise<SandboxResult<T>>((resolve, reject) => {
      const id = `${toolName}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      let settled = false;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const worker = new Worker(workerPath, {
        workerData: { blockNetwork: this.blockNetwork },
      });

      const cleanup = (terminate = true) => {
        if (timer) clearTimeout(timer);
        if (terminate) worker.terminate().catch(() => {});
      };

      // Timeout
      timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        this.violationCount++;
        cleanup();
        const violation: SandboxViolation = {
          type: "timeout",
          toolName,
          detail: `Exceeded ${this.timeoutMs}ms timeout (worker mode)`,
        };
        this.onViolation?.(violation);
        reject(
          new SandboxError(violation, `Tool "${toolName}" timed out after ${this.timeoutMs}ms`),
        );
      }, this.timeoutMs);

      worker.on("message", (msg: { id: string; ok: boolean; result?: unknown; error?: string }) => {
        if (msg.id !== id || settled) return;
        settled = true;
        cleanup(false); // Worker will exit naturally after posting its response
        worker.terminate().catch(() => {});

        const durationMs = Date.now() - start;
        this.totalDurationMs += durationMs;
        this.debugLog(`[${toolName}] (worker) completed in ${durationMs}ms`);

        if (msg.ok) {
          resolve({ value: msg.result as T, durationMs });
        } else {
          reject(new Error(msg.error ?? "Worker tool execution failed"));
        }
      });

      worker.on("error", (err) => {
        if (settled) return;
        settled = true;
        cleanup(false);
        reject(err);
      });

      worker.on("exit", (code) => {
        if (settled) return;
        settled = true;
        cleanup(false);
        reject(new Error(`Worker exited unexpectedly with code ${code} for tool "${toolName}"`));
      });

      // Serialize only the plain args (strip non-serializable non-enumerable keys)
      const serializableArgs: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(args)) {
        try {
          JSON.stringify(v);
          serializableArgs[k] = v;
        } catch {
          // Skip non-serializable values — worker can't receive them
        }
      }

      worker.postMessage({ id, fnSrc, args: serializableArgs });
    });
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private async withTimeout<T>(
    toolName: string,
    promise: Promise<T>,
    ms: number,
    timeoutAbort: AbortController,
  ): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        const violation: SandboxViolation = {
          type: "timeout",
          toolName,
          detail: `Exceeded ${ms}ms timeout`,
        };
        // Signal the tool via its AbortController so cooperative
        // tools (those that check args.__sandboxAbortSignal) will stop.
        // NOTE: The underlying `promise` continues executing in the event loop
        // for non-cooperative tools; for true hard-kill, tool execution must
        // occur in a worker_threads Worker (terminate()able). This is by design:
        // worker isolation is a deliberate opt-in for tools that require it.
        timeoutAbort.abort("timeout");
        this.violationCount++;
        this.onViolation?.(violation);
        reject(new SandboxError(violation, `Tool "${toolName}" timed out after ${ms}ms`));
      }, ms);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timer!);
      return result;
    } catch (err) {
      clearTimeout(timer!);
      throw err;
    }
  }

  /**
   * Check argument values for URLs when network blocking is enabled.
   * This replaces the unsafe global fetch patching that could break concurrent code.
   * Returns an error message if a URL is found, null otherwise.
   */
  private checkForUrls(args: Record<string, unknown>, toolName: string): string | null {
    const urlPatterns = /https?:\/\/[^\s"']+/i;
    const urlKeys = ["url", "uri", "endpoint", "href", "link", "baseUrl", "apiUrl"];

    function check(value: unknown, key?: string): string | null {
      if (typeof value === "string") {
        const isUrlKey = key && urlKeys.includes(key);
        if (isUrlKey || urlPatterns.test(value)) {
          return `Network access blocked for tool "${toolName}": URL detected in args (${key ?? "value"})`;
        }
      }
      if (Array.isArray(value)) {
        for (const item of value) {
          const err = check(item);
          if (err) return err;
        }
      }
      if (value && typeof value === "object") {
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
          const err = check(v, k);
          if (err) return err;
        }
      }
      return null;
    }

    for (const [key, value] of Object.entries(args)) {
      const err = check(value, key);
      if (err) return err;
    }
    return null;
  }

  private handleViolation(violation: SandboxViolation): never {
    this.violationCount++;
    if (this.onViolation) {
      this.onViolation(violation);
    }
    throw new SandboxError(
      violation,
      `Sandbox violation [${violation.type}] in "${violation.toolName}": ${violation.detail}`,
    );
  }

  private debugLog(msg: string): void {
    if (this.debug) console.debug(`[yaaf/sandbox] ${msg}`);
  }
}

/** Permissive sandbox — only adds timeout protection. */
export function timeoutSandbox(timeoutMs = 30_000): Sandbox {
  return new Sandbox({ timeoutMs });
}

/**
 * Strict sandbox — restricts to a single directory, blocks network.
 *
 * ⚠️ NETWORK BLOCKING LIMITATION: `blockNetwork: true` intercepts the injected
 * `__sandboxFetch` function and scans tool arguments for URL patterns. It does NOT
 * intercept calls to `node:http`, `node:https`, `axios`, `undici`, `got`, or any
 * other HTTP library that bypasses `globalThis.fetch`. For true network isolation,
 * use OS-level restrictions (network namespaces, seccomp, iptables) in addition
 * to this sandbox.
 */
export function strictSandbox(rootDir: string, timeoutMs = 15_000): Sandbox {
  const homedir = os.homedir();
  return new Sandbox({
    timeoutMs,
    allowedPaths: [rootDir],
    blockedPaths: [
      // OS system paths
      "/etc",
      "/proc",
      "/sys",
      "/dev",
      // Docker/container runtime secrets
      "/run/secrets",
      // Secrets and credentials inside the allowed root
      path.join(rootDir, ".env"),
      path.join(rootDir, ".env.local"),
      path.join(rootDir, ".env.production"),
      path.join(rootDir, ".envrc"),
      path.join(rootDir, ".yaaf"),
      // SSH keys
      path.join(homedir, ".ssh"),
      // Cloud provider credentials
      path.join(homedir, ".aws"),
      path.join(homedir, ".config", "gcloud"),
      path.join(homedir, ".azure"),
      // Kubernetes
      path.join(homedir, ".kube"),
      // Docker registry credentials
      path.join(homedir, ".docker"),
      // Package registry auth (npm, pip, cargo, gem)
      path.join(homedir, ".npmrc"),
      path.join(homedir, ".pypirc"),
      path.join(homedir, ".cargo", "credentials"),
      path.join(homedir, ".gem", "credentials"),
      // Terraform state (may contain secrets)
      path.join(homedir, ".terraform.d"),
      // macOS Keychain
      path.join(homedir, "Library", "Keychains"),
    ],
    blockNetwork: true,
  });
}

/**
 * Project sandbox — restrict to project directory with reasonable timeout.
 * Does NOT block network (most tools legitimately need it).
 *
 * ⚠️ If you add `blockNetwork: true` to the returned sandbox, see the
 * network-blocking limitation described on `strictSandbox` — only
 * `__sandboxFetch` and argument scanning are intercepted, not native HTTP.
 */
export function projectSandbox(projectDir = process.cwd(), timeoutMs = 30_000): Sandbox {
  const homedir = os.homedir();
  return new Sandbox({
    timeoutMs,
    allowedPaths: [projectDir],
    blockedPaths: [
      // SSH keys
      path.join(homedir, ".ssh"),
      // Cloud provider credentials
      path.join(homedir, ".aws"),
      path.join(homedir, ".config", "gcloud"),
      path.join(homedir, ".azure"),
      // Kubernetes
      path.join(homedir, ".kube"),
      // Docker registry credentials
      path.join(homedir, ".docker"),
      // Package registry auth
      path.join(homedir, ".npmrc"),
      path.join(homedir, ".pypirc"),
      path.join(homedir, ".cargo", "credentials"),
      // macOS Keychain
      path.join(homedir, "Library", "Keychains"),
    ],
  });
}

// ── Serialization Safety Helpers ─────────────────────────────────────────────

/**
 * Heuristic check for whether a function is likely safe to serialize for
 * `'worker'` or `'external'` sandbox modes.
 *
 * A function is NOT safely serializable if:
 * - Its `toString()` contains reference to identifiers that don't exist in
 * a fresh global scope (i.e. it closes over module-scope state)
 * - It uses `this` (captured via class methods)
 *
 * **This is a best-effort heuristic, not a guarantee.** Functions that
 * only use:
 * - Their own arguments
 * - `import()` (dynamic inside body)
 * - Built-in globals (`Math`, `Date`, `JSON`, `console`, `process.env`)
 * are generally safe.
 *
 * @returns `true` if the function appears serializable, `false` with a reason otherwise.
 */
export function isSerializableFn(
  fn: (...args: unknown[]) => unknown,
): { ok: true } | { ok: false; reason: string } {
  let src: string;
  try {
    src = fn.toString();
  } catch {
    return { ok: false, reason: "fn.toString() failed" };
  }

  // Arrow functions with closing-over `this` patterns
  if (/\bthis\b/.test(src) && !src.startsWith("function")) {
    return {
      ok: false,
      reason:
        "Function references `this`, which is not available in a serialized worker context. " +
        "Extract the needed values into local constants before the function definition.",
    };
  }

  // Simple heuristic: presence of an assignment expression captures outer state
  // This catches common patterns: `const db = await getDb(); return () => db.query(...)`
  // NOTE: This is intentionally loose — false negatives are acceptable here.
  const WELL_KNOWN_GLOBALS = new Set([
    "Math",
    "Date",
    "JSON",
    "console",
    "process",
    "Buffer",
    "Promise",
    "Array",
    "Object",
    "String",
    "Number",
    "Boolean",
    "Error",
    "Map",
    "Set",
    "Symbol",
    "undefined",
    "null",
    "true",
    "false",
    "setTimeout",
    "clearTimeout",
    "setInterval",
    "clearInterval",
    "fetch",
    "URL",
    "URLSearchParams",
    "AbortController",
    "AbortSignal",
    "require",
    "import",
    "exports",
    "module",
    "__dirname",
    "__filename",
  ]);

  // Extract identifier tokens from the source
  const identifiers = new Set(src.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g) ?? []);
  const params = new Set(
    src
      .match(/^(?:async\s+)?(?:function[^(]*)?\(([^)]*)\)/)?.[1]
      ?.split(",")
      .map((p) =>
        p
          .trim()
          .replace(/^\.\.\./, "")
          .replace(/=.*$/, "")
          .trim(),
      )
      .filter(Boolean) ?? [],
  );

  const suspicious: string[] = [];
  for (const id of identifiers) {
    if (WELL_KNOWN_GLOBALS.has(id)) continue;
    if (params.has(id)) continue;
    // If the identifier appears in the source but is not a param or global,
    // it's likely captured from outer scope. Only flag if it looks like a variable ref.
    // (Keywords, property names after `.` are filtered by word-boundary check)
    if (
      /^(const|let|var|function|async|await|return|if|else|for|while|try|catch|throw|new|typeof|instanceof|in|of|break|continue|switch|case|default|class|extends|super|yield|delete|void)$/.test(
        id,
      )
    )
      continue;
    suspicious.push(id);
  }

  if (suspicious.length > 0) {
    return {
      ok: false,
      reason:
        `Function may close over outer-scope identifiers: ${suspicious.slice(0, 5).join(", ")}. ` +
        "In worker/external sandbox modes, only use arguments, globals, and dynamic import().",
    };
  }

  return { ok: true };
}

/**
 * Create a sandbox-safe tool function with an upfront serialization check.
 *
 * In `'worker'` and `'external'` sandbox modes, tool functions are serialized
 * via `fn.toString()` and evaluated in a fresh context. Functions that close
 * over module-scope state (database connections, API clients, class instances)
 * will silently fail at runtime.
 *
 * `createSandboxTool()` performs a heuristic check at definition time and
 * throws a clear error immediately instead of failing cryptically at execution.
 *
 * **For `'inline'` mode**: No check is performed (closures work fine inline).
 *
 * @example
 * ```ts
 * // ❌ This closes over `db` — will fail in worker mode
 * const db = await connectDb()
 * const bad = createSandboxTool((args) => db.query(args.sql))
 *
 * // ✅ This only uses dynamic import — safe in all modes
 * const good = createSandboxTool(async (args) => {
 * const { readFile } = await import('node:fs/promises')
 * return readFile(args.path, 'utf8')
 * })
 * ```
 *
 * @param fn - The tool implementation function.
 * @param mode - If `'strict'`, throw on any suspicious closure. If `'warn'`,
 * log a warning. If `'skip'`, bypass the check entirely.
 * Default: `'strict'`.
 */
export function createSandboxTool<TArgs extends Record<string, unknown> = Record<string, unknown>>(
  fn: (args: TArgs) => Promise<unknown> | unknown,
  mode: "strict" | "warn" | "skip" = "strict",
): (args: TArgs) => Promise<unknown> | unknown {
  if (mode !== "skip") {
    const check = isSerializableFn(fn as (...args: unknown[]) => unknown);
    if (!check.ok) {
      const message =
        `[createSandboxTool] Serialization check failed: ${check.reason}\n` +
        "This function will fail at runtime in worker or external sandbox modes.\n" +
        "See https://yaaf.dev/docs/sandbox#serialization for safe patterns.";
      if (mode === "strict") {
        throw new Error(message);
      } else {
        console.warn(message);
      }
    }
  }
  return fn;
}
