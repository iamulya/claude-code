/**
 * YAAF Framework-Wide Validation Schemas
 *
 * Zod schemas for validating data at every untrusted boundary across
 * the framework — LLM responses, config objects, session records,
 * memory extractions, plugin manifests, and security configs.
 *
 * Sprint 0b: Created as part of the schema validation layer.
 * These schemas are the single source of truth for data shapes
 * flowing through YAAF's subsystems.
 *
 * @module schemas
 */

import { z } from "zod";

// ── Session ──────────────────────────────────────────────────────────────────

/**
 * Schema for individual session records persisted to disk.
 * Uses discriminated union on the `type` field for exhaustive matching.
 */
export const SessionMessageSchema = z.object({
  type: z.literal("message"),
  message: z.object({
    role: z.enum(["user", "assistant", "system", "tool"]),
    content: z.union([z.string(), z.array(z.record(z.string(), z.unknown()))]).optional(),
  }).passthrough(), // Allow toolCalls, toolCallId, name, etc.
  hmac: z.string().optional(),
});

export const SessionMetaSchema = z.object({
  type: z.literal("meta"),
  id: z.string(),
  createdAt: z.string(),
  version: z.number(),
  owner: z.string().optional(),
  hmac: z.string().optional(),
});

export const SessionCompactSchema = z.object({
  type: z.literal("compact"),
  summary: z.string(),
  timestamp: z.string(),
});

export const SessionPlanSchema = z.object({
  type: z.literal("plan"),
  plan: z.string(),
  timestamp: z.string(),
});

export const SessionRecordSchema = z.discriminatedUnion("type", [
  SessionMessageSchema,
  SessionMetaSchema,
  SessionCompactSchema,
  SessionPlanSchema,
]);

export type SessionRecord = z.infer<typeof SessionRecordSchema>;

// ── Memory ───────────────────────────────────────────────────────────────────

/**
 * Schema for the topic/memory extraction output from the LLM.
 * Validates that each extracted fact has the required fields.
 */
export const TopicExtractionEntrySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500),
  type: z.enum(["user", "feedback", "project", "reference"]),
  content: z.string().min(1),
});

export const TopicExtractionSchema = z.array(TopicExtractionEntrySchema);

export type TopicExtractionEntry = z.infer<typeof TopicExtractionEntrySchema>;
export type TopicExtraction = z.infer<typeof TopicExtractionSchema>;

// ── PromptGuard ──────────────────────────────────────────────────────────────

/**
 * Schema for PromptGuard configuration validation.
 * Validates sensitivity levels, modes, and custom pattern definitions.
 */
export const PromptGuardCustomPatternSchema = z.object({
  name: z.string(),
  pattern: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
});

export const PromptGuardConfigSchema = z.object({
  mode: z.enum(["block", "warn", "monitor"]).default("block"),
  sensitivity: z.enum(["low", "medium", "high"]).default("medium"),
  scanAssistant: z.boolean().default(true),
  customPatterns: z.array(PromptGuardCustomPatternSchema).default([]),
});

export type PromptGuardConfig = z.infer<typeof PromptGuardConfigSchema>;

// ── PiiRedactor ──────────────────────────────────────────────────────────────

/**
 * Schema for PII redactor configuration.
 * Validates regex patterns at config time to prevent runtime crashes.
 */
export const PiiRedactorPatternSchema = z.object({
  name: z.string(),
  regex: z.string().refine(
    (r) => {
      try {
        new RegExp(r);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Invalid regex pattern" },
  ),
  replacement: z.string().default("[REDACTED]"),
});

export const PiiRedactorConfigSchema = z.object({
  mode: z.enum(["redact", "detect", "passthrough"]).default("redact"),
  patterns: z.array(PiiRedactorPatternSchema).default([]),
});

export type PiiRedactorConfig = z.infer<typeof PiiRedactorConfigSchema>;

// ── Vigil ────────────────────────────────────────────────────────────────────

/**
 * Schema for Vigil scheduled task registration.
 * Validates cron expressions and timeout bounds.
 */
export const VigilTaskSchema = z.object({
  name: z.string().min(1),
  cron: z.string().min(5),
  handler: z.union([z.string(), z.any()]),
  priority: z.number().min(0).max(10).default(5),
  timeout: z.number().positive().default(30_000),
  enabled: z.boolean().default(true),
});

export type VigilTask = z.infer<typeof VigilTaskSchema>;

// ── Memory Relevance (LLM output) ────────────────────────────────────────────

/**
 * Schema for the memory relevance selection response from the LLM.
 * The LLM returns a JSON object with an array of selected memory filenames.
 */
export const MemoryRelevanceResponseSchema = z.object({
  selected_memories: z.array(z.string()).default([]),
});

export type MemoryRelevanceResponse = z.infer<typeof MemoryRelevanceResponseSchema>;

// ── Vigil Task Journal (disk persistence) ────────────────────────────────────

/**
 * Schema for individual scheduled tasks stored in scheduled_tasks.json.
 * Validates types + bounds to prevent prompt injection via crafted task files.
 */
export const VigilScheduledTaskSchema = z.object({
  id: z.string().min(1),
  cron: z.string().min(5),
  prompt: z.string().min(1).max(4096),
  createdAt: z.number().optional(),
  recurring: z.boolean().optional(),
  lastFiredAt: z.number().optional(),
  priority: z.number().optional(),
  permanent: z.boolean().optional(),
});

export const VigilTaskJournalSchema = z.object({
  tasks: z.array(VigilScheduledTaskSchema).default([]),
});

export type VigilScheduledTask = z.infer<typeof VigilScheduledTaskSchema>;
export type VigilTaskJournal = z.infer<typeof VigilTaskJournalSchema>;

// ── Plugin ───────────────────────────────────────────────────────────────────

/**
 * Schema for plugin manifest validation.
 * Ensures all plugins provide a valid name, semver version, and capabilities.
 */
export const PluginManifestSchema = z.object({
  name: z.string().min(1).max(100),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  capabilities: z.array(z.string()).min(1),
  config: z.record(z.string(), z.unknown()).optional(),
});

export type PluginManifest = z.infer<typeof PluginManifestSchema>;

// ── Shared Utilities ─────────────────────────────────────────────────────────

/**
 * Helper to safely parse untrusted JSON through a Zod schema.
 *
 * Returns `{ success: true, data }` on success, or `{ success: false, error }`
 * with a formatted error message on failure.
 *
 * @example
 * ```ts
 * const result = safeParseJson(rawLlmOutput, TopicExtractionSchema);
 * if (!result.success) {
 *   logger.warn('LLM returned invalid JSON', { error: result.error });
 *   return { extracted: false };
 * }
 * const entries = result.data;
 * ```
 */
export function safeParseJson<T extends z.ZodType>(
  raw: string,
  schema: T,
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return {
      success: false,
      error: `JSON parse error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const result = schema.safeParse(parsed);
  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    error: result.error
      .issues.map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; "),
  };
}
