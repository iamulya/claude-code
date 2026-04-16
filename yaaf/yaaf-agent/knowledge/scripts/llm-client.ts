/**
 * llm-client.ts — Provider-agnostic LLM factory for KB scripts
 *
 * Uses the same unified env var strategy as resolver.ts:
 *
 *   LLM_BASE_URL    Activates OpenAI-compatible mode (Ollama, GLM, DeepSeek, Qwen, Groq…)
 *   LLM_MODEL       Universal model name override
 *   LLM_API_KEY     API key for LLM_BASE_URL providers
 *
 *   GEMINI_API_KEY     → Google Gemini (native SDK)
 *   ANTHROPIC_API_KEY  → Anthropic Claude (native SDK)
 *   OPENAI_API_KEY     → OpenAI
 *
 * KB-specific overrides (take precedence over LLM_* vars):
 *
 *   KB_BASE_URL           Override LLM_BASE_URL for KB compilation only
 *   KB_API_KEY            Override LLM_API_KEY for KB compilation only
 *   KB_MODEL              Single model for both extraction + synthesis stages
 *   KB_EXTRACTION_MODEL   Override just the extraction stage (fast/cheap)
 *   KB_SYNTHESIS_MODEL    Override just the synthesis stage (capable)
 *
 * Examples:
 *   # Ollama / Qwen / local OSS
 *   LLM_BASE_URL=http://localhost:11434/v1  LLM_MODEL=qwen2.5:72b
 *
 *   # GLM via Zhipu AI
 *   LLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4  LLM_API_KEY=...  LLM_MODEL=glm-4-flash
 *
 *   # DeepSeek
 *   LLM_BASE_URL=https://api.deepseek.com/v1  LLM_API_KEY=...  LLM_MODEL=deepseek-chat
 *
 *   # Groq
 *   LLM_BASE_URL=https://api.groq.com/openai/v1  LLM_API_KEY=...  LLM_MODEL=llama3-70b-8192
 *
 *   # Two-stage with different models
 *   GEMINI_API_KEY=... KB_EXTRACTION_MODEL=gemini-2.5-flash KB_SYNTHESIS_MODEL=gemini-2.5-pro
 */

import * as nodePath     from 'node:path'
import { fileURLToPath } from 'node:url'

// ── Types ─────────────────────────────────────────────────────────────────────

export type KBProvider = 'openai-compatible' | 'gemini' | 'anthropic' | 'openai'

export interface KBProviderConfig {
  provider: KBProvider
  apiKey: string
  baseUrl?: string
  extractionModel: string
  synthesisModel: string
}

export interface KBGenerateFns {
  provider: KBProvider
  extractionModel: string
  synthesisModel: string
  extractionFn: (systemPrompt: string, userPrompt: string) => Promise<string>
  synthesisFn:  (systemPrompt: string, userPrompt: string) => Promise<string>
}

// ── Env var helpers ───────────────────────────────────────────────────────────

/** Read the effective base URL for KB, falling back to the universal LLM var. */
function kbBaseUrl(): string | undefined {
  return (
    process.env.KB_BASE_URL ??
    process.env.LLM_BASE_URL ??
    process.env.OPENAI_BASE_URL   // backward compat
  )
}

/** Read the effective API key for KB, falling back to the universal LLM var. */
function kbApiKey(providerEnvKey?: string): string {
  return (
    process.env.KB_API_KEY ??
    process.env.LLM_API_KEY ??
    providerEnvKey ??
    ''
  )
}

/**
 * Resolve a model name for a stage (extraction | synthesis).
 * Priority: stage-specific KB var → KB_MODEL → LLM_MODEL → default.
 */
function kbModelName(stageEnvKey: string, defaultModel: string): string {
  return (
    process.env[stageEnvKey] ??
    process.env.KB_MODEL ??
    process.env.LLM_MODEL ??
    defaultModel
  )
}

// ── Provider detection ────────────────────────────────────────────────────────

/**
 * Detect which provider to use for KB compilation.
 *
 * Priority:
 *   1. KB_BASE_URL / LLM_BASE_URL set → OpenAI-compatible
 *   2. GEMINI_API_KEY                 → Google Gemini
 *   3. ANTHROPIC_API_KEY              → Anthropic Claude
 *   4. OPENAI_API_KEY                 → OpenAI
 *   5. Error
 */
export function detectKBProvider(): KBProviderConfig {
  const baseUrl = kbBaseUrl()

  // 1. OpenAI-compatible (Ollama, GLM, DeepSeek, Qwen, Groq, etc.)
  if (baseUrl) {
    return {
      provider:        'openai-compatible',
      apiKey:          kbApiKey(),
      baseUrl,
      extractionModel: kbModelName('KB_EXTRACTION_MODEL', 'default'),
      synthesisModel:  kbModelName('KB_SYNTHESIS_MODEL',  'default'),
    }
  }

  // 2. Google Gemini
  const googleKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY
  if (googleKey) {
    // Normalise — GeminiChatModel reads GOOGLE_API_KEY
    process.env.GOOGLE_API_KEY = googleKey
    return {
      provider:        'gemini',
      apiKey:          googleKey,
      extractionModel: kbModelName('KB_EXTRACTION_MODEL', 'gemini-2.5-flash'),
      synthesisModel:  kbModelName('KB_SYNTHESIS_MODEL',  'gemini-2.5-pro'),
    }
  }

  // 3. Anthropic
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      provider:        'anthropic',
      apiKey:          process.env.ANTHROPIC_API_KEY,
      extractionModel: kbModelName('KB_EXTRACTION_MODEL', 'claude-haiku-4'),
      synthesisModel:  kbModelName('KB_SYNTHESIS_MODEL',  'claude-sonnet-4'),
    }
  }

  // 4. OpenAI
  if (process.env.OPENAI_API_KEY) {
    return {
      provider:        'openai',
      apiKey:          process.env.OPENAI_API_KEY,
      extractionModel: kbModelName('KB_EXTRACTION_MODEL', 'gpt-4o-mini'),
      synthesisModel:  kbModelName('KB_SYNTHESIS_MODEL',  'gpt-4o'),
    }
  }

  throw new Error(
    [
      'No LLM provider configured for KB compilation.',
      '',
      'Option A — OpenAI-compatible (Ollama, Qwen, GLM, DeepSeek, Groq…):',
      '  LLM_BASE_URL=http://localhost:11434/v1  LLM_MODEL=qwen2.5:72b',
      '',
      'Option B — Hosted providers:',
      '  GEMINI_API_KEY=...      (Google Gemini)',
      '  ANTHROPIC_API_KEY=...   (Anthropic Claude)',
      '  OPENAI_API_KEY=...      (OpenAI)',
      '',
      'Override models with:',
      '  LLM_MODEL=<name>               both stages',
      '  KB_EXTRACTION_MODEL=<name>     extraction stage only',
      '  KB_SYNTHESIS_MODEL=<name>      synthesis stage only',
    ].join('\n'),
  )
}

// ── Path resolution ───────────────────────────────────────────────────────────

/**
 * Resolve the YAAF dist directory.
 * This file lives at: yaaf-agent/knowledge/scripts/llm-client.ts
 * The dist lives at:  yaaf/dist/   (three levels up from scripts/)
 */
function resolveYaafDist(): string {
  const dir: string =
    typeof import.meta.dirname === 'string'
      ? import.meta.dirname
      : nodePath.dirname(fileURLToPath(import.meta.url))
  return nodePath.resolve(dir, '..', '..', '..', 'dist')
}

// ── GenerateFn wrapper ────────────────────────────────────────────────────────

/**
 * Wrap a concrete model object into a simple (system, user) → string function.
 * Called directly (not via makeGenerateFn) to avoid the ChatMessage
 * discriminated-union contravariance issue.
 */
function wrapModel(model: {
  complete(p: {
    messages: Array<{ role: string; content: string }>
    temperature?: number
    maxTokens?: number
  }): Promise<{ content?: string | null }>
}): (systemPrompt: string, userPrompt: string) => Promise<string> {
  return async (systemPrompt, userPrompt) => {
    const result = await model.complete({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
      temperature: 0.1,
      maxTokens:   8192,
    })
    return result.content ?? ''
  }
}

// ── GenerateFn factory ────────────────────────────────────────────────────────

/**
 * Create extractionFn + synthesisFn from the auto-detected or supplied config.
 *
 * @param config - Optional override; if omitted, detectKBProvider() is called.
 */
export async function createKBGenerateFns(
  config?: KBProviderConfig,
): Promise<KBGenerateFns> {
  const cfg  = config ?? detectKBProvider()
  const dist = resolveYaafDist()

  // OpenAI-compatible: Ollama, GLM, DeepSeek, Qwen, Groq, etc.
  if (cfg.provider === 'openai-compatible' || cfg.provider === 'openai') {
    const { OpenAIChatModel } = await import(`${dist}/models/openai.js`)
    const make = (model: string) =>
      wrapModel(new OpenAIChatModel({ model, apiKey: cfg.apiKey, baseUrl: cfg.baseUrl }))
    return {
      ...cfg,
      extractionFn: make(cfg.extractionModel),
      synthesisFn:  make(cfg.synthesisModel),
    }
  }

  if (cfg.provider === 'gemini') {
    const { GeminiChatModel } = await import(`${dist}/models/gemini.js`)
    const make = (model: string) =>
      wrapModel(new GeminiChatModel({ model, apiKey: cfg.apiKey }))
    return {
      ...cfg,
      extractionFn: make(cfg.extractionModel),
      synthesisFn:  make(cfg.synthesisModel),
    }
  }

  // Anthropic
  const { AnthropicChatModel } = await import(`${dist}/models/anthropic.js`)
  const make = (model: string) =>
    wrapModel(new AnthropicChatModel({ model, apiKey: cfg.apiKey }))
  return {
    ...cfg,
    extractionFn: make(cfg.extractionModel),
    synthesisFn:  make(cfg.synthesisModel),
  }
}
