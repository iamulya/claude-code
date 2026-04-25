---
summary: A type representing a request for an LLM agent to invoke a specific tool with provided arguments.
export_name: ToolCall
source_file: src/agents/runner.js
category: type
title: ToolCall
entity_type: api
search_terms:
 - LLM function calling
 - agent tool invocation
 - model tool use request
 - what is a tool call
 - tool call arguments
 - tool call id
 - agent action request
 - structured output for tools
 - how agents use tools
 - pending tool call
 - tool execution
 - invoke a function
stub: false
compiled_at: 2026-04-25T00:15:54.894Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/thread.ts
compiled_from_quality: unknown
confidence: 0.8
---

## Overview

`ToolCall` is a data structure that represents a request from an LLM for an agent to invoke a specific tool with a given set of arguments. It is a fundamental component of the [Tool Calls](../concepts/tool-calls.md) concept in YAAF, enabling agents to perform actions and interact with external systems.

When an [AgentRunner](./agent-runner.md) processes a message, the underlying LLM may respond with one or more `ToolCall` objects instead of a final text answer. This indicates the agent should execute the specified tool(s) to gather more information or perform a task.

The `ToolCall` is also central to the agent's suspension mechanism. As seen in the `SuspendReason` type, if a tool requires manual approval before execution, the agent's state (the `AgentThread`) is suspended with the `pendingToolCall` that triggered the suspension [Source 1].

## Signature

The `ToolCall` type is exported from `src/agents/runner.js`. Its specific definition is not available in the provided source materials, but its usage can be seen within the `SuspendReason` type from `src/agents/thread.ts` [Source 1].

It is imported as follows:
```typescript
// Source: src/agents/thread.ts
import type { ChatMessage, ToolCall } from "./runner.js";
```

Its role is to identify a tool that the LLM wishes to execute. In the context of a suspended thread awaiting approval, the `ToolCall` object is provided alongside its parsed arguments and a message explaining the need for approval [Source 1].

```typescript
// Source: src/agents/thread.ts
export type SuspendReason =
  | {
      type: "awaiting_approval";
      /** The tool call the LLM requested that requires approval */
      pendingToolCall: ToolCall;
      /** Parsed arguments */
      args: Record<string, unknown>;
      /** Human-readable reason (from the tool's requiresApproval setting) */
      message: string;
    };
```

## Examples

The following example illustrates how to handle a `ToolCall` that is part of an `AgentThread`'s `suspended` property. This pattern is common for implementing approval workflows for sensitive tools.

```typescript
import type { AgentThread, SuspendReason } from 'yaaf';

function handleSuspendedThread(thread: AgentThread) {
  if (thread.suspended?.type === 'awaiting_approval') {
    // The type guard confirms thread.suspended is a SuspendReason of the 'awaiting_approval' variant.
    const suspensionInfo = thread.suspended;
    
    // The pendingToolCall is of type ToolCall.
    const pendingToolCall: ToolCall = suspensionInfo.pendingToolCall;
    const toolArgs = suspensionInfo.args;
    const reasonMessage = suspensionInfo.message;

    console.log(`Approval required: ${reasonMessage}`);
    
    // Although the exact structure of ToolCall is not detailed in the source,
    // it can be logged or passed to other systems.
    console.log(`Tool call details:`, pendingToolCall);
    console.log(`Arguments:`, toolArgs);

    // This is where logic to send the request for human review would be implemented,
    // for example, by creating a ticket or sending a message to a Slack channel.
  }
}
```

## See Also

*   [Tool Calls](../concepts/tool-calls.md): The conceptual guide explaining how agents use tools.
*   [AgentRunner](./agent-runner.md): The class responsible for executing agents and handling `ToolCall` requests from the LLM.
*   `AgentThread`: The serializable state of an agent conversation, which can be suspended due to a `ToolCall` requiring approval.

## Sources

[Source 1]: src/agents/thread.ts