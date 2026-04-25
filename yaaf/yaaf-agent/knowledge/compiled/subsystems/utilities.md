---
title: Utilities
entity_type: subsystem
summary: A collection of general-purpose utility functions and helpers used across the YAAF framework.
primary_files:
 - src/knowledge/utils/concurrency.js
exports:
 - pAllSettled
search_terms:
 - promise helpers
 - concurrent operations
 - asynchronous utilities
 - Promise.allSettled alternative
 - framework helpers
 - shared functions
 - how to run promises in parallel
 - pAllSettled function
 - common code library
 - YAAF helper functions
stub: false
compiled_at: 2026-04-24T18:21:17.181Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/tfidfSearch.ts
compiled_from_quality: unknown
confidence: 0.8
---

## Purpose

The Utilities subsystem provides a collection of common, reusable functions that support various components across the YAAF framework. Its primary purpose is to centralize shared logic, such as managing asynchronous operations, to prevent code duplication and promote consistent implementation patterns.

## Architecture

The subsystem is structured as a library of helper modules, with each module focusing on a specific domain of functionality. Based on available source code, one of the key modules is dedicated to concurrency management. The primary file identified within this subsystem is `src/knowledge/utils/concurrency.js`, which contains utilities for handling asynchronous tasks [Source 1].

## Integration Points

Other subsystems within YAAF consume functions from the Utilities subsystem to perform common tasks. For example, the `TfIdfSearchPlugin`, a component of the [Knowledge Store](../apis/knowledge-store.md), imports and utilizes the `pAllSettled` function from the concurrency module to manage its internal operations [Source 1]. This indicates that components dealing with parallel or asynchronous processing rely on this subsystem.

## Key APIs

- **`pAllSettled`**: A function for managing concurrent promise execution. It is exported from the `src/knowledge/utils/concurrency.js` module [Source 1].

## Sources

[Source 1]: src/knowledge/store/tfidfSearch.ts