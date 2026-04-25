---
summary: The structured output from a tool's execution, which can include data, errors, and metadata, serving as factual evidence for the agent.
title: tool results
entity_type: concept
related_subsystems:
 - Agent Core
 - Security
see_also:
 - "[Tool Calls](./tool-calls.md)"
 - "[Tool Execution](./tool-execution.md)"
 - "[Grounding (LLM)](./grounding-llm.md)"
 - "[Tool Result Budget](./tool-result-budget.md)"
 - "[Context Window Management](./context-window-management.md)"
search_terms:
 - tool output
 - what is a tool result
 - tool execution output
 - how to return data from a tool
 - tool error handling
 - tool result structure
 - tool result metadata
 - grounding against tool output
 - evidence for LLM response
 - truncating tool results
 - managing tool result size
 - ToolResult object
stub: false
compiled_at: 2026-04-25T00:26:04.796Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/tools.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/groundingValidator.ts
compiled_from_quality: unknown
confidence: 1
---

## What It Is

A Tool Result is a structured object returned by a tool's `call` function following a [Tool Execution](./tool-execution.md). It represents the outcome of an action taken by an agent and is a specific message type in the conversation history.

Tool Results serve two primary purposes in the YAAF framework:

1.  **Informing the LLM:** The result provides the Large Language Model (LLM) with the information it requested by making a [tool call](./tool-calls.md). This output is added to the conversation history, becoming part of the context for the LLM's next reasoning step.
2.  **Providing Factual Evidence:** Tool Results form an "evidence corpus" within the conversation history. Subsystems like the [GroundingValidator](../apis/grounding-validator.md) use this evidence to cross-reference the LLM's final response, ensuring its claims are factually grounded in the information gathered by the tools and reducing the risk of [Hallucination (LLM)](./hallucination-llm.md) [Source 2].

## How It Works in YAAF

When a tool's `call` function completes, it must return an object conforming to the [ToolResult](../apis/tool-result.md) interface. This object is then serialized and placed into the agent's turn history for the LLM to consume [Source 1].

The structure of a Tool Result object can represent success, failure, or include additional metadata [Source 1]:

*   **`data`**: (string) The primary payload of the result. This is the information the LLM will use.
*   **`error`**: (string, optional) If present, indicates that the tool execution failed. The LLM can use this error message to retry the operation or try a different approach.
*   **`metadata`**: (object, optional) An object for supplementary information that is not part of the primary payload, such as caching status or data source.

**Example of a successful result:**
```typescript
// Success
return { data: 'Search results...' };
```
[Source 1]

**Example of an error result:**
```typescript
// Error
return { data: '', error: 'API rate limited' };
```
[Source 1]

**Example of a result with metadata:**
```typescript
// With metadata
return {
  data: results,
  metadata: { cached: true, source: 'redis' },
};
```
[Source 1]

Once in the conversation history, these results are used by various parts of the framework. The [GroundingValidator](../apis/grounding-validator.md), for instance, parses all tool results in the current context to check if the LLM's subsequent statements are supported by the evidence they contain [Source 2].

## Configuration

The size of tool results can significantly impact the [Context Window](./context-window.md), and YAAF provides mechanisms to manage this at both the tool and agent level.

### Per-Tool Truncation

A single tool can have its output truncated by setting the `maxResultChars` property in its definition. This is a hard limit on the length of the `data` string for that specific tool [Source 1].

```typescript
const weatherTool = buildTool({
  name: 'get_weather',
  description: 'Get current weather for a location.',
  inputSchema: { /* ... */ },
  maxResultChars: 2000, // Truncate results longer than this
  async call({ location, units = 'celsius' }, ctx) {
    // ...
  },
});
```
[Source 1]

### Agent-Level Budgeting

At the agent level, a [Tool Result Budget](./tool-result-budget.md) can be configured to manage the total context space consumed by all tool results combined. This is useful for preventing [Context Overflow](./context-overflow.md) in long conversations with many tool calls [Source 1].

The `toolResultBudget` configuration on an agent allows setting limits on both individual results and the total character count, with a strategy for how to enforce the budget, such as truncating the oldest results first.

```typescript
const agent = new Agent({
  tools: [...],
  systemPrompt: '...',
  // Truncate old tool results to save context space
  toolResultBudget: {
    maxCharsPerResult: 5000,
    maxTotalChars: 20000,
    strategy: 'truncate-oldest',
  },
});
```
[Source 1]

## Sources
[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/tools.md
[Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/groundingValidator.ts