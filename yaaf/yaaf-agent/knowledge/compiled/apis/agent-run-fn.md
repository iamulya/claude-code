---
title: AgentRunFn
entity_type: api
summary: A type definition for the execution loop of an agent, provided by framework consumers to wrap LLM logic.
export_name: AgentRunFn
source_file: src/agents/orchestrator.ts
category: type
stub: false
compiled_at: 2026-04-16T14:13:52.030Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/orchestrator.ts
confidence: 1
---

## Overview
`AgentRunFn` is a core type definition in the YAAF orchestrator system. It defines the functional contract that framework consumers must implement to provide the execution logic for an agent. 

This type allows the framework to remain provider-agnostic; while YAAF manages agent lifecycles, tool distribution, and communication via the `AgentOrchestrator`, the actual LLM query loop and decision-making logic are encapsulated within an implementation of `AgentRunFn`.

## Signature / Constructor
```typescript
export type AgentRunFn = (params: {
  identity: AgentIdentity
  definition: AgentDefinition
  prompt: string
  tools: readonly Tool[]
  signal: AbortSignal
  mailbox: Mailbox
  /** Send a message back to the leader */
  sendToLeader: (text: string, summary?: string) => Promise<void>
}) => Promise<{ success: boolean; error?: string }>
```

### Parameters
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `identity` | `AgentIdentity` | The unique identity information for the specific agent instance. |
| `definition` | `AgentDefinition` | The configuration and metadata defining the agent's role or type. |
| `prompt` | `string` | The initial instruction or task description the agent is expected to execute. |
| `tools` | `readonly Tool[]` | A collection of tools available for the agent to invoke during its run. |
| `signal` | `AbortSignal` | A standard signal used to communicate cancellation or timeouts to the agent loop. |
| `mailbox` | `Mailbox` | A communication interface for receiving messages from other agents or the orchestrator. |
| `sendToLeader` | `Function` | An asynchronous callback used to transmit status updates or results back to the coordinator agent. |

### Return Value
The function returns a `Promise` resolving to an object containing:
* `success`: A boolean indicating if the task was completed successfully.
* `error`: An optional string containing error details if the execution failed.

## Examples
The following example demonstrates implementing an `AgentRunFn` and passing it to an orchestrator.

```typescript
const myAgentRunLogic: AgentRunFn = async ({ 
  identity, 
  prompt, 
  tools, 
  signal, 
  sendToLeader 
}) => {
  try {
    // Implementation of the LLM agent loop
    const result = await myLLMProvider.chat({
      systemPrompt: `You are ${identity.name}`,
      userPrompt: prompt,
      tools: tools,
      abortSignal: signal
    });

    // Report progress or final result back to the leader
    await sendToLeader(result.content, 'Task complete');

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const orchestrator = new AgentOrchestrator({
  mailboxDir: '/tmp/agent-teams',
  defaultTeam: 'engineering',
  runAgent: myAgentRunLogic,
});
```

## See Also
* `AgentOrchestrator`
* `Mailbox`
* `Tool`