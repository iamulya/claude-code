/**
 * bwrap (bubblewrap) backend — Linux OS-level sandbox.
 *
 * Wraps shell commands with bubblewrap for kernel-enforced isolation:
 * - Filesystem: read-only root via bind-mount, writable project dir
 * - Network: --unshare-net blocks all network (proxy for domain filtering)
 * - PID namespace: --unshare-pid prevents killing host processes
 * - Dangerous paths: bind-mounted to /dev/null
 *
 * Requires `bwrap` to be installed: `apt install bubblewrap` or `dnf install bubblewrap`.
 * Available on all major Linux distros. Works on WSL2 (not WSL1).
 */

import type { OsSandboxBackend, WrapCommandOptions } from "../types.js";
import { getDefaultBlockedPaths } from "../types.js";
import { shellQuote } from "../shellQuote.js";

export class BwrapBackend implements OsSandboxBackend {
  readonly name = "bwrap";

  wrapCommand(command: string, shell: string, opts: WrapCommandOptions): string {
    const args: string[] = [];

    // ── Filesystem isolation ───────────────────────────────────────────────

    // Mount root filesystem read-only
    args.push("--ro-bind", "/", "/");

    // Mount project dir read-write
    args.push("--bind", opts.projectDir, opts.projectDir);

    // Mount /tmp writable (many tools need it)
    args.push("--bind", "/tmp", "/tmp");

    // Mount /dev/shm writable (shared memory for Node.js workers, etc.)
    args.push("--bind", "/dev/shm", "/dev/shm");

    // Additional writable paths
    if (opts.writablePaths) {
      for (const p of opts.writablePaths) {
        args.push("--bind", p, p);
      }
    }

    // Block dangerous paths via /dev/null bind-mount
    const blockedPaths = opts.blockedPaths ?? getDefaultBlockedPaths();
    for (const blocked of blockedPaths) {
      // Only block paths that exist — bwrap fails on non-existent --ro-bind targets
      args.push("--ro-bind-try", "/dev/null", blocked);
    }

    // ── Process isolation ──────────────────────────────────────────────────

    // PID namespace — process can't see or kill host processes
    args.push("--unshare-pid");

    // New /proc for the PID namespace
    args.push("--proc", "/proc");

    // ── Network isolation ──────────────────────────────────────────────────

    if (opts.blockNetwork || opts.proxyPort) {
      // Unshare network namespace — blocks ALL network including localhost
      args.push("--unshare-net");

      // If using a proxy, we need loopback inside the sandbox.
      // bwrap --unshare-net creates a new loopback interface.
      // We need to forward from sandbox's loopback to host's proxy port.
      // This is handled by the socat bridge or by the proxy listening on
      // a Unix socket that's bind-mounted into the sandbox.
    }

    // ── Environment ────────────────────────────────────────────────────────

    if (opts.proxyPort) {
      const proxyUrl = `http://127.0.0.1:${opts.proxyPort}`;
      args.push(
        "--setenv", "HTTP_PROXY", proxyUrl,
        "--setenv", "HTTPS_PROXY", proxyUrl,
        "--setenv", "http_proxy", proxyUrl,
        "--setenv", "https_proxy", proxyUrl,
      );
    }

    // Preserve essential env vars
    const envVarsToPreserve = ["HOME", "USER", "PATH", "LANG", "TERM", "NODE_PATH", "NODE_OPTIONS"];
    for (const envVar of envVarsToPreserve) {
      const val = process.env[envVar];
      if (val !== undefined) {
        args.push("--setenv", envVar, val);
      }
    }

    // ── Command execution ──────────────────────────────────────────────────

    args.push(shell, "-c", command);

    const bwrapPath = opts.bwrapPath ?? "bwrap";
    return [bwrapPath, ...args].map((a) => shellQuote(a)).join(" ");
  }

  cleanup(): void {
    // bwrap may leave 0-byte mount-point stubs when --ro-bind targets
    // non-existent paths. These are harmless but can be cleaned up if needed.
    // For now, we use --ro-bind-try which avoids this issue.
  }
}
