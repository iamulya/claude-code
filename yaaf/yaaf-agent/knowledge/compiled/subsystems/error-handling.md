---
summary: Provides standardized error classes and utilities for handling common errors across the YAAF framework, such as API connection issues and abort signals.
primary_files:
 - src/errors.js
title: Error Handling
entity_type: subsystem
exports:
 - APIConnectionError
 - AbortError
 - classifyAPIError
search_terms:
 - exception handling
 - custom error types
 - YAAF exceptions
 - how to handle API errors
 - network connection error
 - request aborted
 - operation cancelled
 - classify API exceptions
 - framework error classes
 - standardized exceptions
 - graceful failure
 - error management
stub: false
compiled_at: 2026-04-25T00:28:13.814Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/openai.ts
compiled_from_quality: unknown
confidence: 1
---

## Purpose

The Error Handling subsystem provides a set of standardized, custom error classes and utility functions for consistent error management throughout the YAAF framework. It addresses common failure scenarios encountered when interacting with external services, particularly LLM provider APIs. By defining specific error types for issues like network connection failures and aborted operations, it allows other subsystems to implement more robust and specific error-handling logic, such as retries or graceful degradation [Source 1].

## Architecture

The subsystem is composed of custom `Error` subclasses and helper functions that encapsulate common failure modes. While the source material does not detail the internal implementation, the primary components can be identified by their usage in other parts of the framework [Source 1].

- **`APIConnectionError`**: An `Error` subclass representing failures related to network communication with an external API. This could include DNS issues, timeouts, or other problems preventing a successful HTTP request.
- **`AbortError`**: An `Error` subclass used to indicate that an asynchronous operation was deliberately cancelled, typically through an `AbortSignal`.
- **`classifyAPIError`**: A utility function designed to inspect a generic error object (e.g., one caught from a `fetch` call) and convert it into a more specific, standardized YAAF error instance like `APIConnectionError`.

## Integration Points

The Error Handling subsystem is primarily consumed by components that perform network requests to external services.

- **[LLM Adapters](./llm-adapters.md)**: The `OpenAIChatModel`, a component of the [LLM Adapters](./llm-adapters.md) subsystem, directly imports and utilizes `APIConnectionError`, `AbortError`, and `classifyAPIError` to manage failures during API calls to OpenAI-compatible endpoints [Source 1]. This allows the model adapter to distinguish between different types of failures and handle them appropriately.

## Key APIs

The main public interface for this subsystem includes the following error classes and functions:

- [APIConnectionError](../apis/api-connection-error.md): Thrown when there is a problem connecting to or communicating with an external API.
- [AbortError](../apis/abort-error.md): Thrown when an operation is cancelled via an `AbortSignal`.
- [classifyAPIError](../apis/classify-api-error.md): A utility function for converting generic network errors into specific YAAF error types.

## Sources

[Source 1] src/models/openai.ts