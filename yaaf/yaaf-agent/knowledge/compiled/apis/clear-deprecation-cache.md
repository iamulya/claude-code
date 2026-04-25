---
summary: Clears the internal deduplication cache for deprecation warnings, intended for testing purposes.
export_name: _clearDeprecationCache
source_file: src/utils/deprecation.ts
category: function
title: _clearDeprecationCache
entity_type: api
search_terms:
 - testing deprecation warnings
 - reset deprecation cache
 - how to test deprecated functions
 - ensure deprecation warning fires in test
 - deprecation deduplication
 - clear warning cache
 - test utility for warnings
 - YAAF testing helpers
 - deprecation test setup
 - resetting global state in tests
 - test isolation for warnings
stub: false
compiled_at: 2026-04-24T16:55:19.718Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/deprecation.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `_clearDeprecationCache` function is a testing utility that resets the internal cache used by the `[[[[[[[[deprecated]]]]]]]]` function.

YAAF's `deprecated` function is designed to emit a specific deprecation warning only once per process execution, regardless of how many times the deprecated code path is hit [Source 1]. This prevents spamming the console with redundant warnings. This behavior is managed by an internal deduplication cache.

During testing, it is often necessary to verify that a deprecation warning is emitted in multiple, independent test cases. Without clearing the cache between tests, only the first test to trigger a specific warning would succeed, and subsequent tests for the same warning would fail.

`_clearDeprecationCache` solves this by clearing the cache, ensuring a clean state for each test. It should be called in a test setup hook, such as `beforeEach` or `afterEach`, to guarantee test isolation [Source 1]. This function is intended exclusively for use in test environments and should not be called in production code.

## Signature

The function takes no arguments and returns nothing.

```typescript
export function _clearDeprecationCache(): void;
```

## Examples

The most common use case is within a test suite's setup or teardown hooks (e.g., `afterEach` in Jest or Vitest) to ensure that each test runs in isolation.

```typescript
import { deprecated, _clearDeprecationCache } from 'yaaf';
import { describe, it, expect, afterEach, vi } from 'vitest';

// A hypothetical legacy function that triggers a deprecation warning.
function someLegacyApiCall() {
  deprecated(
    'someLegacyApiCall() is deprecated.',
    'Please use the new shinyNewApiCall() instead.',
    'v1.0.0'
  );
  return 'old result';
}

// Mock process.emitWarning to spy on calls.
const mockWarningEmitter = vi.spyOn(process, 'emitWarning').mockImplementation(() => {});

describe('someLegacyApiCall', () => {
  // After each test, clear the cache to reset the warning state.
  afterEach(() => {
    _clearDeprecationCache();
    mockWarningEmitter.mockClear();
  });

  it('should emit a deprecation warning on its first invocation', () => {
    someLegacyApiCall();
    expect(mockWarningEmitter).toHaveBeenCalledTimes(1);
    expect(mockWarningEmitter).toHaveBeenCalledWith(
      expect.stringContaining('someLegacyApiCall() is deprecated.')
    );
  });

  it('should also emit a warning in a separate test', () => {
    // This test would fail without _clearDeprecationCache() in afterEach,
    // as the warning for this message would have already been emitted.
    someLegacyApiCall();
    expect(mockWarningEmitter).toHaveBeenCalledTimes(1);
    expect(mockWarningEmitter).toHaveBeenCalledWith(
      expect.stringContaining('someLegacyApiCall() is deprecated.')
    );
  });
});
```

## See Also

- `deprecated`: The function that emits warnings and whose cache is cleared by this utility.

## Sources

[Source 1]: src/utils/deprecation.ts