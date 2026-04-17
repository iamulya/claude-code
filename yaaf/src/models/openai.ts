/**
 * OpenAI-compatible ChatModel + LLMAdapter + Streaming
 *
 * Works with: OpenAI, Groq, Together AI, Fireworks, Perplexity, Ollama,
 * vLLM, LiteLLM, and any other provider exposing the OpenAI chat completions API.
 *
 * Extends `BaseLLMAdapter` which provides `query()`, `summarize()`,
 * `estimateTokens()`, and `healthCheck()` — this class implements
 * `complete()`, `stream()`, and the provider-specific HTTP logic.
 *
 * @example
 * ```ts
 * // Direct use
 * const model = new OpenAIChatModel({ apiKey: process.env.OPENAI_API_KEY! });
 *
 * // Streaming
 * for await (const delta of model.stream({ messages })) {
 * process.stdout.write(delta.content ?? '');
 * }
 *
 * // Groq
 * new OpenAIChatModel({
 * apiKey: process.env.GROQ_API_KEY!,
 * baseUrl: 'https://api.groq.com/openai/v1',
 * model: 'llama-3.3-70b-versatile',
 * });
 *
 * // Ollama (local)
 * new OpenAIChatModel({
 * apiKey: 'ollama',
 * baseUrl: 'http://localhost:11434/v1',
 * model: 'llama3.1',
 * });
 * ```
 *
 * No external dependencies — uses the native fetch API.
 */

import type {
  ChatMessage,
  ChatResult,
  ChatDelta,
  ToolSchema,
  StreamingChatModel,
  TokenUsage,
} from "../agents/runner.js";
import { BaseLLMAdapter } from "./base.js";
import { classifyAPIError, APIConnectionError, AbortError } from "../errors.js";
import { resolveModelSpecs } from "./specs.js";

// ── Config ───────────────────────────────────────────────────────────────────

export type OpenAIModelConfig = {
  /** API key — or 'ollama', 'local', etc. for local providers */
  apiKey: string;
  /** Base URL (default: https://api.openai.com/v1) */
  baseUrl?: string;
  /** Model name (default: gpt-4o-mini) */
  model?: string;
  /** Request timeout in ms (default: 60_000) */
  timeoutMs?: number;
  /** Extra headers to send with every request */
  headers?: Record<string, string>;
  /** Context window size in tokens (default: 128_000) */
  contextWindowTokens?: number;
  /** Maximum output tokens per completion (default: 4_096) */
  maxOutputTokens?: number;
  /**
   * Role name to use for system messages.
   * - `'system'` — standard role for GPT-4 class models (default)
   * - `'developer'` — required for o1, o3, o4 and future reasoning models
   *
   * When not set, YAAF auto-detects based on the model name prefix:
   * models starting with `o1`, `o3`, or `o4` default to `'developer'`.
   */
  systemRole?: "system" | "developer";
  /**
   * Allow the model to call multiple tools in parallel within a single turn.
   * Defaults to `true` (OpenAI API default). Set to `false` to force sequential
   * tool calls — useful when tools have side-effects that depend on ordering.
   */
  parallelToolCalls?: boolean;
  /**
   * Reasoning effort for o-series models (o1, o3, o4).
   * Controls the trade-off between response quality and latency/cost.
   * - `'low'` — fastest, cheapest, least reasoning
   * - `'medium'` — balanced (default for o3-mini)
   * - `'high'` — most thorough reasoning
   *
   * Ignored for non-reasoning models.
   */
  reasoningEffort?: "low" | "medium" | "high";
};

// ── OpenAI response types (local — avoids untyped JSON) ──────────────────────

type OpenAIResponse = {
  choices: Array<{
    message: {
      content?: string | null;
      tool_calls?: Array<{
        id: string;
        type: string;
        function: { name: string; arguments: string };
      }>;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    prompt_tokens_details?: { cached_tokens?: number };
  };
};

/** SSE delta shape from OpenAI streaming */
type OpenAIStreamDelta = {
  choices: Array<{
    delta: {
      content?: string | null;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    prompt_tokens_details?: { cached_tokens?: number };
  } | null;
};

/** Returns true for o-series reasoning models that use the developer role */
function isOSeriesModel(model: string): boolean {
  return /^(o1|o3|o4)(-|$)/.test(model);
}

function buildRequestBody(
  model: string,
  maxOutputTokens: number,
  config: Pick<OpenAIModelConfig, "systemRole" | "parallelToolCalls" | "reasoningEffort">,
  params: {
    messages: ChatMessage[];
    tools?: ToolSchema[];
    temperature?: number;
    maxTokens?: number;
  },
  stream?: boolean,
): Record<string, unknown> {
  // o-series models use 'developer' instead of 'system' for the system role.
  // Auto-detect by model prefix, with manual override via config.systemRole.
  const oSeries = isOSeriesModel(model);
  const systemRole = config.systemRole ?? (oSeries ? "developer" : "system");

  const messages = params.messages.map((msg) => {
    if (msg.role === "tool") {
      return { role: "tool" as const, tool_call_id: msg.toolCallId, content: msg.content };
    }
    if (msg.role === "assistant" && msg.toolCalls?.length) {
      return {
        role: "assistant" as const,
        content: msg.content ?? null,
        tool_calls: msg.toolCalls.map((tc) => ({
          id: tc.id,
          type: "function" as const,
          function: { name: tc.name, arguments: tc.arguments },
        })),
      };
    }
    // Remap 'system' → actual role name (may be 'developer' for o-series)
    if (msg.role === "system") {
      return { role: systemRole, content: msg.content };
    }
    return { role: msg.role, content: msg.content };
  });

  const body: Record<string, unknown> = {
    model,
    messages,
    // max_completion_tokens is the current field (max_tokens is deprecated and
    // incompatible with o-series reasoning models). We send both for backward
    // compatibility with third-party OpenAI-compatible providers that haven't
    // adopted the new field yet.
    max_completion_tokens: params.maxTokens ?? maxOutputTokens,
    max_tokens: params.maxTokens ?? maxOutputTokens,
  };

  // o-series models do not support the temperature parameter
  if (!oSeries) {
    body.temperature = params.temperature ?? 0.2;
  }

  // reasoning_effort: only meaningful for o-series, silently ignored otherwise
  if (oSeries && config.reasoningEffort) {
    body.reasoning_effort = config.reasoningEffort;
  }

  if (params.tools?.length) {
    body.tools = params.tools;
    body.tool_choice = "auto";
    // parallel_tool_calls: only send when explicitly set (API default is true)
    if (config.parallelToolCalls !== undefined) {
      body.parallel_tool_calls = config.parallelToolCalls;
    }
  }

  if (stream) {
    body.stream = true;
    // Request usage in the final SSE chunk (supported by OpenAI)
    body.stream_options = { include_usage: true };
  }

  return body;
}

function parseFinishReason(reason: string | null | undefined): ChatResult["finishReason"] {
  if (reason === "tool_calls") return "tool_calls";
  if (reason === "length") return "length";
  // content_filter maps to stop — we surface it as stop since YAAF's
  // finishReason union doesn't have a dedicated content_filter value.
  // Callers that need to distinguish can inspect raw events via hooks.
  return "stop";
}

// ── Pricing table (USD per 1M tokens) ───────────────────────────────────────
// Consumed by CostTracker via PluginHost.getLLMPricing().
// Source: https://openai.com/api/pricing (update as needed)

import type { LLMPricing } from "../plugin/types.js";

const OPENAI_PRICING: Record<string, LLMPricing> = {
  "gpt-4o": { inputPerMillion: 2.5, outputPerMillion: 10.0, cacheReadPerMillion: 1.25 },
  "gpt-4o-mini": { inputPerMillion: 0.15, outputPerMillion: 0.6, cacheReadPerMillion: 0.075 },
  "gpt-4-turbo": { inputPerMillion: 10.0, outputPerMillion: 30.0 },
  "gpt-4": { inputPerMillion: 30.0, outputPerMillion: 60.0 },
  "gpt-3.5-turbo": { inputPerMillion: 0.5, outputPerMillion: 1.5 },
  o1: { inputPerMillion: 15.0, outputPerMillion: 60.0, cacheReadPerMillion: 7.5 },
  "o1-mini": { inputPerMillion: 3.0, outputPerMillion: 12.0, cacheReadPerMillion: 1.5 },
  "o3-mini": { inputPerMillion: 1.1, outputPerMillion: 4.4, cacheReadPerMillion: 0.55 },
  o3: { inputPerMillion: 10.0, outputPerMillion: 40.0, cacheReadPerMillion: 2.5 },
  "o4-mini": { inputPerMillion: 1.1, outputPerMillion: 4.4, cacheReadPerMillion: 0.275 },
};

/** Best-effort pricing inference for model variant suffixes (e.g. gpt-4o-2024-11-20). */
function inferOpenAIPricing(model: string): LLMPricing | undefined {
  for (const [prefix, pricing] of Object.entries(OPENAI_PRICING)) {
    if (model.startsWith(prefix)) return pricing;
  }
  return undefined;
}

// ── OpenAIChatModel ──────────────────────────────────────────────────────────

export class OpenAIChatModel extends BaseLLMAdapter implements StreamingChatModel {
  readonly model: string;
  readonly contextWindowTokens: number;
  readonly maxOutputTokens: number;
  readonly pricing: import("../plugin/types.js").LLMPricing | undefined;

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly extraHeaders: Record<string, string>;
  private readonly modelConfig: Pick<
    OpenAIModelConfig,
    "systemRole" | "parallelToolCalls" | "reasoningEffort"
  >;

  constructor(config: OpenAIModelConfig) {
    const model = config.model ?? "gpt-4o-mini";
    super(`openai:${model}`);
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl?.replace(/\/$/, "") ?? "https://api.openai.com/v1";
    this.model = model;
    this.timeoutMs = config.timeoutMs ?? 60_000;
    this.extraHeaders = config.headers ?? {};
    this.modelConfig = {
      systemRole: config.systemRole,
      parallelToolCalls: config.parallelToolCalls,
      reasoningEffort: config.reasoningEffort,
    };
    // Auto-resolve from registry; explicit config always wins
    const specs = resolveModelSpecs(model);
    this.contextWindowTokens = config.contextWindowTokens ?? specs.contextWindowTokens;
    this.maxOutputTokens = config.maxOutputTokens ?? specs.maxOutputTokens;
    // Pricing by model prefix — consumed by CostTracker via PluginHost.getLLMPricing()
    this.pricing = OPENAI_PRICING[model] ?? inferOpenAIPricing(model);
  }

  // ── Shared fetch ──────────────────────────────────────────────────────────

  private async doFetch(body: Record<string, unknown>, signal?: AbortSignal): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    signal?.addEventListener("abort", () => controller.abort());

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          ...this.extraHeaders,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new AbortError("Request was aborted");
      }
      throw new APIConnectionError(
        `Failed to connect to ${this.baseUrl}: ${err instanceof Error ? err.message : String(err)}`,
        { provider: "openai", cause: err instanceof Error ? err : undefined },
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "Unknown error");
      throw classifyAPIError(response.status, text, "openai", response.headers);
    }

    return response;
  }

  // ── complete() (batch) ────────────────────────────────────────────────────

  async complete(params: {
    messages: ChatMessage[];
    tools?: ToolSchema[];
    temperature?: number;
    maxTokens?: number;
    signal?: AbortSignal;
  }): Promise<ChatResult> {
    const body = buildRequestBody(this.model, this.maxOutputTokens, this.modelConfig, params);
    const response = await this.doFetch(body, params.signal);
    const data = (await response.json()) as OpenAIResponse;
    const choice = data.choices[0]!;

    const result: ChatResult = {
      content: choice.message.content ?? undefined,
      finishReason: parseFinishReason(choice.finish_reason),
    };

    if (choice.message.tool_calls?.length) {
      result.toolCalls = choice.message.tool_calls.map((tc) => {
        // Validate that tool-call arguments are parseable JSON.
        // Third-party providers (Ollama, vLLM, Fireworks) occasionally return
        // truncated JSON or plain text in function.arguments. Passing invalid
        // JSON downstream causes the runner to crash at call-time. We normalise
        // invalid arguments to '{}' and log a warning so the turn degrades
        // gracefully instead of aborting.
        let safeArguments = tc.function.arguments;
        if (safeArguments) {
          try {
            JSON.parse(safeArguments); // validate only; keep original string
          } catch {
            console.warn(
              `[yaaf/openai] Tool call "${tc.function.name}" returned invalid JSON arguments: ` +
                `${String(safeArguments).slice(0, 200)}. Replacing with '{}'.`,
            );
            safeArguments = "{}";
          }
        } else {
          safeArguments = "{}";
        }
        return {
          id: tc.id,
          name: tc.function.name,
          arguments: safeArguments,
        };
      });
      result.finishReason = "tool_calls";
    }

    if (data.usage) {
      result.usage = {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        // Capture prompt cache read tokens (available when context caching is active)
        cacheReadTokens: data.usage.prompt_tokens_details?.cached_tokens,
      };
    }

    return result;
  }

  // ── stream() (SSE) ────────────────────────────────────────────────────────

  async *stream(params: {
    messages: ChatMessage[];
    tools?: ToolSchema[];
    temperature?: number;
    maxTokens?: number;
    signal?: AbortSignal;
  }): AsyncGenerator<ChatDelta, void, undefined> {
    const body = buildRequestBody(this.model, this.maxOutputTokens, this.modelConfig, params, true);
    const response = await this.doFetch(body, params.signal);

    const reader = response.body?.getReader();
    if (!reader) throw new Error("Response body is not readable");

    const decoder = new TextDecoder();
    let buffer = "";
    /** Cap the SSE buffer to prevent OOM on malformed server responses */
    const MAX_SSE_BUFFER_BYTES = 8 * 1024 * 1024; // 8 MB

    try {
      while (true) {
        // Check abort at the top of every iteration.
        // The AbortSignal is passed to doFetch() so the network request is
        // cancelled, but we also guard here in case the provider ignores the
        // signal and keeps sending data.
        if (params.signal?.aborted) break;

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Abort if the buffer exceeds the size cap.
        if (buffer.length > MAX_SSE_BUFFER_BYTES) {
          throw new Error(
            `[yaaf/openai] SSE buffer exceeded ${MAX_SSE_BUFFER_BYTES} bytes without a complete event. ` +
              "The server may be sending an abnormally large response or not flushing newlines.",
          );
        }

        // Parse SSE events line-by-line
        const lines = buffer.split("\n");
        buffer = lines.pop()!; // keep incomplete last line

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(":")) continue;
          if (trimmed === "data: [DONE]") return;

          if (trimmed.startsWith("data: ")) {
            const json = trimmed.slice(6);
            let chunk: OpenAIStreamDelta;
            try {
              chunk = JSON.parse(json) as OpenAIStreamDelta;
            } catch {
              continue; // malformed chunk, skip
            }

            const choice = chunk.choices?.[0];
            if (!choice) {
              // Usage-only final chunk (no choices)
              if (chunk.usage) {
                yield {
                  usage: {
                    promptTokens: chunk.usage.prompt_tokens,
                    completionTokens: chunk.usage.completion_tokens,
                  },
                };
              }
              continue;
            }

            const delta: ChatDelta = {};

            if (choice.delta.content) {
              delta.content = choice.delta.content;
            }

            if (choice.finish_reason) {
              delta.finishReason = parseFinishReason(choice.finish_reason);
            }

            // Some providers send usage in the final delta
            if (chunk.usage) {
              delta.usage = {
                promptTokens: chunk.usage.prompt_tokens,
                completionTokens: chunk.usage.completion_tokens,
                cacheReadTokens: chunk.usage.prompt_tokens_details?.cached_tokens,
              };
            }

            if (choice.delta.tool_calls?.length) {
              // Process ALL tool calls in this delta — not just [0].
              // OpenAI usually sends one per chunk, but third-party providers
              // (vLLM, Ollama, etc.) may batch multiple in a single delta.
              for (let tci = 0; tci < choice.delta.tool_calls.length; tci++) {
                const tc = choice.delta.tool_calls[tci]!;
                if (tci === 0) {
                  // First tool call: attach to the main delta (which may also carry content/usage)
                  delta.toolCallDelta = {
                    index: tc.index,
                    id: tc.id,
                    name: tc.function?.name,
                    arguments: tc.function?.arguments,
                  };
                } else {
                  // Additional tool calls: yield as separate deltas
                  yield {
                    toolCallDelta: {
                      index: tc.index,
                      id: tc.id,
                      name: tc.function?.name,
                      arguments: tc.function?.arguments,
                    },
                  };
                }
              }
            }

            yield delta;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
