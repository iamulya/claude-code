/**
 * OS-Level Sandbox — Barrel exports.
 *
 * Re-exports the public API for the OS-level sandbox subsystem.
 *
 * Usage:
 * ```ts
 * import { OsSandboxManager, type OsSandboxConfig } from './sandbox/os/index.js';
 * ```
 */

// Primary API
export { OsSandboxManager } from "./manager.js";

// Types
export type {
  OsSandboxConfig,
  OsSandboxBackend,
  WrapCommandOptions,
  PlatformCapabilities,
  OsSandboxResult,
} from "./types.js";
export { getDefaultBlockedPaths } from "./types.js";

// Proxy
export { DomainFilterProxy, type DomainFilterProxyConfig } from "./proxy.js";

// Detection
export { detectPlatformCapabilities, isLandlockAvailable } from "./detect.js";

// Backends (for advanced use — most users should use OsSandboxManager)
export { BwrapBackend } from "./backends/bwrap.js";
export { SandboxExecBackend } from "./backends/sandboxExec.js";
export { SandboxInitBackend } from "./backends/sandboxInit.js";
export { DockerBackend } from "./backends/docker.js";
export { LandlockBackend } from "./backends/landlock.js";

// Utilities
export { shellQuote, shellEscapeInSingleQuotes } from "./shellQuote.js";
