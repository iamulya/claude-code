---
summary: Represents the result of inspecting a context section, detailing its character count, droppability, and inclusion status.
export_name: ContextInspection
source_file: src/agents/contextEngine.ts
category: type
title: ContextInspection
entity_type: api
search_terms:
 - context engine report
 - system prompt analysis
 - token budget inspection
 - droppable section status
 - context section metadata
 - how to check if context was included
 - prompt size breakdown
 - context character count
 - included context sections
 - prompt optimization result
 - ContextEngine output
stub: false
compiled_at: 2026-04-24T16:57:57.225Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/contextEngine.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `ContextInspection` type is a data structure that provides a report on a single `ContextSection` after it has been processed by the `ContextEngine`. It is used to understand how the `ContextEngine` assembled the final [System Prompt](../concepts/system-prompt.md), especially [when](./when.md) a character limit (`maxChars`) is enforced.

Each `ContextInspection` object details whether a specific section was included in the final prompt, its character count, and whether it was designated as droppable. This is primarily useful for debugging, logging, and analyzing the prompt construction process to see which pieces of context were omitted due to size constraints. An array of `ContextInspection` objects is typically returned by methods that build or analyze context.

## Signature

`ContextInspection` is a TypeScript type alias for an object with the following structure [Source 1]:

```typescript
export type ContextInspection = {
  /** The 'id' of the corresponding ContextSection */
  section: string;
  
  /** The number of characters in the section's content */
  charCount: number;
  
  /** Whether the section was marked as droppable */
  droppable: boolean;
  
  /** Whether the section was included in the final prompt */
  included: boolean;
};
```

### Properties

| Property    | Type      | Description                                                                 |
|-------------|-----------|-----------------------------------------------------------------------------|
| `section`   | `string`  | The unique `id` of the `ContextSection` this inspection report refers to.     |
| `charCount` | `number`  | The total number of characters in the `content` of the section.             |
| `droppable` | `boolean` | A flag indicating if the original `ContextSection` was marked as `droppable`. |
| `included`  | `boolean` | `true` if the section was included in the final prompt, `false` if it was dropped due to character limits. |

## Examples

Below is a hypothetical example of an array of `ContextInspection` objects that might be returned from a `ContextEngine` instance. In this scenario, the engine was configured with a character limit that forced it to drop the lowest-priority droppable section (`'historical-context'`).

```typescript
// This is a hypothetical result from a ContextEngine method.
const inspectionResults: ContextInspection[] = [
  {
    section: 'core-rules',
    charCount: 500,
    droppable: false,
    included: true,
  },
  {
    section: 'recent-conversation',
    charCount: 1200,
    droppable: true,
    included: true,
  },
  {
    section: 'historical-context',
    charCount: 2500,
    droppable: true,
    included: false, // This section was dropped to meet the char limit
  },
];

// You can then analyze the results
const droppedSections = inspectionResults
  .filter(result => !result.included)
  .map(result => result.section);

console.log(droppedSections); // Output: ['historical-context']

const totalCharsIncluded = inspectionResults
  .filter(result => result.included)
  .reduce((sum, result) => sum + result.charCount, 0);

console.log(`Total characters in prompt: ${totalCharsIncluded}`); // Output: Total characters in prompt: 1700
```

## See Also

- `ContextEngine`: The class that processes context sections and produces `ContextInspection` reports.
- `ContextSection`: The type definition for a piece of content managed by the `ContextEngine`.

## Sources

[Source 1]: src/agents/contextEngine.ts