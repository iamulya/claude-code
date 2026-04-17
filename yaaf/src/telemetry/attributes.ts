/**
 * YAAF Telemetry Attributes — common span/metric attributes.
 *
 * Mirrors the pattern in `src/utils/telemetryAttributes.ts` in the main repo
 * but scoped to YAAF's configuration surface (no OAuth/session-id complexity).
 *
 * Every span created by YAAF's tracing module starts from these base attributes
 * so that all spans in a trace share consistent cardinality dimensions.
 *
 * @module telemetry/attributes
 */

import type { Attributes } from "@opentelemetry/api";

// ── YAAF service constants ────────────────────────────────────────────────────

export const YAAF_SERVICE_NAME = "yaaf";
export const YAAF_TRACER_NAME = "com.yaaf.tracing";
export const YAAF_METER_NAME = "com.yaaf.metrics";
export const YAAF_LOGGER_NAME = "com.yaaf.logs";

// ── Span type taxonomy (mirrors main repo's SpanType) ────────────────────────

export type YAAFSpanType =
  | "agent.run" // one call to Agent.run()
  | "llm.request" // one ChatModel.complete() call
  | "tool.call" // one tool invocation (before sandbox/permissions)
  | "tool.execution" // the tool fn itself inside the sandbox
  | "tool.blocked" // tool denied by permission policy or hook
  | "memory.extract" // MemoryStrategy.extract()
  | "memory.retrieve" // MemoryStrategy.retrieve()
  | "compaction"; // context compaction strategy run

// ── Attribute helpers ─────────────────────────────────────────────────────────

/**
 * Base attributes attached to every YAAF span.
 *
 * Controllable via env vars (matching main repo cardinality pattern):
 * YAAF_OTEL_INCLUDE_AGENT_NAME=true|false (default: true)
 */
export function getBaseAttributes(opts?: { agentName?: string; provider?: string }): Attributes {
  const include = (envVar: string, def: boolean): boolean => {
    const v = process.env[envVar];
    if (v === undefined) return def;
    return v === "1" || v.toLowerCase() === "true";
  };

  const attrs: Attributes = {
    "service.name": YAAF_SERVICE_NAME,
  };

  if (include("YAAF_OTEL_INCLUDE_AGENT_NAME", true) && opts?.agentName) {
    attrs["agent.name"] = opts.agentName;
  }

  if (opts?.provider) {
    attrs["llm.provider"] = opts.provider;
  }

  return attrs;
}

/**
 * Build a full attribute set for a YAAF span:
 * base attributes + span type + custom attributes.
 */
export function buildSpanAttributes(
  spanType: YAAFSpanType,
  custom: Attributes = {},
  base?: Attributes,
): Attributes {
  return {
    ...(base ?? {}),
    "yaaf.span.type": spanType,
    ...custom,
  };
}
