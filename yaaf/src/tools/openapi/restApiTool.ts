/**
 * RestApiTool — YAAF Tool implementation for OpenAPI operations
 *
 * Each RestApiTool wraps a single API operation (e.g., GET /pets/{petId}).
 * It builds the HTTP request from LLM-provided arguments, executes it via
 * native fetch, and returns the response to the agent loop.
 *
 * Error handling: REST errors are returned as data (not thrown),
 * allowing the LLM to self-correct or retry.
 *
 * @module tools/openapi/restApiTool
 */

import { buildTool, type Tool, type ToolContext } from "../tool.js";
import type { ParsedOperation, SecurityScheme } from "./parser.js";
import { operationToToolInput, getBodyPropertyNames } from "./schema.js";
import { generateToolName } from "./naming.js";
import { applyAuth, resolveAuth, type AuthConfig } from "./auth.js";

// ── Types ────────────────────────────────────────────────────────────────────

export type RestApiToolConfig = {
  /** Timeout for HTTP requests in ms */
  timeoutMs: number;
  /** Extra headers sent with every request */
  extraHeaders: Record<string, string>;
  /** Global auth config */
  auth?: AuthConfig;
  /** Per-scheme credentials */
  credentials: Record<string, string>;
  /** All security schemes from the spec */
  securitySchemes: Record<string, SecurityScheme>;
};

// ── Request Building ─────────────────────────────────────────────────────────

/**
 * Build an HTTP request from an operation and LLM-provided input.
 */
function buildRequest(
  operation: ParsedOperation,
  input: Record<string, unknown>,
  bodyPropNames: Set<string>,
  config: RestApiToolConfig,
): {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
} {
  let url = operation.serverUrl + operation.path;
  const query: Record<string, string> = {};
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...config.extraHeaders,
  };

  // Apply parameters from input
  for (const param of operation.parameters) {
    const value = input[param.name];
    if (value === undefined || value === null) continue;

    switch (param.in) {
      case "path":
        url = url.replace(`{${param.name}}`, encodeURIComponent(String(value)));
        break;
      case "query":
        query[param.name] = String(value);
        break;
      case "header":
        headers[param.name] = String(value);
        break;
      case "cookie": {
        const existing = headers["Cookie"] ?? "";
        headers["Cookie"] = existing
          ? `${existing}; ${param.name}=${encodeURIComponent(String(value))}`
          : `${param.name}=${encodeURIComponent(String(value))}`;
        break;
      }
    }
  }

  // Build request body from body-designated input keys
  let body: string | undefined;
  if (operation.requestBody && bodyPropNames.size > 0) {
    const bodyObj: Record<string, unknown> = {};
    const paramNames = new Set(operation.parameters.map((p) => p.name));

    for (const key of bodyPropNames) {
      if (input[key] === undefined) continue;

      // Reverse the __body_ prefix collision handling
      let originalKey = key;
      if (key.startsWith("__body_")) {
        originalKey = key.slice(7); // remove '__body_' prefix
      } else if (key === "__body") {
        // Non-object body: the entire value IS the body
        body = typeof input[key] === "string" ? (input[key] as string) : JSON.stringify(input[key]);
        headers["Content-Type"] = operation.requestBody.mediaType;
        continue;
      }

      bodyObj[originalKey] = input[key];
    }

    if (Object.keys(bodyObj).length > 0 && !body) {
      body = JSON.stringify(bodyObj);
      headers["Content-Type"] = operation.requestBody.mediaType;
    }
  }

  // Authentication
  const auth = resolveAuth(
    operation.security,
    config.securitySchemes,
    config.credentials,
    config.auth,
  );
  if (auth) {
    applyAuth(headers, query, auth);
  }

  // Append query string
  const qs = new URLSearchParams(query).toString();
  if (qs) url += (url.includes("?") ? "&" : "?") + qs;

  return {
    url,
    method: operation.method.toUpperCase(),
    headers,
    body,
  };
}

// ── Tool Factory ─────────────────────────────────────────────────────────────

/**
 * Create a YAAF Tool from a parsed OpenAPI operation.
 *
 * @param operation - The normalized operation from the parser
 * @param config - Shared configuration (auth, timeout, headers)
 * @param nameOverride - Override the generated tool name
 * @returns A complete YAAF Tool
 */
export function createRestApiTool(
  operation: ParsedOperation,
  config: RestApiToolConfig,
  nameOverride?: string,
): Tool {
  const toolName =
    nameOverride ?? generateToolName(operation.operationId, operation.method, operation.path);
  const inputSchema = operationToToolInput(operation);
  const bodyPropNames = getBodyPropertyNames(operation);
  const description =
    operation.summary ||
    operation.description ||
    `${operation.method.toUpperCase()} ${operation.path}`;
  const method = operation.method;

  return buildTool({
    name: toolName,
    inputSchema,
    maxResultChars: 50_000,

    describe: (input: Record<string, unknown>) => {
      const argSummary = Object.entries(input)
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
        .join(", ");
      return `${method.toUpperCase()} ${operation.path}${argSummary ? ` (${argSummary})` : ""}`;
    },

    prompt: () => description,

    async call(input: Record<string, unknown>, ctx: ToolContext) {
      const req = buildRequest(operation, input, bodyPropNames, config);

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), config.timeoutMs);

        // Forward the tool context's abort signal
        ctx.signal.addEventListener("abort", () => controller.abort());

        let response: Response;
        try {
          response = await fetch(req.url, {
            method: req.method,
            headers: req.headers,
            body: req.body,
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timer);
        }

        // Parse response
        const contentType = response.headers.get("content-type") ?? "";

        if (!response.ok) {
          let errorBody: unknown;
          try {
            errorBody = contentType.includes("json")
              ? await response.json()
              : await response.text();
          } catch {
            errorBody = `HTTP ${response.status} ${response.statusText}`;
          }

          return {
            data: {
              error: true,
              status: response.status,
              statusText: response.statusText,
              body: errorBody,
            },
          };
        }

        let data: unknown;
        try {
          data = contentType.includes("json") ? await response.json() : await response.text();
        } catch {
          data = await response.text();
        }

        return { data };
      } catch (err) {
        // Network errors, timeouts, aborts — return as data, don't throw
        const message = err instanceof Error ? err.message : String(err);
        const isAbort = err instanceof Error && err.name === "AbortError";

        return {
          data: {
            error: true,
            message: isAbort
              ? "Request timed out or was cancelled"
              : `Connection failed: ${message}`,
            aborted: isAbort,
          },
        };
      }
    },

    // Safety classification based on HTTP method
    isReadOnly: () => method === "get",
    isConcurrencySafe: () => method === "get",
    isDestructive: () => method === "delete",
  });
}
