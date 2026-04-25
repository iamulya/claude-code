---
title: SynthesisProgressEvent
entity_type: api
summary: Defines the structure of progress events emitted by the Knowledge Synthesizer during a compilation run.
export_name: SynthesisProgressEvent
source_file: src/knowledge/compiler/synthesizer/types.ts
category: type
search_terms:
 - knowledge synthesizer events
 - compilation progress updates
 - how to track synthesis
 - onProgress callback type
 - real-time compilation status
 - article synthesis started
 - CLI progress display
 - monitoring knowledge base build
 - synthesizer event structure
 - YAAF compilation lifecycle
 - article:started event
stub: false
compiled_at: 2026-04-24T17:42:49.005Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/synthesizer/index.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/synthesizer/types.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `SynthesisProgressEvent` type defines the structure of event objects emitted by the [Knowledge Synthesizer](../subsystems/knowledge-synthesizer.md) during a knowledge base compilation run [Source 2]. Its primary purpose is to enable real-time progress reporting, which is particularly useful for command-line interface ([CLI](../subsystems/cli.md)) [Tools](../subsystems/tools.md) that need to display the status of a long-running synthesis process [Source 2].

These events are consumed via the `onProgress` callback function, which can be provided in the `SynthesisOptions` [when](./when.md) initiating a synthesis run [Source 2].

## Signature

`SynthesisProgressEvent` is a discriminated union type. As of the current version, it has one possible shape, identified by the `type` property [Source 2].

```typescript
import type { ArticleAction } from "../extractor/index.js";

export type SynthesisProgressEvent =
  | { type: "article:started"; docId: string; action: ArticleAction; title: string };
```

### Properties

The `article:started` event contains the following properties:

*   `type: "article:started"`: The event discriminator, indicating that the synthesis process for a specific article has begun.
*   `docId: string`: The unique identifier for the article being processed. This is typically the file path relative to the compiled output directory.
*   `action: ArticleAction`: The operation being performed on the article, such as creation or update. The `ArticleAction` type is imported from the extractor subsystem.
*   `title: string`: The title of the article that is about to be synthesized.

## Examples

The most common use of `SynthesisProgressEvent` is to define an `onProgress` callback function to log the progress of a knowledge base compilation.

```typescript
import type { SynthesisProgressEvent, SynthesisOptions } from 'yaaf';

/**
 * A handler function that processes progress events and logs them to the console.
 */
function logSynthesisProgress(event: SynthesisProgressEvent): void {
  switch (event.type) {
    case 'article:started':
      console.log(
        `[${event.action.toUpperCase()}] Starting synthesis for article: "${event.title}" (${event.docId})`
      );
      break;
    // As more event types are added, they can be handled here.
    default:
      console.log('Received an unknown progress event.');
  }
}

/**
 * Example of using the handler in SynthesisOptions.
 * This options object would be passed to a synthesizer instance.
 */
const options: SynthesisOptions = {
  concurrency: 4,
  onProgress: logSynthesisProgress,
  // ... other options
};

// Hypothetical usage with a synthesizer:
// await knowledgeSynthesizer.run(compilationPlan, options);
```

## See Also

*   `SynthesisOptions`: The configuration object where an `onProgress` callback using this event type is provided.
*   `SynthesisResult`: The final result object returned after the synthesis process, which these events monitor, is complete.

## Sources

*   [Source 1]: `src/knowledge/compiler/synthesizer/index.ts`
*   [Source 2]: `src/knowledge/compiler/synthesizer/types.ts`