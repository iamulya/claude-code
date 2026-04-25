---
summary: Provides utilities for managing and emitting runtime deprecation warnings to enforce YAAF's semver contract.
primary_files:
 - src/utils/deprecation.ts
title: Deprecation Management
entity_type: subsystem
exports:
 - deprecated
 - _clearDeprecationCache
 - DeprecationWarning
search_terms:
 - semver contract
 - runtime deprecation warning
 - how to deprecate a function
 - API removal notice
 - semantic versioning enforcement
 - upgrade path guidance
 - avoiding breaking changes
 - deprecated API usage
 - log deprecation message
 - future removal warning
 - YAAF versioning policy
 - API lifecycle
stub: false
compiled_at: 2026-04-24T18:12:05.979Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/deprecation.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Deprecation Management subsystem provides a standardized mechanism for YAAF framework developers to mark parts of the API as [deprecated](../apis/deprecated.md). Its primary purpose is to enforce the framework's semantic versioning (semver) contract by emitting runtime warnings [when](../apis/when.md) deprecated code paths are executed [Source 1]. This guides consumers to updated APIs and provides clear notice about which features are scheduled for removal and in which future version, ensuring a smoother upgrade path for users [Source 1].

## Architecture

The subsystem is centered around the `deprecated` function, which is designed to be called from within code that is being phased out. A key architectural feature is its internal deduplication cache, which ensures that any unique deprecation warning is emitted only once per process lifetime, preventing log spam [Source 1].

When a warning is triggered, it is packaged into a `DeprecationWarning` object containing the core message, a suggested alternative, the version in which the feature will be removed, and a stack [Trace](../concepts/trace.md) [Source 1]. By default, these warnings are emitted using the standard Node.js `process.emitWarning` function. However, the warning mechanism can be overridden via a parameter, which is primarily intended for test injection [Source 1]. A special function, `_clearDeprecationCache`, is also exposed exclusively for clearing the deduplication cache during testing [Source 1].

## Integration Points

Other subsystems and components within the YAAF framework integrate with this utility by directly calling the `deprecated` function. This is typically done at the beginning of a function, method, or constructor that is scheduled for removal.

For example, a class method being replaced would include a call like this [Source 1]:
```typescript
import { deprecated } from 'yaaf/utils/deprecation'

class PerUserRateLimiter {
  acquireRunSlot() {
    deprecated(
      'PerUserRateLimiter: `acquireRunSlot()` is deprecated.',
      'Use `checkAndAcquire()` for atomic check-and-acquire semantics.',
      '0.5.0',
    );
    // ... old implementation
  }
}
```

## Key APIs

### `deprecated()`
The primary function for emitting a deprecation warning. It is designed to be called exactly once per unique message during an application's runtime [Source 1].

**Signature:**
```typescript
export function deprecated(
  message: string,
  alternative: string,
  removedIn?: string,
  onWarn?: (w: DeprecationWarning) => void,
): void
```

**Parameters:**
- `message`: A string describing what is deprecated and why.
- `alternative`: A string explaining what developers should use instead.
- `removedIn`: An optional semver version string indicating when the feature will be completely removed.
- `onWarn`: An optional callback to override the default warning emission logic, mainly for testing.

### `_clearDeprecationCache()`
A utility function intended for use in tests only. It clears the internal cache that tracks which warnings have already been emitted [Source 1].

### `DeprecationWarning`
The type definition for the warning object passed to the `onWarn` handler [Source 1].

**Shape:**
```typescript
export type DeprecationWarning = {
  message: string;
  alternative: string;
  removedInVersion?: string;
  stack?: string;
};
```

## Extension Points

The main extension point is the optional `onWarn` parameter of the `deprecated` function. This allows developers, particularly during testing, to inject a custom function to handle the `DeprecationWarning` object. This can be used to intercept warnings and make assertions about them instead of printing them to the console [Source 1].

## Sources

[Source 1]: src/utils/deprecation.ts