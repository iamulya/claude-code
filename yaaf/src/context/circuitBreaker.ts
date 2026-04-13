/**
 * Auto-Compact Circuit Breaker — prevents unbounded compaction retries.
 *
 * Inspired by the main repo's MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES = 3.
 * If auto-compaction fails N times in a row, stops trying to prevent
 * wasting API calls on irrecoverably oversized contexts.
 *
 * @example
 * ```ts
 * const breaker = new CompactionCircuitBreaker({ maxConsecutiveFailures: 3 });
 *
 * // Before attempting compaction:
 * if (!breaker.isOpen) {
 *   try {
 *     await compact();
 *     breaker.recordSuccess();
 *   } catch {
 *     breaker.recordFailure();
 *   }
 * }
 * ```
 */

export type CircuitBreakerConfig = {
  /** Max consecutive failures before opening the circuit. Default: 3. */
  maxConsecutiveFailures?: number
  /** Auto-reset after this many ms. Default: 300_000 (5 min). */
  autoResetMs?: number
}

export class CompactionCircuitBreaker {
  private consecutiveFailures = 0
  private readonly maxFailures: number
  private readonly autoResetMs: number
  private lastFailureTime = 0

  constructor(config: CircuitBreakerConfig = {}) {
    this.maxFailures = config.maxConsecutiveFailures ?? 3
    this.autoResetMs = config.autoResetMs ?? 300_000
  }

  /** True when the circuit is open (compaction should NOT be attempted). */
  get isOpen(): boolean {
    if (this.consecutiveFailures < this.maxFailures) return false

    // Auto-reset after timeout
    if (Date.now() - this.lastFailureTime > this.autoResetMs) {
      this.reset()
      return false
    }

    return true
  }

  /** True when the circuit is closed (compaction is safe to attempt). */
  get isClosed(): boolean {
    return !this.isOpen
  }

  get failures(): number {
    return this.consecutiveFailures
  }

  /** Record a successful compaction — resets the failure counter. */
  recordSuccess(): void {
    this.consecutiveFailures = 0
    this.lastFailureTime = 0
  }

  /** Record a failed compaction — increments the failure counter. */
  recordFailure(): void {
    this.consecutiveFailures++
    this.lastFailureTime = Date.now()
  }

  /** Manually reset the circuit breaker. */
  reset(): void {
    this.consecutiveFailures = 0
    this.lastFailureTime = 0
  }
}
