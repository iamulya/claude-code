---
summary: The mechanism for configuring and connecting YAAF agents to various Large Language Model providers using environment variables.
title: LLM Provider Configuration
entity_type: concept
search_terms:
 - how to connect to OpenAI
 - how to use Gemini with YAAF
 - configure Anthropic API key
 - YAAF environment variables
 - set up local LLM
 - using Ollama with YAAF
 - Groq configuration
 - LLM provider setup
 - GOOGLE_API_KEY
 - OPENAI_API_KEY
 - ANTHROPIC_API_KEY
 - OPENAI_BASE_URL
 - connect to different language models
stub: false
compiled_at: 2026-04-24T17:58:02.057Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/getting-started.md
compiled_from_quality: documentation
confidence: 0.9
---

## What It Is

[LLM](./llm.md) Provider Configuration is the mechanism by which a YAAF agent connects to a specific Large Language Model (LLM). YAAF is designed to be provider-agnostic, allowing developers to switch between different LLM backends without altering their agent's core logic. This is achieved through a standardized configuration system that relies on environment variables [Source 1]. This approach decouples the agent's implementation from the specific LLM service, simplifying both development and deployment across different environments.

## How It Works in YAAF

At runtime, YAAF automatically detects which LLM provider to use by scanning the process's environment variables for a recognized API key [Source 1]. The framework prioritizes certain keys to determine the active provider. A developer should only set the environment variables for one provider at a time to ensure predictable behavior [Source 1].

For providers that adhere to the OpenAI API specification but are not OpenAI, such as Groq or a local Ollama instance, YAAF uses a combination of `OPENAI_API_KEY` and `OPENAI_BASE_URL` to direct requests to the correct endpoint [Source 1].

## Configuration

To configure an LLM provider, a developer must set the appropriate environment variables in their shell or deployment environment. The following are the supported configurations [Source 1].

### Google Gemini

Google Gemini is the recommended provider, noted for its free tier and large [Context Window](./context-window.md) [Source 1].

```bash
export GOOGLE_API_KEY=your-key-here
```

### OpenAI

To connect to OpenAI's models like GPT-4, set the `OPENAI_API_KEY`.

```bash
export OPENAI_API_KEY=sk-...
```

### Anthropic

To connect to Anthropic's Claude models, set the `ANTHROPIC_API_KEY`.

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

### Groq

Groq is a fast, OpenAI-compatible provider. It requires setting the API key, base URL, and optionally a specific model name [Source 1].

```bash
export OPENAI_API_KEY=gsk_...
export OPENAI_BASE_URL=https://api.groq.com/openai/v1
export OPENAI_MODEL=llama-3.3-70b-versatile
```

### Ollama (Local)

To run against a local LLM using Ollama, YAAF uses the OpenAI-compatible configuration. The API key can be set to any non-empty string (e.g., `ollama`), and the base URL must point to the local Ollama server endpoint [Source 1].

```bash
export OPENAI_API_KEY=ollama
export OPENAI_BASE_URL=http://localhost:11434/v1
export OPENAI_MODEL=llama3.1
```

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/getting-started.md