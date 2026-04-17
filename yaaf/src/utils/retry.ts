/**
 * Retry Utility — exponential backoff with jitter, Retry-After support,
 * abort signal propagation, and provider-aware error classification.
 *
 * Inspired by Claude Code's withRetry.ts but simplified for the YAAF
 * framework context (no subscription tiers, no fast-mode, no analytics).
 *
 * Features:
 * - Exponential backoff with ±25% jitter (prevents thundering herd)
 * - Retry-After header parsing (seconds and HTTP-date)
 * - AbortSignal propagation — cancelled requests cancel the retry sleep
 * - Typed errors: throws RetryExhaustedError when all attempts fail
 * - Per-attempt callback for observability (logging, telemetry)
 *
 * @example
 * ```ts
 * const result = await withRetry(
 * () => model.complete(params),
 * { maxRetries: 5, signal },
 * );
 * ```
 */

import { YAAFError, AbortError, RetryExhaustedError, type ErrorCode } from "../errors.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export type RetryConfig = {
  /** Maximum number of retry attempts (default: 5) */
  maxRetries?: number;
  /** Base delay in ms for exponential backoff (default: 500) */
  baseDelayMs?: number;
  /** Maximum delay in ms (cap on exponential growth, default: 30_000) */
  maxDelayMs?: number;
  /** AbortSignal — cancels both the operation and the retry sleep */
  signal?: AbortSignal;
  /**
   * Custom function to determine if an error is retryable.
   * Default: uses YAAFError.retryable, falls back to true for network errors.
   */
  isRetryable?: (error: unknown) => boolean;
  /**
   * Called before each retry sleep — useful for logging or telemetry.
   * Return false to abort the retry loop.
   */
  onRetry?: (info: {
    attempt: number;
    maxRetries: number;
    error: unknown;
    delayMs: number;
  }) => void | boolean | Promise<void | boolean>;
};

// ── Default retryable check ──────────────────────────────────────────────────

function defaultIsRetryable(error: unknown): boolean {
  // YAAF typed errors carry a retryable flag
  if (error instanceof YAAFError) return error.retryable;

  // Network-level errors (ECONNRESET, ENOTFOUND, etc.) — always retry
  if (error instanceof TypeError && error.message.includes("fetch")) return true;

  // AbortError — never retry
  if (error instanceof Error && error.name === "AbortError") return false;

  // Unknown errors — don't retry by default (fail-closed)
  return false;
}

// ── Delay Calculation ────────────────────────────────────────────────────────

/**
 * Compute retry delay with exponential backoff and ±25% jitter.
 * If the error carries a Retry-After hint, that takes precedence.
 */
export function computeRetryDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  error?: unknown,
): number {
  // Check for Retry-After hint on YAAF errors
  const retryAfterMs =
    error && typeof error === "object" && "retryAfterMs" in error
      ? (error as { retryAfterMs?: number }).retryAfterMs
      : undefined;

  if (retryAfterMs !== undefined && retryAfterMs > 0) {
    // Cap server-directed delays to prevent unbounded waits
    return Math.min(retryAfterMs, maxDelayMs * 4);
  }

  // Exponential backoff: baseDelay * 2^(attempt-1), capped at maxDelay
  const exponential = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);

  // ±25% jitter
  const jitter = exponential * 0.25 * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(exponential + jitter));
}

// ── Sleep with abort support ─────────────────────────────────────────────────

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new AbortError());
      return;
    }

    const timer = setTimeout(resolve, ms);

    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new AbortError());
      },
      { once: true },
    );
  });
}

// ── withRetry ────────────────────────────────────────────────────────────────

/**
 * Execute an async operation with exponential backoff retry.
 *
 * @param operation The async function to execute (and possibly retry)
 * @param config Retry configuration
 * @returns The result of the operation
 * @throws {RetryExhaustedError} When all retry attempts are exhausted
 * @throws {AbortError} When the abort signal fires
 * @throws {Error} Non-retryable errors are re-thrown immediately
 */
export async function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  config: RetryConfig = {},
): Promise<T> {
  const {
    maxRetries = 5,
    baseDelayMs = 500,
    maxDelayMs = 30_000,
    signal,
    isRetryable = defaultIsRetryable,
    onRetry,
  } = config;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    // Check abort before each attempt
    if (signal?.aborted) throw new AbortError();

    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;

      // Abort errors are never retried
      if (error instanceof Error && error.name === "AbortError") {
        throw new AbortError(error.message);
      }

      // Non-retryable errors fail immediately
      if (!isRetryable(error)) throw error;

      // Last attempt — no more retries
      if (attempt > maxRetries) break;

      // Compute delay
      const delayMs = computeRetryDelay(attempt, baseDelayMs, maxDelayMs, error);

      // Notify listener (can abort by returning false)
      if (onRetry) {
        const result = await onRetry({ attempt, maxRetries, error, delayMs });
        if (result === false) break;
      }

      // Sleep with abort support
      await sleep(delayMs, signal);
    }
  }

  // All attempts exhausted
  const err = lastError instanceof Error ? lastError : new Error(String(lastError));

  // Throw with maxRetries (the user-configured number of retries),
  // not maxRetries + 1. The loop runs maxRetries + 1 total iterations (initial
  // attempt + maxRetries retries), but the user thinks in terms of retries, not
  // total attempts. The old code produced confusing messages like "All 6 retry
  // attempts exhausted" when the caller set maxRetries: 5.
  throw new RetryExhaustedError(maxRetries, err);
}
