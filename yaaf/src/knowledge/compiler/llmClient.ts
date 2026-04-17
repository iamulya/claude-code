/**
 * KB LLM Client — Shared LLM abstraction for Phase C features
 *
 * A lightweight text-in/text-out LLM client that:
 * - Auto-detects provider from environment variables (same as PDF extraction)
 * - Uses native fetch() — zero SDK dependencies
 * - Supports Gemini, OpenAI, and Anthropic
 * - Used by: Heal Mode (C1), Discovery Mode (C2), Vision Pass (C3)
 */

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * A simple text-in/text-out LLM call function.
 * Used for all Phase C features (heal, discovery, vision).
 */
export type LLMCallFn = (params: {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}) => Promise<string>;

/**
 * A vision-capable LLM call function.
 * Accepts an image alongside the text prompt.
 */
export type VisionCallFn = (params: {
  system: string;
  user: string;
  imageBase64: string;
  imageMimeType: string;
  temperature?: number;
  maxTokens?: number;
}) => Promise<string>;

export type LLMClientOptions = {
  /** Override API key (auto-detected from env if omitted) */
  apiKey?: string;
  /** Override model (auto-detected from provider if omitted) */
  model?: string;
  /** Override provider (auto-detected from env if omitted) */
  provider?: "gemini" | "openai" | "anthropic";
};

// ── Auto-detect provider ──────────────────────────────────────────────────────

type ProviderConfig = {
  provider: "gemini" | "openai" | "anthropic";
  apiKey: string;
  model: string;
};

function detectProvider(options: LLMClientOptions = {}): ProviderConfig {
  if (options.provider === "gemini" || (!options.provider && process.env.GEMINI_API_KEY)) {
    const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not set");
    return { provider: "gemini", apiKey, model: options.model ?? "gemini-2.5-flash" };
  }

  if (options.provider === "openai" || (!options.provider && process.env.OPENAI_API_KEY)) {
    const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set");
    return { provider: "openai", apiKey, model: options.model ?? "gpt-4o-mini" };
  }

  if (options.provider === "anthropic" || (!options.provider && process.env.ANTHROPIC_API_KEY)) {
    const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
    return { provider: "anthropic", apiKey, model: options.model ?? "claude-sonnet-4-20250514" };
  }

  throw new Error(
    "No LLM API key found. Set one of: GEMINI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY",
  );
}

// ── Factory: Text LLM ────────────────────────────────────────────────────────

/**
 * Create a text LLM call function, auto-detecting provider from env.
 *
 * @example
 * ```ts
 * const llm = makeKBLLMClient()
 * const answer = await llm({ system: 'You are a linter.', user: 'Fix this wikilink.' })
 * ```
 */
export function makeKBLLMClient(options: LLMClientOptions = {}): LLMCallFn {
  const config = detectProvider(options);

  switch (config.provider) {
    case "gemini":
      return makeGeminiClient(config);
    case "openai":
      return makeOpenAIClient(config);
    case "anthropic":
      return makeAnthropicClient(config);
  }
}

/**
 * Create a vision-capable LLM call function, auto-detecting provider from env.
 * Falls back to text-only client if the provider doesn't support vision natively.
 */
export function makeKBVisionClient(options: LLMClientOptions = {}): VisionCallFn {
  const config = detectProvider(options);

  switch (config.provider) {
    case "gemini":
      return makeGeminiVisionClient(config);
    case "openai":
      return makeOpenAIVisionClient(config);
    case "anthropic":
      return makeAnthropicVisionClient(config);
  }
}

/**
 * Auto-detect and create both text + vision clients.
 * Returns null if no API key is found.
 */
export function autoDetectKBClients(options: LLMClientOptions = {}): {
  text: LLMCallFn;
  vision: VisionCallFn;
  provider: string;
} | null {
  try {
    const config = detectProvider(options);
    return {
      text: makeKBLLMClient(options),
      vision: makeKBVisionClient(options),
      provider: `${config.provider}/${config.model}`,
    };
  } catch {
    return null;
  }
}

// ── Gemini implementation ─────────────────────────────────────────────────────

function makeGeminiClient(config: ProviderConfig): LLMCallFn {
  return async ({ system, user, temperature = 0.2, maxTokens = 4096 }) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ parts: [{ text: user }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature },
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Gemini API error (${response.status}): ${body.slice(0, 300)}`);
    }

    const json = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  };
}

function makeGeminiVisionClient(config: ProviderConfig): VisionCallFn {
  return async ({
    system,
    user,
    imageBase64,
    imageMimeType,
    temperature = 0.2,
    maxTokens = 2048,
  }) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [
          {
            parts: [{ inlineData: { mimeType: imageMimeType, data: imageBase64 } }, { text: user }],
          },
        ],
        generationConfig: { maxOutputTokens: maxTokens, temperature },
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Gemini Vision API error (${response.status}): ${body.slice(0, 300)}`);
    }

    const json = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  };
}

// ── OpenAI implementation ─────────────────────────────────────────────────────

function makeOpenAIClient(config: ProviderConfig): LLMCallFn {
  return async ({ system, user, temperature = 0.2, maxTokens = 4096 }) => {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`OpenAI API error (${response.status}): ${body.slice(0, 300)}`);
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return json.choices?.[0]?.message?.content ?? "";
  };
}

function makeOpenAIVisionClient(config: ProviderConfig): VisionCallFn {
  return async ({
    system,
    user,
    imageBase64,
    imageMimeType,
    temperature = 0.2,
    maxTokens = 2048,
  }) => {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${imageMimeType};base64,${imageBase64}` },
              },
              { type: "text", text: user },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`OpenAI Vision API error (${response.status}): ${body.slice(0, 300)}`);
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return json.choices?.[0]?.message?.content ?? "";
  };
}

// ── Anthropic implementation ──────────────────────────────────────────────────

function makeAnthropicClient(config: ProviderConfig): LLMCallFn {
  return async ({ system, user, temperature = 0.2, maxTokens = 4096 }) => {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: maxTokens,
        temperature,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Anthropic API error (${response.status}): ${body.slice(0, 300)}`);
    }

    const json = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    return json.content?.find((b) => b.type === "text")?.text ?? "";
  };
}

function makeAnthropicVisionClient(config: ProviderConfig): VisionCallFn {
  return async ({
    system,
    user,
    imageBase64,
    imageMimeType,
    temperature = 0.2,
    maxTokens = 2048,
  }) => {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: maxTokens,
        temperature,
        system,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: imageMimeType,
                  data: imageBase64,
                },
              },
              { type: "text", text: user },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Anthropic Vision API error (${response.status}): ${body.slice(0, 300)}`);
    }

    const json = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    return json.content?.find((b) => b.type === "text")?.text ?? "";
  };
}
