/**
 * Error classification test suite
 *
 * Tests classifyAPIError for correct mapping of status codes
 * and error patterns to typed YAAF error classes.
 */

import { describe, it, expect } from "vitest";
import {
  classifyAPIError,
  APIError,
  RateLimitError,
  OverloadedError,
  AuthError,
  APIConnectionError,
  ContextOverflowError,
  AbortError,
  RetryExhaustedError,
  YAAFError,
} from "../errors.js";

describe("classifyAPIError", () => {
  it("classifies 401 as AuthError", () => {
    const err = classifyAPIError(401, "Unauthorized");
    expect(err).toBeInstanceOf(AuthError);
    expect(err.code).toBe("AUTH_ERROR");
    expect(err.retryable).toBe(false);
  });

  it("classifies 403 as AuthError", () => {
    const err = classifyAPIError(403, "Forbidden");
    expect(err).toBeInstanceOf(AuthError);
  });

  it("classifies 429 as RateLimitError", () => {
    const err = classifyAPIError(429, "Too Many Requests");
    expect(err).toBeInstanceOf(RateLimitError);
    expect(err.retryable).toBe(true);
  });

  it("classifies 529 as OverloadedError", () => {
    const err = classifyAPIError(529, "Overloaded");
    expect(err).toBeInstanceOf(OverloadedError);
    expect(err.retryable).toBe(true);
  });

  it("classifies network errors as APIConnectionError", () => {
    const err = classifyAPIError(0, "fetch failed: ECONNREFUSED");
    expect(err).toBeInstanceOf(APIConnectionError);
    expect(err.retryable).toBe(true);
  });

  it("classifies 413 as ContextOverflowError", () => {
    const err = classifyAPIError(413, "Request too large");
    expect(err).toBeInstanceOf(ContextOverflowError);
    expect(err.retryable).toBe(false);
  });

  it("classifies 400 with prompt_too_long as ContextOverflowError", () => {
    const err = classifyAPIError(400, "prompt is too long");
    expect(err).toBeInstanceOf(ContextOverflowError);
  });

  it("classifies 400 with context_length_exceeded as ContextOverflowError", () => {
    const err = classifyAPIError(400, "context_length_exceeded");
    expect(err).toBeInstanceOf(ContextOverflowError);
  });

  it("classifies generic 500 as APIError", () => {
    const err = classifyAPIError(500, "Internal Server Error");
    expect(err).toBeInstanceOf(APIError);
  });

  it("classifies generic 400 as APIError (non-retryable)", () => {
    const err = classifyAPIError(400, "Bad Request");
    expect(err).toBeInstanceOf(APIError);
    expect(err.retryable).toBe(false);
  });
});

describe("YAAFError", () => {
  it("carries error code and retryable flag", () => {
    const err = new YAAFError("test error", { code: "API_ERROR", retryable: true });
    expect(err.message).toBe("test error");
    expect(err.code).toBe("API_ERROR");
    expect(err.retryable).toBe(true);
    expect(err.name).toBe("YAAFError");
  });
});

describe("RetryExhaustedError", () => {
  it("wraps the last error", () => {
    const cause = new Error("original");
    const err = new RetryExhaustedError(5, cause);
    expect(err.message).toContain("5");
    expect(err.retryable).toBe(false);
    expect(err.code).toBe("RETRY_EXHAUSTED");
  });
});

describe("AbortError", () => {
  it("is not retryable", () => {
    const err = new AbortError();
    expect(err.retryable).toBe(false);
    expect(err.code).toBe("ABORT");
  });
});
