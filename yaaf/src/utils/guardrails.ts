/**
 * Guardrails — usage-based budget limits and cost policies.
 *
 * Prevents runaway agent loops from consuming unbounded resources.
 * Inspired by the main repo's `calculateTokenWarningState()` and
 * `policyLimits` service.
 *
 * Three tiers of protection:
 * 1. **Warning** — emit event when approaching limits
 * 2. **Error** — escalated warning, UI should prompt user
 * 3. **Blocked** — hard stop, agent cannot proceed
 *
 * @example
 * ```ts
 * const guardrails = new Guardrails({
 *   maxCostUSD: 5.00,          // $5 per session
 *   maxTokensPerSession: 500_000,
 *   maxTurnsPerRun: 50,
 *   warningPct: 80,            // Warn at 80% usage
 * });
 *
 * guardrails.on('warning', ({ resource, usage, limit }) => {
 *   console.warn(`Approaching ${resource} limit: ${usage}/${limit}`);
 * });
 *
 * guardrails.on('blocked', ({ resource }) => {
 *   console.error(`${resource} budget exceeded — agent stopped`);
 * });
 *
 * // Check before each model call
 * const check = guardrails.check(tracker);
 * if (check.blocked) throw new BudgetExceededError(check.reason);
 * ```
 */

import type { CostTracker } from './costTracker.js'
import { YAAFError } from '../errors.js'

// ── Types ────────────────────────────────────────────────────────────────────

export type GuardrailConfig = {
  /** Maximum USD cost per session. Default: Infinity (no limit). */
  maxCostUSD?: number
  /** Maximum total tokens (input+output) per session. Default: Infinity. */
  maxTokensPerSession?: number
  /** Maximum turns (model calls) per single run(). Default: Infinity. */
  maxTurnsPerRun?: number
  /** Maximum input tokens for a single model call. Default: Infinity. */
  maxInputTokensPerCall?: number
  /** Percentage of budget at which to emit 'warning'. Default: 80. */
  warningPct?: number
  /** Percentage of budget at which to emit 'error'. Default: 95. */
  errorPct?: number
}

export type GuardrailResource = 'cost' | 'tokens' | 'turns' | 'input_tokens'

export type GuardrailStatus = 'ok' | 'warning' | 'error' | 'blocked'

export type GuardrailCheckResult = {
  status: GuardrailStatus
  blocked: boolean
  reason?: string
  details: GuardrailDetail[]
}

export type GuardrailDetail = {
  resource: GuardrailResource
  status: GuardrailStatus
  current: number
  limit: number
  pctUsed: number
}

export type GuardrailEvent =
  | { type: 'warning'; resource: GuardrailResource; current: number; limit: number; pctUsed: number }
  | { type: 'error'; resource: GuardrailResource; current: number; limit: number; pctUsed: number }
  | { type: 'blocked'; resource: GuardrailResource; current: number; limit: number; reason: string }

export type GuardrailListener = (event: GuardrailEvent) => void

// ── BudgetExceededError ──────────────────────────────────────────────────────

export class BudgetExceededError extends YAAFError {
  readonly resource: GuardrailResource
  readonly current: number
  readonly limit: number

  constructor(resource: GuardrailResource, current: number, limit: number) {
    const msg = resource === 'cost'
      ? `Cost budget exceeded: $${current.toFixed(4)} / $${limit.toFixed(2)}`
      : resource === 'tokens'
        ? `Token budget exceeded: ${current.toLocaleString()} / ${limit.toLocaleString()}`
        : resource === 'turns'
          ? `Turn limit exceeded: ${current} / ${limit}`
          : `Input token limit exceeded: ${current.toLocaleString()} / ${limit.toLocaleString()}`
    super(msg, { code: 'ABORT', retryable: false })
    this.name = 'BudgetExceededError'
    this.resource = resource
    this.current = current
    this.limit = limit
  }
}

// ── Guardrails ───────────────────────────────────────────────────────────────

export class Guardrails {
  private readonly config: Required<GuardrailConfig>
  private readonly listeners: GuardrailListener[] = []
  private _turnCount = 0
  /** Track which resources have already emitted warnings (prevent spam). */
  private _warnedResources = new Set<string>()
  private _erroredResources = new Set<string>()

  constructor(config: GuardrailConfig = {}) {
    this.config = {
      maxCostUSD: config.maxCostUSD ?? Infinity,
      maxTokensPerSession: config.maxTokensPerSession ?? Infinity,
      maxTurnsPerRun: config.maxTurnsPerRun ?? Infinity,
      maxInputTokensPerCall: config.maxInputTokensPerCall ?? Infinity,
      warningPct: config.warningPct ?? 80,
      errorPct: config.errorPct ?? 95,
    }
  }

  // ── Event system ───────────────────────────────────────────────────────

  on(listener: GuardrailListener): () => void {
    this.listeners.push(listener)
    return () => {
      const idx = this.listeners.indexOf(listener)
      if (idx >= 0) this.listeners.splice(idx, 1)
    }
  }

  private emit(event: GuardrailEvent): void {
    for (const listener of this.listeners) {
      try { listener(event) } catch { /* swallow listener errors */ }
    }
  }

  // ── Turn tracking ──────────────────────────────────────────────────────

  /** Increment turn counter. Called before each model call. */
  recordTurn(): void {
    this._turnCount++
  }

  /** Reset turn counter (called at the start of each run()). */
  resetTurns(): void {
    this._turnCount = 0
  }

  get turnCount(): number { return this._turnCount }

  // ── Primary check ──────────────────────────────────────────────────────

  /**
   * Check all guardrails. Returns the combined status.
   * Call this before each model call.
   */
  check(tracker: CostTracker, inputTokensThisCall?: number): GuardrailCheckResult {
    const details: GuardrailDetail[] = []
    let worstStatus: GuardrailStatus = 'ok'

    // Cost check
    if (isFinite(this.config.maxCostUSD)) {
      const detail = this.checkResource('cost', tracker.totalCostUSD, this.config.maxCostUSD)
      details.push(detail)
      worstStatus = worse(worstStatus, detail.status)
    }

    // Token check
    if (isFinite(this.config.maxTokensPerSession)) {
      const totalTokens = tracker.totalInputTokens + tracker.totalOutputTokens
      const detail = this.checkResource('tokens', totalTokens, this.config.maxTokensPerSession)
      details.push(detail)
      worstStatus = worse(worstStatus, detail.status)
    }

    // Turn limit check
    if (isFinite(this.config.maxTurnsPerRun)) {
      const detail = this.checkResource('turns', this._turnCount, this.config.maxTurnsPerRun)
      details.push(detail)
      worstStatus = worse(worstStatus, detail.status)
    }

    // Input tokens per call check
    if (inputTokensThisCall !== undefined && isFinite(this.config.maxInputTokensPerCall)) {
      const detail = this.checkResource('input_tokens', inputTokensThisCall, this.config.maxInputTokensPerCall)
      details.push(detail)
      worstStatus = worse(worstStatus, detail.status)
    }

    const blocked = worstStatus === 'blocked'
    const blockedDetail = details.find(d => d.status === 'blocked')

    return {
      status: worstStatus,
      blocked,
      reason: blockedDetail
        ? `${blockedDetail.resource} limit exceeded: ${blockedDetail.current} / ${blockedDetail.limit}`
        : undefined,
      details,
    }
  }

  /**
   * Check and throw if blocked. Convenience for wiring into agent loop.
   */
  enforce(tracker: CostTracker, inputTokensThisCall?: number): void {
    const result = this.check(tracker, inputTokensThisCall)
    if (result.blocked) {
      const blocked = result.details.find(d => d.status === 'blocked')!
      throw new BudgetExceededError(blocked.resource, blocked.current, blocked.limit)
    }
  }

  // ── Internal ───────────────────────────────────────────────────────────

  private checkResource(
    resource: GuardrailResource,
    current: number,
    limit: number,
  ): GuardrailDetail {
    const pctUsed = limit > 0 ? (current / limit) * 100 : 0
    let status: GuardrailStatus = 'ok'

    if (current >= limit) {
      status = 'blocked'
      this.emit({ type: 'blocked', resource, current, limit, reason: `${resource} budget exceeded` })
    } else if (pctUsed >= this.config.errorPct) {
      status = 'error'
      if (!this._erroredResources.has(resource)) {
        this._erroredResources.add(resource)
        this.emit({ type: 'error', resource, current, limit, pctUsed })
      }
    } else if (pctUsed >= this.config.warningPct) {
      status = 'warning'
      if (!this._warnedResources.has(resource)) {
        this._warnedResources.add(resource)
        this.emit({ type: 'warning', resource, current, limit, pctUsed })
      }
    }

    return { resource, status, current, limit, pctUsed }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_SEVERITY: Record<GuardrailStatus, number> = {
  ok: 0, warning: 1, error: 2, blocked: 3,
}

function worse(a: GuardrailStatus, b: GuardrailStatus): GuardrailStatus {
  return STATUS_SEVERITY[a] >= STATUS_SEVERITY[b] ? a : b
}
