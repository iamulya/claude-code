/**
 * YAAF Error Hierarchy — structured, typed errors for every subsystem.
 *
 * Design principles:
 * - All YAAF errors extend `YAAFError` for unified catch
 * - Every error carries `code` (machine-readable), `retryable` (for retry logic),
 * and optional `provider` (for multi-provider diagnostics)
 * - Subclasses add domain-specific fields (status, retryAfterMs, etc.)
 *
 * @example
 * ```ts
 * try {
 * await model.complete(params);
 * } catch (err) {
 * if (err instanceof RateLimitError) {
 * console.log(`Retry after ${err.retryAfterMs}ms`);
 * } else if (err instanceof YAAFError) {
 * console.log(`${err.code}: ${err.message} [retryable=${err.retryable}]`);
 * }
 * }
 * ```
 */

// ── Base Error ───────────────────────────────────────────────────────────────

export type ErrorCode =
  | "RATE_LIMIT"
  | "OVERLOADED"
  | "AUTH_ERROR"
  | "API_ERROR"
  | "API_CONNECTION_ERROR"
  | "CONTEXT_OVERFLOW"
  | "TOOL_EXECUTION_ERROR"
  | "SANDBOX_VIOLATION"
  | "PERMISSION_DENIED"
  | "ABORT"
  | "RETRY_EXHAUSTED"
  | "MAX_ITERATIONS"
  | "COMPACTION_ERROR"
  | "UNKNOWN";

export class YAAFError extends Error {
  /** Machine-readable error code */
  readonly code: ErrorCode;
  /** Whether this error is safe to retry */
  readonly retryable: boolean;
  /** Provider that produced the error (e.g. 'openai', 'gemini') */
  readonly provider?: string;
  /** Original error, if wrapping */
  readonly cause?: Error;

  constructor(
    message: string,
    opts: {
      code: ErrorCode;
      retryable?: boolean;
      provider?: string;
      cause?: Error;
    },
  ) {
    super(message);
    this.name = "YAAFError";
    this.code = opts.code;
    this.retryable = opts.retryable ?? false;
    this.provider = opts.provider;
    this.cause = opts.cause;
  }
}

// ── API / Provider Errors ───────────────────────────────────────────────────

/** HTTP error from an LLM provider */
export class APIError extends YAAFError {
  /** HTTP status code */
  readonly status: number;
  /** Raw response body (if available) */
  readonly responseBody?: string;

  constructor(
    message: string,
    opts: {
      status: number;
      provider?: string;
      responseBody?: string;
      retryable?: boolean;
      cause?: Error;
    },
  ) {
    const retryable = opts.retryable ?? isRetryableStatus(opts.status);
    super(message, { code: "API_ERROR", retryable, provider: opts.provider, cause: opts.cause });
    this.name = "APIError";
    this.status = opts.status;
    this.responseBody = opts.responseBody;
  }
}

/** 429 rate limit error — carries retry-after timing */
export class RateLimitError extends YAAFError {
  readonly status = 429;
  /** How long to wait before retrying, in ms (from Retry-After header) */
  readonly retryAfterMs?: number;

  constructor(
    message: string,
    opts: {
      provider?: string;
      retryAfterMs?: number;
      cause?: Error;
    } = {},
  ) {
    super(message, {
      code: "RATE_LIMIT",
      retryable: true,
      provider: opts.provider,
      cause: opts.cause,
    });
    this.name = "RateLimitError";
    this.retryAfterMs = opts.retryAfterMs;
  }
}

/** 529 / 503 overloaded error */
export class OverloadedError extends YAAFError {
  readonly status: number;
  readonly retryAfterMs?: number;

  constructor(
    message: string,
    opts: {
      status?: number;
      provider?: string;
      retryAfterMs?: number;
      cause?: Error;
    } = {},
  ) {
    super(message, {
      code: "OVERLOADED",
      retryable: true,
      provider: opts.provider,
      cause: opts.cause,
    });
    this.name = "OverloadedError";
    this.status = opts.status ?? 529;
    this.retryAfterMs = opts.retryAfterMs;
  }
}

/** Authentication failure (401/403) */
export class AuthError extends YAAFError {
  readonly status: number;

  constructor(
    message: string,
    opts: {
      status?: number;
      provider?: string;
      cause?: Error;
    } = {},
  ) {
    super(message, {
      code: "AUTH_ERROR",
      retryable: false,
      provider: opts.provider,
      cause: opts.cause,
    });
    this.name = "AuthError";
    this.status = opts.status ?? 401;
  }
}

/** Network connectivity failure (DNS, TCP, TLS) */
export class APIConnectionError extends YAAFError {
  constructor(
    message: string,
    opts: {
      provider?: string;
      cause?: Error;
    } = {},
  ) {
    super(message, {
      code: "API_CONNECTION_ERROR",
      retryable: true,
      provider: opts.provider,
      cause: opts.cause,
    });
    this.name = "APIConnectionError";
  }
}

// ── Context / Compaction Errors ──────────────────────────────────────────────

/** Context window exceeded — input + max_tokens > window */
export class ContextOverflowError extends YAAFError {
  readonly inputTokens: number;
  readonly maxTokens: number;
  readonly contextLimit: number;

  constructor(opts: {
    inputTokens: number;
    maxTokens: number;
    contextLimit: number;
    provider?: string;
  });
  constructor(
    message: string,
    opts?: {
      status?: number;
      provider?: string;
      estimatedTokens?: number;
      contextLimit?: number;
    },
  );
  constructor(
    messageOrOpts:
      | string
      | {
          inputTokens: number;
          maxTokens: number;
          contextLimit: number;
          provider?: string;
        },
    extraOpts?: {
      status?: number;
      provider?: string;
      estimatedTokens?: number;
      contextLimit?: number;
    },
  ) {
    if (typeof messageOrOpts === "string") {
      super(messageOrOpts, {
        code: "CONTEXT_OVERFLOW",
        retryable: false,
        provider: extraOpts?.provider,
      });
      this.inputTokens = extraOpts?.estimatedTokens ?? 0;
      this.maxTokens = 0;
      this.contextLimit = extraOpts?.contextLimit ?? 0;
    } else {
      super(
        `Context overflow: ${messageOrOpts.inputTokens} input + ${messageOrOpts.maxTokens} output > ${messageOrOpts.contextLimit} limit`,
        { code: "CONTEXT_OVERFLOW", retryable: false, provider: messageOrOpts.provider },
      );
      this.inputTokens = messageOrOpts.inputTokens;
      this.maxTokens = messageOrOpts.maxTokens;
      this.contextLimit = messageOrOpts.contextLimit;
    }
    this.name = "ContextOverflowError";
  }
}

/** Compaction failed */
export class CompactionError extends YAAFError {
  constructor(message: string, opts: { cause?: Error } = {}) {
    super(message, { code: "COMPACTION_ERROR", retryable: false, cause: opts.cause });
    this.name = "CompactionError";
  }
}

// ── Execution Errors ────────────────────────────────────────────────────────

/** Tool execution failed */
export class ToolExecutionError extends YAAFError {
  readonly toolName: string;

  constructor(toolName: string, message: string, opts: { cause?: Error } = {}) {
    super(`Tool "${toolName}" failed: ${message}`, {
      code: "TOOL_EXECUTION_ERROR",
      retryable: false,
      cause: opts.cause,
    });
    this.name = "ToolExecutionError";
    this.toolName = toolName;
  }
}

/** Abort signal fired */
export class AbortError extends YAAFError {
  constructor(message = "Operation was aborted") {
    super(message, { code: "ABORT", retryable: false });
    this.name = "AbortError";
  }
}

/** All retry attempts exhausted */
export class RetryExhaustedError extends YAAFError {
  readonly attempts: number;
  readonly lastError: Error;

  constructor(attempts: number, lastError: Error, opts: { provider?: string } = {}) {
    super(`All ${attempts} retry attempts exhausted. Last error: ${lastError.message}`, {
      code: "RETRY_EXHAUSTED",
      retryable: false,
      provider: opts.provider,
      cause: lastError,
    });
    this.name = "RetryExhaustedError";
    this.attempts = attempts;
    this.lastError = lastError;
  }
}

/** Agent loop hit maxIterations without producing a final response */
export class MaxIterationsError extends YAAFError {
  readonly iterations: number;

  constructor(iterations: number, opts: { provider?: string } = {}) {
    super(`Agent reached maximum iterations (${iterations}) without producing a final response`, {
      code: "MAX_ITERATIONS",
      retryable: false,
      provider: opts.provider,
    });
    this.name = "MaxIterationsError";
    this.iterations = iterations;
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function isRetryableStatus(status: number): boolean {
  if (status === 408) return true; // Request timeout
  if (status === 409) return true; // Lock timeout
  if (status === 429) return true; // Rate limit
  if (status >= 500) return true; // Server errors
  return false;
}

/**
 * Classify a raw HTTP response into the appropriate YAAF error type.
 * Used by model adapters to convert fetch() errors into typed errors.
 */
export function classifyAPIError(
  status: number,
  body: string,
  provider?: string,
  headers?: Headers,
): YAAFError {
  const retryAfterMs = parseRetryAfterHeader(headers);
  // Truncate raw response body before embedding in error messages.
  // Provider responses can be arbitrarily large (HTML error pages, verbose JSON).
  // Embedding them untruncated causes: (a) MB-scale log entries, (b) potential
  // credential/secret leakage from verbose provider error payloads.
  const safeBody = body.length > 500 ? body.slice(0, 500) + "...[truncated]" : body;

  // Network failure (status 0 = fetch failed)
  if (status === 0) {
    return new APIConnectionError(`${provider ?? "API"} connection failed: ${safeBody}`, {
      provider,
    });
  }

  if (status === 401 || status === 403) {
    return new AuthError(`${provider ?? "API"} authentication failed (${status}): ${safeBody}`, {
      status,
      provider,
    });
  }

  if (status === 429) {
    return new RateLimitError(`${provider ?? "API"} rate limit exceeded: ${safeBody}`, {
      provider,
      retryAfterMs,
    });
  }

  if (status === 529 || (status === 503 && safeBody.includes("overloaded"))) {
    return new OverloadedError(`${provider ?? "API"} overloaded (${status}): ${safeBody}`, {
      status,
      provider,
      retryAfterMs,
    });
  }

  // Context overflow detection (Gap #5)
  if (status === 413) {
    return new ContextOverflowError(`${provider ?? "API"} request too large (413): ${safeBody}`, {
      status,
      provider,
      estimatedTokens: 0,
      contextLimit: 0,
    });
  }

  // Prompt-too-long patterns in 400 responses
  const bodyLower = safeBody.toLowerCase();
  if (
    status === 400 &&
    (bodyLower.includes("prompt is too long") ||
      bodyLower.includes("prompt_too_long") ||
      bodyLower.includes("context_length_exceeded") ||
      bodyLower.includes("maximum context length"))
  ) {
    return new ContextOverflowError(`${provider ?? "API"} context overflow (400): ${safeBody}`, {
      status,
      provider,
      estimatedTokens: 0,
      contextLimit: 0,
    });
  }

  return new APIError(`${provider ?? "API"} error ${status}: ${safeBody}`, {
    status,
    provider,
    responseBody: body, // preserve full body on the error object for debugging
  });
}

/**
 * Parse the Retry-After header into milliseconds.
 * Supports both delay-seconds and HTTP-date formats.
 */
export function parseRetryAfterHeader(headers?: Headers): number | undefined {
  if (!headers) return undefined;
  const value = headers.get("retry-after");
  if (!value) return undefined;

  // Try as seconds (most common)
  const seconds = parseInt(value, 10);
  if (!isNaN(seconds)) return seconds * 1000;

  // Try as HTTP-date
  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    const delayMs = date.getTime() - Date.now();
    return delayMs > 0 ? delayMs : 0;
  }

  return undefined;
}
