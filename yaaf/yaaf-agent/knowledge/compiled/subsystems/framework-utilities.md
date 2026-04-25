---
summary: Provides a runtime utility for issuing deprecation warnings to developers, enforcing the framework's semantic versioning contract.
primary_files:
 - src/utils/deprecation.ts
title: Framework Utilities
entity_type: subsystem
exports:
 - deprecated
 - DeprecationWarning
 - _clearDeprecationCache
search_terms:
 - how to deprecate a function
 - semver contract enforcement
 - runtime deprecation warning
 - API removal notice
 - framework versioning
 - deprecated function helper
 - upgrade path guidance
 - log deprecated API usage
 - semantic versioning utilities
 - code removal schedule
stub: false
compiled_at: 2026-04-25T00:28:20.005Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/deprecation.ts
compiled_from_quality: unknown
confidence: 0.85
---

## Purpose

The Deprecation Management subsystem provides a standardized mechanism for signaling that a part of the YAAF framework is scheduled for removal in a future version. It helps enforce the framework's semantic versioning contract by emitting runtime warnings to developers who use deprecated code paths. This gives consumers advance notice of breaking changes and guides them toward the recommended replacement APIs, ensuring a smoother upgrade path [Source 1].

## Architecture

The subsystem is centered around the `deprecated` function. To prevent log spam, it maintains an internal, in-memory deduplication cache. This ensures that each unique deprecation warning is emitted only once during the application's lifecycle. The default mechanism for emitting the warning is the standard Node.js `process.emitWarning` function. A `DeprecationWarning` type defines the structured data for a warning, including the core message, the suggested alternative, and the version in which the feature is slated for removal [Source 1].

For testing purposes, the subsystem exposes a private function, `_clearDeprecationCache`, to reset the deduplication cache, and the `deprecated` function accepts an optional `onWarn` callback to inject a custom warning handler [Source 1].

## Key APIs

- **`deprecated(message, alternative, removedIn, onWarn)`**: The primary function used to issue a warning. It is called from within a code path that is being deprecated. It logs a warning message to the console exactly once per unique message [Source 1].
- **`DeprecationWarning`**: A type definition for the warning object, containing `message`, `alternative`, `removedInVersion`, and an optional `stack` trace [Source 1].
- **`_clearDeprecationCache()`**: A utility function intended only for use in tests to clear the internal cache of emitted warnings [Source 1].

An example of its usage is as follows [Source 1]:

```typescript
import { deprecated } from 'yaaf/utils/deprecation'

// In a constructor or function body:
deprecated(
  'PerUserRateLimiter: `acquireRunSlot()` is deprecated.',
  'Use `checkAndAcquire()` for atomic check-and-acquire semantics.',
  '0.5.0',
)
```

## Extension Points

The primary extension point is the optional `onWarn` parameter of the `deprecated` function. This allows developers, particularly during testing, to override the default warning mechanism (`process.emitWarning`) and inject a custom function to handle the `DeprecationWarning` object. This is useful for asserting that specific deprecation warnings are correctly triggered under test conditions [Source 1].

## Sources

[Source 1]: src/utils/deprecation.ts