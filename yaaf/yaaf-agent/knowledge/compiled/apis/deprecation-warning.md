---
summary: Defines the structure of a deprecation warning emitted by the `deprecated` utility.
export_name: DeprecationWarning
source_file: src/utils/deprecation.ts
category: type
title: DeprecationWarning
entity_type: api
search_terms:
 - deprecation message format
 - deprecation object structure
 - deprecated utility type
 - how to handle deprecations
 - YAAF semver contract
 - runtime warning object
 - alternative API suggestion
 - removedInVersion property
 - deprecation stack trace
 - onWarn callback parameter
 - deprecated function helper
stub: false
compiled_at: 2026-04-24T17:01:17.228Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/deprecation.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `DeprecationWarning` type defines the object structure for a deprecation warning within the YAAF framework [Source 1]. It is used by the `deprecated` utility function to create a structured warning that can be emitted at runtime. This provides consumers of the framework with clear, actionable information about features that are scheduled for removal, including what to use instead and the version in which the feature will be removed [Source 1].

## Signature

`DeprecationWarning` is a TypeScript type alias for an object with the following properties [Source 1]:

```typescript
export type DeprecationWarning = {
  /**
   * The main warning message, explaining what is deprecated and why.
   */
  message: string;

  /**
   * A message suggesting what API or pattern to use as a replacement.
   */
  alternative: string;

  /**
   * An optional semantic version string indicating when the deprecated
   * feature is scheduled for complete removal.
   */
  removedInVersion?: string;

  /**
   * An optional stack trace string pointing to where the deprecated
   * code was called.
   */
  stack?: string;
};
```

## Examples

### Example Warning Object

An object conforming to the `DeprecationWarning` type might look like this. This is the kind of object passed to the `onWarn` callback in the `deprecated` function.

```typescript
const warning: DeprecationWarning = {
  message: 'PerUserRateLimiter: `acquireRunSlot()` is deprecated.',
  alternative: 'Use `checkAndAcquire()` for atomic check-and-acquire semantics.',
  removedInVersion: '0.5.0',
  stack: 'Error\n    at acquireRunSlot (/path/to/project/node_modules/yaaf/dist/index.js:1234:5)\n    at myCustomAgent (/path/to/project/src/my-agent.ts:42:10)\n    ...'
};
```

### Usage with the `deprecated` function

The `deprecated` function constructs a `DeprecationWarning` object from its arguments and emits it.

```typescript
import { deprecated } from 'yaaf/utils/deprecation';

// This call will generate a DeprecationWarning object internally.
deprecated(
  'PerUserRateLimiter: `acquireRunSlot()` is deprecated.', // -> message
  'Use `checkAndAcquire()` for atomic check-and-acquire semantics.', // -> alternative
  '0.5.0' // -> removedInVersion
);
```

## See Also

* The `deprecated` function, which creates and emits `DeprecationWarning` objects.

## Sources

[Source 1]: src/utils/deprecation.ts