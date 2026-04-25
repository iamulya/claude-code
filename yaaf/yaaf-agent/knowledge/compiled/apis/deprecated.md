---
summary: Emits a runtime deprecation warning exactly once per unique message, guiding consumers to replacement APIs.
export_name: deprecated
source_file: src/utils/deprecation.ts
category: function
title: deprecated
entity_type: api
search_terms:
 - deprecation warning
 - how to mark API as deprecated
 - semver contract
 - runtime warnings
 - notify users of breaking changes
 - API removal notice
 - upgrade path guidance
 - log deprecation message
 - once-per-message warning
 - testing deprecations
 - _clearDeprecationCache
stub: false
compiled_at: 2026-04-24T17:01:18.854Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/deprecation.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `deprecated` function is a utility for enforcing YAAF's semantic versioning contract. It is called within code paths that are scheduled for removal in a future version. [when](./when.md) executed, it emits a runtime warning to guide consumers toward the replacement API [Source 1].

A key feature of this utility is that it only emits a warning *once* for each unique message. This prevents log spam if a deprecated function is called multiple times in a loop or during an application's lifecycle [Source 1].

This function is primarily intended for use by YAAF framework authors and plugin developers to manage the lifecycle of their public APIs.

## Signature

The function takes a message, an alternative, and optional version and callback parameters [Source 1].

```typescript
export function deprecated(
  message: string,
  alternative: string,
  removedIn?: string,
  onWarn?: (w: [[[[[[[[DeprecationWarning]]]]]]]]) => void,
): void;
```

**Parameters:**

*   `message` [string]: A description of what is deprecated and why.
*   `alternative` [string]: A description of what API or pattern callers should use instead.
*   `removedIn` [string] (optional): The semantic version number in which the deprecated API is scheduled to be removed.
*   `onWarn` [(w: DeprecationWarning) => void] (optional): An override function for emitting the warning. This is primarily used for test injection. The default behavior is to use `process.emitWarning` [Source 1].

The `onWarn` callback receives an object of type `DeprecationWarning`:

```typescript
export type DeprecationWarning = {
  message: string;
  alternative: string;
  removedInVersion?: string;
  stack?: string;
};
```

## Related Functions

### `_clearDeprecationCache()`

A related utility function is exported for testing purposes.

```typescript
export function _clearDeprecationCache(): void;
```

This function clears the internal deduplication cache, ensuring that subsequent calls to `deprecated` will emit warnings again within the same test run. It should only be used in tests [Source 1].

## Examples

The following example shows how to call `deprecated` from within a function or class method that is being deprecated [Source 1].

```typescript
import { deprecated } from 'yaaf'; // Assuming aliased import

class PerUserRateLimiter {
  public acquireRunSlot() {
    deprecated(
      'PerUserRateLimiter: `acquireRunSlot()` is deprecated.',
      'Use `checkAndAcquire()` for atomic check-and-acquire semantics.',
      '0.5.0',
    );
    
    // ... old implementation
  }

  public checkAndAcquire() {
    // ... new implementation
  }
}
```

When `acquireRunSlot()` is called for the first time, a warning similar to the following will be emitted to the console:

```
(node:12345) [YAAFDeprecationWarning]: PerUserRateLimiter: `acquireRunSlot()` is deprecated. Use `checkAndAcquire()` for atomic check-and-acquire semantics. This will be removed in version 0.5.0.
```

Subsequent calls to `acquireRunSlot()` in the same process will not produce another warning.

## Sources

[Source 1]: src/utils/deprecation.ts