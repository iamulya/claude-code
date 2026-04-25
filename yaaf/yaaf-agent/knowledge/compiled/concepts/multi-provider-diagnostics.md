---
summary: The design principle of including provider-specific information in errors for better debugging in multi-provider environments.
title: Multi-Provider Diagnostics
entity_type: concept
related_subsystems:
 - errors
search_terms:
 - debugging multiple LLM providers
 - provider-specific error info
 - YAAF error handling
 - diagnosing API errors
 - which provider failed
 - unified error model
 - troubleshooting model adapters
 - YAAFError provider field
 - multi-cloud LLM debugging
 - identifying error source
 - agnostic framework errors
stub: false
compiled_at: 2026-04-24T17:58:53.707Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/errors.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

Multi-Provider Diagnostics is a core design principle within YAAF's error handling system. It ensures that errors originating from external services, such as [LLM](./llm.md) providers, are tagged with an identifier for the specific provider that generated the error.

In a provider-agnostic framework like YAAF, an agent may interact with multiple different LLM providers simultaneously. [when](../apis/when.md) a generic error like an authentication failure or a rate limit occurs, it is crucial for developers to know which provider's configuration, credentials, or usage limits are the source of the problem. This principle solves the ambiguity of generic errors in a multi-provider architecture by embedding diagnostic context directly into the error object.

## How It Works in YAAF

The implementation of this principle is centered on the base `YAAFError` class, which is the parent class for all custom errors within the framework.

According to the framework's design principles, every YAAF error can carry an optional `provider` field [Source 1]. This field is a string that identifies the source of the error, such as `"openai"` or `"anthropic"`.

This mechanism is primarily utilized by model adapters. When an adapter makes an API call to a specific provider and receives an error response (e.g., an HTTP 401 or 429), it uses the `classifyAPIError` utility function to convert the raw response into a structured `YAAFError`. The adapter passes a string identifying itself as the `provider` argument to this function [Source 1]. The resulting typed error, such as `AuthError` or `RateLimitError`, then contains the provider's name, making it immediately available for logging and debugging in `try...catch` blocks.

## Sources

[Source 1]: src/errors.ts