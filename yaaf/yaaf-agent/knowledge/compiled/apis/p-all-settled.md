---
title: pAllSettled
entity_type: api
summary: Executes async task factories with a bounded concurrency limit, returning results in input order.
export_name: pAllSettled
source_file: src/knowledge/utils/concurrency.ts
category: function
search_terms:
 - bounded concurrency
 - concurrent task execution
 - limit parallel promises
 - promise pool
 - async task queue
 - control promise concurrency
 - Promise.allSettled with limit
 - run async functions in parallel
 - throttle async operations
 - concurrent fetch requests
 - batch async tasks
 - manage promise execution
stub: false
compiled_at: 2026-04-24T17:25:38.526Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/tfidfSearch.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/utils/concurrency.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `pAllSettled` function provides a bounded concurrency pool for executing asynchronous tasks [Source 2]. It takes an array of zero-argument async task factories and runs them with a specified maximum number of concurrent executions.

This utility's semantics are designed to match `Promise.allSettled`. All tasks are run to completion, whether they fulfill or reject, and there is no early termination if one task fails. The results are returned in an array that corresponds to the order of the input tasks [Source 2].

This function was created to centralize logic that was previously duplicated in multiple places within the YAAF codebase [Source 2].

## Signature

```typescript
export function pAllSettled<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
): Promise<Array<PromiseSettledResult<T>>>
```

### Parameters

-   **`tasks`**: `Array<() => Promise<T>>`
    An array of zero-argument functions, where each function returns a `Promise`. These are the asynchronous tasks to be executed.

-   **`limit`**: `number`
    The maximum number of tasks to run concurrently. The value is clamped to be at least 1.

### Returns

-   `Promise<Array<PromiseSettledResult<T>>>`
    A `Promise` that resolves to an array of `PromiseSettledResult` objects. Each object represents the outcome of a corresponding task from the input array, and the results are guaranteed to be in the same order as the input tasks.

## Examples

The following example demonstrates fetching multiple URLs with a concurrency limit of 8.

```typescript
const urls = [
  'https://api.example.com/data/1',
  'https://api.example.com/data/2',
  // ... more urls
];

const results = await pAllSettled(
  urls.map(url => () => fetch(url)),
  8, // max 8 concurrent fetches
);

for (const result of results) {
  if (result.status === 'fulfilled') {
    console.log('Fetched data:', result.value);
  } else {
    console.error('Fetch failed:', result.reason);
  }
}
```
[Source 2]

## Sources

[Source 1]: src/knowledge/store/tfidfSearch.ts
[Source 2]: src/knowledge/utils/concurrency.ts