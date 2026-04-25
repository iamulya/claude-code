---
summary: "OpenAI-compatible ChatModel + LLMAdapter + Streaming. Works with: OpenAI, Groq, Together AI, Fireworks, Perplexity, Ollama, vLLM, LiteLLM, and any other provider exposing the OpenAI chat completions API."
export_name: OpenAIChatModel
source_file: src/models/openai.ts
category: class
title: OpenAIChatModel
entity_type: api
search_terms:
 - OpenAI API client
 - connect to Groq
 - use Ollama with YAAF
 - LLM provider adapter
 - chat completions API
 - streaming LLM responses
 - vLLM integration
 - LiteLLM wrapper
 - Together AI model
 - Fireworks AI client
 - Perplexity API
 - how to configure LLM
 - BaseLLMAdapter implementation
 - o-series models
 - reasoning effort
stub: false
compiled_at: 2026-04-24T17:24:54.796Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/openai.ts
compiled_from_quality: unknown
confidence: 0.95
---
## Overview

The `OpenAIChatModel` class is a versatile adapter for interacting with any Large Language Model ([LLM](../concepts/llm.md)) provider that exposes an OpenAI-compatible chat completions API [Source 1]. It provides a unified interface for chat completions, [Streaming](../concepts/streaming.md), and other common LLM operations.

This class is designed to be provider-agnostic, supporting services such as OpenAI, Groq, Together AI, Fireworks, Perplexity, and local models served via Ollama, vLLM, or LiteLLM [Source 1]. It has no external dependencies and uses the native `fetch` API for making HTTP requests.

`OpenAIChatModel` extends the abstract `BaseLLMAdapter` class. It inherits foundational methods like `query()`, `summarize()`, `estimateTokens()`, and `healthCheck()`, while providing the concrete implementation for the core `complete()` and `stream()` methods required to communicate with the provider's API [Source 1].


---

[Next: Constructor →](open-ai-chat-model-part-2.md) | 
*Part 1 of 2*