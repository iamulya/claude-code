---
export_name: SequentialConfig
source_file: src/agents/workflow.ts
category: type
title: SequentialConfig
entity_type: api
summary: Configuration options for a sequential workflow agent created with the `sequential` function.
search_terms:
 - sequential agent configuration
 - workflow step transform
 - pass data between agents
 - modify agent output
 - sequential workflow options
 - chaining agents together
 - pipeline agent settings
 - customize sequential execution
 - transform function in workflow
 - step output manipulation
 - sequential function config
stub: false
compiled_at: 2026-04-24T17:36:51.192Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/workflow.ts
compiled_from_quality: unknown
confidence: 0.99
---

## Overview

The `SequentialConfig` type defines the configuration options for a sequential [workflow](../concepts/workflow.md) agent created using the `sequential` function [Source 1]. It allows for customizing the workflow's name for tracing and defining a transformation function to modify the output of each step before it is passed as input to the next [Source 1].

This configuration object is optional. If not provided, the `sequential` function uses default behaviors, such as naming the workflow 'sequential' and passing data between steps without modification [Source 1].

## Signature

The `SequentialConfig` type is an object with the following optional properties [Source 1]:

```typescript
export type SequentialConfig = {
  /** Name for this workflow instance (default: 'sequential') */
  name?: string;
  /**
   * Transform the output of step N before passing to step N+1.
   * Default: passes output directly as the next input.
   */
  transform?: (output: string, stepIndex: number, stepCount: number) => string;
};
```

### Properties

*   **`name`**: `string` (optional)
    A descriptive name for the workflow instance, primarily used for debugging and tracing. If not provided, it defaults to `'sequential'` [Source 1].

*   **`transform`**: `(output: string, stepIndex: number, stepCount: number) => string` (optional)
    A function that is called after each step (except the last one) completes. It receives the output of the completed step (`output`), its zero-based index (`stepIndex`), and the total number of steps (`stepCount`). The function's return value is then used as the input for the subsequent step. If this property is not defined, the output of a step is passed directly to the next step without modification [Source 1].

## Examples

The following example demonstrates how to use `SequentialConfig` to name a workflow and transform the data passed between two agents.

```typescript
import { sequential } from 'yaaf';
import type { WorkflowStep } from 'yaaf';

// Mock agents for demonstration purposes
const researcher: WorkflowStep = {
  run: async (topic: string) => `Here is detailed research about ${topic}.`,
};

const writer: WorkflowStep = {
  run: async (research: string) => `Based on the provided information, I have written an article. ${research}`,
};

// Create a sequential pipeline with custom configuration
const pipeline = sequential(
  [researcher, writer],
  {
    name: 'ResearchAndWritePipeline',
    transform: (output, stepIndex) => {
      // This function runs after each step.
      // We'll add a prefix to the researcher's output before it goes to the writer.
      if (stepIndex === 0) { // After the researcher step
        return `WRITER_PROMPT: Use the following research to write an article.\n\n${output}`;
      }
      // For any other steps, pass the output through unchanged.
      return output;
    },
  }
);

// Run the pipeline
const finalArticle = await pipeline.run('the history of YAAF');

console.log(finalArticle);
/*
Expected output:
Based on the provided information, I have written an article. WRITER_PROMPT: Use the following research to write an article.

Here is detailed research about the history of YAAF.
*/
```

## See Also

*   `sequential` function: The factory function that creates a sequential workflow and accepts this configuration.
*   `WorkflowAgent` type: The return type of the `sequential` function, representing the runnable workflow.
*   `WorkflowStep` type: The interface for agents or sub-workflows that can be included in a sequential pipeline.

## Sources

[Source 1]: src/agents/workflow.ts