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
  maxRetries?: number
  /** Base delay in ms before first retry (default: 1000) */
  baseDelayMs?: number
  /** Maximum delay between retries (default: 30000) */
  maxDelayMs?: number
  /** Custom predicate — return true to retry, false to throw immediately */
  retryOn?: (error: unknown) => boolean
  /** Called before each retry with attempt number and error */
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void
}

// ── Default retry predicate ───────────────────────────────────────────────────

function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    // Rate limit
    if (msg.includes('429') || msg.includes('rate limit') || msg.includes('quota')) return true
    // Server errors
    if (msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('504')) return true
    // Transient network errors
    if (msg.includes('econnreset') || msg.includes('econnrefused') || msg.includes('etimedout')) return true
    if (msg.includes('fetch failed') || msg.includes('network')) return true
    // Overloaded
    if (msg.includes('overloaded') || msg.includes('capacity')) return true
  }
  return false
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Execute an async function with retry logic and exponential backoff.
 *
 * @example
 * ```ts
 * const result = await withRetry(
 *   () => generateFn(systemPrompt, userPrompt),
 *   { maxRetries: 3 },
 * )
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3
  const baseDelay = options?.baseDelayMs ?? 1000
  const maxDelay = options?.maxDelayMs ?? 30000
  const shouldRetry = options?.retryOn ?? isRetryableError

  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err

      // Last attempt — don't retry
      if (attempt === maxRetries) break

      // Check if this error is retryable
      if (!shouldRetry(err)) break

      // Exponential backoff with jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 500,
        maxDelay,
      )

      options?.onRetry?.(attempt + 1, err, delay)
      await sleep(delay)
    }
  }

  throw lastError
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
