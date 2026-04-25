---
title: RuntimeStreamEvent
entity_type: api
summary: Simplified stream event for runtime consumers (CLI, server, worker).
export_name: RuntimeStreamEvent
source_file: src/runtime/adapter.ts
category: type
search_terms:
 - agent stream events
 - CLI streaming output
 - server-sent events format
 - agent runtime events
 - text delta event
 - tool call stream
 - token usage event
 - final response event
 - how to consume agent stream
 - StreamableAgent event type
 - adaptStream output
 - RunnerStreamEvent vs RuntimeStreamEvent
stub: false
compiled_at: 2026-04-24T17:34:38.516Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/cli-runtime.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/runtime/adapter.ts
compiled_from_quality: unknown
confidence: 0.99
---

## Overview

`RuntimeStreamEvent` is a simplified, consumer-facing type representing events emitted by a [Streaming](../concepts/streaming.md) agent. It is the common event type expected by YAAF's runtime harnesses, such as `create[[[[[[[[CLI]]]]]]]]`, `createServer`, and `createWorker` [Source 2].

This type serves as an abstraction layer, bridging the gap between the detailed internal events produced by the agent's core runner (`RunnerStreamEvent`) and the needs of external consumers. It strips away internal details like iteration counts and raw [LLM](../concepts/llm.md) request metadata to provide a clean, stable interface for building user-facing applications [Source 2].

The `adaptStream` function and the `toStreamableAgent` wrapper are used to convert an agent's native `RunnerStreamEvent` stream into a `RuntimeStreamEvent` stream [Source 2].

## Signature

`RuntimeStreamEvent` is a discriminated union type, where the `type` property identifies the kind of event.

```typescript
type RuntimeStreamEvent =
  | { type: "text_delta"; text: string }
  | { type: "tool_call_start"; toolName: string; args?: any }
  | { type: "tool_call_end"; toolName: string; durationMs?: number; error?: Error }
  | { type: "tool_blocked"; toolName: string; reason: string }
  | { type: "usage"; promptTokens: number; completionTokens: number; totalCalls: number }
  | { type: "done"; text: string };
```

### Event Types

The following table describes each event in the union [Source 1]:

| Event Type          | Fields                                                     | Description                                                              |
| ------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------ |
| `text_delta`        | `text: string`                                             | A token or chunk of text from the LLM's streaming response.              |
| `tool_call_start`   | `toolName: string`, `args?: any`                           | Signals that the agent is beginning to execute a tool.                   |
| `tool_call_end`     | `toolName: string`, `durationMs?: number`, `error?: Error` | Signals that a [Tool Execution](../concepts/tool-execution.md) has completed, either successfully or not. |
| `tool_blocked`      | `toolName: string`, `reason: string`                       | Indicates that a tool call was attempted but denied by a permission check. |
| `usage`             | `promptTokens`, `completionTokens`, `totalCalls`           | Provides token usage and tool call statistics for the run.               |
| `done`              | `text: string`                                             | The final, complete response from the agent after all steps are finished. |

## Examples

The primary use case for `RuntimeStreamEvent` is consuming an agent's stream and reacting to different event types to build a user interface or log agent activity.

```typescript
import { Agent, toStreamableAgent } from 'yaaf';

// Assume 'agent' is a configured YAAF Agent instance
const streamableAgent = toStreamableAgent(agent);

async function renderAgentResponse(input: string) {
  const stream = streamableAgent.runStream(input);

  for await (const event of stream) {
    switch (event.type) {
      case 'text_delta':
        // Append text chunks to the UI as they arrive
        process.stdout.write(event.text);
        break;

      case 'tool_call_start':
        console.log(`\n[TOOL] Calling ${event.toolName} with args:`, event.args);
        break;

      case 'tool_call_end':
        if (event.error) {
          console.error(`\n[TOOL] Error in ${event.toolName}:`, event.error);
        } else {
          console.log(`\n[TOOL] ${event.toolName} finished in ${event.durationMs}ms.`);
        }
        break;

      case 'usage':
        console.log(
          `\n[USAGE] Tokens: ${event.promptTokens} prompt, ${event.completionTokens} completion.`
        );
        break;

      case 'done':
        console.log('\n\n[DONE] Agent finished.');
        // The `event.text` contains the full, final message.
        break;
    }
  }
}

renderAgentResponse("What is the weather in Tokyo?");
```

## See Also

*   `StreamableAgent`: The interface that runtime harnesses expect, which uses `RuntimeStreamEvent`.
*   `toStreamableAgent`: A utility function that wraps a standard `Agent` to make it compatible with runtimes by converting its event stream.
*   `adaptStream`: The underlying async generator function that performs the event stream conversion.
*   `RunnerStreamEvent`: The more detailed, internal event type that `RuntimeStreamEvent` is adapted from.

## Sources

*   [Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/CLI-runtime.md
*   [Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/runtime/adapter.ts