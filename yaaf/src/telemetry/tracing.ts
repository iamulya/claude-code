/**
 * YAAF Tracing — OpenTelemetry span API for agent execution.
 *
 * Provides a zero-overhead, opt-in tracing layer over every significant
 * YAAF lifecycle event. Mirrors the design of the main repo's
 * `src/utils/telemetry/sessionTracing.ts`:
 *
 * - Span hierarchy: agent.run → llm.request / tool.call → tool.execution
 * - AsyncLocalStorage for context propagation (no manual span passing)
 * - WeakRef + strong-ref pattern to prevent GC collecting active spans
 * - Background cleanup interval for orphaned spans (crash / abort scenarios)
 * - `executeInSpan<T>()` helper for one-shot instrumented work
 * - No-op when tracing is disabled — zero overhead in production
 *
 * ## Activation
 *
 * Tracing is disabled by default. Enable with:
 * YAAF_OTEL_TRACES_EXPORTER=console # console output
 * YAAF_OTEL_TRACES_EXPORTER=otlp # OTLP (Jaeger, Tempo, etc.)
 * OTEL_TRACES_EXPORTER=console # standard OTEL env var also works
 *
 * Full init requires calling `initYAAFTelemetry()` from `telemetry.ts` at
 * process startup (or the equivalent factory for embedded use).
 *
 * @module telemetry/tracing
 */

import { context as otelContext, type Attributes, type Span, trace } from "@opentelemetry/api";
import { AsyncLocalStorage } from "async_hooks";
import { buildSpanAttributes, YAAF_TRACER_NAME } from "./attributes.js";

export type { Span };

// ── Internal span context ─────────────────────────────────────────────────────

interface SpanCtx {
  span: Span;
  startTime: number;
  attrs: Attributes;
  ended?: boolean;
}

// ALS holds strong refs while spans are active; WeakRef Map lets GC collect
// after spans are finished (same pattern as main repo's activeSpans/strongSpans)
const runContext = new AsyncLocalStorage<SpanCtx | undefined>();
const toolContext = new AsyncLocalStorage<SpanCtx | undefined>();
const activeSpans = new Map<string, WeakRef<SpanCtx>>();
const strongSpans = new Map<string, SpanCtx>(); // spans not in ALS

let _cleanupStarted = false;

const SPAN_TTL_MS = 30 * 60 * 1000; // 30 min

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTracer() {
  return trace.getTracer(YAAF_TRACER_NAME);
}

function spanId(span: Span): string {
  return span.spanContext().spanId;
}

function noop(): Span {
  return trace.getActiveSpan() ?? getTracer().startSpan("__noop__");
}

/**
 * Lazily start the orphaned-span cleanup interval (same pattern as main repo).
 * Only fires once regardless of how many spans are created.
 */
function ensureCleanup(): void {
  if (_cleanupStarted) return;
  _cleanupStarted = true;
  const t = setInterval(() => {
    const cutoff = Date.now() - SPAN_TTL_MS;
    for (const [id, ref] of activeSpans) {
      const ctx = ref.deref();
      if (ctx === undefined) {
        activeSpans.delete(id);
        strongSpans.delete(id);
      } else if (ctx.startTime < cutoff) {
        if (!ctx.ended) ctx.span.end();
        activeSpans.delete(id);
        strongSpans.delete(id);
      }
    }
  }, 60_000);
  if (typeof (t as NodeJS.Timeout).unref === "function") {
    (t as NodeJS.Timeout).unref();
  }
}

// ── Tracing enable check ──────────────────────────────────────────────────────

/**
 * Whether YAAF tracing is active.
 *
 * Reads `YAAF_OTEL_TRACES_EXPORTER` (overrides) or falls back to the
 * standard `OTEL_TRACES_EXPORTER` env var. A non-empty, non-"none" value
 * enables tracing ONLY if a TracerProvider has been registered via
 * `initYAAFTelemetry()` — otherwise spans are no-ops regardless of the env var.
 */
export function isTracingEnabled(): boolean {
  const v = process.env.YAAF_OTEL_TRACES_EXPORTER ?? process.env.OTEL_TRACES_EXPORTER ?? "";
  const raw = v.trim();
  if (!raw || raw === "none") return false;
  // Check that a real provider has been registered (not the default no-op one)
  const tracer = getTracer();
  const span = tracer.startSpan("__probe__");
  const ctx = span.spanContext();
  span.end();
  // If traceId is all-zeros the provider is the no-op default
  return ctx.traceId !== "00000000000000000000000000000000";
}

// ── Agent run span ────────────────────────────────────────────────────────────

/**
 * Start a span for one `Agent.run()` turn.
 *
 * Sets the run-level ALS context so all child spans (LLM, tool) can
 * automatically link to it as a parent.
 *
 * @returns The span (or a no-op span if tracing is disabled).
 */
export function startAgentRunSpan(opts: {
  agentName: string;
  userMessage: string;
  iteration?: number;
}): Span {
  ensureCleanup();
  if (!isTracingEnabled()) return noop();

  const tracer = getTracer();
  const attrs = buildSpanAttributes("agent.run", {
    "agent.name": opts.agentName,
    "run.user_message_length": opts.userMessage.length,
    ...(opts.iteration !== undefined ? { "run.iteration": opts.iteration } : {}),
  });

  const span = tracer.startSpan("yaaf.agent.run", { attributes: attrs });
  const id = spanId(span);
  const ctx: SpanCtx = { span, startTime: Date.now(), attrs };
  activeSpans.set(id, new WeakRef(ctx));
  runContext.enterWith(ctx);
  return span;
}

export function endAgentRunSpan(opts?: {
  responseLength?: number;
  iterations?: number;
  error?: string;
}): void {
  const ctx = runContext.getStore();
  if (!ctx || ctx.ended) return;

  if (isTracingEnabled()) {
    const duration = Date.now() - ctx.startTime;
    const endAttrs: Attributes = { "run.duration_ms": duration };
    if (opts?.responseLength !== undefined) endAttrs["run.response_length"] = opts.responseLength;
    if (opts?.iterations !== undefined) endAttrs["run.iterations"] = opts.iterations;
    if (opts?.error !== undefined) endAttrs["run.error"] = opts.error;
    ctx.span.setAttributes(endAttrs);
    ctx.span.end();
  }

  ctx.ended = true;
  activeSpans.delete(spanId(ctx.span));
  runContext.enterWith(undefined);
}

// ── LLM request span ─────────────────────────────────────────────────────────

/**
 * Start a span for one `ChatModel.complete()` call.
 *
 * Returns the span so you can pass it explicitly to `endLLMRequestSpan()`.
 * This is important when multiple LLM calls run in parallel.
 */
export function startLLMRequestSpan(opts: {
  model: string;
  messageCount: number;
  toolCount: number;
}): Span {
  if (!isTracingEnabled()) return noop();

  const tracer = getTracer();
  const parentCtx = runContext.getStore();
  const attrs = buildSpanAttributes("llm.request", {
    "llm.model": opts.model,
    "llm.message_count": opts.messageCount,
    "llm.tool_count": opts.toolCount,
  });

  const ctx = parentCtx
    ? trace.setSpan(otelContext.active(), parentCtx.span)
    : otelContext.active();
  const span = tracer.startSpan("yaaf.llm.request", { attributes: attrs }, ctx);

  const id: string = spanId(span);
  const sc: SpanCtx = { span, startTime: Date.now(), attrs };
  activeSpans.set(id, new WeakRef(sc));
  strongSpans.set(id, sc); // strong ref — not in ALS

  return span;
}

export function endLLMRequestSpan(
  span: Span,
  meta?: {
    inputTokens?: number;
    outputTokens?: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
    durationMs?: number;
    hasToolCalls?: boolean;
    error?: string;
    finishReason?: string;
  },
): void {
  const id = spanId(span);
  const sc = strongSpans.get(id) ?? activeSpans.get(id)?.deref();
  if (!sc) return;

  if (isTracingEnabled()) {
    const endAttrs: Attributes = {
      "llm.duration_ms": meta?.durationMs ?? Date.now() - sc.startTime,
    };
    if (meta?.inputTokens !== undefined) endAttrs["llm.input_tokens"] = meta.inputTokens;
    if (meta?.outputTokens !== undefined) endAttrs["llm.output_tokens"] = meta.outputTokens;
    if (meta?.cacheReadTokens !== undefined)
      endAttrs["llm.cache_read_tokens"] = meta.cacheReadTokens;
    if (meta?.cacheWriteTokens !== undefined)
      endAttrs["llm.cache_write_tokens"] = meta.cacheWriteTokens;
    if (meta?.hasToolCalls !== undefined) endAttrs["llm.has_tool_calls"] = meta.hasToolCalls;
    if (meta?.finishReason !== undefined) endAttrs["llm.finish_reason"] = meta.finishReason;
    if (meta?.error !== undefined) endAttrs["llm.error"] = meta.error;
    sc.span.setAttributes(endAttrs);
    sc.span.end();
  }

  activeSpans.delete(id);
  strongSpans.delete(id);
}

// ── Tool call span ────────────────────────────────────────────────────────────

/**
 * Start a span for one tool invocation (before execution).
 * Sets the tool-level ALS context for child spans.
 */
export function startToolCallSpan(opts: {
  toolName: string;
  args?: Record<string, unknown>;
}): Span {
  if (!isTracingEnabled()) return noop();

  const tracer = getTracer();
  const parentCtx = runContext.getStore();
  const attrs = buildSpanAttributes("tool.call", {
    "tool.name": opts.toolName,
  });

  const ctx = parentCtx
    ? trace.setSpan(otelContext.active(), parentCtx.span)
    : otelContext.active();
  const span = tracer.startSpan("yaaf.tool.call", { attributes: attrs }, ctx);

  const id: string = spanId(span);
  const sc: SpanCtx = { span, startTime: Date.now(), attrs };
  activeSpans.set(id, new WeakRef(sc));
  toolContext.enterWith(sc);
  return span;
}

export function endToolCallSpan(opts?: {
  durationMs?: number;
  error?: string;
  blocked?: boolean;
  blockReason?: string;
}): void {
  const sc = toolContext.getStore();
  if (!sc || sc.ended) return;

  if (isTracingEnabled()) {
    const endAttrs: Attributes = {
      "tool.duration_ms": opts?.durationMs ?? Date.now() - sc.startTime,
    };
    if (opts?.error !== undefined) endAttrs["tool.error"] = opts.error;
    if (opts?.blocked !== undefined) endAttrs["tool.blocked"] = opts.blocked;
    if (opts?.blockReason !== undefined) endAttrs["tool.block_reason"] = opts.blockReason;
    sc.span.setAttributes(endAttrs);
    sc.span.end();
  }

  sc.ended = true;
  activeSpans.delete(spanId(sc.span));
  toolContext.enterWith(undefined);
}

// ── Tool execution span ───────────────────────────────────────────────────────

/**
 * Start a child span for the actual tool fn execution (inside the sandbox).
 * Parent: tool.call ALS context.
 */
export function startToolExecutionSpan(): Span {
  if (!isTracingEnabled()) return noop();

  const tracer = getTracer();
  const parentCtx = toolContext.getStore();
  const attrs = buildSpanAttributes("tool.execution", {});

  const ctx = parentCtx
    ? trace.setSpan(otelContext.active(), parentCtx.span)
    : otelContext.active();
  const span = tracer.startSpan("yaaf.tool.execution", { attributes: attrs }, ctx);

  const id: string = spanId(span);
  const sc: SpanCtx = { span, startTime: Date.now(), attrs };
  activeSpans.set(id, new WeakRef(sc));
  strongSpans.set(id, sc);
  return span;
}

export function endToolExecutionSpan(
  span: Span,
  meta?: { durationMs?: number; error?: string },
): void {
  const id = spanId(span);
  const sc = strongSpans.get(id) ?? activeSpans.get(id)?.deref();
  if (!sc) return;

  if (isTracingEnabled()) {
    const endAttrs: Attributes = {
      "tool.execution_ms": meta?.durationMs ?? Date.now() - sc.startTime,
    };
    if (meta?.error !== undefined) endAttrs["tool.error"] = meta.error;
    sc.span.setAttributes(endAttrs);
    sc.span.end();
  }

  activeSpans.delete(id);
  strongSpans.delete(id);
}

// ── Generic helper ────────────────────────────────────────────────────────────

/**
 * Run `fn` inside a new named span.
 * Automatically attaches to the current run context (if any).
 * Records exceptions and ends the span on completion.
 *
 * @example
 * ```ts
 * const result = await executeInSpan('yaaf.my_op', async (span) => {
 * span.setAttribute('my.attr', 42);
 * return doWork();
 * });
 * ```
 */
export async function executeInSpan<T>(
  spanName: string,
  fn: (span: Span) => Promise<T>,
  attrs?: Attributes,
): Promise<T> {
  if (!isTracingEnabled()) {
    return fn(noop());
  }

  const tracer = getTracer();
  const parentCtx = toolContext.getStore() ?? runContext.getStore();
  const ctx = parentCtx
    ? trace.setSpan(otelContext.active(), parentCtx.span)
    : otelContext.active();
  const span = tracer.startSpan(spanName, { attributes: attrs }, ctx);

  const id: string = spanId(span);
  const sc: SpanCtx = { span, startTime: Date.now(), attrs: attrs ?? {} };
  activeSpans.set(id, new WeakRef(sc));
  strongSpans.set(id, sc);

  try {
    const result = await fn(span);
    span.end();
    return result;
  } catch (err) {
    if (err instanceof Error) span.recordException(err);
    span.end();
    throw err;
  } finally {
    activeSpans.delete(id);
    strongSpans.delete(id);
  }
}

// ── Context accessors ─────────────────────────────────────────────────────────

/** Get the active run-level span (or null) */
export function getCurrentRunSpan(): Span | null {
  return runContext.getStore()?.span ?? null;
}

/** Get the active tool-level span (or null) */
export function getCurrentToolSpan(): Span | null {
  return toolContext.getStore()?.span ?? null;
}
