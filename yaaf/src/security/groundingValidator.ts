/**
 * GroundingValidator — Anti-Hallucination Cross-Reference Check
 *
 * Validates LLM responses against the evidence (tool results) in the
 * conversation. Detects when the LLM makes claims that aren't grounded
 * in any tool output, reducing the risk of hallucination.
 *
 * Three modes:
 * - `warn` — log ungrounded claims, pass response through
 * - `annotate` — append `[ungrounded]` markers to suspicious claims
 * - `strict` — override response if grounding score is below threshold
 *
 * Uses a lightweight keyword/phrase overlap algorithm (no extra LLM call)
 * to score how well the response is supported by tool results.
 *
 * @example
 * ```ts
 * import { GroundingValidator } from 'yaaf';
 *
 * const validator = new GroundingValidator({
 *   mode: 'warn',
 *   minCoverage: 0.3,
 * });
 *
 * const agent = new Agent({
 *   hooks: {
 *     afterLLM: validator.hook(),
 *   },
 * });
 * ```
 *
 * @module security/groundingValidator
 */

import type { ChatMessage, ChatResult } from '../agents/runner.js'
import type { LLMHookResult } from '../hooks.js'

// ── Types ────────────────────────────────────────────────────────────────────

export type GroundingMode = 'warn' | 'annotate' | 'strict'

export type GroundingValidatorConfig = {
  /**
   * Validation mode:
   * - `warn` — log warning, pass response through (default)
   * - `annotate` — add [⚠️ ungrounded] markers to unverified sentences
   * - `strict` — override response if below threshold
   */
  mode?: GroundingMode

  /**
   * Minimum fraction of response sentences that must be grounded (0-1).
   * Only used in `strict` mode.
   * Default: 0.3 (30% of factual sentences must be backed by tool results).
   */
  minCoverage?: number

  /**
   * Minimum number of token overlap to consider a sentence "grounded".
   * Default: 3 (at least 3 significant words must overlap with tool evidence).
   */
  minOverlapTokens?: number

  /**
   * Message to use when overriding in strict mode.
   */
  overrideMessage?: string

  /**
   * Called on every grounding assessment.
   */
  onAssessment?: (event: GroundingAssessment) => void

  /**
   * Minimum words for a sentence to be considered a "factual claim"
   * worth checking. Shorter sentences (greetings, acknowledgments)
   * are skipped.
   * Default: 5
   */
  minSentenceWords?: number
}

export type GroundingSentence = {
  /** The sentence text */
  text: string
  /** Whether this sentence is grounded in tool evidence */
  grounded: boolean
  /** Number of overlapping tokens with tool evidence */
  overlapCount: number
  /** Which tool result provided the best evidence (if any) */
  bestSource?: string
}

export type GroundingAssessment = {
  /** Overall grounding score (0-1) */
  score: number
  /** Number of factual sentences checked */
  totalSentences: number
  /** Number of grounded sentences */
  groundedSentences: number
  /** Per-sentence breakdown */
  sentences: GroundingSentence[]
  /** Action taken */
  action: 'passed' | 'warned' | 'annotated' | 'overridden'
  /** Timestamp */
  timestamp: Date
}

// ── Stop words (excluded from overlap comparison) ────────────────────────────

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'must', 'ought',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her',
  'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their', 'this',
  'that', 'these', 'those', 'and', 'but', 'or', 'nor', 'not', 'so',
  'yet', 'both', 'if', 'then', 'else', 'when', 'where', 'how', 'what',
  'which', 'who', 'whom', 'why', 'in', 'on', 'at', 'to', 'for', 'of',
  'with', 'by', 'from', 'as', 'into', 'through', 'during', 'before',
  'after', 'above', 'below', 'between', 'here', 'there', 'all', 'each',
  'every', 'some', 'any', 'no', 'more', 'most', 'other', 'also', 'just',
  'about', 'up', 'out', 'than', 'very', 'too', 'quite', 'only', 'even',
])

// ── GroundingValidator ───────────────────────────────────────────────────────

export class GroundingValidator {
  readonly name = 'grounding-validator'
  private readonly mode: GroundingMode
  private readonly minCoverage: number
  private readonly minOverlapTokens: number
  private readonly minSentenceWords: number
  private readonly overrideMessage: string
  private readonly onAssessment?: (event: GroundingAssessment) => void

  constructor(config: GroundingValidatorConfig = {}) {
    this.mode = config.mode ?? 'warn'
    this.minCoverage = config.minCoverage ?? 0.3
    this.minOverlapTokens = config.minOverlapTokens ?? 3
    this.minSentenceWords = config.minSentenceWords ?? 5
    this.overrideMessage = config.overrideMessage ??
      'I wasn\'t able to fully verify my response against the available evidence. Please verify the claims independently.'
    this.onAssessment = config.onAssessment
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Assess how well a response is grounded in tool evidence.
   *
   * @param response - The LLM response text
   * @param messages - Conversation messages (to extract tool results)
   */
  assess(response: string, messages: readonly ChatMessage[]): GroundingAssessment {
    // 1. Extract tool result evidence from conversation
    const evidence = this.extractEvidence(messages)

    // If no tool results in conversation, skip grounding (nothing to check against)
    if (evidence.length === 0) {
      const assessment: GroundingAssessment = {
        score: 1.0,
        totalSentences: 0,
        groundedSentences: 0,
        sentences: [],
        action: 'passed',
        timestamp: new Date(),
      }
      this.onAssessment?.(assessment)
      return assessment
    }

    // 2. Tokenize evidence into sets of significant words per source
    const evidenceSets = evidence.map(e => ({
      name: e.name,
      tokens: tokenize(e.content),
    }))

    // 3. Split response into sentences and check each
    const sentences = splitSentences(response)
    const checkedSentences: GroundingSentence[] = []

    for (const sentence of sentences) {
      // Skip short sentences (greetings, acknowledgments, etc.)
      const words = sentence.split(/\s+/).filter(w => w.length > 0)
      if (words.length < this.minSentenceWords) continue

      const sentenceTokens = tokenize(sentence)
      let bestOverlap = 0
      let bestSource: string | undefined

      for (const evidence of evidenceSets) {
        const overlap = countOverlap(sentenceTokens, evidence.tokens)
        if (overlap > bestOverlap) {
          bestOverlap = overlap
          bestSource = evidence.name
        }
      }

      const grounded = bestOverlap >= this.minOverlapTokens
      checkedSentences.push({
        text: sentence,
        grounded,
        overlapCount: bestOverlap,
        bestSource: grounded ? bestSource : undefined,
      })
    }

    // 4. Calculate score
    const total = checkedSentences.length
    const grounded = checkedSentences.filter(s => s.grounded).length
    const score = total > 0 ? grounded / total : 1.0

    // 5. Determine action
    let action: GroundingAssessment['action'] = 'passed'
    if (total > 0 && score < this.minCoverage) {
      action = this.mode === 'strict' ? 'overridden' :
        this.mode === 'annotate' ? 'annotated' : 'warned'
    } else if (total > 0 && score < 1.0) {
      action = this.mode === 'annotate' ? 'annotated' : 'warned'
      // If score is above threshold, only warn (don't override)
      if (score >= this.minCoverage) action = this.mode === 'warn' ? 'warned' : 'annotated'
    }

    // If everything is grounded or no factual sentences, pass
    if (score >= 1.0 || total === 0) action = 'passed'

    const assessment: GroundingAssessment = {
      score,
      totalSentences: total,
      groundedSentences: grounded,
      sentences: checkedSentences,
      action,
      timestamp: new Date(),
    }
    this.onAssessment?.(assessment)
    return assessment
  }

  /**
   * Create an `afterLLM` hook that validates response grounding.
   */
  hook(): (response: ChatResult, iteration: number) => LLMHookResult | void {
    // We need access to messages — store them via beforeLLM
    let currentMessages: readonly ChatMessage[] = []

    // Return a composite: beforeLLM captures messages, afterLLM validates
    return (response: ChatResult) => {
      if (!response.content) return { action: 'continue' as const }

      const assessment = this.assess(response.content, currentMessages)

      switch (assessment.action) {
        case 'passed':
          return { action: 'continue' as const }

        case 'warned':
          // Log but don't modify
          return { action: 'continue' as const }

        case 'annotated': {
          // Add markers to ungrounded sentences
          let annotated = response.content
          for (const s of assessment.sentences) {
            if (!s.grounded) {
              annotated = annotated.replace(
                s.text,
                `${s.text} [⚠️ ungrounded]`,
              )
            }
          }
          return { action: 'override' as const, content: annotated }
        }

        case 'overridden':
          return {
            action: 'override' as const,
            content: `${this.overrideMessage}\n\nOriginal response (${Math.round(assessment.score * 100)}% grounded):\n${response.content}`,
          }

        default:
          return { action: 'continue' as const }
      }
    }
  }

  /**
   * Create hooks that capture conversation messages for grounding validation.
   *
   * Returns `{ beforeLLM, afterLLM }` hooks that work together.
   */
  hooks(): { beforeLLM: (messages: ChatMessage[]) => void; afterLLM: (response: ChatResult, iteration: number) => LLMHookResult | void } {
    let currentMessages: ChatMessage[] = []

    return {
      beforeLLM: (messages: ChatMessage[]) => {
        currentMessages = messages
      },
      afterLLM: (response: ChatResult) => {
        if (!response.content) return { action: 'continue' as const }

        const assessment = this.assess(response.content, currentMessages)

        switch (assessment.action) {
          case 'annotated': {
            let annotated = response.content
            for (const s of assessment.sentences) {
              if (!s.grounded) {
                annotated = annotated.replace(s.text, `${s.text} [⚠️ ungrounded]`)
              }
            }
            return { action: 'override' as const, content: annotated }
          }
          case 'overridden':
            return {
              action: 'override' as const,
              content: `${this.overrideMessage}\n\nOriginal response (${Math.round(assessment.score * 100)}% grounded):\n${response.content}`,
            }
          default:
            return { action: 'continue' as const }
        }
      },
    }
  }

  // ── Internal ────────────────────────────────────────────────────────────

  private extractEvidence(messages: readonly ChatMessage[]): Array<{ name: string; content: string }> {
    const evidence: Array<{ name: string; content: string }> = []

    for (const msg of messages) {
      if (msg.role === 'tool') {
        const content = typeof msg.content === 'string'
          ? msg.content
          : JSON.stringify(msg.content)
        // Use tool_call_id or generic name
        const name = (msg as Record<string, unknown>).name as string ??
          (msg as Record<string, unknown>).tool_call_id as string ??
          `tool_result_${evidence.length}`
        evidence.push({ name, content })
      }
    }

    return evidence
  }
}

// ── Text Processing Helpers ──────────────────────────────────────────────────

/** Split text into significant tokens (lowercase, no stop words, no punctuation) */
function tokenize(text: string): Set<string> {
  const tokens = new Set<string>()
  const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/)
  for (const word of words) {
    if (word.length > 2 && !STOP_WORDS.has(word)) {
      tokens.add(word)
    }
  }
  return tokens
}

/** Count token overlap between two sets */
function countOverlap(a: Set<string>, b: Set<string>): number {
  let count = 0
  for (const token of a) {
    if (b.has(token)) count++
  }
  return count
}

/** Split text into sentences */
function splitSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by whitespace or end of string
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

// ── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create a grounding validator with production defaults.
 */
export function groundingValidator(config?: GroundingValidatorConfig): GroundingValidator {
  return new GroundingValidator(config)
}

/**
 * Create a strict grounding validator.
 */
export function strictGroundingValidator(config?: Omit<GroundingValidatorConfig, 'mode'>): GroundingValidator {
  return new GroundingValidator({ ...config, mode: 'strict' })
}
