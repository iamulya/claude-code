/**
 * Landlock backend — Linux native addon for kernel filesystem restrictions.
 *
 * Uses the Landlock LSM (kernel ≥5.13) via a compiled N-API addon
 * to restrict filesystem access without requiring root or external binaries.
 *
 * This backend is secondary to bwrap on Linux because bwrap provides
 * broader isolation (network, PID, mount namespaces). Landlock only
 * provides filesystem restrictions.
 *
 * Use cases:
 * - Systems with Landlock kernel support but without bwrap installed
 * - Worker processes that only need filesystem restrictions (no network isolation)
 * - Complementary to bwrap when finer-grained FS control is needed
 */

import type { OsSandboxBackend, WrapCommandOptions } from "../types.js";
import { getDefaultBlockedPaths } from "../types.js";
import { shellQuote } from "../shellQuote.js";

/** The native addon interface (when compiled). */
interface LandlockNative {
  isAvailable(): boolean;
  restrictFilesystem(options: {
    readOnlyPaths: string[];
    readWritePaths: string[];
  }): void;
}

export class LandlockBackend implements OsSandboxBackend {
  readonly name = "landlock";
  private native: LandlockNative | undefined;
  private _available = false;

  async initialize(): Promise<boolean> {
    if (process.platform !== "linux") return false;

    try {
      const nativeModule = await import(
        /* webpackIgnore: true */
        "../native/build/Release/linux_landlock.node"
      ) as unknown as LandlockNative;

      if (nativeModule?.isAvailable()) {
        this.native = nativeModule;
        this._available = true;
        return true;
      }
    } catch {
      this._available = false;
    }
    return false;
  }

  wrapCommand(command: string, shell: string, opts: WrapCommandOptions): string {
    if (!this._available || !this.native) {
      // Landlock not available — return command unchanged (let manager fall back)
      return command;
    }

    // Landlock applies to the calling process (irreversible), so we can't
    // use it directly for command wrapping. Instead, we'd need a helper
    // script similar to sandbox_init.
    //
    // For command wrapping, we construct a Node.js one-liner that:
    // 1. Loads the landlock addon
    // 2. Calls restrictFilesystem()
    // 3. exec()s the command
    //
    // This is less efficient than bwrap (requires Node.js startup) but
    // works without any external binary dependencies.

    const readWritePaths = [
      opts.projectDir,
      "/tmp",
      ...(opts.writablePaths ?? []),
    ];

    const blockedPaths = opts.blockedPaths ?? getDefaultBlockedPaths();
    const readOnlyPaths = [
      "/", // Root filesystem — read-only by default
      // Exclude blocked paths by not adding them
    ];

    // Build a Node.js wrapper script that applies Landlock and then exec()s the command
    const landlockerScript = [
      "const ll = require('./native/build/Release/linux_landlock.node');",
      `ll.restrictFilesystem({`,
      `  readOnlyPaths: ${JSON.stringify(readOnlyPaths)},`,
      `  readWritePaths: ${JSON.stringify(readWritePaths)}`,
      `});`,
      `require('child_process').execSync(${JSON.stringify(command)}, {stdio:'inherit'});`,
    ].join("");

    return `node -e ${shellQuote(landlockerScript)}`;
  }
}
