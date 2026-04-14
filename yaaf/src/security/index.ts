/**
 * Security — YAAF Security Middleware
 *
 * OWASP-aligned security utilities for LLM applications:
 *
 * - **PromptGuard** — Prompt injection detection and blocking (LLM01)
 * - **OutputSanitizer** — XSS/HTML stripping for LLM output (LLM02)
 * - **PiiRedactor** — PII detection and redaction (LLM06)
 * - **TrustPolicy** — Plugin & MCP integrity verification (LLM05)
 * - **GroundingValidator** — Anti-hallucination cross-reference (LLM09)
 * - **PerUserRateLimiter** — Per-identity usage budgets (LLM04/08)
 *
 * These can be composed as hooks on any YAAF agent:
 *
 * @example
 * ```ts
 * import { Agent, PromptGuard, OutputSanitizer, PiiRedactor } from 'yaaf';
 *
 * const guard = new PromptGuard({ mode: 'block', sensitivity: 'high' });
 * const sanitizer = new OutputSanitizer();
 * const redactor = new PiiRedactor({ mode: 'redact' });
 *
 * const agent = new Agent({
 *   systemPrompt: 'You are a helpful assistant.',
 *   hooks: {
 *     beforeLLM: async (messages) => {
 *       // 1. Prompt injection detection
 *       const guarded = guard.hook()(messages);
 *       const msgs = guarded ?? messages;
 *       // 2. PII redaction (input direction)
 *       return redactor.beforeHook()(msgs) ?? msgs;
 *     },
 *     afterLLM: async (response, iteration) => {
 *       // 3. Output sanitization
 *       const sanitized = sanitizer.hook()(response, iteration);
 *       if (sanitized?.action === 'override') {
 *         return sanitized;
 *       }
 *       // 4. PII redaction (output direction)
 *       return redactor.afterHook()(response, iteration);
 *     },
 *   },
 * });
 * ```
 *
 * @module security
 */

// ── PromptGuard (LLM01: Prompt Injection) ─────────────────────────────────
export {
  PromptGuard,
  promptGuard,
  strictPromptGuard,
  type PromptGuardConfig,
  type PromptGuardSensitivity,
  type PromptGuardMode,
  type PromptGuardPattern,
  type PromptGuardEvent,
  type PromptGuardResult,
} from './promptGuard.js'

// ── OutputSanitizer (LLM02: Insecure Output Handling) ─────────────────────
export {
  OutputSanitizer,
  outputSanitizer,
  strictSanitizer,
  type OutputSanitizerConfig,
  type SanitizeEvent,
  type SanitizeResult,
} from './outputSanitizer.js'

// ── PiiRedactor (LLM06: Sensitive Information Disclosure) ─────────────────
export {
  PiiRedactor,
  piiRedactor,
  strictPiiRedactor,
  type PiiRedactorConfig,
  type PiiRedactorMode,
  type PiiCategory,
  type PiiDetection,
  type PiiEvent,
  type PiiScanResult,
  type CustomPiiPattern,
} from './piiRedactor.js'

// ── TrustPolicy (LLM05: Supply Chain Vulnerabilities) ─────────────────────
export {
  TrustPolicy,
  trustPolicy,
  type TrustPolicyConfig,
  type TrustPolicyMode,
  type PluginTrust,
  type McpServerTrust,
  type TrustVerificationEvent,
  type PluginVerificationResult,
  type McpToolFilterResult,
} from './trustPolicy.js'

// ── GroundingValidator (LLM09: Overreliance) ──────────────────────────────
export {
  GroundingValidator,
  groundingValidator,
  strictGroundingValidator,
  type GroundingValidatorConfig,
  type GroundingMode,
  type GroundingSentence,
  type GroundingAssessment,
} from './groundingValidator.js'

// ── PerUserRateLimiter (LLM04/08: DoS & Excessive Agency) ─────────────────
export {
  PerUserRateLimiter,
  perUserRateLimiter,
  type PerUserRateLimiterConfig,
  type RateLimitEvent,
  type RateLimitCheckResult,
  type UserUsageSummary,
} from './rateLimiter.js'

// ── InputAnomalyDetector (LLM01: Deep Injection Defense) ──────────────────
export {
  InputAnomalyDetector,
  inputAnomalyDetector,
  type InputAnomalyConfig,
  type InputAnomalyEvent,
  type InputAnomalyResult,
  type AnomalyType,
} from './inputAnomalyDetector.js'

// ── StructuredOutputValidator (LLM02: Output Schema Enforcement) ──────────
export {
  StructuredOutputValidator,
  structuredOutputValidator,
  type OutputValidatorConfig,
  type OutputValidationEvent,
  type OutputValidationViolation,
  type FieldRule,
  type FieldType,
} from './structuredOutputValidator.js'

// ── SecurityAuditLog (Cross-cutting: Compliance & Forensics) ──────────────
export {
  SecurityAuditLog,
  securityAuditLog,
  type AuditLogConfig,
  type AuditEntry,
  type AuditSeverity,
  type AuditCategory,
  type AuditStats,
} from './auditLog.js'

// ── Composite Security Hook ───────────────────────────────────────────────

import type { ChatMessage, ChatResult } from '../agents/runner.js'
import type { LLMHookResult, Hooks } from '../hooks.js'
import { PromptGuard, type PromptGuardConfig } from './promptGuard.js'
import { OutputSanitizer, type OutputSanitizerConfig } from './outputSanitizer.js'
import { PiiRedactor, type PiiRedactorConfig } from './piiRedactor.js'

export type SecurityHooksConfig = {
  /** PromptGuard config. Set to false to disable. */
  promptGuard?: PromptGuardConfig | false
  /** OutputSanitizer config. Set to false to disable. */
  outputSanitizer?: OutputSanitizerConfig | false
  /** PiiRedactor config. Set to false to disable. */
  piiRedactor?: PiiRedactorConfig | false
}

/**
 * Create a pre-wired `Hooks` object with all three security middlewares.
 *
 * This is the simplest way to add OWASP-aligned security to a YAAF agent:
 *
 * @example
 * ```ts
 * import { Agent, securityHooks } from 'yaaf';
 *
 * const agent = new Agent({
 *   systemPrompt: '...',
 *   hooks: securityHooks(),
 * });
 * ```
 *
 * @example
 * ```ts
 * // Customize individual components
 * const agent = new Agent({
 *   hooks: securityHooks({
 *     promptGuard: { mode: 'block', sensitivity: 'high' },
 *     outputSanitizer: { stripHtml: true },
 *     piiRedactor: { categories: ['email', 'ssn', 'api_key'] },
 *   }),
 * });
 * ```
 */
export function securityHooks(config: SecurityHooksConfig = {}): Hooks {
  const guard = config.promptGuard !== false
    ? new PromptGuard(config.promptGuard ?? {})
    : null

  const sanitizer = config.outputSanitizer !== false
    ? new OutputSanitizer(config.outputSanitizer ?? {})
    : null

  const redactor = config.piiRedactor !== false
    ? new PiiRedactor(config.piiRedactor ?? {})
    : null

  const hooks: Hooks = {}

  // Compose beforeLLM: promptGuard → piiRedactor
  if (guard || redactor) {
    hooks.beforeLLM = (messages: ChatMessage[]) => {
      let msgs = messages

      // 1. Prompt injection detection/blocking
      if (guard) {
        const result = guard.scan(msgs)
        if (result.detected && guard['mode'] === 'block') {
          msgs = result.messages
        }
      }

      // 2. PII redaction on input
      if (redactor) {
        const redactedMsgs = redactor.beforeHook()(msgs)
        if (redactedMsgs) msgs = redactedMsgs
      }

      return msgs !== messages ? msgs : undefined
    }
  }

  // Compose afterLLM: outputSanitizer → piiRedactor
  if (sanitizer || redactor) {
    hooks.afterLLM = (response: ChatResult, iteration: number) => {
      // 3. Output sanitization
      if (sanitizer && response.content) {
        const sanitized = sanitizer.hook()(response, iteration)
        if (sanitized?.action === 'override') {
          // Create a modified response for the next stage
          const modifiedResponse = { ...response, content: sanitized.content }

          // 4. PII redaction on sanitized output
          if (redactor) {
            return redactor.afterHook()(modifiedResponse, iteration)
          }
          return sanitized
        }
      }

      // 4. PII redaction on raw output
      if (redactor) {
        return redactor.afterHook()(response, iteration)
      }

      return { action: 'continue' as const }
    }
  }

  return hooks
}
