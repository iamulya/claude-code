/**
 * Model Specs Registry
 *
 * Maps well-known model names to their LLM-specific context limits.
 * Used to auto-configure ContextManager and AgentRunner defaults without
 * the user needing to manually specify them.
 *
 * Sources:
 * - OpenAI: https://platform.openai.com/docs/models
 * - Gemini: https://ai.google.dev/gemini-api/docs/models
 * - Anthropic: https://docs.anthropic.com/en/docs/about-claude/models
 * - Groq: https://console.groq.com/docs/models
 * - Meta: https://llama.meta.com/
 */

export type ModelSpecs = {
  /** Total context window in tokens (input + output) */
  contextWindowTokens: number;
  /** Maximum output tokens the model can generate per call */
  maxOutputTokens: number;
};

/**
 * Registry of known model specs keyed by model name.
 * Partial names are matched via `resolveModelSpecs()`.
 */
const MODEL_SPECS: Record<string, ModelSpecs> = {
  // ── OpenAI ─────────────────────────────────────────────────────────────────

  // GPT-4o family
  "gpt-4o": { contextWindowTokens: 128_000, maxOutputTokens: 16_384 },
  "gpt-4o-mini": { contextWindowTokens: 128_000, maxOutputTokens: 16_384 },
  "gpt-4o-2024-11-20": { contextWindowTokens: 128_000, maxOutputTokens: 16_384 },
  "gpt-4o-2024-08-06": { contextWindowTokens: 128_000, maxOutputTokens: 16_384 },
  "gpt-4o-mini-2024-07-18": { contextWindowTokens: 128_000, maxOutputTokens: 16_384 },

  // GPT-4 Turbo
  "gpt-4-turbo": { contextWindowTokens: 128_000, maxOutputTokens: 4_096 },
  "gpt-4-turbo-preview": { contextWindowTokens: 128_000, maxOutputTokens: 4_096 },
  "gpt-4-1106-preview": { contextWindowTokens: 128_000, maxOutputTokens: 4_096 },

  // GPT-4 Classic
  "gpt-4": { contextWindowTokens: 8_192, maxOutputTokens: 4_096 },
  "gpt-4-32k": { contextWindowTokens: 32_768, maxOutputTokens: 4_096 },

  // GPT-3.5
  "gpt-3.5-turbo": { contextWindowTokens: 16_385, maxOutputTokens: 4_096 },

  // o-series reasoning
  o1: { contextWindowTokens: 200_000, maxOutputTokens: 100_000 },
  "o1-mini": { contextWindowTokens: 128_000, maxOutputTokens: 65_536 },
  "o3-mini": { contextWindowTokens: 200_000, maxOutputTokens: 100_000 },
  o3: { contextWindowTokens: 200_000, maxOutputTokens: 100_000 },

  // ── Google Gemini ───────────────────────────────────────────────────────────

  "gemini-3-flash-preview": { contextWindowTokens: 1_048_576, maxOutputTokens: 65_536 },
  "gemini-2.5-pro": { contextWindowTokens: 1_048_576, maxOutputTokens: 65_536 },
  "gemini-2.5-flash": { contextWindowTokens: 1_048_576, maxOutputTokens: 65_536 },
  "gemini-2.5-flash-preview-04-17": { contextWindowTokens: 1_048_576, maxOutputTokens: 65_536 },
  "gemini-2.0-flash": { contextWindowTokens: 1_048_576, maxOutputTokens: 8_192 },
  "gemini-2.0-flash-lite": { contextWindowTokens: 1_048_576, maxOutputTokens: 8_192 },
  "gemini-2.0-pro": { contextWindowTokens: 2_097_152, maxOutputTokens: 8_192 },
  "gemini-1.5-pro": { contextWindowTokens: 2_097_152, maxOutputTokens: 8_192 },
  "gemini-1.5-flash": { contextWindowTokens: 1_048_576, maxOutputTokens: 8_192 },
  "gemini-1.5-flash-8b": { contextWindowTokens: 1_048_576, maxOutputTokens: 8_192 },
  "gemini-1.0-pro": { contextWindowTokens: 32_760, maxOutputTokens: 8_192 },

  // ── Anthropic Claude ────────────────────────────────────────────────────────

  "claude-opus-4": { contextWindowTokens: 200_000, maxOutputTokens: 32_000 },
  "claude-sonnet-4": { contextWindowTokens: 200_000, maxOutputTokens: 16_000 },
  "claude-haiku-4": { contextWindowTokens: 200_000, maxOutputTokens: 16_000 },
  "claude-3-5-sonnet": { contextWindowTokens: 200_000, maxOutputTokens: 8_192 },
  "claude-3-5-haiku": { contextWindowTokens: 200_000, maxOutputTokens: 8_192 },
  "claude-3-opus": { contextWindowTokens: 200_000, maxOutputTokens: 4_096 },
  "claude-3-sonnet": { contextWindowTokens: 200_000, maxOutputTokens: 4_096 },
  "claude-3-haiku": { contextWindowTokens: 200_000, maxOutputTokens: 4_096 },

  // ── Meta Llama (via Groq / Together / Ollama) ───────────────────────────────

  "llama-3.3-70b-versatile": { contextWindowTokens: 128_000, maxOutputTokens: 32_768 },
  "llama-3.1-70b-versatile": { contextWindowTokens: 128_000, maxOutputTokens: 8_000 },
  "llama-3.1-8b-instant": { contextWindowTokens: 128_000, maxOutputTokens: 8_000 },
  "llama-3.2-3b-preview": { contextWindowTokens: 8_192, maxOutputTokens: 8_192 },
  "llama-3.2-11b-vision-preview": { contextWindowTokens: 128_000, maxOutputTokens: 8_000 },
  "llama3.1": { contextWindowTokens: 128_000, maxOutputTokens: 8_000 },
  "llama3.2": { contextWindowTokens: 128_000, maxOutputTokens: 8_000 },
  "llama3.3": { contextWindowTokens: 128_000, maxOutputTokens: 8_000 },

  // ── Mistral / Mixtral ────────────────────────────────────────────────────────

  "mistral-large": { contextWindowTokens: 128_000, maxOutputTokens: 8_192 },
  "mistral-small": { contextWindowTokens: 128_000, maxOutputTokens: 8_192 },
  "mistral-7b": { contextWindowTokens: 32_768, maxOutputTokens: 8_192 },
  "mixtral-8x7b": { contextWindowTokens: 32_768, maxOutputTokens: 32_768 },
  "mixtral-8x22b": { contextWindowTokens: 65_536, maxOutputTokens: 65_536 },

  // ── DeepSeek ─────────────────────────────────────────────────────────────────

  "deepseek-chat": { contextWindowTokens: 64_000, maxOutputTokens: 8_192 },
  "deepseek-coder": { contextWindowTokens: 64_000, maxOutputTokens: 8_192 },
  "deepseek-r1": { contextWindowTokens: 64_000, maxOutputTokens: 8_192 },
};

/**
 * Sentinel returned when no spec is found.
 * Represents conservative fallback values that work across providers.
 */
const FALLBACK_SPECS: ModelSpecs = {
  contextWindowTokens: 128_000,
  maxOutputTokens: 4_096,
};

/**
 * Resolve the specs for a given model name.
 *
 * Matching strategy (in order):
 * 1. Exact match in the registry
 * 2. Prefix/substring match — e.g., `'claude-3-5-sonnet-20241022'` hits `'claude-3-5-sonnet'`
 * 3. Returns conservative fallback values if no match found
 *
 * @example
 * ```ts
 * const specs = resolveModelSpecs('gpt-4o-mini')
 * // → { contextWindowTokens: 128_000, maxOutputTokens: 16_384 }
 *
 * const specs = resolveModelSpecs('claude-3-5-sonnet-20241022')
 * // → { contextWindowTokens: 200_000, maxOutputTokens: 8_192 }
 * ```
 */
export function resolveModelSpecs(modelName: string | undefined): ModelSpecs {
  if (!modelName) return FALLBACK_SPECS;

  const name = modelName.toLowerCase().trim();

  // 1. Exact match
  if (MODEL_SPECS[name]) return MODEL_SPECS[name]!;

  // 2. Partial/prefix match — longest key that the name starts with wins
  let bestKey = "";
  let bestSpecs: ModelSpecs | undefined;

  for (const [key, specs] of Object.entries(MODEL_SPECS)) {
    if (name.startsWith(key) || name.includes(key)) {
      if (key.length > bestKey.length) {
        bestKey = key;
        bestSpecs = specs;
      }
    }
  }

  if (bestSpecs) return bestSpecs;

  return FALLBACK_SPECS;
}

/**
 * Register custom model specs at runtime.
 * Useful for private deployments, fine-tuned models, or new releases
 * not yet in the built-in registry.
 *
 * Added `overwrite` flag (default false) to prevent silent
 * shadowing of well-known built-in specs. Pass `overwrite: true` to
 * explicitly replace an existing entry.
 *
 * @example
 * ```ts
 * registerModelSpecs('my-fine-tuned-model', {
 * contextWindowTokens: 32_000,
 * maxOutputTokens: 4_096,
 * })
 *
 * // Overwrite an existing built-in entry (rare; prefer a new name)
 * registerModelSpecs('gpt-4o', { contextWindowTokens: 200_000, maxOutputTokens: 16_384 }, { overwrite: true })
 * ```
 */
export function registerModelSpecs(
  modelName: string,
  specs: ModelSpecs,
  options: { overwrite?: boolean } = {},
): void {
  const key = modelName.toLowerCase().trim();
  // Warn before overwriting an existing built-in entry.
  if (MODEL_SPECS[key] !== undefined && !options.overwrite) {
    console.warn(
      `[yaaf/specs] registerModelSpecs: "${key}" already exists in the built-in registry. ` +
        "The existing entry was NOT overwritten. To replace it, pass { overwrite: true }.",
    );
    return;
  }
  MODEL_SPECS[key] = specs;
}
