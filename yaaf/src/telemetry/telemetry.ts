/**
 * YAAF Telemetry — OpenTelemetry provider initialization.
 *
 * Mirrors the main repo's `src/utils/telemetry/instrumentation.ts` but
 * adapted for YAAF's library context (no Anthropic-internal infra, no
 * BigQuery, no mTLS, no GrowthBook). All signals are controlled purely
 * via standard OTEL environment variables (with optional YAAF_OTEL_ prefix
 * overrides for coexistence with a host app's own OTEL configuration).
 *
 * ## Quick start
 *
 * ```ts
 * import { initYAAFTelemetry } from 'yaaf/telemetry';
 *
 * await initYAAFTelemetry(); // reads OTEL_* env vars, registers providers
 * ```
 *
 * ## Environment variables
 *
 * | Variable | Default | Purpose |
 * |-------------------------------------|----------------|----------------------------------------|
 * | `YAAF_OTEL_TRACES_EXPORTER` | — | Override `OTEL_TRACES_EXPORTER` |
 * | `YAAF_OTEL_METRICS_EXPORTER` | — | Override `OTEL_METRICS_EXPORTER` |
 * | `YAAF_OTEL_LOGS_EXPORTER` | — | Override `OTEL_LOGS_EXPORTER` |
 * | `YAAF_OTEL_EXPORTER_OTLP_ENDPOINT` | — | Override `OTEL_EXPORTER_OTLP_ENDPOINT` |
 * | `YAAF_OTEL_EXPORTER_OTLP_PROTOCOL` | `http/protobuf`| `grpc` / `http/json` / `http/protobuf` |
 * | `YAAF_OTEL_SHUTDOWN_TIMEOUT_MS` | `2000` | Max ms to wait for flush on shutdown |
 * | `OTEL_*` | — | Standard OTEL env vars (all honoured) |
 *
 * ## Exporters supported (per signal)
 *
 * - `console` — pretty-print to stdout (development)
 * - `otlp` — OTLP over `http/protobuf` (default), `http/json`, or `grpc`
 * - `none` / empty — disable signal (no exporter registered)
 *
 * @module telemetry
 */

import { diag, DiagLogLevel, trace, type DiagLogger } from "@opentelemetry/api";
import { logs } from "@opentelemetry/api-logs";
import {
  BatchLogRecordProcessor,
  ConsoleLogRecordExporter,
  LoggerProvider,
} from "@opentelemetry/sdk-logs";
import {
  ConsoleMetricExporter,
  MeterProvider,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import {
  BasicTracerProvider,
  BatchSpanProcessor,
  ConsoleSpanExporter,
} from "@opentelemetry/sdk-trace-base";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import { Resource } from "@opentelemetry/resources";
import { Logger } from "../utils/logger.js";
import { YAAF_LOGGER_NAME, YAAF_METER_NAME, YAAF_SERVICE_NAME } from "./attributes.js";

const log = new Logger("telemetry");

// Package version - falls back gracefully in library context
const YAAF_VERSION = process.env["npm_package_version"] ?? "0.0.0";

// Default export intervals (ms)
const DEFAULT_METRICS_INTERVAL_MS = 60_000;
const DEFAULT_LOGS_INTERVAL_MS = 5_000;
const DEFAULT_TRACES_INTERVAL_MS = 5_000;

// ── Provider singletons (initialized once) ────────────────────────────────────

let _meterProvider: MeterProvider | undefined;
let _loggerProvider: LoggerProvider | undefined;
let _tracerProvider: BasicTracerProvider | undefined;
let _initialized = false;

// ── Env utilities ─────────────────────────────────────────────────────────────

/**
 * Resolve a YAAF-prefixed or standard OTEL env variable.
 * YAAF_OTEL_* overrides take precedence for coexistence with host app OTEL config.
 */
function resolveEnv(key: string): string | undefined {
  return process.env[`YAAF_${key}`] ?? process.env[key];
}

/**
 * Parse a comma-separated exporter type list.
 * "console,otlp" → ["console", "otlp"].
 * "none" and empty values are filtered out.
 * Mirrors `parseExporterTypes()` in the main repo.
 */
export function parseExporterList(value: string | undefined): string[] {
  return (value ?? "")
    .trim()
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && s !== "none");
}

// ── OTLP config ───────────────────────────────────────────────────────────────

function getOtlpEndpoint(): string | undefined {
  return resolveEnv("OTEL_EXPORTER_OTLP_ENDPOINT");
}

function getOtlpProtocol(signalKey?: string): string {
  if (signalKey) {
    const sigProto = resolveEnv(`OTEL_EXPORTER_OTLP_${signalKey}_PROTOCOL`);
    if (sigProto) return sigProto.trim();
  }
  return (resolveEnv("OTEL_EXPORTER_OTLP_PROTOCOL") ?? "http/protobuf").trim();
}

function getOtlpHeaders(): Record<string, string> {
  const raw = resolveEnv("OTEL_EXPORTER_OTLP_HEADERS") ?? "";
  const headers: Record<string, string> = {};
  for (const pair of raw.split(",")) {
    const [k, ...vs] = pair.split("=");
    if (k && vs.length > 0) headers[k.trim()] = vs.join("=").trim();
  }
  return headers;
}

// ── Trace exporter factory ────────────────────────────────────────────────────

type AnySpanExporter = InstanceType<typeof ConsoleSpanExporter>;

async function buildTraceExporters(): Promise<AnySpanExporter[]> {
  const types = parseExporterList(resolveEnv("OTEL_TRACES_EXPORTER"));
  const results: AnySpanExporter[] = [];

  for (const t of types) {
    if (t === "console") {
      results.push(new ConsoleSpanExporter());
    } else if (t === "otlp") {
      results.push(await buildOtlpTraceExporter());
    } else {
      log.warn(`Unknown OTEL_TRACES_EXPORTER value: "${t}" — skipping`);
    }
  }
  return results;
}

async function buildOtlpTraceExporter(): Promise<AnySpanExporter> {
  const protocol = getOtlpProtocol("TRACES");
  const endpoint = getOtlpEndpoint();
  const headers = getOtlpHeaders();

  switch (protocol) {
    case "grpc": {
      const { OTLPTraceExporter } = await import(
        "@opentelemetry/exporter-trace-otlp-grpc" as string
      );
      return new (OTLPTraceExporter as new () => AnySpanExporter)();
    }
    case "http/json": {
      const { OTLPTraceExporter } = await import(
        "@opentelemetry/exporter-trace-otlp-http" as string
      );
      return new (OTLPTraceExporter as new (c: object) => AnySpanExporter)({
        url: endpoint ? `${endpoint}/v1/traces` : undefined,
        headers,
      });
    }
    case "http/protobuf":
    default: {
      const { OTLPTraceExporter } = await import(
        "@opentelemetry/exporter-trace-otlp-proto" as string
      );
      return new (OTLPTraceExporter as new (c: object) => AnySpanExporter)({
        url: endpoint ? `${endpoint}/v1/traces` : undefined,
        headers,
      });
    }
  }
}

// ── Metric reader factory ─────────────────────────────────────────────────────

async function buildMetricReaders(): Promise<PeriodicExportingMetricReader[]> {
  const types = parseExporterList(resolveEnv("OTEL_METRICS_EXPORTER"));
  const interval = parseInt(
    resolveEnv("OTEL_METRIC_EXPORT_INTERVAL") ?? String(DEFAULT_METRICS_INTERVAL_MS),
  );
  const readers: PeriodicExportingMetricReader[] = [];

  for (const t of types) {
    if (t === "console") {
      readers.push(
        new PeriodicExportingMetricReader({
          exporter: new ConsoleMetricExporter(),
          exportIntervalMillis: interval,
        }),
      );
    } else if (t === "otlp") {
      const exporter = await buildOtlpMetricExporter();
      readers.push(
        new PeriodicExportingMetricReader({
          exporter: exporter as ConstructorParameters<
            typeof PeriodicExportingMetricReader
          >[0]["exporter"],
          exportIntervalMillis: interval,
        }),
      );
    } else {
      log.warn(`Unknown OTEL_METRICS_EXPORTER value: "${t}" — skipping`);
    }
  }
  return readers;
}

async function buildOtlpMetricExporter() {
  const protocol = getOtlpProtocol("METRICS");
  const endpoint = getOtlpEndpoint();
  const headers = getOtlpHeaders();

  switch (protocol) {
    case "grpc": {
      const { OTLPMetricExporter } = await import(
        "@opentelemetry/exporter-metrics-otlp-grpc" as string
      );
      return new (OTLPMetricExporter as new () => object)();
    }
    case "http/json": {
      const { OTLPMetricExporter } = await import(
        "@opentelemetry/exporter-metrics-otlp-http" as string
      );
      return new (OTLPMetricExporter as new (c: object) => object)({
        url: endpoint ? `${endpoint}/v1/metrics` : undefined,
        headers,
      });
    }
    case "http/protobuf":
    default: {
      const { OTLPMetricExporter } = await import(
        "@opentelemetry/exporter-metrics-otlp-proto" as string
      );
      return new (OTLPMetricExporter as new (c: object) => object)({
        url: endpoint ? `${endpoint}/v1/metrics` : undefined,
        headers,
      });
    }
  }
}

// ── Log exporter factory ──────────────────────────────────────────────────────

type AnyLogExporter = InstanceType<typeof ConsoleLogRecordExporter>;

async function buildLogExporters(): Promise<AnyLogExporter[]> {
  const types = parseExporterList(resolveEnv("OTEL_LOGS_EXPORTER"));
  const results: AnyLogExporter[] = [];

  for (const t of types) {
    if (t === "console") {
      results.push(new ConsoleLogRecordExporter());
    } else if (t === "otlp") {
      results.push(await buildOtlpLogExporter());
    } else {
      log.warn(`Unknown OTEL_LOGS_EXPORTER value: "${t}" — skipping`);
    }
  }
  return results;
}

async function buildOtlpLogExporter(): Promise<AnyLogExporter> {
  const protocol = getOtlpProtocol("LOGS");
  const endpoint = getOtlpEndpoint();
  const headers = getOtlpHeaders();

  switch (protocol) {
    case "grpc": {
      const { OTLPLogExporter } = await import("@opentelemetry/exporter-logs-otlp-grpc" as string);
      return new (OTLPLogExporter as new () => AnyLogExporter)();
    }
    case "http/json": {
      const { OTLPLogExporter } = await import("@opentelemetry/exporter-logs-otlp-http" as string);
      return new (OTLPLogExporter as new (c: object) => AnyLogExporter)({
        url: endpoint ? `${endpoint}/v1/logs` : undefined,
        headers,
      });
    }
    case "http/protobuf":
    default: {
      const { OTLPLogExporter } = await import("@opentelemetry/exporter-logs-otlp-proto" as string);
      return new (OTLPLogExporter as new (c: object) => AnyLogExporter)({
        url: endpoint ? `${endpoint}/v1/logs` : undefined,
        headers,
      });
    }
  }
}

// ── Shutdown helpers ──────────────────────────────────────────────────────────

class TelemetryTimeoutError extends Error {}

function telemetryTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    const t = setTimeout(
      () => reject(new TelemetryTimeoutError(`YAAF telemetry flush timed out after ${ms}ms`)),
      ms,
    );
    if (typeof (t as NodeJS.Timeout).unref === "function") {
      (t as NodeJS.Timeout).unref();
    }
  });
}

// ── Minimal DiagLogger implementation ─────────────────────────────────────────

function makeDiagLogger(): DiagLogger {
  return {
    error: (msg: string, ...args: unknown[]) => log.error(msg, { args: String(args) }),
    warn: (msg: string, ...args: unknown[]) => log.warn(msg, { args: String(args) }),
    info: () => {},
    debug: () => {},
    verbose: () => {},
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Initialize the YAAF OpenTelemetry stack.
 *
 * Call once at process startup. Safe to call multiple times — only the first call
 * takes effect. Reads OTEL_* (or YAAF_OTEL_* override) env vars, registers
 * global providers, and wires `beforeExit`/`exit` flush handlers.
 *
 * @returns The YAAF internal `Meter` — use it to create counters/histograms.
 *
 * @example
 * ```ts
 * // Production: Jaeger via OTLP
 * process.env.OTEL_TRACES_EXPORTER = 'otlp';
 * process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';
 * const meter = await initYAAFTelemetry();
 *
 * // Development: console output
 * process.env.OTEL_TRACES_EXPORTER = 'console';
 * process.env.OTEL_METRICS_EXPORTER = 'console';
 * const meter = await initYAAFTelemetry();
 *
 * // Custom metrics
 * const counter = meter.createCounter('yaaf.requests');
 * counter.add(1, { agent: 'my-agent' });
 * ```
 */
export async function initYAAFTelemetry(): Promise<ReturnType<MeterProvider["getMeter"]>> {
  if (_initialized) {
    return _meterProvider!.getMeter(YAAF_METER_NAME, YAAF_VERSION);
  }
  _initialized = true;

  // Reduce OTel internal noise to error level only (mirrors main repo)
  diag.setLogger(makeDiagLogger(), DiagLogLevel.ERROR);

  // ── Build resource ───────────────────────────────────────────────────────
  const resource = new Resource({
    [ATTR_SERVICE_NAME]: YAAF_SERVICE_NAME,
    [ATTR_SERVICE_VERSION]: YAAF_VERSION,
    "process.runtime.name": "nodejs",
  });

  // ── Metrics ──────────────────────────────────────────────────────────────
  const readers = await buildMetricReaders();
  const meterProv = new MeterProvider({ resource, readers, views: [] });
  _meterProvider = meterProv;

  // ── Traces ───────────────────────────────────────────────────────────────
  const traceExp = await buildTraceExporters();
  if (traceExp.length > 0) {
    const traceInterval = parseInt(
      resolveEnv("OTEL_TRACES_EXPORT_INTERVAL") ?? String(DEFAULT_TRACES_INTERVAL_MS),
    );
    const processors = traceExp.map(
      (e) => new BatchSpanProcessor(e, { scheduledDelayMillis: traceInterval }),
    );
    const tracerProv = new BasicTracerProvider({ resource, spanProcessors: processors });
    trace.setGlobalTracerProvider(tracerProv);
    _tracerProvider = tracerProv;
  }

  // ── Logs ─────────────────────────────────────────────────────────────────
  const logExp = await buildLogExporters();
  if (logExp.length > 0) {
    const logInterval = parseInt(
      resolveEnv("OTEL_LOGS_EXPORT_INTERVAL") ?? String(DEFAULT_LOGS_INTERVAL_MS),
    );
    const logProv = new LoggerProvider({ resource });
    for (const e of logExp) {
      logProv.addLogRecordProcessor(
        new BatchLogRecordProcessor(e, { scheduledDelayMillis: logInterval }),
      );
    }
    logs.setGlobalLoggerProvider(logProv);
    _loggerProvider = logProv;
  }

  // ── Shutdown hooks ────────────────────────────────────────────────────────
  const shutdownFn = async () => {
    const timeoutMs = parseInt(
      resolveEnv("YAAF_OTEL_SHUTDOWN_TIMEOUT_MS") ??
        resolveEnv("OTEL_SHUTDOWN_TIMEOUT_MS") ??
        "2000",
    );
    try {
      const chains: Promise<void>[] = [meterProv.shutdown()];
      if (_loggerProvider) {
        chains.push(_loggerProvider.forceFlush().then(() => _loggerProvider!.shutdown()));
      }
      if (_tracerProvider) {
        chains.push(_tracerProvider.forceFlush().then(() => _tracerProvider!.shutdown()));
      }
      await Promise.race([Promise.all(chains), telemetryTimeout(timeoutMs)]);
    } catch (err) {
      if (!(err instanceof TelemetryTimeoutError)) {
        log.error("Telemetry shutdown error", { error: String(err) });
      }
    }
  };

  process.on("beforeExit", () => {
    void shutdownFn();
  });
  process.on("exit", () => {
    void _meterProvider?.forceFlush();
    void _loggerProvider?.forceFlush();
    void _tracerProvider?.forceFlush();
  });

  return meterProv.getMeter(YAAF_METER_NAME, YAAF_VERSION);
}

/**
 * Force-flush all pending telemetry data immediately.
 * Call before process exit, test teardown, or user logout.
 */
export async function flushYAAFTelemetry(): Promise<void> {
  const timeoutMs = parseInt(resolveEnv("YAAF_OTEL_FLUSH_TIMEOUT_MS") ?? "5000");
  try {
    const chains: Promise<void>[] = [];
    if (_meterProvider) chains.push(_meterProvider.forceFlush());
    if (_loggerProvider) chains.push(_loggerProvider.forceFlush());
    if (_tracerProvider) chains.push(_tracerProvider.forceFlush());
    if (chains.length === 0) return;
    await Promise.race([Promise.all(chains), telemetryTimeout(timeoutMs)]);
  } catch (err) {
    if (!(err instanceof TelemetryTimeoutError)) throw err;
    log.warn(
      `Telemetry flush timed out after ${timeoutMs}ms — some data may not have been exported`,
    );
  }
}

/**
 * Get the initialized YAAF Meter for custom metrics.
 * Returns undefined if `initYAAFTelemetry()` has not been called.
 *
 * @example
 * ```ts
 * const meter = getYAAFMeter();
 * const counter = meter?.createCounter('my_agent.tool_calls');
 * counter?.add(1, { tool: 'search' });
 * ```
 */
export function getYAAFMeter(): ReturnType<MeterProvider["getMeter"]> | undefined {
  return _meterProvider?.getMeter(YAAF_METER_NAME, YAAF_VERSION);
}

/**
 * Get a structured OTLP log emitter for YAAF.
 * Returns undefined if `initYAAFTelemetry()` hasn't been called or
 * no logs exporter is configured.
 */
export function getYAAFOTelLogger(): import("@opentelemetry/api-logs").Logger | undefined {
  if (!_loggerProvider) return undefined;
  return logs.getLogger(YAAF_LOGGER_NAME, YAAF_VERSION);
}
