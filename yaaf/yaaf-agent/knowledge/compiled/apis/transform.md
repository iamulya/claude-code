---
title: transform
entity_type: api
summary: Creates a simple pass-through step that transforms text without calling an LLM.
export_name: transform
source_file: src/agents/workflow.ts
category: function
stub: false
compiled_at: 2026-04-16T14:15:36.782Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/workflow.ts
confidence: 1
---

## Overview
The `transform` function is a utility used within YAAF workflows to modify data as it passes between agents. Unlike standard agents or runners, `transform` does not invoke a Large Language Model (LLM). Instead, it executes a provided synchronous or asynchronous JavaScript function to manipulate the input string.

This is typically used for:
- Formatting the output of one agent before it is passed to the next.
- Cleaning or filtering data.
- Wrapping text in specific prompts or templates.
- Injecting metadata into the workflow stream.

## Signature / Constructor

```typescript
export function transform(
  fn: (input: string) => string | Promise<string>,
): WorkflowStep
```

### Parameters
- `fn`: A transformation function that accepts the current input string and returns a modified string (or a Promise resolving to one).

### Returns
Returns a `WorkflowStep` object, which is a lightweight execution unit compatible with workflow orchestrators like `sequential`, `parallel`, and `loop`.

## Methods & Properties
The object returned by `transform` implements the `WorkflowStep` interface:

### run()
```typescript
run(input: string, signal?: AbortSignal): Promise<string>
```
Executes the transformation function provided during the creation of the step.
- **input**: The string to be transformed.
- **signal**: An optional `AbortSignal` to handle execution cancellation.
- **Returns**: A `Promise` resolving to the transformed string.

## Examples

### Sequential Pipeline Transformation
In this example, `transform` is used to add context to a researcher's output before it is handed off to a reviewer.

```typescript
import { sequential, transform } from 'yaaf';

const pipeline = sequential([
  researcher,
  transform(output => `Please review this research:\n${output}`),
  reviewer,
]);

const result = await pipeline.run('Latest trends in renewable energy');
```

### Asynchronous Transformation
`transform` can also handle asynchronous operations, such as fetching external data or performing complex computations.

```typescript
const augmentStep = transform(async (input) => {
  const extraData = await fetchExternalContext(input);
  return `${input}\n\nAdditional Context: ${extraData}`;
});
```

## See Also
- `sequential`
- `parallel`
- `loop`
- `asStep`