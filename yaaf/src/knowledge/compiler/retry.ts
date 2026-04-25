/**
 * LLM Call Retry — Phase 2A
 *
 * Wraps async LLM calls with exponential backoff retry logic.
 * Handles transient API failures (429, 500, network errors) without
 * wasting the entire compilation run.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in ms before first retry (default: 1000) */
  baseDelayMs?: number;
  /** Maximum delay between retries (default: 30000) */
  maxDelayMs?: number;
  /** Custom predicate — return true to retry, false to throw immediately */
  retryOn?: (error: unknown) => boolean;
  /** Called before each retry with attempt number and error */
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
}

// ── Default retry predicate ───────────────────────────────────────────────────

function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    // 8.6: Check structured error properties FIRST before substring fallback.
    // Substring matching on messages causes false positives:
    //   - "Failed to process 500 documents" triggers 500-server-error retry
    //   - "Article 'Report #429' failed" triggers rate-limit retry
    // Structured checks are provider-agnostic and precise.
    const asAny = error as unknown as Record<string, unknown>;

    // HTTP status code on the error object (common pattern: axios, node-fetch, Got, ky)
    const status = typeof asAny["status"] === "number" ? asAny["status"] :
                   typeof asAny["statusCode"] === "number" ? asAny["statusCode"] : null;
    if (status !== null) {
      if (status === 429) return true;
      if (status >= 500 && status < 600) return true;
      if (status >= 400 && status < 500) return false; // 4xx client errors — don't retry
    }

    // Node.js error codes (network errors)
    const code = typeof asAny["code"] === "string" ? asAny["code"] : null;
    if (code !== null) {
      if (code === "ECONNRESET" || code === "ECONNREFUSED" || code === "ETIMEDOUT") return true;
      if (code === "ENOTFOUND" || code === "EAI_AGAIN") return true; // DNS failures
    }

    // Fallback: substring match on message — only after structured checks fail.
    // Limited to unambiguous patterns that can't appear in normal content.
    const msg = error.message.toLowerCase();
    if (msg.includes("rate limit") || msg.includes("quota exceeded")) return true;
    if (msg.includes("overloaded") || msg.includes("capacity")) return true;
    if (msg.includes("service unavailable") || msg.includes("bad gateway")) return true;
    if (msg.includes("fetch failed") || msg.includes("network error")) return true;
  }
  return false;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Execute an async function with retry logic and exponential backoff.
 *
 * @example
 * ```ts
 * const result = await withRetry(
 * () => generateFn(systemPrompt, userPrompt),
 * { maxRetries: 3 },
 * )
 * ```
 */
export async function withRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3;
  const baseDelay = options?.baseDelayMs ?? 1000;
  const maxDelay = options?.maxDelayMs ?? 30000;
  const shouldRetry = options?.retryOn ?? isRetryableError;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      // Last attempt — don't retry
      if (attempt === maxRetries) break;

      // Check if this error is retryable
      if (!shouldRetry(err)) break;

      // Exponential backoff with jitter
      const delay = Math.min(baseDelay * Math.pow(2, attempt) + Math.random() * 500, maxDelay);

      options?.onRetry?.(attempt + 1, err, delay);
      await sleep(delay);
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
