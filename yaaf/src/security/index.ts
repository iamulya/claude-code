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
 * systemPrompt: 'You are a helpful assistant.',
 * hooks: {
 * beforeLLM: async (messages) => {
 * // 1. Prompt injection detection
 * const guarded = guard.hook()(messages);
 * const msgs = guarded ?? messages;
 * // 2. PII redaction (input direction)
 * return redactor.beforeHook()(msgs) ?? msgs;
 * },
 * afterLLM: async (response, iteration) => {
 * // 3. Output sanitization
 * const sanitized = sanitizer.hook()(response, iteration);
 * if (sanitized?.action === 'override') {
 * return sanitized;
 * }
 * // 4. PII redaction (output direction)
 * return redactor.afterHook()(response, iteration);
 * },
 * },
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
} from "./promptGuard.js";

// ── OutputSanitizer (LLM02: Insecure Output Handling) ─────────────────────
export {
  OutputSanitizer,
  outputSanitizer,
  strictSanitizer,
  type OutputSanitizerConfig,
  type SanitizeEvent,
  type SanitizeResult,
} from "./outputSanitizer.js";

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
  type NerDetection,
} from "./piiRedactor.js";

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
} from "./trustPolicy.js";

// ── GroundingValidator (LLM09: Overreliance) ──────────────────────────────
export {
  GroundingValidator,
  groundingValidator,
  strictGroundingValidator,
  type GroundingValidatorConfig,
  type GroundingMode,
  type GroundingSentence,
  type GroundingAssessment,
} from "./groundingValidator.js";

// ── PerUserRateLimiter (LLM04/08: DoS & Excessive Agency) ─────────────────
export {
  PerUserRateLimiter,
  perUserRateLimiter,
  type PerUserRateLimiterConfig,
  type RateLimitEvent,
  type RateLimitCheckResult,
  type UserUsageSummary,
} from "./rateLimiter.js";

// ── InputAnomalyDetector (LLM01: Deep Injection Defense) ──────────────────
export {
  InputAnomalyDetector,
  inputAnomalyDetector,
  type InputAnomalyConfig,
  type InputAnomalyEvent,
  type InputAnomalyResult,
  type AnomalyType,
} from "./inputAnomalyDetector.js";

// ── StructuredOutputValidator (LLM02: Output Schema Enforcement) ──────────
export {
  StructuredOutputValidator,
  structuredOutputValidator,
  type OutputValidatorConfig,
  type OutputValidationEvent,
  type OutputValidationViolation,
  type FieldRule,
  type FieldType,
} from "./structuredOutputValidator.js";

// ── SecurityAuditLog (Cross-cutting: Compliance & Forensics) ──────────────
export {
  SecurityAuditLog,
  securityAuditLog,
  type AuditLogConfig,
  type AuditEntry,
  type AuditSeverity,
  type AuditCategory,
  type AuditStats,
} from "./auditLog.js";

// ── Composite Security Hook ───────────────────────────────────────────────

import type { ChatMessage, ChatResult } from "../agents/runner.js";
import type { LLMHookResult, Hooks } from "../hooks.js";
import type { PluginHost } from "../plugin/types.js";
import { PromptGuard, type PromptGuardConfig } from "./promptGuard.js";
import { OutputSanitizer, type OutputSanitizerConfig } from "./outputSanitizer.js";
import { PiiRedactor, type PiiRedactorConfig } from "./piiRedactor.js";

export type SecurityHooksConfig = {
  /** PromptGuard config. Set to false to disable. */
  promptGuard?: PromptGuardConfig | false;
  /** OutputSanitizer config. Set to false to disable. */
  outputSanitizer?: OutputSanitizerConfig | false;
  /** PiiRedactor config. Set to false to disable. */
  piiRedactor?: PiiRedactorConfig | false;
  /**
   * When provided, all security detection events (PII found,
   * prompt injection detected, output sanitized) are forwarded to
   * `ObservabilityAdapter` plugins via `pluginHost.emitLog()` and
   * `pluginHost.emitMetric()`.
   *
   * Passed automatically by `composeSecurityHooks()` in agent.ts when the
   * agent has an observability plugin registered. Manual wiring:
   * ```ts
   * const hooks = securityHooks({ piiRedactor: true }, pluginHost)
   * ```
   */
  _pluginHost?: PluginHost;
};

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
 * systemPrompt: '...',
 * hooks: securityHooks(),
 * });
 * ```
 *
 * @example
 * ```ts
 * // Customize individual components
 * const agent = new Agent({
 * hooks: securityHooks({
 * promptGuard: { mode: 'block', sensitivity: 'high' },
 * outputSanitizer: { stripHtml: true },
 * piiRedactor: { categories: ['email', 'ssn', 'api_key'] },
 * }),
 * });
 * ```
 */
export function securityHooks(config: SecurityHooksConfig = {}): Hooks {
  const ph = config._pluginHost;
  const hasObs = ph?.hasCapability("observability") ?? false;

  // ── build onDetection callbacks that forward to ObsAdapter ────
  // When security is enabled via the shorthand (security: true),
  // default promptGuard to 'block' mode \u2014 not 'detect'. Developers enabling
  // security: true expect actual injection blocking, not silent logging.
  // Explicit config objects (security: { promptGuard: { mode: 'detect' } })
  // are honoured as-is.
  const defaultGuardMode: PromptGuardConfig["mode"] =
    config.promptGuard === undefined ? "block" : undefined;

  const guardConfig: PromptGuardConfig =
    config.promptGuard !== false
      ? {
          mode: defaultGuardMode,
          ...(config.promptGuard ?? {}),
          onDetection: (event) => {
            // Merge with any user-provided onDetection
            (config.promptGuard as PromptGuardConfig | undefined)?.onDetection?.(event);
            if (!hasObs) return;
            ph!.emitMetric("security.prompt_injection.detected", 1, {
              pattern: event.patternName,
              severity: event.severity,
              action: event.action,
            });
            ph!.emitLog({
              level: "warn",
              namespace: "security.PromptGuard",
              message: `Prompt injection detected: ${event.patternName} (${event.action})`,
              data: event as unknown as Record<string, unknown>,
              timestamp: new Date().toISOString(),
            });
          },
        }
      : {};

  const guard = config.promptGuard !== false ? new PromptGuard(guardConfig) : null;

  const redactorConfig: PiiRedactorConfig =
    config.piiRedactor !== false
      ? {
          ...(config.piiRedactor ?? {}),
          onDetection: (event) => {
            (config.piiRedactor as PiiRedactorConfig | undefined)?.onDetection?.(event);
            if (!hasObs) return;
            ph!.emitMetric("security.pii.detected", event.count, {
              category: event.category,
              direction: event.direction,
              action: event.action,
            });
            ph!.emitLog({
              level: event.action === "redacted" ? "warn" : "info",
              namespace: "security.PiiRedactor",
              message: `PII ${event.action}: ${event.count}x ${event.category} (${event.direction})`,
              data: event as unknown as Record<string, unknown>,
              timestamp: new Date().toISOString(),
            });
          },
        }
      : {};

  const redactor = config.piiRedactor !== false ? new PiiRedactor(redactorConfig) : null;

  const sanitizer =
    config.outputSanitizer !== false ? new OutputSanitizer(config.outputSanitizer ?? {}) : null;

  const hooks: Hooks = {};

  // BUG FIX #7: Cache hook closures once — previously re-created on every
  // beforeLLM/afterLLM invocation, wasting regex compilation and setup.
  const redactorBeforeHook = redactor?.beforeHook();
  const redactorAfterHook = redactor?.afterHook();
  const sanitizerHook = sanitizer?.hook();

  // Compose beforeLLM: promptGuard → piiRedactor
  if (guard || redactor) {
    hooks.beforeLLM = (messages: ChatMessage[]) => {
      let msgs = messages;
      let modified = false;

      // 1. Prompt injection detection/blocking
      if (guard) {
        const result = guard.scan(msgs);
        if (result.detected) {
          // BUG FIX #4: In detect mode, result.messages is the SAME array
          // reference as the input. Previously the identity check
          // `msgs !== messages` would return false, causing beforeLLM to
          // return `undefined` and silently swallowing the detection.
          // Now we always mark as modified when injection is detected,
          // ensuring the messages are returned through the hook pipeline.
          msgs = result.messages;
          modified = true;
        }
      }

      // 2. PII redaction on input
      if (redactorBeforeHook) {
        const redactedMsgs = redactorBeforeHook(msgs);
        if (redactedMsgs) {
          msgs = redactedMsgs;
          modified = true;
        }
      }

      return modified ? msgs : undefined;
    };
  }

  // Compose afterLLM: outputSanitizer → piiRedactor
  if (sanitizer || redactor) {
    hooks.afterLLM = (response: ChatResult, iteration: number) => {
      // 3. Output sanitization
      if (sanitizerHook && response.content) {
        const sanitized = sanitizerHook(response, iteration);
        if (sanitized?.action === "override") {
          // Forward sanitization event to observability adapter
          if (hasObs) {
            ph!.emitMetric("security.output.sanitized", 1, {});
            ph!.emitLog({
              level: "info",
              namespace: "security.OutputSanitizer",
              message: "LLM output sanitized",
              timestamp: new Date().toISOString(),
            });
          }
          // Create a modified response for the next stage
          const modifiedResponse = { ...response, content: sanitized.content };

          // 4. PII redaction on sanitized output
          if (redactorAfterHook) {
            return redactorAfterHook(modifiedResponse, iteration);
          }
          return sanitized;
        }
      }

      // 4. PII redaction on raw output
      if (redactorAfterHook) {
        return redactorAfterHook(response, iteration);
      }

      return { action: "continue" as const };
    };
  }

  return hooks;
}

/**
 * Returns a set of hardened `AgentRunnerConfig` additions.
 *
 * The defaults chosen here close the three opt-in gaps identified in v7:
 * - `detectPromptInjection: true` in the output sanitizer
 * - `reservedTokens: 512` (protects output space from system-prompt growth)
 * - A startup warning if no sandboxRuntime is specified
 *
 * Usage:
 * ```ts
 * import { Agent } from 'yaaf'
 * import { securityHooks, hardenedRunnerDefaults } from 'yaaf/security'
 *
 * const agent = new Agent({
 * ...hardenedRunnerDefaults(),
 * systemPrompt: 'You are a helpful assistant.',
 * hooks: securityHooks({ outputSanitizer: { detectPromptInjection: true } }),
 * })
 * ```
 */
export function hardenedRunnerDefaults(): {
  reservedTokens: number;
  toolResultBoundaries: boolean;
} {
  return {
    reservedTokens: 512,
    toolResultBoundaries: true,
  };
}

/**
 * Hardened `securityHooks()` config with production-safe defaults.
 *
 * Equivalent to `securityHooks()` but with:
 * - `detectPromptInjection: true` (structural injection detection)
 * - `mode: 'block'` for PromptGuard (not just detect)
 * - `codeBlockExempt: true` for PiiRedactor (avoids false positives in code)
 *
 * @example
 * ```ts
 * const agent = new Agent({
 * systemPrompt: '...',
 * ...hardenedRunnerDefaults(),
 * hooks: hardenedSecurityHooks(),
 * })
 * ```
 */
export function hardenedSecurityHooks(config: SecurityHooksConfig = {}): Hooks {
  return securityHooks({
    promptGuard: {
      mode: "block",
      sensitivity: "medium",
      ...(config.promptGuard !== false ? (config.promptGuard ?? {}) : {}),
    },
    outputSanitizer: {
      detectPromptInjection: true,
      blockOnInjection: true,
      stripDangerousHtml: true,
      ...(config.outputSanitizer !== false ? (config.outputSanitizer ?? {}) : {}),
    },
    piiRedactor: {
      mode: "redact",
      codeBlockExempt: true,
      ...(config.piiRedactor !== false ? (config.piiRedactor ?? {}) : {}),
    },
    _pluginHost: config._pluginHost,
  });
}
