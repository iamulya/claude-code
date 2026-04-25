---
summary: The process of approximating the number of LLM tokens a given text will consume, crucial for managing context windows and costs.
title: Token Estimation
entity_type: concept
related_subsystems:
 - Knowledge Base
search_terms:
 - how to count tokens
 - LLM token approximation
 - context window management
 - predicting API costs
 - token count before API call
 - text to token ratio
 - tokenization approximation
 - YAAF token counting
 - knowledge base token size
 - document token estimate
 - managing LLM input size
stub: false
compiled_at: 2026-04-24T18:03:49.216Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/store.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

Token Estimation is the process of calculating an approximate number of tokens that a given piece of text will consume [when](../apis/when.md) processed by a Large Language Model ([LLM](./llm.md)). Since LLMs operate on tokens rather than characters or words, and have fixed [Context Window](./context-window.md) limits, estimating the token count of a text before sending it to a model is essential for managing input size, preventing errors, and controlling costs.

In YAAF, token estimation is used as a pre-computation step, particularly within the Knowledge Base subsystem. The estimated token count for each document is stored as metadata, allowing the framework to make efficient, informed decisions about data loading and [Memory](./memory.md) management without needing to process the full text of a document at runtime [Source 1].

## How It Works in YAAF

Within the YAAF framework, token estimation is primarily associated with the compile-time processing of the Knowledge Base. The `KBCompiler` (mentioned in source code comments) is responsible for this pre-computation, and the runtime `KBStore` consumes the results [Source 1].

The core logic for the calculation is encapsulated in an `estimateTokens` utility function. While the exact algorithm of this function is not detailed in the provided source, its output is stored in several key data structures [Source 1]:

*   **`CompiledDocument`**: This type represents a fully processed knowledge base article and includes a `tokenEstimate` field, which holds the calculated number of tokens for the document's body [Source 1].
*   **`DocumentMeta`**: To optimize runtime memory usage, the `KBStore` loads only lightweight metadata for each document into memory initially. This `DocumentMeta` object includes the `tokenEstimate`, allowing the system to know the "size" of a document without loading its full body from disk [Source 1].
*   **`KBIndex`**: This object provides a high-level summary of the entire Knowledge Base. It contains a `totalTokenEstimate` field, which is the sum of the token estimates of all documents in the store. This provides a quick measure of the total size of the knowledge corpus [Source 1].

By pre-calculating and storing token estimates, YAAF's `KBStore` can maintain a low memory footprint while still having access to critical size-related metadata for its documents [Source 1].

## Sources

[Source 1] `src/knowledge/store/store.ts`