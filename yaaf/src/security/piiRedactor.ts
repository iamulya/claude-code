/**
 * PiiRedactor — Personally Identifiable Information Detection and Redaction
 *
 * Bidirectional PII scanner that works on both LLM input (user messages)
 * and output (LLM responses). Detects and optionally redacts:
 *
 * - **Email addresses** — RFC 5322 compliant patterns
 * - **Phone numbers** — US, EU, and international formats
 * - **Social Security Numbers** — US SSN patterns (XXX-XX-XXXX)
 * - **Credit card numbers** — Visa, Mastercard, Amex, Discover (Luhn-validated)
 * - **API keys / tokens** — common provider patterns (AWS, GitHub, Stripe, etc.)
 * - **IP addresses** — IPv4 and IPv6
 * - **Passport numbers** — US passport format
 * - **IBAN numbers** — International Bank Account Numbers
 * - **Custom patterns** — user-defined regex for domain-specific PII
 *
 * Operates in two modes:
 * - **redact** — replaces PII with `[REDACTED:type]` placeholders
 * - **detect** — flags PII locations without modifying text
 *
 * Designed as composable middleware: use as `beforeLLM` (protect outgoing PII),
 * `afterLLM` (scrub PII from responses), or both.
 *
 * @example
 * ```ts
 * import { PiiRedactor } from 'yaaf';
 *
 * const redactor = new PiiRedactor({
 *   mode: 'redact',
 *   categories: ['email', 'ssn', 'credit_card', 'api_key'],
 * });
 *
 * const agent = new Agent({
 *   hooks: {
 *     beforeLLM: redactor.beforeHook(),
 *     afterLLM: redactor.afterHook(),
 *   },
 * });
 * ```
 *
 * @module security/piiRedactor
 */

import type { ChatMessage } from '../agents/runner.js'
import type { ChatResult } from '../agents/runner.js'
import type { LLMHookResult } from '../hooks.js'

// ── Types ────────────────────────────────────────────────────────────────────

export type PiiCategory =
  | 'email'
  | 'phone'
  | 'ssn'
  | 'credit_card'
  | 'api_key'
  | 'ipv4'
  | 'ipv6'
  | 'passport'
  | 'iban'
  | 'custom'

export type PiiRedactorMode = 'detect' | 'redact'

export type PiiRedactorConfig = {
  /**
   * Operating mode:
   * - `detect` — find PII occurrences without modifying text
   * - `redact` — replace PII with `[REDACTED:type]` placeholders (default)
   */
  mode?: PiiRedactorMode

  /**
   * Categories of PII to scan for.
   * Default: all built-in categories.
   */
  categories?: PiiCategory[]

  /**
   * Custom PII patterns to detect.
   */
  customPatterns?: CustomPiiPattern[]

  /**
   * Replacement template for redacted PII.
   * Use `{type}` as a placeholder for the PII category name.
   * Default: `[REDACTED:{type}]`
   */
  redactTemplate?: string

  /**
   * Allowlisted values that should never be redacted.
   * Useful for known-safe emails, IPs, etc.
   */
  allowlist?: string[]

  /**
   * Called when PII is detected.
   */
  onDetection?: (event: PiiEvent) => void
}

export type CustomPiiPattern = {
  /** Human-readable name */
  name: string
  /** Category label used in redaction placeholder */
  category: string
  /** Regex pattern to detect the PII */
  pattern: RegExp
  /**
   * Optional validator — receives the matched text and returns true
   * if it's genuinely PII (reduces false positives).
   */
  validate?: (match: string) => boolean
}

export type PiiDetection = {
  /** Category of PII detected */
  category: string
  /** The matched PII value (original text) */
  value: string
  /** Position in the text */
  offset: number
  /** Length of the match */
  length: number
}

export type PiiEvent = {
  /** Category of PII detected */
  category: string
  /** Direction: input (user → LLM) or output (LLM → user) */
  direction: 'input' | 'output'
  /** Number of occurrences */
  count: number
  /** Action taken */
  action: 'detected' | 'redacted'
  /** Timestamp */
  timestamp: Date
}

export type PiiScanResult = {
  /** The (optionally redacted) text */
  text: string
  /** Whether any PII was found */
  found: boolean
  /** All PII detections */
  detections: PiiDetection[]
  /** Summary events */
  events: PiiEvent[]
}

// ── Built-in Patterns ────────────────────────────────────────────────────────

type BuiltinPattern = {
  category: PiiCategory
  pattern: RegExp
  validate?: (match: string) => boolean
}

const EMAIL_PATTERN: BuiltinPattern = {
  category: 'email',
  pattern: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
}

const PHONE_PATTERN: BuiltinPattern = {
  category: 'phone',
  // Matches: (555) 123-4567, 555-123-4567, +1-555-123-4567, +44 20 7946 0958
  pattern: /(?:\+\d{1,3}[\s.-]?)?(?:\(\d{1,4}\)[\s.-]?\d{3}[\s.-]?\d{4}|\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{3,4})/g,
  validate: (match) => {
    // Must have at least 7 digits to be a phone number
    const digits = match.replace(/\D/g, '')
    return digits.length >= 7 && digits.length <= 15
  },
}

const SSN_PATTERN: BuiltinPattern = {
  category: 'ssn',
  // US SSN: XXX-XX-XXXX (not starting with 000, 666, or 900-999)
  pattern: /\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/g,
}

const CREDIT_CARD_PATTERN: BuiltinPattern = {
  category: 'credit_card',
  // Visa, MC, Amex, Discover — with optional separators
  pattern: /\b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6(?:011|5\d{2}))[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{1,4}\b/g,
  validate: (match) => {
    const digits = match.replace(/\D/g, '')
    return digits.length >= 13 && digits.length <= 19 && luhnCheck(digits)
  },
}

const API_KEY_PATTERNS: BuiltinPattern[] = [
  {
    category: 'api_key',
    // AWS Access Key
    pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
  },
  {
    category: 'api_key',
    // AWS Secret Key
    pattern: /\b[A-Za-z0-9/+=]{40}\b/g,
    validate: (match) => {
      // Must contain at least one uppercase, lowercase, and special char
      return /[A-Z]/.test(match) && /[a-z]/.test(match) && /[/+=]/.test(match)
    },
  },
  {
    category: 'api_key',
    // GitHub token
    pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,255}\b/g,
  },
  {
    category: 'api_key',
    // Stripe key
    pattern: /\b(?:sk|pk)_(?:test|live)_[A-Za-z0-9]{10,99}\b/g,
  },
  {
    category: 'api_key',
    // OpenAI API key
    pattern: /\bsk-[A-Za-z0-9]{20,}\b/g,
  },
  {
    category: 'api_key',
    // Generic long token (Bearer eyJ...)
    pattern: /\bBearer\s+eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    category: 'api_key',
    // Anthropic API key
    pattern: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    category: 'api_key',
    // Google AI API key (AIza...)
    pattern: /\bAIza[A-Za-z0-9_-]{35,}\b/g,
  },
]

const IPV4_PATTERN: BuiltinPattern = {
  category: 'ipv4',
  pattern: /\b(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
  validate: (match) => {
    // Exclude common non-PII IPs (localhost, broadcast, documentation ranges)
    return !['0.0.0.0', '127.0.0.1', '255.255.255.255', '192.168.0.1', '10.0.0.1'].includes(match)
  },
}

const IPV6_PATTERN: BuiltinPattern = {
  category: 'ipv6',
  // Simplified IPv6 — full and compressed forms
  pattern: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b|\b(?:[0-9a-fA-F]{1,4}:){1,7}:\b|\b::(?:[0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4}\b/g,
  validate: (match) => match !== '::1' && match !== '::',
}

const PASSPORT_PATTERN: BuiltinPattern = {
  category: 'passport',
  // US passport: 1 letter + 8 digits
  pattern: /\b[A-Z]\d{8}\b/g,
}

const IBAN_PATTERN: BuiltinPattern = {
  category: 'iban',
  // IBAN: 2-letter country code + 2 check digits + up to 30 alphanumeric
  pattern: /\b[A-Z]{2}\d{2}[A-Z0-9]{4,30}\b/g,
  validate: (match) => {
    // Basic length check (IBANs are 15-34 chars)
    return match.length >= 15 && match.length <= 34
  },
}

// ── Luhn Check ───────────────────────────────────────────────────────────────

function luhnCheck(digits: string): boolean {
  let sum = 0
  let isDouble = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i]!, 10)
    if (isDouble) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    isDouble = !isDouble
  }
  return sum % 10 === 0
}

// ── PiiRedactor ──────────────────────────────────────────────────────────────

export class PiiRedactor {
  readonly name = 'pii-redactor'
  private readonly mode: PiiRedactorMode
  private readonly patterns: Array<{ category: string; pattern: RegExp; validate?: (m: string) => boolean }>
  private readonly redactTemplate: string
  private readonly allowlist: Set<string>
  private readonly onDetection?: (event: PiiEvent) => void

  /** Running count of PII detections */
  private _detectionCount = 0

  constructor(config: PiiRedactorConfig = {}) {
    this.mode = config.mode ?? 'redact'
    this.redactTemplate = config.redactTemplate ?? '[REDACTED:{type}]'
    this.allowlist = new Set(config.allowlist ?? [])
    this.onDetection = config.onDetection

    // Build pattern set
    const categories = new Set(config.categories ?? [
      'email', 'phone', 'ssn', 'credit_card', 'api_key', 'ipv4', 'ipv6', 'passport', 'iban',
    ])

    this.patterns = []
    if (categories.has('email')) this.patterns.push(clonePattern(EMAIL_PATTERN))
    if (categories.has('phone')) this.patterns.push(clonePattern(PHONE_PATTERN))
    if (categories.has('ssn')) this.patterns.push(clonePattern(SSN_PATTERN))
    if (categories.has('credit_card')) this.patterns.push(clonePattern(CREDIT_CARD_PATTERN))
    if (categories.has('api_key')) {
      for (const p of API_KEY_PATTERNS) this.patterns.push(clonePattern(p))
    }
    if (categories.has('ipv4')) this.patterns.push(clonePattern(IPV4_PATTERN))
    if (categories.has('ipv6')) this.patterns.push(clonePattern(IPV6_PATTERN))
    if (categories.has('passport')) this.patterns.push(clonePattern(PASSPORT_PATTERN))
    if (categories.has('iban')) this.patterns.push(clonePattern(IBAN_PATTERN))

    // Add custom patterns
    for (const custom of config.customPatterns ?? []) {
      this.patterns.push({
        category: custom.category,
        pattern: new RegExp(custom.pattern.source, custom.pattern.flags.includes('g') ? custom.pattern.flags : custom.pattern.flags + 'g'),
        validate: custom.validate,
      })
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Scan text for PII. Returns detections and optionally redacted text.
   */
  scan(text: string, direction: 'input' | 'output' = 'input'): PiiScanResult {
    const allDetections: PiiDetection[] = []

    // Collect all matches first
    for (const { category, pattern, validate } of this.patterns) {
      // Reset lastIndex for global patterns
      pattern.lastIndex = 0
      let match: RegExpExecArray | null

      while ((match = pattern.exec(text)) !== null) {
        const value = match[0]

        // Skip allowlisted values
        if (this.allowlist.has(value)) continue

        // Run validator if present
        if (validate && !validate(value)) continue

        allDetections.push({
          category,
          value,
          offset: match.index,
          length: value.length,
        })
      }
    }

    // Deduplicate overlapping matches (prefer longer matches)
    const detections = deduplicateDetections(allDetections)

    // Build events grouped by category
    const events: PiiEvent[] = []
    const grouped = new Map<string, number>()
    for (const d of detections) {
      grouped.set(d.category, (grouped.get(d.category) ?? 0) + 1)
    }
    for (const [category, count] of grouped) {
      const event: PiiEvent = {
        category,
        direction,
        count,
        action: this.mode === 'redact' ? 'redacted' : 'detected',
        timestamp: new Date(),
      }
      events.push(event)
      this._detectionCount += count
      this.onDetection?.(event)
    }

    // Redact if mode is 'redact'
    let resultText = text
    if (this.mode === 'redact' && detections.length > 0) {
      // Sort by offset descending to preserve positions during replacement
      const sorted = [...detections].sort((a, b) => b.offset - a.offset)
      for (const d of sorted) {
        const replacement = this.redactTemplate.replace('{type}', d.category)
        resultText =
          resultText.slice(0, d.offset) +
          replacement +
          resultText.slice(d.offset + d.length)
      }
    }

    return {
      text: resultText,
      found: detections.length > 0,
      detections,
      events,
    }
  }

  /**
   * Redact PII from text. Returns only the cleaned string.
   */
  redact(text: string): string {
    return this.scan(text, 'input').text
  }

  /**
   * Create a `beforeLLM` hook — redacts PII from user messages before they reach the LLM.
   *
   * @example
   * ```ts
   * const agent = new Agent({
   *   hooks: { beforeLLM: redactor.beforeHook() },
   * });
   * ```
   */
  beforeHook(): (messages: ChatMessage[]) => ChatMessage[] | void {
    return (messages: ChatMessage[]) => {
      let modified = false
      const cleaned = messages.map((msg) => {
        // Only scan user messages
        if (msg.role !== 'user') return msg

        const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
        const result = this.scan(content, 'input')

        if (result.found) {
          modified = true
          return { ...msg, content: result.text }
        }
        return msg
      })

      return modified ? cleaned : undefined
    }
  }

  /**
   * Create an `afterLLM` hook — redacts PII from LLM responses.
   *
   * @example
   * ```ts
   * const agent = new Agent({
   *   hooks: { afterLLM: redactor.afterHook() },
   * });
   * ```
   */
  afterHook(): (response: ChatResult, iteration: number) => LLMHookResult | void {
    return (response: ChatResult) => {
      if (!response.content) return { action: 'continue' as const }

      const result = this.scan(response.content, 'output')
      if (result.found && this.mode === 'redact') {
        return { action: 'override' as const, content: result.text }
      }
      return { action: 'continue' as const }
    }
  }

  /** Total PII detections across all scans */
  get detectionCount(): number {
    return this._detectionCount
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Clone a pattern to get fresh lastIndex */
function clonePattern(p: BuiltinPattern): { category: string; pattern: RegExp; validate?: (m: string) => boolean } {
  return {
    category: p.category,
    pattern: new RegExp(p.pattern.source, p.pattern.flags),
    validate: p.validate,
  }
}

/** Remove overlapping detections, preferring longer matches */
function deduplicateDetections(detections: PiiDetection[]): PiiDetection[] {
  if (detections.length <= 1) return detections

  // Sort by offset, then by length descending (longer matches first)
  const sorted = [...detections].sort((a, b) =>
    a.offset !== b.offset ? a.offset - b.offset : b.length - a.length,
  )

  const result: PiiDetection[] = [sorted[0]!]
  for (let i = 1; i < sorted.length; i++) {
    const prev = result[result.length - 1]!
    const curr = sorted[i]!

    // If current starts before previous ends, it's overlapping — skip
    if (curr.offset < prev.offset + prev.length) continue
    result.push(curr)
  }

  return result
}

// ── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create a PII redactor with sensible defaults.
 *
 * @example
 * ```ts
 * const redactor = piiRedactor({
 *   categories: ['email', 'ssn', 'credit_card', 'api_key'],
 *   onDetection: (e) => auditLog.write(e),
 * });
 *
 * const agent = new Agent({
 *   hooks: {
 *     beforeLLM: redactor.beforeHook(),
 *     afterLLM: redactor.afterHook(),
 *   },
 * });
 * ```
 */
export function piiRedactor(config?: PiiRedactorConfig): PiiRedactor {
  return new PiiRedactor(config)
}

/**
 * Create a PII redactor for sensitive environments (all categories, strict mode).
 */
export function strictPiiRedactor(config?: Omit<PiiRedactorConfig, 'mode'>): PiiRedactor {
  return new PiiRedactor({
    ...config,
    mode: 'redact',
  })
}
