/**
 * OutputSanitizer — LLM Output Sanitization
 *
 * Sanitizes LLM responses to prevent downstream security issues:
 *
 * - **HTML/XSS stripping** — removes `<script>`, `onclick`, `javascript:` etc.
 * - **Markdown sanitization** — strips dangerous markdown (raw HTML blocks)
 * - **Tool result wrapping** — wraps tool outputs in safe boundaries
 * - **Content length limits** — prevents memory exhaustion from oversized responses
 * - **URL validation** — flags/removes suspicious URLs (data:, javascript:)
 *
 * Can be used as:
 * - An `afterLLM` hook (intercepts every LLM response)
 * - A standalone utility (sanitize any string)
 * - A `safeRun()` wrapper around `agent.run()`
 *
 * @example
 * ```ts
 * import { OutputSanitizer } from 'yaaf';
 *
 * const sanitizer = new OutputSanitizer();
 *
 * const agent = new Agent({
 *   hooks: {
 *     afterLLM: sanitizer.hook(),
 *   },
 * });
 *
 * // Or use as a standalone utility:
 * const safe = sanitizer.sanitize('<script>alert("xss")</script>Hello');
 * // → "Hello"
 * ```
 *
 * @module security/outputSanitizer
 */

import type { ChatResult } from '../agents/runner.js'
import type { LLMHookResult } from '../hooks.js'

// ── Types ────────────────────────────────────────────────────────────────────

export type OutputSanitizerConfig = {
  /**
   * Strip all HTML tags. Default: true.
   */
  stripHtml?: boolean

  /**
   * Strip dangerous HTML only (scripts, event handlers, iframes).
   * If `stripHtml` is true, this is ignored.
   * Default: true.
   */
  stripDangerousHtml?: boolean

  /**
   * Remove suspicious URLs (javascript:, data:, vbscript:).
   * Default: true.
   */
  sanitizeUrls?: boolean

  /**
   * Maximum output length in characters. Content beyond this is truncated.
   * Default: 100_000.
   */
  maxLength?: number

  /**
   * Strip raw HTML blocks from markdown (```html ... ```).
   * Default: false (preserves code blocks).
   */
  stripMarkdownHtml?: boolean

  /**
   * Custom sanitization function applied after all built-in rules.
   */
  customSanitizer?: (text: string) => string

  /**
   * Called when content is sanitized.
   */
  onSanitize?: (event: SanitizeEvent) => void
}

export type SanitizeEvent = {
  /** What was removed/modified */
  type: 'html_stripped' | 'script_removed' | 'url_sanitized' | 'truncated' | 'custom'
  /** Number of modifications */
  count: number
  /** Timestamp */
  timestamp: Date
}

export type SanitizeResult = {
  /** The sanitized text */
  text: string
  /** Whether any modifications were made */
  modified: boolean
  /** Events describing what was sanitized */
  events: SanitizeEvent[]
}

// ── Patterns ─────────────────────────────────────────────────────────────────

/** Script tags including any content between them */
const SCRIPT_RE = /<script\b[^>]*>[\s\S]*?<\/script>/gi

/** Style tags (can contain expression() for IE exploits) */
const STYLE_RE = /<style\b[^>]*>[\s\S]*?<\/style>/gi

/** Event handler attributes (onclick, onerror, etc.) */
const EVENT_HANDLER_RE = /\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi

/** iframe, object, embed, applet tags */
const DANGEROUS_TAGS_RE = /<\/?(iframe|object|embed|applet|form|input|button|textarea|select)\b[^>]*>/gi

/** All HTML tags (for full strip mode) */
const ALL_TAGS_RE = /<[^>]+>/g

/** Dangerous URL schemes (excluding data: which is handled separately) */
const DANGEROUS_URL_RE = /(?:javascript|vbscript)\s*:/gi

/** data: URLs that aren't images */
const DANGEROUS_DATA_URL_RE = /data:(?!image\/(?:png|jpe?g|gif|svg\+xml|webp))[^;\s,]+/gi

/** HTML entity-encoded script tags (&#60;script&#62;) */
const ENCODED_SCRIPT_RE = /&#(?:60|x3c);?\s*script/gi

/** CSS expression() — IE vector */
const CSS_EXPRESSION_RE = /expression\s*\([^)]*\)/gi

/** SVG onload and similar */
const SVG_EVENT_RE = /<svg[^>]*\s+on\w+/gi

// ── OutputSanitizer ──────────────────────────────────────────────────────────

export class OutputSanitizer {
  readonly name = 'output-sanitizer'
  private readonly config: Required<Pick<OutputSanitizerConfig, 'stripHtml' | 'stripDangerousHtml' | 'sanitizeUrls' | 'maxLength' | 'stripMarkdownHtml'>> & Pick<OutputSanitizerConfig, 'customSanitizer' | 'onSanitize'>

  constructor(config: OutputSanitizerConfig = {}) {
    this.config = {
      stripHtml: config.stripHtml ?? false,
      stripDangerousHtml: config.stripDangerousHtml ?? true,
      sanitizeUrls: config.sanitizeUrls ?? true,
      maxLength: config.maxLength ?? 100_000,
      stripMarkdownHtml: config.stripMarkdownHtml ?? false,
      customSanitizer: config.customSanitizer,
      onSanitize: config.onSanitize,
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Sanitize a text string. Returns the sanitized text and metadata.
   */
  sanitize(text: string): SanitizeResult {
    const events: SanitizeEvent[] = []
    let result = text
    let modified = false

    // 1. Strip all HTML OR just dangerous HTML
    if (this.config.stripHtml) {
      const before = result
      result = result.replace(ALL_TAGS_RE, '')
      if (result !== before) {
        modified = true
        const count = (before.match(ALL_TAGS_RE) ?? []).length
        const event: SanitizeEvent = { type: 'html_stripped', count, timestamp: new Date() }
        events.push(event)
        this.config.onSanitize?.(event)
      }
    } else if (this.config.stripDangerousHtml) {
      const before = result

      // Remove script tags and content
      result = result.replace(SCRIPT_RE, '')

      // Remove style tags (expression() vector)
      result = result.replace(STYLE_RE, '')

      // Remove event handlers from remaining tags
      result = result.replace(EVENT_HANDLER_RE, '')

      // Remove dangerous tags
      result = result.replace(DANGEROUS_TAGS_RE, '')

      // Remove entity-encoded scripts
      result = result.replace(ENCODED_SCRIPT_RE, '')

      // Remove CSS expressions
      result = result.replace(CSS_EXPRESSION_RE, '')

      // Remove SVG event handlers
      result = result.replace(SVG_EVENT_RE, '<svg')

      if (result !== before) {
        modified = true
        const event: SanitizeEvent = { type: 'script_removed', count: 1, timestamp: new Date() }
        events.push(event)
        this.config.onSanitize?.(event)
      }
    }

    // 2. Sanitize dangerous URLs
    if (this.config.sanitizeUrls) {
      const before = result
      result = result.replace(DANGEROUS_URL_RE, 'about:blank')
      result = result.replace(DANGEROUS_DATA_URL_RE, 'about:blank')
      if (result !== before) {
        modified = true
        const event: SanitizeEvent = { type: 'url_sanitized', count: 1, timestamp: new Date() }
        events.push(event)
        this.config.onSanitize?.(event)
      }
    }

    // 3. Strip raw HTML blocks from markdown
    if (this.config.stripMarkdownHtml) {
      const before = result
      result = result.replace(/```html\s*\n[\s\S]*?\n```/gi, '```\n[HTML content removed]\n```')
      if (result !== before) {
        modified = true
        const event: SanitizeEvent = { type: 'html_stripped', count: 1, timestamp: new Date() }
        events.push(event)
        this.config.onSanitize?.(event)
      }
    }

    // 4. Truncate to max length
    if (result.length > this.config.maxLength) {
      result = result.slice(0, this.config.maxLength) + '\n... [output truncated for safety]'
      modified = true
      const event: SanitizeEvent = { type: 'truncated', count: 1, timestamp: new Date() }
      events.push(event)
      this.config.onSanitize?.(event)
    }

    // 5. Custom sanitizer
    if (this.config.customSanitizer) {
      const before = result
      result = this.config.customSanitizer(result)
      if (result !== before) {
        modified = true
        events.push({ type: 'custom', count: 1, timestamp: new Date() })
      }
    }

    return { text: result, modified, events }
  }

  /**
   * Sanitize text — returns only the cleaned string.
   */
  clean(text: string): string {
    return this.sanitize(text).text
  }

  /**
   * Create an `afterLLM` hook.
   *
   * @example
   * ```ts
   * const agent = new Agent({
   *   hooks: { afterLLM: sanitizer.hook() },
   * });
   * ```
   */
  hook(): (response: ChatResult, iteration: number) => LLMHookResult | void {
    return (response: ChatResult) => {
      if (!response.content) return { action: 'continue' as const }

      const result = this.sanitize(response.content)
      if (result.modified) {
        return { action: 'override' as const, content: result.text }
      }
      return { action: 'continue' as const }
    }
  }

  /**
   * Wrap tool result text for safe injection into context.
   * Encodes the output in clearly delimited boundaries.
   */
  static wrapToolResult(toolName: string, content: string): string {
    // Escape any embedded boundary markers in the content itself
    const safeContent = content.replace(
      /\[\/TOOL_RESULT\]/g,
      '[/TOOL\\_RESULT]',
    )
    return `[TOOL_RESULT: ${toolName}]\n${safeContent}\n[/TOOL_RESULT]`
  }
}

// ── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create an output sanitizer with production defaults.
 */
export function outputSanitizer(config?: OutputSanitizerConfig): OutputSanitizer {
  return new OutputSanitizer(config)
}

/**
 * Create a strict sanitizer that strips all HTML.
 */
export function strictSanitizer(config?: Omit<OutputSanitizerConfig, 'stripHtml'>): OutputSanitizer {
  return new OutputSanitizer({ ...config, stripHtml: true })
}
