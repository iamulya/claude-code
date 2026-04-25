/**
 * Platform capability detection for OS-level sandbox.
 *
 * Detects which sandbox backends are available on the current platform
 * and selects the best one according to the priority tier:
 *
 * macOS: sandbox-exec → Docker/Podman
 * Linux: bwrap → Docker/Podman
 *
 * Detection is performed lazily and cached for the lifetime of the
 * OsSandboxManager instance.
 */

import { execFileSync } from "child_process";
import { platform as osPlatform } from "os";
import * as fs from "fs";

import type { OsSandboxBackend, OsSandboxConfig, PlatformCapabilities } from "./types.js";
import { BwrapBackend } from "./backends/bwrap.js";
import { SandboxExecBackend } from "./backends/sandboxExec.js";
import { DockerBackend } from "./backends/docker.js";

/**
 * Detect which OS sandbox backends are available on this system.
 *
 * Returns a `PlatformCapabilities` object with the best backend selected
 * and all available backends listed in priority order.
 *
 * This function does NOT throw — if no backend is available, it returns
 * `selectedBackend: undefined` with a warning message.
 */
export async function detectPlatformCapabilities(
  config: OsSandboxConfig,
): Promise<PlatformCapabilities> {
  const plat = osPlatform();
  const available: string[] = [];
  const warnings: string[] = [];
  let selected: OsSandboxBackend | undefined;

  if (plat === "darwin") {
    // ── macOS Tier 1: sandbox-exec CLI ──────────────────────────────
    // Despite deprecation, this is the most lightweight option available
    // on macOS. The sandbox_init() N-API addon (Phase 1.5) will be
    // added later as a higher-priority option.
    if (commandExists("sandbox-exec")) {
      available.push("sandbox-exec");
      warnings.push(
        "sandbox-exec is deprecated since macOS 10.15 Catalina. " +
          "It still works on current macOS versions but Apple may remove it.",
      );
      selected = selected ?? new SandboxExecBackend();
    }

    // ── macOS Tier 2: Docker/Podman ──────────────────────────────────
    const containerRuntime = config.containerRuntime ?? "docker";
    if (commandExists(containerRuntime)) {
      available.push(containerRuntime);
      selected = selected ?? new DockerBackend(containerRuntime);
    }
  } else if (plat === "linux") {
    // ── Linux Tier 1: bubblewrap ────────────────────────────────────
    const bwrapPath = config.bwrapPath ?? "bwrap";
    if (commandExists(bwrapPath)) {
      available.push("bwrap");
      selected = selected ?? new BwrapBackend();
    }

    // ── Linux Tier 2: Docker/Podman ─────────────────────────────────
    const containerRuntime = config.containerRuntime ?? "docker";
    if (commandExists(containerRuntime)) {
      available.push(containerRuntime);
      selected = selected ?? new DockerBackend(containerRuntime);
    }

    // Detect WSL1 (where bwrap won't work)
    if (isWSL1()) {
      warnings.push(
        "WSL1 detected. bubblewrap requires a real Linux kernel (WSL2). " +
          "OS-level sandbox features may be limited.",
      );
    }
  } else if (plat === "win32") {
    // ── Windows: Docker only ────────────────────────────────────────
    warnings.push(
      "Native OS-level sandbox is not available on Windows. " +
        "Docker/Podman can be used as a fallback.",
    );

    const containerRuntime = config.containerRuntime ?? "docker";
    if (commandExists(containerRuntime)) {
      available.push(containerRuntime);
      selected = selected ?? new DockerBackend(containerRuntime);
    }
  } else {
    warnings.push(`OS-level sandbox is not supported on platform: ${plat}`);
  }

  if (!selected) {
    warnings.push(
      "No OS-level sandbox backend available. Shell commands will run unsandboxed. " +
        "Install bubblewrap (Linux: apt install bubblewrap) or Docker to enable OS sandboxing.",
    );
  }

  return {
    platform: (plat === "darwin" || plat === "linux" || plat === "win32" ? plat : "unknown") as
      | "darwin"
      | "linux"
      | "win32"
      | "unknown",
    selectedBackend: selected,
    availableBackends: available,
    warnings,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Check if a command exists on the system PATH.
 * Uses `which` (POSIX) or `where` (Windows).
 */
function commandExists(cmd: string): boolean {
  try {
    const whichCmd = process.platform === "win32" ? "where" : "which";
    execFileSync(whichCmd, [cmd], { stdio: "ignore", timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Detect if running under WSL1 (as opposed to WSL2).
 * WSL1 translates Linux syscalls to Windows NT calls and does not support
 * namespaces, cgroups, or bubblewrap. WSL2 runs a real Linux kernel.
 */
function isWSL1(): boolean {
  try {
    const version = fs.readFileSync("/proc/version", "utf8");
    // WSL1: "Microsoft" appears in /proc/version but "microsoft-standard" does not
    // WSL2: "microsoft-standard-WSL2" appears
    if (version.includes("Microsoft") && !version.includes("microsoft-standard")) {
      return true;
    }
  } catch {
    // Not Linux or /proc not available — not WSL
  }
  return false;
}

/**
 * Check if the Linux kernel supports Landlock (kernel ≥5.13).
 * Reserved for future use when the Landlock N-API addon is implemented.
 */
export function isLandlockAvailable(): boolean {
  try {
    const version = fs.readFileSync("/proc/version", "utf8");
    const match = version.match(/(\d+)\.(\d+)/);
    if (match) {
      const major = parseInt(match[1]!, 10);
      const minor = parseInt(match[2]!, 10);
      return major > 5 || (major === 5 && minor >= 13);
    }
  } catch {
    // Not Linux or /proc unavailable
  }
  return false;
}
