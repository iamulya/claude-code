/**
 * Model resolver — constructs a ChatModel from AgentConfig provider settings.
 *
 * ## Unified environment variable strategy
 *
 * ### Universal vars (work with any provider)
 *
 * LLM_MODEL=<name> The model name to use
 * LLM_API_KEY=<key> API key (for OpenAI-compatible providers via LLM_BASE_URL)
 * LLM_BASE_URL=<url> Base URL — activates OpenAI-compatible mode for any provider:
 * Ollama: http://localhost:11434/v1
 * GLM: https://open.bigmodel.cn/api/paas/v4
 * DeepSeek: https://api.deepseek.com/v1
 * Groq: https://api.groq.com/openai/v1
 * Qwen: https://dashscope.aliyuncs.com/compatible-mode/v1
 *
 * ### Provider API keys (auto-detect provider when LLM_BASE_URL is not set)
 *
 * GEMINI_API_KEY=<key> → Google Gemini (native SDK)
 * ANTHROPIC_API_KEY=<key> → Anthropic Claude (native SDK)
 * OPENAI_API_KEY=<key> → OpenAI (or set LLM_BASE_URL for a compatible provider)
 *
 * ### Resolution priority
 *
 * 1. config.chatModel — pre-built model, used directly
 * 2. pluginHost adapter — LLM plugin registered with PluginHost
 * 3. LLM_BASE_URL is set → OpenAI-compatible (LLM_MODEL + LLM_API_KEY)
 * 4. GEMINI_API_KEY → GeminiChatModel (LLM_MODEL overrides default)
 * 5. ANTHROPIC_API_KEY → AnthropicChatModel (LLM_MODEL overrides default)
 * 6. OPENAI_API_KEY → OpenAIChatModel (LLM_MODEL overrides default)
 * 7. Error — lists all four options clearly
 *
 * ### Backward compatibility
 *
 * OPENAI_BASE_URL → alias for LLM_BASE_URL
 * OPENAI_MODEL → alias for LLM_MODEL (OpenAI path only)
 * YAAF_AGENT_MODEL → alias for LLM_MODEL (agent entrypoint)
 * config.provider + config.model still work as before
 */

import { OpenAIChatModel, type OpenAIModelConfig } from "./openai.js";
import { GeminiChatModel, type GeminiModelConfig } from "./gemini.js";
import { AnthropicChatModel, type AnthropicModelConfig } from "./anthropic.js";
import type { ChatModel } from "../agents/runner.js";
import type { PluginHost } from "../plugin/types.js";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Provider identifiers supported by the built-in resolver. */
export type ModelProvider = "openai" | "gemini" | "anthropic" | "ollama" | "groq";

/** Subset of AgentConfig fields the resolver needs. */
export type ResolverConfig = {
  chatModel?: ChatModel;
  provider?: ModelProvider | string;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  project?: string;
  location?: string;
  temperature?: number;
  maxTokens?: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Read the universal LLM_MODEL env var, falling back to provider-specific
 * aliases for backward compatibility.
 */
function resolveModelName(configModel: string | undefined, defaultModel: string): string {
  return (
    configModel ??
    process.env.LLM_MODEL ??
    process.env.YAAF_AGENT_MODEL ?? // yaaf-agent backward compat
    process.env.OPENAI_MODEL ?? // OpenAI backward compat
    defaultModel
  );
}

/**
 * Read the base URL, unified across LLM_BASE_URL and OPENAI_BASE_URL aliases.
 */
function resolveBaseUrl(configBaseUrl?: string): string | undefined {
  return configBaseUrl ?? process.env.LLM_BASE_URL ?? process.env.OPENAI_BASE_URL;
}

/**
 * Read the API key, unified across LLM_API_KEY and the provider-specific keys.
 * when `required` is true, throws if no key is found instead of
 * returning an empty string that would cause a confusing 401 at call time.
 */
function resolveApiKey(configApiKey?: string, providerEnvKey?: string, required = false): string {
  const key = configApiKey ?? process.env.LLM_API_KEY ?? providerEnvKey ?? "";
  if (required && !key) {
    throw new Error(
      "YAAF: No API key configured.\n" +
        "Set one of: LLM_API_KEY, GEMINI_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY\n" +
        'Or pass apiKey in the agent config: new Agent({ apiKey: "..." })',
    );
  }
  return key;
}

// ── Main resolver ─────────────────────────────────────────────────────────────

/**
 * Resolve a ChatModel from configuration.
 *
 * See module-level JSDoc for the full resolution priority and env var guide.
 *
 * @throws if no provider can be determined
 */
export function resolveModel(config: ResolverConfig, pluginHost?: PluginHost): ChatModel {
  // 1. Pre-built model — pass through directly
  if (config.chatModel) return config.chatModel;

  // 2. LLM plugin registered with PluginHost
  if (pluginHost) {
    const llmAdapter = pluginHost.getLLMAdapter();
    if (llmAdapter) return llmAdapter;
  }

  const baseUrl = resolveBaseUrl(config.baseUrl);

  // 3. Explicit provider override in config (backward compat: new Agent({ provider: 'gemini' }))
  if (config.provider) {
    return buildFromProvider(config.provider, { config, baseUrl });
  }

  // 4. LLM_BASE_URL → OpenAI-compatible (Ollama, GLM, DeepSeek, Groq, Qwen, …)
  if (baseUrl) {
    return new OpenAIChatModel({
      apiKey: resolveApiKey(config.apiKey),
      model: resolveModelName(config.model, "default"),
      baseUrl,
      maxOutputTokens: config.maxTokens,
    });
  }

  // 5–7. Auto-detect from provider API keys
  if (process.env.GEMINI_API_KEY) {
    return new GeminiChatModel(geminiConfig(config));
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return new AnthropicChatModel(anthropicConfig(config));
  }
  if (process.env.OPENAI_API_KEY) {
    return new OpenAIChatModel(openaiConfig(config, baseUrl));
  }

  throw new Error(
    [
      "YAAF: No LLM provider configured.",
      "",
      "Option A — OpenAI-compatible (Ollama, Qwen, GLM, DeepSeek, Groq, …):",
      " LLM_BASE_URL=http://localhost:11434/v1 LLM_MODEL=qwen2.5:72b",
      " LLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4 LLM_API_KEY=... LLM_MODEL=glm-4",
      "",
      "Option B — Hosted providers:",
      " GEMINI_API_KEY=... (Google Gemini)",
      " ANTHROPIC_API_KEY=... (Anthropic Claude)",
      " OPENAI_API_KEY=... (OpenAI)",
      "",
      "Override model name with: LLM_MODEL=<name>",
      "",
      "Or pass chatModel directly: new Agent({ chatModel: new GeminiChatModel(...) })",
    ].join("\n"),
  );
}

// ── Provider allowlist ────────────────────────────────────────────────────────

const KNOWN_PROVIDERS = new Set([
  "gemini",
  "anthropic",
  "openai",
  "ollama",
  "groq",
  "together",
  "fireworks",
  "perplexity",
  "mock",
  "test",
]);

function buildFromProvider(
  provider: string,
  ctx: { config: ResolverConfig; baseUrl?: string },
): ChatModel {
  const { config, baseUrl } = ctx;

  // Validate provider string against an explicit allowlist.
  // Previously any unknown provider silently fell through to OpenAI, which
  // could: (a) surprise users who made a typo, (b) allow a multi-tenant attacker
  // to force a more expensive provider by supplying an arbitrary string.
  if (!KNOWN_PROVIDERS.has(provider.toLowerCase())) {
    throw new Error(
      `YAAF: Unknown provider "${provider}". ` +
        `Valid values are: ${[...KNOWN_PROVIDERS].join(", ")}. ` +
        'For OpenAI-compatible providers, use provider: "openai" with baseUrl set.',
    );
  }

  if (provider === "gemini") return new GeminiChatModel(geminiConfig(config));
  if (provider === "anthropic") return new AnthropicChatModel(anthropicConfig(config));

  // 'openai' + all OpenAI-compatible named providers (groq, ollama, together, …)
  return new OpenAIChatModel(openaiConfig(config, baseUrl));
}

function geminiConfig(config: ResolverConfig): GeminiModelConfig {
  const model = resolveModelName(config.model, "gemini-2.5-flash");
  if (config.project) {
    return {
      vertexAI: true,
      project: config.project,
      location: config.location,
      model,
      temperature: config.temperature,
      maxOutputTokens: config.maxTokens,
    };
  }
  return {
    apiKey: resolveApiKey(config.apiKey, process.env.GEMINI_API_KEY, true),
    model,
    temperature: config.temperature,
    maxOutputTokens: config.maxTokens,
  };
}

function anthropicConfig(config: ResolverConfig): AnthropicModelConfig {
  return {
    apiKey: resolveApiKey(config.apiKey, process.env.ANTHROPIC_API_KEY, true),
    model: resolveModelName(config.model, "claude-sonnet-4"),
    maxOutputTokens: config.maxTokens,
  };
}

function openaiConfig(config: ResolverConfig, baseUrl?: string): OpenAIModelConfig {
  const resolvedBaseUrl = baseUrl ?? resolveBaseUrl();
  return {
    apiKey: resolveApiKey(config.apiKey, process.env.OPENAI_API_KEY), // Not required: local/Ollama endpoints may not need keys
    model: resolveModelName(config.model, "gpt-4o"),
    baseUrl: resolvedBaseUrl,
    maxOutputTokens: config.maxTokens,
  };
}
