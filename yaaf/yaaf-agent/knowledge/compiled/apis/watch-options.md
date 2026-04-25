---
summary: The `WatchOptions` type defines parameters for the YAAF Doctor daemon's file watching and automated diagnosis behavior.
export_name: WatchOptions
source_file: src/doctor/index.ts
category: type
title: WatchOptions
entity_type: api
search_terms:
 - doctor daemon configuration
 - file watcher options
 - auto diagnose settings
 - error debouncing
 - configure yaaf doctor watch
 - how to control doctor daemon
 - debounceMs
 - maxBufferSize
 - autoDiagnose
 - YAAF Doctor watcher
 - proactive error detection
 - control diagnosis frequency
 - yaaf doctor watch mode
 - error buffer settings
stub: false
compiled_at: 2026-04-24T17:49:16.168Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/doctor/index.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `WatchOptions` type is a configuration object used to control the behavior of the `YaafDoctor` [when](./when.md) it runs in a "watch" or "daemon" mode, proactively monitoring a project for issues. It allows developers to fine-tune how the Doctor responds to detected errors, such as compilation failures.

These options are particularly useful for managing performance and avoiding excessive notifications or [LLM](../concepts/llm.md) calls during periods of heavy development, where many transient errors can occur in quick succession. By adjusting debouncing, buffer sizes, and the auto-diagnosis feature, one can tailor the Doctor's responsiveness to their [workflow](../concepts/workflow.md).

## Signature

`WatchOptions` is a TypeScript type alias for an object with the following properties:

```typescript
export type WatchOptions = {
  /**
   * How long to wait (ms) after the last error before flushing the
   * buffer and triggering diagnosis. Prevents flooding on cascading errors.
   * Default: 2000ms
   */
  debounceMs?: number;

  /**
   * Maximum errors to accumulate before force-flushing regardless of debounce.
   * Default: 5
   */
  maxBufferSize?: number;

  /**
   * Whether to use the Doctor's LLM to diagnose accumulated errors.
   * If false, raw [[[[[[[[DoctorIssue]]]]]]]] events are still emitted via onIssue().
   * Default: true
   */
  autoDiagnose?: boolean;
};
```

## Examples

### Customizing Debounce and Buffer Size

This example defines a `WatchOptions` object for a less aggressive watcher. It waits longer after the last error before triggering a diagnosis and has a smaller error buffer.

```typescript
import type { WatchOptions } from 'yaaf';

// Configuration for a less aggressive watcher
const customWatchOptions: WatchOptions = {
  // Wait 5 seconds after the last error before diagnosing
  debounceMs: 5000,
  // Only buffer up to 3 errors before force-diagnosing
  maxBufferSize: 3,
};

// This options object would be passed to a method on a YaafDoctor instance
// that initiates the watch mode.
```

### Disabling Auto-Diagnosis

This example shows how to configure the watcher to report issues as they are detected without automatically sending them to an LLM for analysis. This is useful for a lightweight, reporting-only mode.

```typescript
import type { WatchOptions } from 'yaaf';

// Configuration to only report errors without LLM diagnosis
const reportingOnlyOptions: WatchOptions = {
  // Disable the LLM-based diagnosis step
  autoDiagnose: false,
};

// When using these options, one would typically listen for the `onIssue`
// event on the YaafDoctor instance to process the raw DoctorIssue events.
```

## See Also

*   **YaafDoctor**: The primary class that utilizes `WatchOptions` to configure its daemon mode.
*   **DoctorIssue**: The type representing a single issue detected by the `YaafDoctor`, which is emitted regardless of the `autoDiagnose` setting.

## Sources

*   [Source 1]: src/doctor/index.ts