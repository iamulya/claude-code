/**
 * Google Gemini ChatModel + LLMAdapter + Streaming
 *
 * Uses the official `@google/genai` SDK. Install it separately:
 * npm install @google/genai
 *
 * Supports both Google AI Studio (apiKey) and Vertex AI (project + location).
 * Extends `BaseLLMAdapter` — implements `complete()`, `stream()`, and the
 * message translation layer.
 *
 * @example
 * ```ts
 * // Google AI Studio
 * const model = new GeminiChatModel({ apiKey: process.env.GEMINI_API_KEY! });
 *
 * // Streaming
 * for await (const delta of model.stream({ messages })) {
 * process.stdout.write(delta.content ?? '');
 * }
 *
 * // Vertex AI
 * const model = new GeminiChatModel({
 * vertexAI: true,
 * project: process.env.GOOGLE_CLOUD_PROJECT!,
 * location: 'us-central1',
 * model: 'gemini-1.5-pro',
 * });
 *
 * // Plugin registration
 * await host.register(new GeminiChatModel({ apiKey: '...' }));
 * const model = host.getLLMAdapter()!;
 * ```
 *
 * Peer dependency: `@google/genai` >= 0.7.0
 */

import type {
  ChatMessage,
  ChatResult,
  ChatDelta,
  ToolSchema,
  StreamingChatModel,
} from "../agents/runner.js";
import { BaseLLMAdapter } from "./base.js";
import { YAAFError } from "../errors.js";
import { resolveModelSpecs } from "./specs.js";
import * as crypto from "crypto";

// ── Config ───────────────────────────────────────────────────────────────────

export type GeminiModelConfig =
  | {
      apiKey: string;
      vertexAI?: false;
      model?: string;
      temperature?: number;
      maxOutputTokens?: number;
      contextWindowTokens?: number;
      /**
       * Thinking budget for thinking-capable models (e.g. Gemini 2.5 Pro).
       * When tools are present:
       * - `undefined` (default): Disables thinking (thinkingBudget: 0) for SDK compatibility
       * - `0`: Explicitly disable thinking
       * - `N > 0`: Allow up to N tokens of thinking chain
       *
       * Set this to a positive value to enable reasoning with tool-calling models.
       */
      thinkingBudget?: number;
    }
  | {
      vertexAI: true;
      project: string;
      location?: string;
      model?: string;
      temperature?: number;
      maxOutputTokens?: number;
      contextWindowTokens?: number;
      /** @see GeminiModelConfig.thinkingBudget */
      thinkingBudget?: number;
    };

// ── Local Gemini types (avoids peer-dep import at module level) ───────────────

type GeminiContent = { role: string; parts: GeminiPart[] };

type GeminiPart =
  | { text: string; thoughtSignature?: never }
  | {
      functionCall: { id?: string; name: string; args: Record<string, unknown> };
      thoughtSignature?: string;
    }
  | {
      functionResponse: { id?: string; name: string; response: { output: unknown } };
      thoughtSignature?: never;
    };

type GeminiFunctionDeclaration = {
  name: string;
  description: string;
  parametersJsonSchema: Record<string, unknown>;
};

type GeminiCandidate = {
  content?: { parts: Array<Record<string, unknown>> };
  finishReason?: string;
};

type GeminiResponse = {
  candidates?: GeminiCandidate[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    cachedContentTokenCount?: number;
  };
};

type GenAIClient = {
  models: {
    generateContent(params: {
      model: string;
      contents: GeminiContent[];
      config: Record<string, unknown>;
    }): Promise<GeminiResponse>;
    generateContentStream(params: {
      model: string;
      contents: GeminiContent[];
      config: Record<string, unknown>;
    }): AsyncIterable<GeminiResponse>;
  };
};

// ── Message translation ───────────────────────────────────────────────────────

// thoughtSignatureMap is now per-instance;
// toGeminiContents accepts it as a parameter.
function toGeminiContents(
  messages: ChatMessage[],
  thoughtSignatureMap: BoundedSignatureCache,
): {
  contents: GeminiContent[];
  systemInstruction: string | undefined;
} {
  const systemParts: string[] = [];
  const contents: GeminiContent[] = [];
  let pendingToolResults: GeminiPart[] = [];

  const flushToolResults = () => {
    if (pendingToolResults.length > 0) {
      contents.push({ role: "user", parts: pendingToolResults });
      pendingToolResults = [];
    }
  };

  for (const msg of messages) {
    if (msg.role === "system") {
      systemParts.push(msg.content);
      continue;
    }

    if (msg.role === "tool") {
      let response: unknown;
      try {
        response = JSON.parse(msg.content);
      } catch {
        response = msg.content;
      }
      pendingToolResults.push({
        functionResponse: {
          id: msg.toolCallId,
          name: msg.name,
          response: { output: response },
        },
      });
      continue;
    }

    flushToolResults();

    if (msg.role === "user") {
      contents.push({ role: "user", parts: [{ text: msg.content }] });
      continue;
    }

    if (msg.role === "assistant") {
      const parts: GeminiPart[] = [];
      if (msg.content) parts.push({ text: msg.content });
      if (msg.toolCalls?.length) {
        for (const tc of msg.toolCalls) {
          let args: Record<string, unknown>;
          try {
            args = JSON.parse(tc.arguments);
          } catch {
            args = {};
          }
          // Read from instance map (passed as parameter)
          const thoughtSignature = thoughtSignatureMap.get(tc.id);
          if (thoughtSignature) thoughtSignatureMap.delete(tc.id);
          const part: GeminiPart = thoughtSignature
            ? { functionCall: { id: tc.id, name: tc.name, args }, thoughtSignature }
            : { functionCall: { id: tc.id, name: tc.name, args } };
          parts.push(part);
        }
      }
      if (parts.length > 0) contents.push({ role: "model", parts });
    }
  }
  flushToolResults();

  return {
    contents,
    systemInstruction: systemParts.length > 0 ? systemParts.join("\n\n") : undefined,
  };
}

function toGeminiFunctions(tools: ToolSchema[]): GeminiFunctionDeclaration[] {
  return tools.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    parametersJsonSchema: t.function.parameters,
  }));
}

/** Build the shared config object for both batch and streaming calls */
function buildGeminiConfig(
  config: GeminiModelConfig,
  maxOutputTokens: number,
  params: {
    tools?: ToolSchema[];
    temperature?: number;
    maxTokens?: number;
    signal?: AbortSignal;
    systemInstruction?: string;
  },
): Record<string, unknown> {
  const genConfig: Record<string, unknown> = {
    temperature: params.temperature ?? config.temperature ?? 0.2,
    maxOutputTokens: params.maxTokens ?? maxOutputTokens,
    abortSignal: params.signal,
  };

  if (params.systemInstruction) genConfig.systemInstruction = params.systemInstruction;

  if (params.tools?.length) {
    genConfig.tools = [{ functionDeclarations: toGeminiFunctions(params.tools) }];
    genConfig.toolConfig = { functionCallingConfig: { mode: "AUTO" } };
    // Thinking budget is now configurable instead of hardcoded to 0.
    // Default behavior: disable thinking for backward compat (thinkingBudget: 0).
    // Users can set config.thinkingBudget to a positive value to enable reasoning.
    const thinkingBudget = config.thinkingBudget ?? 0;
    genConfig.thinkingConfig = { thinkingBudget };
  }

  return genConfig;
}

/** Parse a Gemini candidate into a ChatResult */
function parseCandidate(
  candidate: GeminiCandidate | undefined,
  usageMetadata: GeminiResponse["usageMetadata"],
  thoughtSignatureMap: BoundedSignatureCache,
): ChatResult {
  if (!candidate) return { content: "", finishReason: "stop" };

  const parts = candidate.content?.parts ?? [];
  const textParts: string[] = [];
  const toolCalls: ChatResult["toolCalls"] = [];

  for (const part of parts) {
    if (typeof part.text === "string") textParts.push(part.text);

    const fc = part.functionCall as Record<string, unknown> | undefined;
    if (fc) {
      // Use a collision-safe internal key for thought signature round-trip.
      const args: Record<string, unknown> = (fc.args as Record<string, unknown>) ?? {};
      const thoughtSignature = part.thoughtSignature as string | undefined;

      const callId = (fc.id as string | undefined) ?? `call_${crypto.randomUUID()}`;

      // Use per-instance map (passed as parameter)
      if (thoughtSignature) thoughtSignatureMap.set(callId, thoughtSignature);

      toolCalls.push({
        id: callId,
        name: (fc.name as string) ?? "",
        arguments: JSON.stringify(args),
      });
    }
  }

  const finishReason: ChatResult["finishReason"] =
    toolCalls.length > 0
      ? "tool_calls"
      : candidate.finishReason === "MAX_TOKENS"
        ? "length"
        : "stop";

  const result: ChatResult = {
    content: textParts.join("") || undefined,
    finishReason,
  };

  if (toolCalls.length > 0) result.toolCalls = toolCalls;

  if (usageMetadata) {
    result.usage = {
      promptTokens: usageMetadata.promptTokenCount ?? 0,
      completionTokens: usageMetadata.candidatesTokenCount ?? 0,
      cacheReadTokens: usageMetadata.cachedContentTokenCount,
    };
  }

  return result;
}

import type { LLMPricing } from "../plugin/types.js";

const GEMINI_PRICING: Record<string, LLMPricing> = {
  "gemini-3-flash": { inputPerMillion: 0.1, outputPerMillion: 0.4, cacheReadPerMillion: 0.025 },
  "gemini-3-flash-preview": {
    inputPerMillion: 0.1,
    outputPerMillion: 0.4,
    cacheReadPerMillion: 0.025,
  },
  "gemini-2.5-pro": { inputPerMillion: 1.25, outputPerMillion: 10.0, cacheReadPerMillion: 0.31 },
  "gemini-2.5-flash": { inputPerMillion: 0.15, outputPerMillion: 0.6, cacheReadPerMillion: 0.0375 },
  "gemini-2.0-flash": { inputPerMillion: 0.1, outputPerMillion: 0.4, cacheReadPerMillion: 0.025 },
  "gemini-2.0-flash-lite": { inputPerMillion: 0.075, outputPerMillion: 0.3 },
  "gemini-1.5-pro": { inputPerMillion: 1.25, outputPerMillion: 5.0, cacheReadPerMillion: 0.3125 },
  "gemini-1.5-flash": {
    inputPerMillion: 0.075,
    outputPerMillion: 0.3,
    cacheReadPerMillion: 0.01875,
  },
};

function inferGeminiPricing(model: string): LLMPricing | undefined {
  for (const [prefix, pricing] of Object.entries(GEMINI_PRICING)) {
    if (model.startsWith(prefix)) return pricing;
  }
  return undefined;
}

/**
 * Bounded cache for thought signature round-trip.
 * Stores thought signatures by tool call ID, avoiding pollution of
 * tool arguments, telemetry, session files, and audit logs.
 * Entries are cleaned up in toGeminiContents after use.
 *
 * Bounded to prevent unbounded memory growth in long-running server
 * deployments. Uses LRU eviction when capacity is reached. Entries
 * older than TTL_MS are lazily pruned on access.
 */
class BoundedSignatureCache {
  private readonly map = new Map<string, { value: string; ts: number }>();
  private static readonly MAX_SIZE = 10_000;
  /** Entries older than 10 minutes are considered stale (tool call round-trip) */
  private static readonly TTL_MS = 10 * 60_000;
  private lastPruneTs = Date.now();

  get(key: string): string | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.ts > BoundedSignatureCache.TTL_MS) {
      this.map.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: string): void {
    // Periodic prune: every 60s, remove expired entries
    if (Date.now() - this.lastPruneTs > 60_000) {
      this.prune();
    }
    // Evict oldest 20% when at capacity
    if (this.map.size >= BoundedSignatureCache.MAX_SIZE) {
      const evictCount = Math.floor(BoundedSignatureCache.MAX_SIZE * 0.2);
      let i = 0;
      for (const k of this.map.keys()) {
        if (i++ >= evictCount) break;
        this.map.delete(k);
      }
    }
    this.map.set(key, { value, ts: Date.now() });
  }

  delete(key: string): boolean {
    return this.map.delete(key);
  }

  private prune(): void {
    const now = Date.now();
    this.lastPruneTs = now;
    for (const [k, entry] of this.map) {
      if (now - entry.ts > BoundedSignatureCache.TTL_MS) {
        this.map.delete(k);
      }
    }
  }
}

// (thoughtSignatureMap was previously module-level — G-1 FIX moved it to instance scope)

// ── GeminiChatModel ──────────────────────────────────────────────────────────

export class GeminiChatModel extends BaseLLMAdapter implements StreamingChatModel {
  readonly model: string;
  readonly contextWindowTokens: number;
  readonly maxOutputTokens: number;
  readonly pricing: LLMPricing | undefined;

  private client: GenAIClient | null = null;
  /** Promise gate to prevent duplicate client creation from concurrent calls */
  private _clientInitPromise: Promise<GenAIClient> | null = null;
  private readonly config: GeminiModelConfig;
  /**
   * Per-instance thought signature cache (was module-level).
   * Moving to instance scope prevents cross-instance contamination when multiple
   * GeminiChatModel instances (different API keys/projects) exist in the same process.
   */
  private readonly _thoughtSignatureMap = new BoundedSignatureCache();

  constructor(config: GeminiModelConfig) {
    const model = config.model ?? "gemini-3-flash-preview";
    super(`gemini:${model}`);
    this.config = config;
    this.model = model;
    // Auto-resolve from registry; explicit config always wins
    const specs = resolveModelSpecs(model);
    this.contextWindowTokens = config.contextWindowTokens ?? specs.contextWindowTokens;
    this.maxOutputTokens = config.maxOutputTokens ?? specs.maxOutputTokens;
    this.pricing = GEMINI_PRICING[model] ?? inferGeminiPricing(model);
  }

  // ── Client initialization ─────────────────────────────────────────────────

  // Use a promise gate to prevent duplicate client creation
  // when concurrent complete()/stream() calls hit getClient() simultaneously.
  private async getClient(): Promise<GenAIClient> {
    if (this.client) return this.client;
    if (this._clientInitPromise) return this._clientInitPromise;

    this._clientInitPromise = this._createClient();
    try {
      return await this._clientInitPromise;
    } catch (err) {
      this._clientInitPromise = null; // Allow retry on failure
      throw err;
    }
  }

  private async _createClient(): Promise<GenAIClient> {
    let pkg: { GoogleGenAI: new (opts: Record<string, unknown>) => GenAIClient };
    try {
      // @ts-expect-error — optional peer dependency, may not be installed
      pkg = (await import("@google/genai")) as typeof pkg;
    } catch {
      throw new YAAFError(
        "Missing peer dependency: npm install @google/genai\n" +
          "GeminiChatModel requires @google/genai to be installed.",
        { code: "API_ERROR", retryable: false, provider: "gemini" },
      );
    }

    const opts: Record<string, unknown> =
      "vertexAI" in this.config && this.config.vertexAI
        ? {
            vertexai: true,
            project: this.config.project,
            location: this.config.location ?? "us-central1",
          }
        : { apiKey: (this.config as { apiKey: string }).apiKey };

    // Create client in a local variable first, only assign to this.client
    // after full successful construction. Previously this.client was set before return,
    // which could leave a partially-initialized instance on the fast-path if the
    // constructor threw after assignment.
    const newClient = new pkg.GoogleGenAI(opts);
    this.client = newClient;
    return newClient;
  }

  // ── complete() (batch) ────────────────────────────────────────────────────

  async complete(params: {
    messages: ChatMessage[];
    tools?: ToolSchema[];
    temperature?: number;
    maxTokens?: number;
    signal?: AbortSignal;
  }): Promise<ChatResult> {
    const client = await this.getClient();
    const { contents, systemInstruction } = toGeminiContents(
      params.messages,
      this._thoughtSignatureMap,
    );
    const genConfig = buildGeminiConfig(this.config, this.maxOutputTokens, {
      ...params,
      systemInstruction,
    });

    const response = await client.models.generateContent({
      model: this.model,
      contents,
      config: genConfig,
    });

    return parseCandidate(
      response.candidates?.[0],
      response.usageMetadata,
      this._thoughtSignatureMap,
    );
  }

  // ── stream() (SSE) ────────────────────────────────────────────────────────

  async *stream(params: {
    messages: ChatMessage[];
    tools?: ToolSchema[];
    temperature?: number;
    maxTokens?: number;
    signal?: AbortSignal;
  }): AsyncGenerator<ChatDelta, void, undefined> {
    const client = await this.getClient();
    const { contents, systemInstruction } = toGeminiContents(
      params.messages,
      this._thoughtSignatureMap,
    );
    const genConfig = buildGeminiConfig(this.config, this.maxOutputTokens, {
      ...params,
      systemInstruction,
    });

    const stream = await client.models.generateContentStream({
      model: this.model,
      contents,
      config: genConfig,
    });

    // Per-stream function call index counter.
    // Gemini delivers each parallel FC in its own chunk, and each must get a
    // unique index so the runner's assembledToolCalls map can track them separately.
    let fcIndex = 0;

    for await (const chunk of stream) {
      // Check abort at each iteration. The AbortSignal is passed
      // into genConfig.abortSignal (consumed by the SDK), but older SDK versions
      // or certain network conditions may not honour it. Checking here ensures
      // we stop emitting deltas as soon as the caller cancels.
      if (params.signal?.aborted) break;

      const candidate = chunk.candidates?.[0];
      if (!candidate?.content?.parts) continue;

      // Text content and finish reason are accumulated into a single delta.
      // Function calls are yielded as individual deltas (one per FC part) so
      // the runner can track them by index.
      let baseHasContent = false;
      const baseDelta: ChatDelta = {};

      // Finish reason
      if (candidate.finishReason) {
        const toolCalled = candidate.content.parts.some(
          (p) => (p as Record<string, unknown>).functionCall !== undefined,
        );
        baseDelta.finishReason = toolCalled
          ? "tool_calls"
          : candidate.finishReason === "MAX_TOKENS"
            ? "length"
            : "stop";
        baseHasContent = true;
      }

      // Usage (may be on the final chunk)
      if (chunk.usageMetadata) {
        baseDelta.usage = {
          promptTokens: chunk.usageMetadata.promptTokenCount ?? 0,
          completionTokens: chunk.usageMetadata.candidatesTokenCount ?? 0,
          cacheReadTokens: chunk.usageMetadata.cachedContentTokenCount,
        };
        baseHasContent = true;
      }

      for (const part of candidate.content.parts) {
        // Text delta — fold into baseDelta
        if (typeof part.text === "string" && part.text.length > 0) {
          baseDelta.content = (baseDelta.content ?? "") + part.text;
          baseHasContent = true;
        }

        // Function call delta — yield one delta per FC part with a unique index.
        // thoughtSignature is a Part-level sibling and only appears on the first
        // FC part in a parallel group (per Gemini 3 API spec).
        const fc = part.functionCall as Record<string, unknown> | undefined;
        if (fc) {
          const args: Record<string, unknown> = (fc.args as Record<string, unknown>) ?? {};
          const sig = part.thoughtSignature as string | undefined;

          const streamCallId = (fc.id as string | undefined) ?? `call_${crypto.randomUUID()}`;
          // Use per-instance map instead of module-level thoughtSignatureMap
          if (sig) this._thoughtSignatureMap.set(streamCallId, sig);

          yield {
            toolCallDelta: {
              index: fcIndex++,
              id: streamCallId,
              name: fc.name as string,
              arguments: JSON.stringify(args),
            },
          };
        }
      }

      if (baseHasContent) yield baseDelta;
    }
  }
}
