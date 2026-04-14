/**
 * PromptGuard — Prompt Injection Detection Middleware
 *
 * A `beforeLLM` hook that detects common prompt injection patterns:
 *
 * - **Instruction overrides** — "ignore previous instructions", "you are now"
 * - **Role hijacking** — "act as", "pretend you are", "you're a new AI"
 * - **Encoding attacks** — base64-encoded instructions, unicode tricks
 * - **Delimiter escape** — attempts to break out of XML/markdown boundaries
 * - **System prompt extraction** — "repeat your system prompt", "what are your instructions"
 * - **Payload injection** — embedded `<script>`, `javascript:`, SQL injection markers
 * - **Canary token detection** — verifies a hidden canary wasn't extracted
 *
 * Operates in two modes:
 * - **detect** — flags suspicious messages, logs warning, continues execution
 * - **block** — flags suspicious messages, replaces them with sanitized versions
 *
 * @example
 * ```ts
 * import { PromptGuard } from 'yaaf';
 *
 * const guard = new PromptGuard({ mode: 'block', sensitivity: 'high' });
 *
 * const agent = new Agent({
 *   hooks: {
 *     beforeLLM: guard.hook(),
 *   },
 * });
 * ```
 *
 * @module security/promptGuard
 */

import type { ChatMessage } from '../agents/runner.js'

// ── Types ────────────────────────────────────────────────────────────────────

export type PromptGuardSensitivity = 'low' | 'medium' | 'high'

export type PromptGuardMode = 'detect' | 'block'

export type PromptGuardConfig = {
  /**
   * Detection mode:
   * - `detect` — log warnings, allow messages through (default)
   * - `block` — replace detected injection attempts with a sanitized message
   */
  mode?: PromptGuardMode

  /**
   * Sensitivity level controls which patterns are checked:
   * - `low` — only obvious injection attempts (instruction overrides)
   * - `medium` — adds encoding attacks, delimiter escapes (default)
   * - `high` — adds role hijacking, extraction attempts, content scanning
   */
  sensitivity?: PromptGuardSensitivity

  /**
   * Optional canary token to inject into the system prompt.
   * If the canary appears in a user message, it indicates the system prompt
   * was extracted (prompt leakage attack).
   */
  canaryToken?: string

  /**
   * Additional custom patterns to detect.
   * Each pattern has a name, regex, and severity.
   */
  customPatterns?: PromptGuardPattern[]

  /**
   * Called when an injection attempt is detected.
   * Use for audit logging, alerting, or custom handling.
   */
  onDetection?: (event: PromptGuardEvent) => void

  /**
   * Message to substitute when blocking in `block` mode.
   * Default: "[Message blocked: potential prompt injection detected]"
   */
  blockMessage?: string
}

export type PromptGuardPattern = {
  /** Human-readable name for the pattern */
  name: string
  /** Regex pattern to match against message content */
  pattern: RegExp
  /** Severity: how likely this is to be an actual attack */
  severity: 'low' | 'medium' | 'high'
  /** Optional description for audit logs */
  description?: string
}

export type PromptGuardEvent = {
  /** Type of injection detected */
  patternName: string
  /** Severity of the detection */
  severity: 'low' | 'medium' | 'high'
  /** The message role that triggered the detection */
  messageRole: string
  /** Index of the message in the conversation */
  messageIndex: number
  /** Excerpt of the matched content (truncated for safety) */
  matchExcerpt: string
  /** Action taken */
  action: 'detected' | 'blocked'
  /** Timestamp */
  timestamp: Date
}

export type PromptGuardResult = {
  /** Whether any injection was detected */
  detected: boolean
  /** All detections found */
  events: PromptGuardEvent[]
  /** The (potentially modified) messages */
  messages: ChatMessage[]
}

// ── Built-in Patterns ────────────────────────────────────────────────────────

const INSTRUCTION_OVERRIDE_PATTERNS: PromptGuardPattern[] = [
  {
    name: 'instruction-override',
    pattern: /\b(ignore|disregard|forget|override|bypass)\b.{0,30}\b(previous|above|prior|earlier|all|system|original)\b.{0,30}\b(instructions?|prompts?|rules?|guidelines?|directives?|constraints?)\b/i,
    severity: 'high',
    description: 'Attempts to override system instructions',
  },
  {
    name: 'new-instructions',
    pattern: /\b(new|updated|revised|actual|real)\b.{0,15}\b(instructions?|prompt|rules?|guidelines?|directives?)\b.{0,5}(:|are|follow)/i,
    severity: 'high',
    description: 'Injects new instructions',
  },
  {
    name: 'do-not-follow',
    pattern: /\bdo\s+not\s+(follow|obey|listen\s+to|respect)\b.{0,30}\b(system|original|initial)\b/i,
    severity: 'high',
    description: 'Instructs to not follow system prompt',
  },
]

const ROLE_HIJACK_PATTERNS: PromptGuardPattern[] = [
  {
    name: 'role-hijack',
    pattern: /\b(you\s+are\s+now|from\s+now\s+on\s+you\s+are|act\s+as|pretend\s+(to\s+be|you\s+are)|imagine\s+you\s+are|roleplay\s+as|switch\s+to)\b/i,
    severity: 'medium',
    description: 'Attempts to change the AI role',
  },
  {
    name: 'jailbreak-DAN',
    pattern: /\b(DAN|Do\s+Anything\s+Now|STAN|DUDE|AIM)\b.{0,50}\b(mode|version|personality|character)\b/i,
    severity: 'high',
    description: 'Known jailbreak persona names',
  },
  {
    name: 'developer-mode',
    pattern: /\b(developer|debug|admin|root|sudo|maintenance)\s+(mode|access|override|privileges?)\b/i,
    severity: 'high',
    description: 'Claims special access modes',
  },
]

const ENCODING_ATTACK_PATTERNS: PromptGuardPattern[] = [
  {
    name: 'base64-instruction',
    pattern: /(?:decode|interpret|execute|follow|read)\s+(?:this|the\s+following)?\s*(?:base64|b64|encoded)/i,
    severity: 'medium',
    description: 'Instructs to decode encoded content that may contain injections',
  },
  {
    name: 'hex-encoded-block',
    pattern: /\\x[0-9a-f]{2}(?:\\x[0-9a-f]{2}){10,}/i,
    severity: 'medium',
    description: 'Large hex-encoded payload',
  },
  {
    name: 'unicode-smuggling',
    pattern: /[\u200b-\u200f\u2028-\u202f\u2060-\u206f\ufeff]/,
    severity: 'low',
    description: 'Zero-width or invisible unicode characters',
  },
]

const DELIMITER_ESCAPE_PATTERNS: PromptGuardPattern[] = [
  {
    name: 'xml-escape',
    pattern: /<\/?(?:system|assistant|user|human|ai|instructions?|prompt|context|tool_result|function_call)\s*>/i,
    severity: 'medium',
    description: 'Attempts to inject XML role boundaries',
  },
  {
    name: 'markdown-escape',
    pattern: /^#{1,3}\s*(system\s*prompt|instructions?|rules?|context)/im,
    severity: 'low',
    description: 'Markdown headers mimicking system sections',
  },
]

const EXTRACTION_PATTERNS: PromptGuardPattern[] = [
  {
    name: 'prompt-extraction',
    pattern: /\b(repeat|show|display|print|output|reveal|tell\s+me)\b.{0,30}\b(system\s*prompt|instructions?|initial\s*prompt|original\s*prompt|full\s*prompt|your\s*rules|your\s*guidelines)\b/i,
    severity: 'high',
    description: 'Attempts to extract the system prompt',
  },
  {
    name: 'prompt-leak-indirect',
    pattern: /\b(what\s+(?:are|were)\s+you\s+told|how\s+were\s+you\s+(?:programmed|configured|prompted|instructed))\b/i,
    severity: 'medium',
    description: 'Indirect prompt extraction attempt',
  },
]

const PAYLOAD_PATTERNS: PromptGuardPattern[] = [
  {
    name: 'xss-payload',
    pattern: /<script[\s>]|javascript:|on(?:load|error|click|mouseover)\s*=/i,
    severity: 'high',
    description: 'Cross-site scripting payload',
  },
  {
    name: 'sql-injection',
    pattern: /(?:'\s*(?:OR|AND|UNION)\s+|--\s*$|;\s*DROP\s+TABLE|;\s*DELETE\s+FROM|EXEC\s+xp_)/im,
    severity: 'medium',
    description: 'SQL injection markers (may propagate to tool queries)',
  },
  {
    name: 'command-injection',
    pattern: /(?:;\s*(?:cat|curl|wget|nc|bash|sh|python|node|rm|chmod)\s|`[^`]{3,}`|\$\([^)]{3,}\))/i,
    severity: 'medium',
    description: 'Shell command injection markers',
  },
]

// ── PromptGuard ──────────────────────────────────────────────────────────────

export class PromptGuard {
  readonly name = 'prompt-guard'
  private readonly mode: PromptGuardMode
  private readonly sensitivity: PromptGuardSensitivity
  private readonly canaryToken?: string
  private readonly patterns: PromptGuardPattern[]
  private readonly onDetection?: (event: PromptGuardEvent) => void
  private readonly blockMessage: string

  /** Running count of detections across all calls */
  private _detectionCount = 0

  constructor(config: PromptGuardConfig = {}) {
    this.mode = config.mode ?? 'detect'
    this.sensitivity = config.sensitivity ?? 'medium'
    this.canaryToken = config.canaryToken
    this.onDetection = config.onDetection
    this.blockMessage = config.blockMessage ?? '[Message blocked: potential prompt injection detected]'

    // Build pattern set based on sensitivity
    this.patterns = this.buildPatternSet(config.customPatterns ?? [])
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Scan messages for prompt injection patterns.
   * Returns detection results and (optionally modified) messages.
   */
  scan(messages: ChatMessage[]): PromptGuardResult {
    const events: PromptGuardEvent[] = []

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i]!
      // Only scan user messages and tool results (not system or assistant)
      if (msg.role !== 'user' && msg.role !== 'tool') continue

      const content = typeof msg.content === 'string'
        ? msg.content
        : JSON.stringify(msg.content)

      // Check canary token
      if (this.canaryToken && content.includes(this.canaryToken)) {
        events.push({
          patternName: 'canary-extraction',
          severity: 'high',
          messageRole: msg.role,
          messageIndex: i,
          matchExcerpt: '[canary token detected]',
          action: this.mode === 'block' ? 'blocked' : 'detected',
          timestamp: new Date(),
        })
      }

      // Check all patterns
      for (const pattern of this.patterns) {
        if (pattern.pattern.test(content)) {
          const match = content.match(pattern.pattern)
          events.push({
            patternName: pattern.name,
            severity: pattern.severity,
            messageRole: msg.role,
            messageIndex: i,
            matchExcerpt: (match?.[0] ?? '').slice(0, 80),
            action: this.mode === 'block' ? 'blocked' : 'detected',
            timestamp: new Date(),
          })
        }
      }
    }

    // Fire callbacks
    for (const event of events) {
      this._detectionCount++
      this.onDetection?.(event)
    }

    // Block mode: replace affected messages
    let outputMessages = messages
    if (this.mode === 'block' && events.length > 0) {
      const blockedIndices = new Set(events.map((e) => e.messageIndex))
      outputMessages = messages.map((msg, i) =>
        blockedIndices.has(i)
          ? { ...msg, content: this.blockMessage }
          : msg,
      )
    }

    return {
      detected: events.length > 0,
      events,
      messages: outputMessages,
    }
  }

  /**
   * Create a `beforeLLM` hook function.
   *
   * @example
   * ```ts
   * const agent = new Agent({
   *   hooks: { beforeLLM: guard.hook() },
   * });
   * ```
   */
  hook(): (messages: ChatMessage[]) => ChatMessage[] | void {
    return (messages: ChatMessage[]) => {
      const result = this.scan(messages)
      if (result.detected && this.mode === 'block') {
        return result.messages
      }
      // detect mode: return void (pass through unchanged)
      return undefined
    }
  }

  /**
   * Generate a random canary token to embed in system prompts.
   * If this token appears in user messages, the system prompt was extracted.
   */
  static generateCanary(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let token = 'YAAF_CANARY_'
    for (let i = 0; i < 16; i++) {
      token += chars[Math.floor(Math.random() * chars.length)]
    }
    return token
  }

  /** Total detections across all scans */
  get detectionCount(): number {
    return this._detectionCount
  }

  // ── Internal ────────────────────────────────────────────────────────────

  private buildPatternSet(custom: PromptGuardPattern[]): PromptGuardPattern[] {
    const patterns: PromptGuardPattern[] = []

    // Always include instruction overrides (even at low sensitivity)
    patterns.push(...INSTRUCTION_OVERRIDE_PATTERNS)

    if (this.sensitivity === 'medium' || this.sensitivity === 'high') {
      patterns.push(...ENCODING_ATTACK_PATTERNS)
      patterns.push(...DELIMITER_ESCAPE_PATTERNS)
      patterns.push(...PAYLOAD_PATTERNS)
    }

    if (this.sensitivity === 'high') {
      patterns.push(...ROLE_HIJACK_PATTERNS)
      patterns.push(...EXTRACTION_PATTERNS)
    }

    // Always include custom patterns
    patterns.push(...custom)

    return patterns
  }
}

// ── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create a prompt guard with sensible production defaults.
 *
 * @example
 * ```ts
 * const guard = promptGuard({
 *   onDetection: (e) => auditLog.write(e),
 * });
 *
 * const agent = new Agent({
 *   hooks: { beforeLLM: guard.hook() },
 * });
 * ```
 */
export function promptGuard(config?: PromptGuardConfig): PromptGuard {
  return new PromptGuard({
    mode: 'detect',
    sensitivity: 'medium',
    ...config,
  })
}

/**
 * Create a strict prompt guard that blocks all detected injections.
 */
export function strictPromptGuard(config?: Omit<PromptGuardConfig, 'mode' | 'sensitivity'>): PromptGuard {
  return new PromptGuard({
    ...config,
    mode: 'block',
    sensitivity: 'high',
  })
}
