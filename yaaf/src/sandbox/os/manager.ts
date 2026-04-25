/**
 * OsSandboxManager — OS-level sandbox orchestrator.
 *
 * This is the primary entry point for OS-level process isolation.
 * It manages:
 *
 * 1. **Backend detection**: Detects which sandbox mechanisms are available
 *    on the current platform and selects the best one automatically.
 *
 * 2. **Command wrapping**: Wraps shell commands with kernel-enforced
 *    restrictions (filesystem, network, process isolation).
 *
 * 3. **Domain proxy**: Starts and manages a CONNECT proxy for domain-level
 *    network allowlisting when needed.
 *
 * Usage:
 * ```ts
 * const osSandbox = new OsSandboxManager({
 *   projectDir: '/path/to/project',
 *   allowedDomains: ['api.openai.com', 'registry.npmjs.org'],
 * });
 *
 * // Wrap a command with OS-level sandbox
 * const wrapped = await osSandbox.wrapCommand('npm install');
 * // Execute the wrapped command via child_process.exec or similar
 *
 * // Cleanup when done
 * await osSandbox.dispose();
 * ```
 *
 * This layer is complementary to YAAF's existing application-level
 * Sandbox class (sandbox.ts). Both layers provide defense-in-depth:
 *
 * - **Application-level** (sandbox.ts): Argument scanning, fetch interception,
 *   timeout enforcement, ALS-based network blocking. Catches tool arguments.
 *
 * - **OS-level** (this module): Kernel-enforced filesystem and network
 *   restrictions on spawned child processes. Catches `child_process.exec()`
 *   and any other syscalls from spawned processes.
 */

import { detectPlatformCapabilities } from "./detect.js";
import { DomainFilterProxy } from "./proxy.js";
import type { OsSandboxConfig, PlatformCapabilities, OsSandboxBackend } from "./types.js";

export class OsSandboxManager {
  private caps: PlatformCapabilities | undefined;
  private proxy: DomainFilterProxy | undefined;
  private readonly config: OsSandboxConfig;

  constructor(config: OsSandboxConfig) {
    this.config = config;
  }

  // ── Detection ───────────────────────────────────────────────────────────

  /**
   * Detect platform capabilities.
   * Lazy — only runs once, then caches the result.
   */
  async detect(): Promise<PlatformCapabilities> {
    if (!this.caps) {
      this.caps = await detectPlatformCapabilities(this.config);
    }
    return this.caps;
  }

  /**
   * Check if OS-level sandboxing is available on this system.
   */
  async isAvailable(): Promise<boolean> {
    const caps = await this.detect();
    return caps.selectedBackend !== undefined;
  }

  /**
   * Get the name of the selected backend, or undefined if none available.
   */
  async getBackendName(): Promise<string | undefined> {
    const caps = await this.detect();
    return caps.selectedBackend?.name;
  }

  /**
   * Get all available backend names.
   */
  async getAvailableBackends(): Promise<string[]> {
    const caps = await this.detect();
    return caps.availableBackends;
  }

  /**
   * Get any detection warnings (e.g. deprecation notices).
   */
  async getWarnings(): Promise<string[]> {
    const caps = await this.detect();
    return caps.warnings;
  }

  // ── Command Wrapping ────────────────────────────────────────────────────

  /**
   * Wrap a shell command with OS-level sandbox restrictions.
   *
   * Returns the wrapped command string ready for `child_process.exec()`.
   * If no sandbox backend is available:
   * - With `failIfUnavailable: true`: throws an error.
   * - With `failIfUnavailable: false` (default): returns the command unchanged
   *   (with a warning logged).
   *
   * @param command - The raw shell command to execute.
   * @param shell - The shell to use. Default: '/bin/sh'.
   * @returns The wrapped command string.
   */
  async wrapCommand(command: string, shell = "/bin/sh"): Promise<string> {
    const caps = await this.detect();
    const backend = caps.selectedBackend;

    if (!backend) {
      if (this.config.failIfUnavailable) {
        throw new Error(
          "[yaaf/sandbox/os] No OS-level sandbox backend available. " +
            `Available backends: none. Platform: ${caps.platform}. ` +
            "Install bubblewrap (Linux: apt install bubblewrap) or Docker to enable OS sandboxing, " +
            "or set failIfUnavailable: false to run unsandboxed.",
        );
      }
      // Fail-open: return command unchanged
      return command;
    }

    // Start domain proxy if network filtering is needed
    let proxyPort: number | undefined;
    if (this.needsProxy()) {
      proxyPort = await this.ensureProxy();
    }

    // Inject proxy env vars into the command for backends that don't
    // natively inject environment variables (sandbox-exec, landlock).
    // bwrap handles this via --setenv, but other backends need the
    // env vars prepended to the command string so that curl/wget/pip/npm
    // inside the sandbox automatically route through the domain proxy.
    let effectiveCommand = command;
    if (proxyPort && backend.name !== "bwrap") {
      // IMPORTANT: Use "localhost" not "127.0.0.1" — macOS Seatbelt rules
      // specify "localhost" and do NOT match "127.0.0.1" even though they
      // resolve to the same address. The proxy URL hostname must match
      // the hostname in the Seatbelt network allow rule.
      const proxyUrl = `http://localhost:${proxyPort}`;
      effectiveCommand =
        `export HTTP_PROXY=${proxyUrl} HTTPS_PROXY=${proxyUrl} ` +
        `http_proxy=${proxyUrl} https_proxy=${proxyUrl}; ${command}`;
    }

    return backend.wrapCommand(effectiveCommand, shell, {
      ...this.config,
      proxyPort,
    });
  }

  // ── Proxy Management ────────────────────────────────────────────────────

  /**
   * Start the domain-filtering proxy (idempotent).
   * Returns the port the proxy is listening on.
   */
  private async ensureProxy(): Promise<number> {
    if (!this.proxy) {
      this.proxy = new DomainFilterProxy({
        allowedDomains: this.config.allowedDomains ?? [],
        deniedDomains: this.config.deniedDomains,
      });
      return this.proxy.start();
    }
    return this.proxy.getPort();
  }

  /**
   * Check if a domain proxy is needed based on config.
   * Proxy is needed when:
   * - allowedDomains is specified (empty or non-empty) AND
   * - blockNetwork is false (blockNetwork overrides proxy)
   */
  private needsProxy(): boolean {
    return this.config.allowedDomains !== undefined && !this.config.blockNetwork;
  }

  /**
   * Get the domain filter proxy instance, if started.
   * Useful for checking blocked requests.
   */
  getProxy(): DomainFilterProxy | undefined {
    return this.proxy;
  }

  // ── Post-Command ────────────────────────────────────────────────────────

  /**
   * Run post-command cleanup (e.g. removing bwrap mount-point stubs).
   * Call this after each command execution.
   */
  cleanupAfterCommand(): void {
    this.caps?.selectedBackend?.cleanup?.();
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────

  /**
   * Shutdown the manager: stop the domain proxy and release resources.
   * Call this when the sandbox is no longer needed.
   */
  async dispose(): Promise<void> {
    if (this.proxy) {
      await this.proxy.stop();
      this.proxy = undefined;
    }
  }
}
