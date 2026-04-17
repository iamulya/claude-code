/**
 * Structured Output — Schema-enforced JSON responses from agents
 *
 * Forces the model to return JSON matching a specified schema instead of
 * free-text. Works with any provider that supports native structured output:
 *
 * - **OpenAI**: `response_format: { type: "json_schema", json_schema: { schema } }`
 * - **Gemini**: `responseMimeType: "application/json"` + `responseSchema`
 * - **Anthropic**: Via tool_use workaround (fake tool with the schema)
 * - **Ollama**: `format: "json"` + schema in prompt
 *
 * Unlike ADK's `output_schema` which **disables tool calling**, YAAF's
 * structured output can be applied selectively — use `structuredAgent()`
 * for a tools-disabled schema agent, or `parseStructuredOutput()` for
 * post-hoc validation on any agent response.
 *
 * @example Schema-Only Agent (no tools)
 * ```ts
 * const evaluator = structuredAgent(model, {
 * name: 'evaluator',
 * systemPrompt: 'Evaluate the code quality. Return a structured grade.',
 * schema: {
 * type: 'object',
 * properties: {
 * grade: { type: 'string', enum: ['pass', 'fail'] },
 * score: { type: 'number', minimum: 0, maximum: 100 },
 * issues: { type: 'array', items: { type: 'string' } },
 * },
 * required: ['grade', 'score', 'issues'],
 * },
 * });
 *
 * const result = await evaluator.run('function add(a, b) { return a + b; }');
 * console.log(result); // { grade: 'pass', score: 95, issues: [] }
 * ```
 *
 * @example Post-hoc Validation
 * ```ts
 * const response = await agent.run('Classify this email');
 * const parsed = parseStructuredOutput(response, classificationSchema);
 * if (parsed.ok) {
 * console.log(parsed.data.category); // Type-safe
 * }
 * ```
 *
 * @module agents/structuredOutput
 */

import type { ChatModel, ChatMessage, ChatResult } from "./runner.js";

// ── Types ────────────────────────────────────────────────────────────────────

/** JSON Schema for the expected output shape */
export type OutputSchema = {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
};

/** Successful parse result */
export type ParseSuccess<T = Record<string, unknown>> = {
  ok: true;
  data: T;
};

/** Failed parse result */
export type ParseFailure = {
  ok: false;
  error: string;
  raw: string;
};

/** Union result type */
export type ParseResult<T = Record<string, unknown>> = ParseSuccess<T> | ParseFailure;

/** Config for the structured agent */
export type StructuredAgentConfig = {
  /** Agent name (for tracing) */
  name?: string;
  /** System prompt explaining what the agent should do */
  systemPrompt: string;
  /** JSON Schema the model's response must conform to */
  schema: OutputSchema;
  /** Temperature for LLM sampling (default: 0) */
  temperature?: number;
  /** Maximum output tokens (default: 4096) */
  maxTokens?: number;
};

// ── Schema Injection ─────────────────────────────────────────────────────────

/**
 * Build a system prompt section that instructs the model to output
 * valid JSON matching the schema. Used as a fallback for providers
 * that don't support native structured output.
 */
export function buildSchemaPromptSection(schema: OutputSchema): string {
  return [
    "",
    "## Response Format",
    "",
    "You MUST respond with a valid JSON object matching this schema.",
    "Do NOT include any text before or after the JSON. Do NOT use markdown code fences.",
    "",
    "```json",
    JSON.stringify(schema, null, 2),
    "```",
  ].join("\n");
}

// ── Structured Agent ─────────────────────────────────────────────────────────

/**
 * Create a simple agent that returns structured JSON output.
 *
 * This is equivalent to ADK's Agent with `output_schema` — it does NOT
 * support tool calling (tools are disabled to ensure clean JSON output).
 *
 * For agents that need both tools AND structured output, use a regular
 * AgentRunner and apply `parseStructuredOutput()` to the final response.
 *
 * @param model - The ChatModel to use
 * @param config - System prompt and output schema
 * @returns An object with `run()` that returns parsed JSON
 */
export function structuredAgent<T extends Record<string, unknown> = Record<string, unknown>>(
  model: ChatModel,
  config: StructuredAgentConfig,
): {
  readonly name: string;
  run(input: string, signal?: AbortSignal): Promise<T>;
} {
  const fullSystemPrompt = config.systemPrompt + buildSchemaPromptSection(config.schema);
  const name = config.name ?? "structured_agent";

  return {
    name,

    async run(input: string, signal?: AbortSignal): Promise<T> {
      const messages: ChatMessage[] = [
        { role: "system", content: fullSystemPrompt },
        { role: "user", content: input },
      ];

      const result: ChatResult = await model.complete({
        messages,
        tools: [], // No tools — force text/JSON output
        temperature: config.temperature ?? 0,
        maxTokens: config.maxTokens ?? 4096,
        signal,
      });

      const content = result.content ?? "";
      const parsed = parseStructuredOutput<T>(content, config.schema);

      if (!parsed.ok) {
        throw new Error(`Structured output parse failed: ${parsed.error}\nRaw: ${parsed.raw}`);
      }

      return parsed.data;
    },
  };
}

// ── Parser ───────────────────────────────────────────────────────────────────

/**
 * Parse and validate a model's text output against a JSON Schema.
 *
 * Handles common LLM quirks:
 * - Strips markdown code fences (```json ... ```)
 * - Strips leading/trailing whitespace
 * - Handles embedded JSON in prose (extracts first { ... } block)
 *
 * @param output - Raw text output from the model
 * @param schema - Expected JSON Schema (used for basic validation)
 * @returns ParseResult with the parsed data or error
 */
export function parseStructuredOutput<T extends Record<string, unknown> = Record<string, unknown>>(
  output: string,
  schema: OutputSchema,
): ParseResult<T> {
  if (!output.trim()) {
    return { ok: false, error: "Empty output", raw: output };
  }

  // Strip markdown code fences
  let cleaned = output.trim();
  const fenceMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/m);
  if (fenceMatch) {
    cleaned = fenceMatch[1]!.trim();
  }

  // If it doesn't start with {, try to extract JSON from prose
  if (!cleaned.startsWith("{")) {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }
  }

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    return {
      ok: false,
      error: `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`,
      raw: output,
    };
  }

  // Type check: must be an object
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: "Output is not a JSON object", raw: output };
  }

  // Validate required fields
  if (schema.required) {
    const obj = parsed as Record<string, unknown>;
    const missing = schema.required.filter((key) => !(key in obj));
    if (missing.length > 0) {
      return {
        ok: false,
        error: `Missing required fields: ${missing.join(", ")}`,
        raw: output,
      };
    }
  }

  // Validate property types (basic type checking)
  if (schema.properties) {
    const obj = parsed as Record<string, unknown>;
    for (const [key, schemaDef] of Object.entries(schema.properties)) {
      if (key in obj && typeof schemaDef === "object" && schemaDef !== null) {
        const propSchema = schemaDef as Record<string, unknown>;
        const value = obj[key];
        const expectedType = propSchema.type as string | undefined;

        if (expectedType && value !== null && value !== undefined) {
          const actualType = Array.isArray(value) ? "array" : typeof value;
          if (
            expectedType === "integer" &&
            (typeof value !== "number" || !Number.isInteger(value))
          ) {
            return {
              ok: false,
              error: `Field "${key}" expected integer, got ${typeof value}`,
              raw: output,
            };
          } else if (expectedType !== "integer" && actualType !== expectedType) {
            return {
              ok: false,
              error: `Field "${key}" expected ${expectedType}, got ${actualType}`,
              raw: output,
            };
          }
        }

        // Validate enum
        if (propSchema.enum && Array.isArray(propSchema.enum) && value !== undefined) {
          if (!propSchema.enum.includes(value)) {
            return {
              ok: false,
              error: `Field "${key}" value "${value}" not in enum: [${propSchema.enum.join(", ")}]`,
              raw: output,
            };
          }
        }
      }
    }
  }

  return { ok: true, data: parsed as T };
}
