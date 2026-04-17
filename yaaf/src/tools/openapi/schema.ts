/**
 * OpenAPI → JSON Schema Converter
 *
 * Converts a ParsedOperation's parameters and request body into a single
 * flat JSON Schema (`ToolInput`) for LLM consumption.
 *
 * Design: LLMs produce better function call arguments when the schema is
 * flat (all properties at the top level) rather than nested. We inline
 * body properties alongside query/path params, using a `__body_` prefix
 * only when there's a name collision.
 *
 * @module tools/openapi/schema
 */

import type { ToolInput } from "../tool.js";
import type { ParsedOperation, ParsedParam } from "./parser.js";

// ── Schema Simplification ────────────────────────────────────────────────────

/** Keys to strip from schemas to reduce noise for LLMs */
const STRIP_KEYS = new Set([
  "example",
  "examples",
  "xml",
  "externalDocs",
  "deprecated",
  "readOnly",
  "writeOnly",
  "nullable", // LLMs handle null gracefully
]);

/**
 * Remove LLM-noisy keys from a JSON Schema, recursively.
 * Also collapses single-item `allOf` into the item itself.
 */
function simplifySchema(schema: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(schema)) {
    // Strip noisy keys
    if (STRIP_KEYS.has(key)) continue;
    // Strip vendor extensions
    if (key.startsWith("x-")) continue;

    if (key === "allOf" && Array.isArray(value) && value.length === 1) {
      // Collapse single-item allOf
      const inner = simplifySchema(value[0] as Record<string, unknown>);
      Object.assign(result, inner);
      continue;
    }

    // Recurse into objects (but not arrays of primitives)
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      result[key] = simplifySchema(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        item !== null && typeof item === "object" && !Array.isArray(item)
          ? simplifySchema(item as Record<string, unknown>)
          : item,
      );
    } else {
      result[key] = value;
    }
  }

  return result;
}

// ── Schema Generation ────────────────────────────────────────────────────────

/**
 * Convert a ParsedOperation into a flat JSON Schema for the tool's input.
 *
 * Strategy:
 * 1. Each parameter becomes a top-level property
 * 2. Request body properties are inlined at the top level
 * 3. On name collision, body properties get a `__body_` prefix
 * 4. All schemas are simplified (noise removed)
 *
 * @example
 * // GET /pets?limit=10&status=available
 * // → { type: 'object', properties: { limit: {...}, status: {...} } }
 *
 * // POST /pets { name: string, tag?: string } + query param dryRun
 * // → { type: 'object', properties: { name: {...}, tag: {...}, dryRun: {...} }, required: ['name'] }
 */
export function operationToToolInput(operation: ParsedOperation): ToolInput {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  // Track parameter names to detect body collisions
  const paramNames = new Set<string>();

  // 1. Parameters (path, query, header, cookie)
  for (const param of operation.parameters) {
    paramNames.add(param.name);

    const paramSchema = simplifySchema(param.schema);
    if (param.description && !paramSchema.description) {
      paramSchema.description = param.description;
    }

    properties[param.name] = paramSchema;

    if (param.required) {
      required.push(param.name);
    }
  }

  // 2. Request body (inline properties at top level)
  if (operation.requestBody?.schema) {
    const bodySchema = simplifySchema(operation.requestBody.schema);

    if (bodySchema.type === "object" && bodySchema.properties) {
      const bodyProps = bodySchema.properties as Record<string, Record<string, unknown>>;
      const bodyRequired = (bodySchema.required ?? []) as string[];

      for (const [propName, propSchema] of Object.entries(bodyProps)) {
        // Check for collision with parameter names
        const safeName = paramNames.has(propName) ? `__body_${propName}` : propName;
        properties[safeName] = propSchema;

        if (bodyRequired.includes(propName) && operation.requestBody!.required) {
          required.push(safeName);
        }
      }
    } else {
      // Non-object body (e.g., raw string) — wrap it as a single `body` property
      const safeName = paramNames.has("body") ? "__body" : "body";
      properties[safeName] = bodySchema;

      if (operation.requestBody!.required) {
        required.push(safeName);
      }
    }
  }

  const result: ToolInput = {
    type: "object",
    properties,
  };

  if (required.length > 0) {
    result.required = required;
  }

  return result;
}

/**
 * Extract which input keys correspond to body properties (for request construction).
 * Returns a set of property names that should be placed in the request body.
 *
 * @param operation - The parsed operation
 * @param inputSchema - The generated ToolInput
 * @returns Set of property names that belong in the request body
 */
export function getBodyPropertyNames(operation: ParsedOperation): Set<string> {
  const bodyNames = new Set<string>();

  if (!operation.requestBody?.schema) return bodyNames;

  const bodySchema = operation.requestBody.schema;
  const paramNames = new Set(operation.parameters.map((p) => p.name));

  if (
    bodySchema.type === "object" &&
    bodySchema.properties &&
    typeof bodySchema.properties === "object"
  ) {
    for (const propName of Object.keys(bodySchema.properties as Record<string, unknown>)) {
      const safeName = paramNames.has(propName) ? `__body_${propName}` : propName;
      bodyNames.add(safeName);
    }
  } else {
    const safeName = paramNames.has("body") ? "__body" : "body";
    bodyNames.add(safeName);
  }

  return bodyNames;
}
