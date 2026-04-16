---
title: Tool Summary
entity_type: concept
summary: The pattern of using lightweight LLMs to condense technical tool execution logs into concise, human-readable status updates.
stub: false
compiled_at: 2026-04-16T14:40:42.743Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/utils/toolSummary.ts
confidence: 0.95
---

---
title: "Tool Summary"
entity_type: "concept"
summary: "The pattern of using lightweight LLMs to condense technical tool execution logs into concise, human-readable status updates."
related_subsystems:
  - "utils"
  - "agents"

## What It Is
Tool Summary is a design pattern in YAAF used to transform technical, often verbose tool execution data into brief, human-readable descriptions. When an agent executes one or more tools, the raw inputs and outputs (such as file contents, stack traces, or API responses) can be difficult for users to parse quickly. The Tool Summary concept solves this by using a secondary, typically lightweight Large Language Model (LLM) to generate a "one-line label" that describes the outcome of the tool usage.

This pattern is particularly useful for providing status updates in user interfaces or logging systems where a high-level overview of agent activity is preferred over raw execution logs.

## How It Works in YAAF
The Tool Summary mechanism is implemented via the `generateToolUseSummary` function located in `src/utils/toolSummary.ts`. It processes a batch of tool executions and returns a single string summarizing the work performed.

### Data Structures
The framework defines the following types to support summarization:
- **ToolInfo**: Represents an individual tool execution, containing the tool `name`, the `input` provided to it, and the resulting `output`.
- **ToolSummaryConfig**: The configuration object passed to the generator. It includes the array of `ToolInfo` objects, the `ChatModel` to perform the summarization, an optional `AbortSignal`, and optional `lastAssistantText` to provide the model with context regarding the agent's intent.

### Execution Process
1. The framework collects a batch of completed `ToolInfo` objects.
2. These objects, along with the specified `ChatModel`, are passed to `generateToolUseSummary`.
3. The utility prompts the model to synthesize the technical details into a concise summary (e.g., "Fixed auth validation in auth.ts").
4. If the generation is successful, a string is returned; otherwise, the function returns `null`.

## Configuration
Developers configure tool summarization by defining a `ToolSummaryConfig` object. It is recommended to use a small, fast model for this task to minimize latency and cost.

```typescript
import { generateToolUseSummary } from './src/utils/toolSummary.js';

const summary = await generateToolUseSummary({
  tools: [
    { 
      name: 'read_file', 
      input: { path: 'src/auth.ts' }, 
      output: 'export const validate = ...' 
    },
    { 
      name: 'edit_file', 
      input: { path: 'src/auth.ts', content: '...' }, 
      output: 'OK' 
    },
  ],
  model: smallModel, // A fast, lightweight ChatModel instance
  lastAssistantText: "I will check the authentication logic and fix any bugs."
});

// Result: "Fixed auth validation in auth.ts"
```

## Sources
- `src/utils/toolSummary.ts`---