/**
 * Cost Tracker — per-model token accounting with USD cost estimation.
 *
 * Inspired by the main repo's cost-tracker.ts. Tracks:
 * - Input/output/cache tokens per model
 * - USD cost per model (configurable price table)
 * - Session-resumable state (save/restore across session boundaries)
 * - Formatted usage summaries for UIs and logs
 *
 * @example
 * ```ts
 * const tracker = new CostTracker();
 * tracker.record('gpt-4o', { inputTokens: 1000, outputTokens: 500 });
 * tracker.record('gpt-4o-mini', { inputTokens: 2000, outputTokens: 100 });
 *
 * console.log(tracker.totalCostUSD);   // 0.0255
 * console.log(tracker.formatSummary()); // Formatted breakdown
 *
 * // Session persistence
 * const snapshot = tracker.save();
 * const restored = CostTracker.restore(snapshot);
 * ```
 */

// ── Price Table ──────────────────────────────────────────────────────────────

/** Pricing per 1M tokens (USD) */
export type ModelPricing = {
  inputPerMillion: number
  outputPerMillion: number
  cacheReadPerMillion?: number
  cacheWritePerMillion?: number
}

/**
 * Default pricing for known models. Users can override or extend via
 * `CostTracker.setPricing()`.
 */
const DEFAULT_PRICING: Record<string, ModelPricing> = {
  // Claude
  'claude-sonnet-4-20250514': { inputPerMillion: 3, outputPerMillion: 15, cacheReadPerMillion: 0.3, cacheWritePerMillion: 3.75 },
  'claude-3-7-sonnet-20250219': { inputPerMillion: 3, outputPerMillion: 15, cacheReadPerMillion: 0.3, cacheWritePerMillion: 3.75 },
  'claude-3-5-sonnet-20241022': { inputPerMillion: 3, outputPerMillion: 15, cacheReadPerMillion: 0.3, cacheWritePerMillion: 3.75 },
  'claude-3-5-haiku-20241022': { inputPerMillion: 0.8, outputPerMillion: 4, cacheReadPerMillion: 0.08, cacheWritePerMillion: 1 },
  'claude-3-opus-20240229': { inputPerMillion: 15, outputPerMillion: 75, cacheReadPerMillion: 1.5, cacheWritePerMillion: 18.75 },
  // OpenAI
  'gpt-4o': { inputPerMillion: 2.5, outputPerMillion: 10 },
  'gpt-4o-mini': { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  'gpt-4-turbo': { inputPerMillion: 10, outputPerMillion: 30 },
  'o1': { inputPerMillion: 15, outputPerMillion: 60 },
  'o1-mini': { inputPerMillion: 3, outputPerMillion: 12 },
  'o3-mini': { inputPerMillion: 1.1, outputPerMillion: 4.4 },
  // Gemini
  'gemini-2.5-pro': { inputPerMillion: 1.25, outputPerMillion: 10 },
  'gemini-2.5-flash': { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  'gemini-2.0-flash': { inputPerMillion: 0.1, outputPerMillion: 0.4 },
  'gemini-1.5-pro': { inputPerMillion: 1.25, outputPerMillion: 5 },
  'gemini-1.5-flash': { inputPerMillion: 0.075, outputPerMillion: 0.3 },
}

// ── Types ────────────────────────────────────────────────────────────────────

export type UsageRecord = {
  inputTokens: number
  outputTokens: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
}

export type ModelUsage = {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  costUSD: number
  calls: number
}

export type CostSnapshot = {
  models: Record<string, ModelUsage>
  totalCostUSD: number
  totalInputTokens: number
  totalOutputTokens: number
  totalDurationMs: number
  sessionId?: string
  savedAt: string
}

// ── CostTracker ──────────────────────────────────────────────────────────────

export class CostTracker {
  private models = new Map<string, ModelUsage>()
  private pricing: Record<string, ModelPricing>
  private _totalCostUSD = 0
  private _totalInputTokens = 0
  private _totalOutputTokens = 0
  private _startTime = Date.now()
  private _hasUnknownCost = false

  constructor(customPricing?: Record<string, ModelPricing>) {
    this.pricing = { ...DEFAULT_PRICING, ...customPricing }
  }

  // ── Recording ──────────────────────────────────────────────────────────

  /** Record a model API call's token usage. */
  record(model: string, usage: UsageRecord): number {
    const cost = this.calculateCost(model, usage)
    const existing = this.models.get(model) ?? {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      costUSD: 0,
      calls: 0,
    }

    existing.inputTokens += usage.inputTokens
    existing.outputTokens += usage.outputTokens
    existing.cacheReadTokens += usage.cacheReadTokens ?? 0
    existing.cacheWriteTokens += usage.cacheWriteTokens ?? 0
    existing.costUSD += cost
    existing.calls += 1

    this.models.set(model, existing)
    this._totalCostUSD += cost
    this._totalInputTokens += usage.inputTokens
    this._totalOutputTokens += usage.outputTokens

    return cost
  }

  // ── Queries ────────────────────────────────────────────────────────────

  get totalCostUSD(): number { return this._totalCostUSD }
  get totalInputTokens(): number { return this._totalInputTokens }
  get totalOutputTokens(): number { return this._totalOutputTokens }
  get hasUnknownCost(): boolean { return this._hasUnknownCost }
  get totalDurationMs(): number { return Date.now() - this._startTime }

  /** Get usage for a specific model. */
  getModelUsage(model: string): ModelUsage | undefined {
    return this.models.get(model)
  }

  /** Get usage for all models. */
  getAllModelUsage(): ReadonlyMap<string, ModelUsage> {
    return this.models
  }

  /** Set custom pricing for a model. */
  setPricing(model: string, pricing: ModelPricing): void {
    this.pricing[model] = pricing
  }

  /** Reset all tracked usage. */
  reset(): void {
    this.models.clear()
    this._totalCostUSD = 0
    this._totalInputTokens = 0
    this._totalOutputTokens = 0
    this._startTime = Date.now()
    this._hasUnknownCost = false
  }

  // ── Cost Calculation ───────────────────────────────────────────────────

  private calculateCost(model: string, usage: UsageRecord): number {
    // Try exact match, then prefix match (e.g., "gpt-4o-2024-08-06" matches "gpt-4o")
    const pricing = this.pricing[model] ?? this.findPricingByPrefix(model)
    if (!pricing) {
      this._hasUnknownCost = true
      return 0
    }

    let cost = 0
    cost += (usage.inputTokens / 1_000_000) * pricing.inputPerMillion
    cost += (usage.outputTokens / 1_000_000) * pricing.outputPerMillion
    if (usage.cacheReadTokens && pricing.cacheReadPerMillion) {
      cost += (usage.cacheReadTokens / 1_000_000) * pricing.cacheReadPerMillion
    }
    if (usage.cacheWriteTokens && pricing.cacheWritePerMillion) {
      cost += (usage.cacheWriteTokens / 1_000_000) * pricing.cacheWritePerMillion
    }
    return cost
  }

  private findPricingByPrefix(model: string): ModelPricing | undefined {
    for (const [key, pricing] of Object.entries(this.pricing)) {
      if (model.startsWith(key)) return pricing
    }
    return undefined
  }

  // ── Formatting ─────────────────────────────────────────────────────────

  /** Format cost as a string (e.g., "$0.0255"). */
  static formatCost(cost: number): string {
    return `$${cost > 0.5 ? cost.toFixed(2) : cost.toFixed(4)}`
  }

  /** Format a number with commas (e.g., "1,234,567"). */
  static formatNumber(n: number): string {
    return n.toLocaleString('en-US')
  }

  /** Human-readable usage summary. */
  formatSummary(): string {
    const lines: string[] = []

    lines.push(`Total cost:   ${CostTracker.formatCost(this._totalCostUSD)}${this._hasUnknownCost ? ' (some models have unknown pricing)' : ''}`)
    lines.push(`Total tokens: ${CostTracker.formatNumber(this._totalInputTokens)} in, ${CostTracker.formatNumber(this._totalOutputTokens)} out`)
    lines.push(`Duration:     ${this.formatDuration(this.totalDurationMs)}`)

    if (this.models.size > 1) {
      lines.push('')
      lines.push('By model:')
      for (const [model, usage] of this.models) {
        const shortName = model.length > 30 ? model.slice(0, 27) + '...' : model
        lines.push(
          `  ${shortName.padEnd(30)} ${CostTracker.formatNumber(usage.inputTokens)} in, ` +
          `${CostTracker.formatNumber(usage.outputTokens)} out ` +
          `(${CostTracker.formatCost(usage.costUSD)}, ${usage.calls} calls)`,
        )
      }
    }

    return lines.join('\n')
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`
    const secs = Math.floor(ms / 1000)
    if (secs < 60) return `${secs}s`
    const mins = Math.floor(secs / 60)
    const remSecs = secs % 60
    return `${mins}m ${remSecs}s`
  }

  // ── Session Persistence ────────────────────────────────────────────────

  /** Serialize current state for session persistence. */
  save(sessionId?: string): CostSnapshot {
    const models: Record<string, ModelUsage> = {}
    for (const [model, usage] of this.models) {
      models[model] = { ...usage }
    }

    return {
      models,
      totalCostUSD: this._totalCostUSD,
      totalInputTokens: this._totalInputTokens,
      totalOutputTokens: this._totalOutputTokens,
      totalDurationMs: this.totalDurationMs,
      sessionId,
      savedAt: new Date().toISOString(),
    }
  }

  /** Restore state from a saved snapshot. */
  static restore(snapshot: CostSnapshot, customPricing?: Record<string, ModelPricing>): CostTracker {
    const tracker = new CostTracker(customPricing)
    for (const [model, usage] of Object.entries(snapshot.models)) {
      tracker.models.set(model, { ...usage })
    }
    tracker._totalCostUSD = snapshot.totalCostUSD
    tracker._totalInputTokens = snapshot.totalInputTokens
    tracker._totalOutputTokens = snapshot.totalOutputTokens
    return tracker
  }
}
