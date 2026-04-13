/**
 * Tool Loop Detection — Detects and breaks repetitive tool call patterns.
 *
 * Prevents agents from burning money by calling the same tool with the same
 * arguments in an infinite loop. Inspired by OpenClaw's tool-loop detection.
 *
 * @example
 * ```ts
 * const detector = new ToolLoopDetector({ threshold: 3, windowSize: 10 });
 *
 * // In the agent loop:
 * detector.record(toolName, toolArgs);
 * if (detector.isLooping()) {
 *   // Break out of the loop, inject a warning message
 *   const warning = detector.getWarning();
 * }
 * ```
 *
 * @module tools/loopDetector
 */

import { createHash } from 'crypto'

// ── Types ────────────────────────────────────────────────────────────────────

export type LoopDetectorConfig = {
  /**
   * Number of consecutive identical calls before flagging a loop.
   * Default: 3
   */
  threshold?: number
  /**
   * Rolling window size for pattern detection.
   * Default: 20
   */
  windowSize?: number
  /**
   * Also detect alternating patterns (A→B→A→B)?
   * Default: true
   */
  detectAlternating?: boolean
}

export type ToolCallRecord = {
  name: string
  argsHash: string
  timestamp: number
}

export type LoopInfo = {
  type: 'exact-repeat' | 'alternating' | 'none'
  /** Tool(s) involved */
  tools: string[]
  /** Number of repetitions detected */
  count: number
}

// ── Detector ─────────────────────────────────────────────────────────────────

export class ToolLoopDetector {
  private history: ToolCallRecord[] = []
  private readonly threshold: number
  private readonly windowSize: number
  private readonly detectAlternating: boolean

  constructor(config?: LoopDetectorConfig) {
    this.threshold = config?.threshold ?? 3
    this.windowSize = config?.windowSize ?? 20
    this.detectAlternating = config?.detectAlternating ?? true
  }

  /**
   * Record a tool call. Call this after each tool execution.
   */
  record(name: string, args: unknown): void {
    const argsHash = hashArgs(args)
    this.history.push({ name, argsHash, timestamp: Date.now() })

    // Trim to window size
    if (this.history.length > this.windowSize) {
      this.history = this.history.slice(-this.windowSize)
    }
  }

  /**
   * Check if the agent is stuck in a loop.
   */
  isLooping(): boolean {
    return this.detect().type !== 'none'
  }

  /**
   * Get detailed loop information.
   */
  detect(): LoopInfo {
    if (this.history.length < this.threshold) {
      return { type: 'none', tools: [], count: 0 }
    }

    // Check exact repeats: same tool + same args N times in a row
    const recent = this.history.slice(-this.threshold)
    const first = recent[0]!
    const allSame = recent.every(
      r => r.name === first.name && r.argsHash === first.argsHash,
    )
    if (allSame) {
      return { type: 'exact-repeat', tools: [first.name], count: this.threshold }
    }

    // Check alternating pattern: A→B→A→B (needs 2x threshold minimum)
    if (this.detectAlternating && this.history.length >= this.threshold * 2) {
      const window = this.history.slice(-this.threshold * 2)
      const pattern = detectAlternatingPattern(window)
      if (pattern) {
        return {
          type: 'alternating',
          tools: pattern.tools,
          count: pattern.count,
        }
      }
    }

    return { type: 'none', tools: [], count: 0 }
  }

  /**
   * Generate a warning message to inject into the conversation.
   * Tells the model it's stuck in a loop.
   */
  getWarning(): string {
    const info = this.detect()
    if (info.type === 'none') return ''

    if (info.type === 'exact-repeat') {
      return (
        `⚠️ Loop detected: You have called "${info.tools[0]}" with the same arguments ` +
        `${info.count} times in a row. This appears to be a loop. ` +
        `Please try a different approach or explain why this repetition is necessary.`
      )
    }

    return (
      `⚠️ Alternating loop detected: You are cycling between ` +
      `${info.tools.map(t => `"${t}"`).join(' and ')} repeatedly. ` +
      `This appears to be a loop. Please try a different approach.`
    )
  }

  /**
   * Reset the detector (e.g., on new conversation turn).
   */
  reset(): void {
    this.history = []
  }

  /** Get the current history length */
  get length(): number {
    return this.history.length
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function hashArgs(args: unknown): string {
  const str = typeof args === 'string' ? args : JSON.stringify(args ?? {})
  return createHash('sha256').update(str).digest('hex').slice(0, 16)
}

function detectAlternatingPattern(
  window: ToolCallRecord[],
): { tools: string[]; count: number } | null {
  if (window.length < 4) return null

  // Check A→B→A→B pattern
  const a = window[window.length - 1]!
  const b = window[window.length - 2]!

  if (a.name === b.name && a.argsHash === b.argsHash) return null // Same, not alternating

  let count = 0
  for (let i = window.length - 1; i >= 1; i -= 2) {
    const cur = window[i]!
    const prev = window[i - 1]!
    if (
      cur.name === a.name && cur.argsHash === a.argsHash &&
      prev.name === b.name && prev.argsHash === b.argsHash
    ) {
      count++
    } else {
      break
    }
  }

  return count >= 2 ? { tools: [b.name, a.name], count: count * 2 } : null
}
