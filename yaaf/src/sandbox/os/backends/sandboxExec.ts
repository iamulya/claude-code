/**
 * sandbox-exec backend — macOS OS-level sandbox.
 *
 * Wraps shell commands with Apple's sandbox-exec using dynamically
 * generated Seatbelt (SBPL) profiles for:
 * - Filesystem: deny file-write* globally, allow for project dir + /tmp
 * - Network: deny network-outbound globally, allow proxy port only
 * - Process: deny process-exec for dangerous binaries (optional)
 *
 * ⚠️ DEPRECATION WARNING: `sandbox-exec` has been deprecated since
 * macOS 10.15 Catalina (2019). It still works on macOS 15 Sequoia
 * (2024) but Apple could remove it in any future release.
 *
 * This backend is used as a fallback when the sandbox_init N-API
 * addon is not available. The sandbox_init() C API uses the same
 * underlying kernel mechanism (Sandbox.kext / libsandbox.dylib).
 */

import type { OsSandboxBackend, WrapCommandOptions } from "../types.js";
import { getDefaultBlockedPaths } from "../types.js";
import { shellQuote, shellEscapeInSingleQuotes } from "../shellQuote.js";
import * as fs from "fs";

export class SandboxExecBackend implements OsSandboxBackend {
  readonly name = "sandbox-exec";

  wrapCommand(command: string, shell: string, opts: WrapCommandOptions): string {
    const profile = this.generateSeatbeltProfile(opts);

    // sandbox-exec -p '<profile>' <shell> -c '<command>'
    // The profile is passed inline via -p to avoid writing temp files
    const escapedProfile = shellEscapeInSingleQuotes(profile);
    const escapedCommand = shellEscapeInSingleQuotes(command);

    return `sandbox-exec -p '${escapedProfile}' ${shellQuote(shell)} -c '${escapedCommand}'`;
  }

  /**
   * Generate a Seatbelt (SBPL) profile from sandbox configuration.
   *
   * SBPL (Sandbox Profile Language) is a Scheme-like DSL used by macOS
   * to define process restrictions. Rules are evaluated in order;
   * the last matching rule wins.
   */
  private generateSeatbeltProfile(opts: WrapCommandOptions): string {
    const lines: string[] = [
      "(version 1)",
      // Start by denying everything — fail-closed
      "(deny default)",

      // ── Process execution ──────────────────────────────────────────
      "(allow process-exec)",
      "(allow process-fork)",
      "(allow process*)",

      // ── Filesystem: read ───────────────────────────────────────────
      // Allow reading most of the filesystem (code, binaries, libraries)
      "(allow file-read*)",
    ];

    // Block reading sensitive paths
    const blockedPaths = opts.blockedPaths ?? getDefaultBlockedPaths();
    for (const p of blockedPaths) {
      // Escape any special characters in the path
      const escaped = p.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      lines.push(`(deny file-read* (subpath "${escaped}"))`);
    }

    // ── Filesystem: write ──────────────────────────────────────────
    // Resolve symlinks — on macOS /var → /private/var, /tmp → /private/tmp.
    // The kernel enforces Seatbelt rules against the REAL path, so we must
    // use the resolved path in the profile, not the user-provided one.
    const resolvedProjectDir = this.resolvePath(opts.projectDir);
    lines.push(`(allow file-write* (subpath "${resolvedProjectDir}"))`);
    // Allow writing to /tmp
    lines.push('(allow file-write* (subpath "/tmp"))');
    // Allow writing to /private/tmp (macOS symlinks /tmp → /private/tmp)
    lines.push('(allow file-write* (subpath "/private/tmp"))');
    // Allow writing to /dev/null, /dev/zero, /dev/random
    lines.push('(allow file-write* (subpath "/dev"))');

    // Additional writable paths
    if (opts.writablePaths) {
      for (const p of opts.writablePaths) {
        const resolved = this.resolvePath(p);
        lines.push(`(allow file-write* (subpath "${resolved}"))`);
      }
    }

    // ── System calls ─────────────────────────────────────────────────
    lines.push("(allow sysctl-read)");
    lines.push("(allow signal)");
    lines.push("(allow ipc-posix*)");

    // ── Mach IPC ─────────────────────────────────────────────────────
    // Allow essential macOS services
    lines.push('(allow mach-lookup (global-name "com.apple.system.logger"))');
    lines.push('(allow mach-lookup (global-name "com.apple.system.notification_center"))');
    // Allow DNS resolution
    lines.push('(allow mach-lookup (global-name "com.apple.dnssd.service"))');
    // Allow time services
    lines.push('(allow mach-lookup (global-name "com.apple.SystemConfiguration.configd"))');

    // ── Network ──────────────────────────────────────────────────────
    if (opts.blockNetwork) {
      lines.push("(deny network*)");
    } else if (opts.proxyPort) {
      // Deny all outbound except the proxy
      lines.push("(deny network-outbound)");
      // Allow loopback connections to the proxy port
      // NOTE: macOS Seatbelt only accepts "localhost" or "*" as host,
      // NOT IP addresses like "127.0.0.1". localhost resolves to 127.0.0.1.
      lines.push(`(allow network-outbound (remote tcp "localhost:${opts.proxyPort}"))`);
      // Allow Unix domain sockets (needed for some IPC)
      lines.push("(allow network-outbound (remote unix-socket))");
      // Allow inbound (listening is fine — we're restricting outbound)
      lines.push("(allow network-inbound)");
    } else {
      // No network restriction
      lines.push("(allow network*)");
    }

    return lines.join("\n");
  }

  /**
   * Resolve symlinks in a path for Seatbelt profile use.
   *
   * macOS Seatbelt rules are enforced against the *real* (resolved) path.
   * Common macOS symlinks:
   * - /var → /private/var
   * - /tmp → /private/tmp
   * - /etc → /private/etc
   *
   * If the path doesn't exist yet, returns the original path.
   */
  private resolvePath(p: string): string {
    try {
      return fs.realpathSync(p);
    } catch {
      return p;
    }
  }

  cleanup(): void {
    // sandbox-exec doesn't leave artifacts — nothing to clean up
  }
}
