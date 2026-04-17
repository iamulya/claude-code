/**
 * Deprecation utility — YAAF semver contract enforcement.
 *
 * Call `deprecated()` in code paths that are scheduled for removal
 * to emit a runtime warning and guide consumers to the replacement.
 *
 * @example
 * ```ts
 * import { deprecated } from 'yaaf/utils/deprecation'
 *
 * // In a constructor or function body:
 * deprecated(
 * 'PerUserRateLimiter: `acquireRunSlot()` is deprecated.',
 * 'Use `checkAndAcquire()` for atomic check-and-acquire semantics.',
 * '0.5.0',
 * )
 * ```
 *
 * @module utils/deprecation
 */

export type DeprecationWarning = {
  message: string;
  alternative: string;
  removedInVersion?: string;
  stack?: string;
};

const emittedWarnings = new Set<string>();

/**
 * Emit a deprecation warning exactly once per unique message.
 *
 * @param message - What is deprecated and why.
 * @param alternative - What callers should use instead.
 * @param removedIn - Optional semver version when the symbol will be removed.
 * @param onWarn - Optional override for test injection (default: process.emitWarning).
 */
export function deprecated(
  message: string,
  alternative: string,
  removedIn?: string,
  onWarn?: (w: DeprecationWarning) => void,
): void {
  const key = `${message}::${alternative}`;
  if (emittedWarnings.has(key)) return;
  emittedWarnings.add(key);

  const suffix = removedIn ? ` Will be removed in v${removedIn}.` : "";
  const full = `[yaaf] DEPRECATED: ${message}${suffix} → ${alternative}`;

  const warning: DeprecationWarning = {
    message,
    alternative,
    removedInVersion: removedIn,
  };

  if (onWarn) {
    onWarn(warning);
    return;
  }

  // Capture a short stack trace so callers can find the usage site
  const err = new Error(full);
  warning.stack = err.stack;

  if (typeof process !== "undefined" && typeof process.emitWarning === "function") {
    process.emitWarning(full, { type: "DeprecationWarning", code: "YAAF_DEPRECATED" });
  } else {
    console.warn(full);
  }
}

/**
 * Clear the deduplication cache — use in tests only.
 */
export function _clearDeprecationCache(): void {
  emittedWarnings.clear();
}
