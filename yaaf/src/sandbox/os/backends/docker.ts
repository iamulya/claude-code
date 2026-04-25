/**
 * Docker/Podman backend — cross-platform OS-level sandbox fallback.
 *
 * Wraps shell commands in a container with:
 * - Filesystem: --read-only root, writable project dir via -v mount
 * - Network: --network=none for full block, or proxy env vars for filtering
 * - Process isolation: container provides full PID/IPC/UTS namespace isolation
 *
 * This backend works on macOS, Linux, and Windows (via Docker Desktop).
 * It has higher per-command overhead (~50-200ms) than native backends
 * but provides stronger isolation and no deprecation risk.
 *
 * Requires Docker or Podman to be installed and running.
 */

import type { OsSandboxBackend, WrapCommandOptions } from "../types.js";
import { shellQuote } from "../shellQuote.js";

export class DockerBackend implements OsSandboxBackend {
  readonly name: string;
  private readonly runtime: string;
  private readonly image: string;

  /**
   * @param runtime - Container runtime binary name ('docker' or 'podman').
   * @param image - Base image to use. Default: 'node:lts-slim'.
   */
  constructor(runtime = "docker", image = "node:lts-slim") {
    this.name = runtime;
    this.runtime = runtime;
    this.image = image;
  }

  wrapCommand(command: string, shell: string, opts: WrapCommandOptions): string {
    const args: string[] = [
      this.runtime,
      "run",
      "--rm", // Remove container after exit
      "--read-only", // Read-only root filesystem

      // ── Filesystem mounts ──────────────────────────────────────────
      // Mount project dir writable
      "-v", `${opts.projectDir}:${opts.projectDir}:rw`,
      // Mount /tmp writable (many tools need it)
      "-v", "/tmp:/tmp:rw",
      // Mount a writable tmpfs for container's own temp files
      "--tmpfs", "/var/tmp:rw,noexec,nosuid,size=256m",
      // Working directory
      "-w", opts.projectDir,
    ];

    // Additional writable paths
    if (opts.writablePaths) {
      for (const p of opts.writablePaths) {
        args.push("-v", `${p}:${p}:rw`);
      }
    }

    // ── User mapping ─────────────────────────────────────────────────
    // Run as current user to avoid permission issues with mounted volumes
    if (process.getuid && process.getgid) {
      args.push("-u", `${process.getuid()}:${process.getgid()}`);
    }

    // ── Network ──────────────────────────────────────────────────────
    if (opts.blockNetwork) {
      args.push("--network=none");
    } else if (opts.proxyPort) {
      // Use host network so the container can reach the proxy on host's localhost.
      // On Linux: --network=host works directly.
      // On macOS/Windows Docker Desktop: use host.docker.internal.
      const proxyHost = process.platform === "linux" ? "127.0.0.1" : "host.docker.internal";
      const proxyUrl = `http://${proxyHost}:${opts.proxyPort}`;
      args.push(
        "-e", `HTTP_PROXY=${proxyUrl}`,
        "-e", `HTTPS_PROXY=${proxyUrl}`,
        "-e", `http_proxy=${proxyUrl}`,
        "-e", `https_proxy=${proxyUrl}`,
      );
      // On Linux with --network=host, no extra config needed.
      // On macOS, host.docker.internal resolves to the host.
      if (process.platform === "linux") {
        args.push("--network=host");
      }
    }

    // ── Resource limits ──────────────────────────────────────────────
    // Prevent runaway processes from consuming all host resources
    args.push("--memory=512m");
    args.push("--cpus=2");
    // Disable privilege escalation
    args.push("--security-opt=no-new-privileges");
    // Drop all capabilities
    args.push("--cap-drop=ALL");

    // ── Environment ──────────────────────────────────────────────────
    // Pass through essential env vars
    const envVarsToPreserve = ["HOME", "USER", "LANG", "TERM", "NODE_OPTIONS"];
    for (const envVar of envVarsToPreserve) {
      const val = process.env[envVar];
      if (val !== undefined) {
        args.push("-e", `${envVar}=${val}`);
      }
    }

    // ── Command ──────────────────────────────────────────────────────
    args.push(this.image);
    args.push(shell, "-c", command);

    return args.map((a) => shellQuote(a)).join(" ");
  }

  cleanup(): void {
    // Docker --rm handles container cleanup automatically
  }
}
