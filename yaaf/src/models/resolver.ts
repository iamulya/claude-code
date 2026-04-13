/**
 * Model resolver — constructs a ChatModel from AgentConfig provider settings.
 *
 * Centralises provider auto-detection and model construction so agent.ts
 * stays focused on lifecycle management.
 */

import { OpenAIChatModel, type OpenAIModelConfig } from './openai.js'
import { GeminiChatModel, type GeminiModelConfig } from './gemini.js'
import type { ChatModel } from '../agents/runner.js'

/** Provider identifiers supported by the built-in resolver. */
export type ModelProvider = 'openai' | 'gemini' | 'ollama' | 'groq'

/** Subset of AgentConfig fields the resolver needs. */
export type ResolverConfig = {
  chatModel?: ChatModel
  provider?: ModelProvider | string
  model?: string
  apiKey?: string
  baseUrl?: string
  project?: string
  location?: string
  temperature?: number
  maxTokens?: number
}

/**
 * Well-known base URLs for OpenAI-compatible providers.
 * Referenced by name via `provider: 'groq'` etc.
 */
export const KNOWN_BASE_URLS: Record<string, string> = {
  groq: 'https://api.groq.com/openai/v1',
  ollama: 'http://localhost:11434/v1',
  together: 'https://api.together.xyz/v1',
  fireworks: 'https://api.fireworks.ai/inference/v1',
  perplexity: 'https://api.perplexity.ai',
  deepseek: 'https://api.deepseek.com/v1',
}

/**
 * Resolve a ChatModel from configuration.
 *
 * Priority:
 * 1. `config.chatModel` — already constructed, use directly
 * 2. `config.provider === 'gemini'` — build GeminiChatModel
 * 3. Any other provider string — build OpenAIChatModel (OpenAI-compatible)
 * 4. Auto-detect from env: GEMINI_API_KEY → gemini, OPENAI_API_KEY → openai
 *
 * @throws if no provider can be determined and no API keys are set
 */
export function resolveModel(config: ResolverConfig): ChatModel {
  if (config.chatModel) return config.chatModel

  let provider = config.provider
  if (!provider) {
    if (process.env.GEMINI_API_KEY) provider = 'gemini'
    else if (process.env.OPENAI_API_KEY) provider = 'openai'
    else {
      throw new Error(
        [
          'YAAF: No LLM provider configured. Set one of:',
          '  GEMINI_API_KEY=...   (Google Gemini)',
          '  OPENAI_API_KEY=...   (OpenAI / Groq / Ollama)',
          '',
          'Or pass chatModel, provider+apiKey, or provider+baseUrl to the Agent constructor.',
          '',
          'Examples:',
          '  GEMINI_API_KEY=... npx tsx src/main.ts',
          '  OPENAI_API_KEY=sk-... npx tsx src/main.ts',
        ].join('\n')
      )
    }
  }

  if (provider === 'gemini') {
    const apiKey = config.apiKey ?? process.env.GEMINI_API_KEY ?? ''
    const geminiConfig: GeminiModelConfig = config.project
      ? {
        vertexAI: true,
        project: config.project,
        location: config.location,
        model: config.model,
        temperature: config.temperature,
        maxOutputTokens: config.maxTokens,
      }
      : {
        apiKey,
        model: config.model,
        temperature: config.temperature,
        maxOutputTokens: config.maxTokens,
      }
    return new GeminiChatModel(geminiConfig)
  }

  // Everything else is OpenAI-compatible
  const resolvedBaseUrl =
    config.baseUrl ??
    process.env.OPENAI_BASE_URL ??
    KNOWN_BASE_URLS[provider]

  const openaiConfig: OpenAIModelConfig = {
    apiKey: config.apiKey ?? process.env.OPENAI_API_KEY ?? '',
    model: config.model ?? process.env.OPENAI_MODEL,
    baseUrl: resolvedBaseUrl,
    maxOutputTokens: config.maxTokens,
  }

  return new OpenAIChatModel(openaiConfig)
}
