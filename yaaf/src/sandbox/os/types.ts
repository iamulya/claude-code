/**
 * OS-Level Sandbox — Type definitions.
 *
 * Types for the kernel-enforced process isolation layer that wraps
 * shell commands with bwrap (Linux), sandbox_init/sandbox-exec (macOS),
 * or Docker/Podman (cross-platform fallback).
 *
 * This module is the single source of truth for OS sandbox configuration.
 * Application-level sandbox types live in `../sandbox.ts`.
 */

// ── Configuration ─────────────────────────────────────────────────────────────

export type OsSandboxConfig = {
  /** Project root directory — writable inside the sandbox. */
  projectDir: string;

  /** Additional directories the sandboxed process may write to. */
  writablePaths?: string[];

  /**
   * Paths to block entirely inside the sandbox.
   * On Linux: bind-mounted to /dev/null.
   * On macOS: denied via Seatbelt profile.
   *
   * If not specified, a sensible default list is used
   * (~/.ssh, ~/.gnupg, ~/.aws/credentials, etc.).
   */
  blockedPaths?: string[];

  /**
   * Domains the sandboxed process may access.
   * Requires the domain-filtering CONNECT proxy.
   *
   * - `undefined`: no network restriction.
   * - `[]` (empty): block ALL network.
   * - `['api.openai.com', '*.npmjs.org']`: allow only listed domains.
   *
   * Supports wildcards: `*.example.com` matches `sub.example.com`.
   * Supports dot-prefix: `.example.com` matches `sub.example.com`.
   */
  allowedDomains?: string[];

  /**
   * Domains to explicitly deny, even if they match `allowedDomains`.
   * Takes precedence over allowedDomains.
   */
  deniedDomains?: string[];

  /**
   * Block ALL network access unconditionally.
   * Overrides `allowedDomains`. No proxy is started.
   */
  blockNetwork?: boolean;

  /** Override path to the `bwrap` binary (Linux). Default: `'bwrap'`. */
  bwrapPath?: string;

  /** Override path to Docker or Podman binary. Default: `'docker'`. */
  containerRuntime?: string;

  /**
   * If true, throw an error when no OS sandbox backend is available
   * instead of running the command unsandboxed. Default: false.
   */
  failIfUnavailable?: boolean;
};

// ── Backend Interface ─────────────────────────────────────────────────────────

/**
 * Options passed to a backend's `wrapCommand()` method.
 *
 * Extends the user-facing config with runtime-resolved fields
 * (e.g. the proxy port assigned at startup).
 */
export type WrapCommandOptions = OsSandboxConfig & {
  /**
   * Port of the domain-filtering proxy on 127.0.0.1.
   * Set by `OsSandboxManager.ensureProxy()`.
   * If present, the backend should inject HTTP_PROXY/HTTPS_PROXY env vars
   * pointing to this port and restrict network to localhost only.
   */
  proxyPort?: number;
};

/**
 * Contract for an OS-level sandbox backend.
 *
 * Each backend wraps a shell command string with platform-specific
 * isolation primitives (bwrap, sandbox-exec, Docker, Landlock).
 *
 * Backends are stateless — all configuration is passed per-call
 * via `WrapCommandOptions`.
 */
export interface OsSandboxBackend {
  /** Human-readable backend name (for logging). */
  readonly name: string;

  /**
   * Wrap a shell command with OS-level sandbox restrictions.
   *
   * @param command - The raw shell command to execute.
   * @param shell - The shell to use (e.g. '/bin/sh', '/bin/bash').
   * @param opts - Sandbox configuration + runtime proxy port.
   * @returns The wrapped command string, ready for `child_process.exec()`.
   */
  wrapCommand(command: string, shell: string, opts: WrapCommandOptions): string;

  /**
   * Optional async initialization (e.g. loading a native N-API addon).
   * Return `true` if the backend is available, `false` otherwise.
   * Backends that don't need initialization should not implement this.
   */
  initialize?(): Promise<boolean>;

  /**
   * Optional post-command cleanup (e.g. removing bwrap mount-point stubs).
   */
  cleanup?(): void;
}

// ── Platform Detection ────────────────────────────────────────────────────────

/**
 * Result of platform capability detection.
 * Produced by `detect.ts::detectPlatformCapabilities()`.
 */
export type PlatformCapabilities = {
  /** Detected OS platform. */
  platform: "darwin" | "linux" | "win32" | "unknown";

  /** The best available backend (first in priority order), or undefined. */
  selectedBackend: OsSandboxBackend | undefined;

  /** Names of all available backends, in priority order. */
  availableBackends: string[];

  /** Non-fatal warnings (e.g. "sandbox-exec is deprecated"). */
  warnings: string[];
};

// ── Result Types ──────────────────────────────────────────────────────────────

/** Result of a sandboxed command execution. */
export type OsSandboxResult = {
  /** stdout of the wrapped command. */
  stdout: string;

  /** stderr of the wrapped command (may contain sandbox violation messages). */
  stderr: string;

  /** Exit code of the wrapped command. */
  exitCode: number;

  /** Wall-clock duration in milliseconds. */
  durationMs: number;

  /** Name of the backend that executed the command. */
  backend: string;
};

// ── Utility Types ─────────────────────────────────────────────────────────────

/**
 * Default paths to block inside the sandbox.
 * These contain secrets, credentials, or shell configuration
 * that an agent should never read or modify.
 */
export function getDefaultBlockedPaths(homedir?: string): string[] {
  const home = homedir ?? process.env.HOME ?? "/home/unknown";
  return [
    // SSH keys
    `${home}/.ssh`,
    // GPG keys
    `${home}/.gnupg`,
    // Cloud credentials
    `${home}/.aws/credentials`,
    `${home}/.aws/config`,
    `${home}/.config/gcloud`,
    `${home}/.azure`,
    // Kubernetes
    `${home}/.kube/config`,
    // Docker registry credentials
    `${home}/.docker/config.json`,
    // Package registry auth
    `${home}/.npmrc`,
    `${home}/.pypirc`,
    `${home}/.cargo/credentials`,
    `${home}/.gem/credentials`,
    // Shell config (prevent .bashrc injection)
    `${home}/.bashrc`,
    `${home}/.bash_profile`,
    `${home}/.zshrc`,
    `${home}/.profile`,
    // Git config (prevent credential helper hijacking)
    `${home}/.gitconfig`,
    // Terraform state (may contain secrets)
    `${home}/.terraform.d`,
    // macOS Keychain
    `${home}/Library/Keychains`,
  ];
}
