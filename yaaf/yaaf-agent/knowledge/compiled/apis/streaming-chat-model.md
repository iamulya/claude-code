---
summary: Interface for LLM adapters that support streaming chat responses.
export_name: StreamingChatModel
source_file: src/plugin/types.js
category: interface
title: StreamingChatModel
entity_type: api
search_terms:
 - streaming LLM responses
 - real-time chat updates
 - server-sent events for AI
 - how to stream from model
 - LLM adapter streaming
 - chunked response
 - asynchronous model output
 - SSE in YAAF
 - LLMAdapter stream method
 - incremental response generation
 - live text generation
stub: false
compiled_at: 2026-04-24T17:41:07.386Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/base.ts
compiled_from_quality: unknown
confidence: 0.85
---

## Overview

The `[[[[[[[[Streaming]]]]]]]]ChatModel` is an interface that defines the contract for Language Model ([LLM](../concepts/llm.md)) adapters capable of Streaming their responses. [when](./when.md) an LLM adapter implements this interface, it signals that it can return generated content as a series of chunks over time, rather than waiting for the entire response to be complete. This is essential for building real-time, interactive applications, such as chatbots, where text is displayed to the user as it is being generated.

The abstract class `BaseLLMAdapter`, which serves as the foundation for all YAAF [LLM Adapters](../subsystems/llm-adapters.md), implements the `StreamingChatModel` interface [Source 1].

## Signature

As an interface, `StreamingChatModel` does not have a constructor. It defines a set of methods that a class must implement. While the source material does not provide the full interface definition, its implementation within `BaseLLMAdapter` indicates it includes a method for streaming responses, likely named `stream` [Source 1].

## Methods & Properties

Based on the implementation context in `BaseLLMAdapter`, the `StreamingChatModel` interface includes the following method:

### stream(params)

This method initiates a streaming connection to the LLM. Instead of returning a single `Promise` that resolves with the full response, it returns an asynchronous iterator or a similar mechanism that yields response chunks as they become available from the model. The comments in `BaseLLMAdapter` suggest this is intended for Server-Sent Events (SSE) streaming [Source 1].

## Examples

No code examples are available in the provided source material.

## See Also

*   `BaseLLMAdapter`: The abstract base class for all LLM adapters, which implements this interface.
*   `LLMAdapter`: The primary interface for all LLM adapters, defining non-streaming methods.

## Sources

[Source 1]: src/models/base.ts