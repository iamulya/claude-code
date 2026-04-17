/**
 * StructuredOutputValidator — Schema-Based LLM Output Validation
 *
 * Validates and constrains LLM outputs against defined schemas.
 * Prevents downstream code from processing malformed, unexpected,
 * or hallucinated structured data.
 *
 * Supports:
 * - JSON output validation against field definitions
 * - URL validation and sanitization in responses
 * - Numeric range enforcement
 * - Enum/allowed-value constraints
 * - Required field verification
 *
 * @module security/structuredOutputValidator
 */

import type { ChatResult } from "../agents/runner.js";
import type { LLMHookResult } from "../hooks.js";

// ── Types ────────────────────────────────────────────────────────────────────

export type FieldType = "string" | "number" | "boolean" | "url" | "email" | "date" | "enum";

export type FieldRule = {
  /** Field name (supports dot notation for nested: "address.city") */
  field: string;
  /** Expected type */
  type: FieldType;
  /** Whether the field is required */
  required?: boolean;
  /** Allowed values (for enum type) */
  allowedValues?: unknown[];
  /** Minimum value (for number type) */
  min?: number;
  /** Maximum value (for number type) */
  max?: number;
  /** Maximum string length */
  maxLength?: number;
  /** Regex pattern the value must match */
  pattern?: RegExp;
};

export type OutputValidatorConfig = {
  /**
   * Field validation rules.
   * Only applied when the LLM output contains parseable JSON.
   */
  rules?: FieldRule[];

  /**
   * Maximum output length in characters.
   * Default: 100_000.
   */
  maxOutputLength?: number;

  /**
   * Action when validation fails:
   * - `warn` — log and pass through (default)
   * - `strip` — remove invalid fields
   * - `reject` — override the response with an error message
   */
  onViolation?: "warn" | "strip" | "reject";

  /**
   * Called on each validation result.
   */
  onValidation?: (event: OutputValidationEvent) => void;

  /**
   * Validate URLs in the output text (not just JSON).
   * When true, checks all URLs against allowedDomains or blocks known-dangerous ones.
   * Default: false.
   */
  validateUrls?: boolean;

  /**
   * When validateUrls is true, only allow URLs from these domains.
   * If empty, all non-dangerous URLs are allowed.
   */
  allowedDomains?: string[];
};

export type OutputValidationViolation = {
  field: string;
  rule: string;
  actual: unknown;
  expected: string;
};

export type OutputValidationEvent = {
  /** Whether the output passed validation */
  valid: boolean;
  /** Violations found */
  violations: OutputValidationViolation[];
  /** Whether the output was modified */
  modified: boolean;
  /** Action taken */
  action: "passed" | "warned" | "stripped" | "rejected";
  /** Timestamp */
  timestamp: Date;
};

// ── StructuredOutputValidator ────────────────────────────────────────────────

export class StructuredOutputValidator {
  readonly name = "structured-output-validator";
  private readonly rules: FieldRule[];
  private readonly maxOutputLength: number;
  private readonly onViolation: "warn" | "strip" | "reject";
  private readonly onValidation?: (event: OutputValidationEvent) => void;
  private readonly validateUrls: boolean;
  private readonly allowedDomains: Set<string>;

  constructor(config: OutputValidatorConfig = {}) {
    this.rules = config.rules ?? [];
    this.maxOutputLength = config.maxOutputLength ?? 100_000;
    this.onViolation = config.onViolation ?? "warn";
    this.onValidation = config.onValidation;
    this.validateUrls = config.validateUrls ?? false;
    this.allowedDomains = new Set(config.allowedDomains ?? []);
  }

  /**
   * Validate an LLM output string.
   */
  validate(output: string): OutputValidationEvent {
    const violations: OutputValidationViolation[] = [];
    let modified = false;
    let content = output;

    // 1. Length check
    if (content.length > this.maxOutputLength) {
      violations.push({
        field: "__output__",
        rule: "maxLength",
        actual: content.length,
        expected: `<= ${this.maxOutputLength}`,
      });
      if (this.onViolation === "strip") {
        content =
          content.slice(0, this.maxOutputLength) + "\n[output truncated by security policy]";
        modified = true;
      }
    }

    // 2. Try to parse as JSON for field validation
    if (this.rules.length > 0) {
      const jsonBlocks = extractJsonBlocks(content);
      for (const block of jsonBlocks) {
        try {
          const parsed = JSON.parse(block);
          if (typeof parsed === "object" && parsed !== null) {
            const fieldViolations = this.validateFields(parsed);
            violations.push(...fieldViolations);
          }
        } catch {
          // Not valid JSON, skip
        }
      }
    }

    // 3. URL validation
    if (this.validateUrls) {
      const urlViolations = this.validateUrlsInText(content);
      violations.push(...urlViolations);
    }

    // Determine action
    let action: OutputValidationEvent["action"] = "passed";
    if (violations.length > 0) {
      action =
        this.onViolation === "reject"
          ? "rejected"
          : this.onViolation === "strip"
            ? "stripped"
            : "warned";
    }

    const event: OutputValidationEvent = {
      valid: violations.length === 0,
      violations,
      modified,
      action,
      timestamp: new Date(),
    };
    this.onValidation?.(event);
    return event;
  }

  /**
   * Create an `afterLLM` hook.
   */
  hook(): (response: ChatResult, iteration: number) => LLMHookResult | void {
    return (response: ChatResult) => {
      if (!response.content) return { action: "continue" as const };

      const result = this.validate(response.content);

      if (result.action === "rejected") {
        return {
          action: "override" as const,
          content: `[Response rejected by output validation policy: ${result.violations.length} violation(s) found]`,
        };
      }

      return { action: "continue" as const };
    };
  }

  // ── Field Validation ────────────────────────────────────────────────────

  private validateFields(obj: Record<string, unknown>): OutputValidationViolation[] {
    const violations: OutputValidationViolation[] = [];

    for (const rule of this.rules) {
      const value = getNestedValue(obj, rule.field);

      // Required check
      if (rule.required && (value === undefined || value === null)) {
        violations.push({
          field: rule.field,
          rule: "required",
          actual: value,
          expected: "non-null value",
        });
        continue;
      }

      if (value === undefined || value === null) continue;

      // Type checks
      switch (rule.type) {
        case "string":
          if (typeof value !== "string") {
            violations.push({
              field: rule.field,
              rule: "type",
              actual: typeof value,
              expected: "string",
            });
          } else if (rule.maxLength && value.length > rule.maxLength) {
            violations.push({
              field: rule.field,
              rule: "maxLength",
              actual: value.length,
              expected: `<= ${rule.maxLength}`,
            });
          } else if (rule.pattern && !rule.pattern.test(value)) {
            violations.push({
              field: rule.field,
              rule: "pattern",
              actual: value,
              expected: rule.pattern.source,
            });
          }
          break;

        case "number":
          if (typeof value !== "number") {
            violations.push({
              field: rule.field,
              rule: "type",
              actual: typeof value,
              expected: "number",
            });
          } else {
            if (rule.min !== undefined && value < rule.min) {
              violations.push({
                field: rule.field,
                rule: "min",
                actual: value,
                expected: `>= ${rule.min}`,
              });
            }
            if (rule.max !== undefined && value > rule.max) {
              violations.push({
                field: rule.field,
                rule: "max",
                actual: value,
                expected: `<= ${rule.max}`,
              });
            }
          }
          break;

        case "boolean":
          if (typeof value !== "boolean") {
            violations.push({
              field: rule.field,
              rule: "type",
              actual: typeof value,
              expected: "boolean",
            });
          }
          break;

        case "url":
          if (typeof value !== "string" || !isValidUrl(value)) {
            violations.push({
              field: rule.field,
              rule: "type",
              actual: value,
              expected: "valid URL",
            });
          }
          break;

        case "email":
          if (typeof value !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            violations.push({
              field: rule.field,
              rule: "type",
              actual: value,
              expected: "valid email",
            });
          }
          break;

        case "enum":
          if (rule.allowedValues && !rule.allowedValues.includes(value)) {
            violations.push({
              field: rule.field,
              rule: "enum",
              actual: value,
              expected: `one of: ${rule.allowedValues.join(", ")}`,
            });
          }
          break;
      }
    }

    return violations;
  }

  private validateUrlsInText(text: string): OutputValidationViolation[] {
    const violations: OutputValidationViolation[] = [];
    const urlRegex = /https?:\/\/[^\s\])"']+/g;
    let match;

    while ((match = urlRegex.exec(text)) !== null) {
      const url = match[0];
      try {
        const parsed = new URL(url);

        // Check dangerous schemes (already stripped in OutputSanitizer, but double-check)
        if (parsed.protocol === "javascript:" || parsed.protocol === "data:") {
          violations.push({
            field: "__url__",
            rule: "dangerous_scheme",
            actual: url,
            expected: "http or https URL",
          });
        }

        // Domain allowlist check
        if (this.allowedDomains.size > 0 && !this.allowedDomains.has(parsed.hostname)) {
          violations.push({
            field: "__url__",
            rule: "domain_not_allowed",
            actual: parsed.hostname,
            expected: `one of: ${[...this.allowedDomains].join(", ")}`,
          });
        }
      } catch {
        violations.push({
          field: "__url__",
          rule: "invalid_url",
          actual: url,
          expected: "valid URL",
        });
      }
    }

    return violations;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Guard against prototype-pollution path segments.
 * An attacker-controlled `rule.field` like `__proto__.isAdmin` would
 * traverse Object.prototype, potentially leaking or overwriting internals.
 */
const FORBIDDEN_PATH_SEGMENTS = new Set(["__proto__", "constructor", "prototype"]);

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    // Reject dangerous path segments
    if (FORBIDDEN_PATH_SEGMENTS.has(part)) return undefined;
    if (current === null || current === undefined || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Extract JSON blocks from markdown-formatted LLM output */
function extractJsonBlocks(text: string): string[] {
  const blocks: string[] = [];

  // Match ```json ... ``` code blocks
  const codeBlockRe = /```(?:json)?\s*\n([\s\S]*?)\n```/g;
  let match;
  while ((match = codeBlockRe.exec(text)) !== null) {
    blocks.push(match[1]!);
  }

  // Also try the raw text if it looks like JSON
  const trimmed = text.trim();
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    blocks.push(trimmed);
  }

  return blocks;
}

// ── Factory ──────────────────────────────────────────────────────────────────

export function structuredOutputValidator(
  config?: OutputValidatorConfig,
): StructuredOutputValidator {
  return new StructuredOutputValidator(config);
}
