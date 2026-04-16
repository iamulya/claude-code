---
title: Agent Execution
entity_type: subsystem
summary: The logical subsystem encompassing the runner, executors, and coordination logic for agentic tasks.
primary_files:
  - src/agents/runner.ts
  - src/agents/streamingExecutor.ts
exports:
  - AgentRunner
  - ChatModel
  - StreamingChatModel
  - ChatMessage
  - ToolCall
  - ToolSchema
stub: false
compiled_at: 2026-04-16T14:14:09.960Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/runner.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/hooks.ts
confidence: 0.92
---

## Purpose
The Agent Execution subsystem manages the iterative lifecycle of an LLM-powered agent. It provides a provider-agnostic execution loop that coordinates communication between Large Language Models (LLMs) and executable tools. The subsystem is designed to handle the complexities of parsing tool calls, managing conversation state, executing tools concurrently, and feeding results back to the model until a final response is generated.

## Architecture
The subsystem is centered around the `AgentRunner`, which acts as the primary driver for the agentic loop. It is designed to be LLM-agnostic, relying on standardized interfaces to interact with various model providers.

### Key Components
- **AgentRunner**: The core class that orchestrates the LLM ↔ Tool loop. It manages input validation, tool result budgeting, and the transition between LLM generations and tool executions.
- **ChatModel / StreamingChatModel**: Interfaces that abstract LLM providers (such as OpenAI, Gemini, or Ollama). They use an OpenAI-compatible message and tool schema to ensure interoperability.
- **StreamingToolExecutor**: A specialized component used by the runner to handle the execution of tools, supporting both standard and streaming workflows.
- **Hooks System**: A lifecycle management mechanism that allows for intercepting, modifying, or blocking execution at specific stages of the loop.

### Execution Flow
The standard execution flow within the `AgentRunner` follows a specific sequence:
1. **Input**: Receive user message and initialize context.
2. **Pre-LLM**: Trigger `beforeLLM` hooks.
3. **LLM Inference**: Call the `ChatModel` to generate a response or tool calls.
4. **Post-LLM**: Trigger `afterLLM` hooks.
5. **Tool Execution Loop**: For each requested tool call:
    - Perform permission and access policy checks.
    - Trigger `beforeToolCall` hooks.
    - Execute the tool within a `Sandbox`.
    - Trigger `afterToolCall` hooks.
6. **Iteration**: Feed tool results back to the LLM and repeat until the model provides a final text response.

## Integration Points
The Agent Execution subsystem serves as a coordination layer for several other framework components:
- **Tools & Sandboxes**: The runner identifies tools by name and executes them within isolated environments.
- **Security (IAM & Permissions)**: Execution is subject to `PermissionPolicy` and `AccessPolicy` checks before any tool is invoked.
- **Context Management**: The runner utilizes a `ContextManager` to maintain the conversation history and state across iterations.
- **Observability**: Model identifiers and execution steps are propagated to OpenTelemetry (OTel) spans for tracing.

## Key APIs
The subsystem exposes several critical interfaces and classes for driving agent behavior:

### AgentRunner
The primary entry point for executing agent tasks.
- `run(input: string)`: A method that executes the full agent loop and returns a final response.
- `runStream(input: string)`: An async generator that yields events (such as text deltas or tool call updates) for progressive UI updates.

### ChatModel & StreamingChatModel
Interfaces for implementing LLM providers.
- `complete(params)`: Sends messages and tool schemas to the LLM for a non-streaming completion.
- `stream(params)`: Returns an async generator of `ChatDelta` objects for streaming responses.

### Hook Interfaces
Types used to define lifecycle callbacks:
- `HookContext`: Provides the tool name, arguments, full message history, and current iteration count to a hook.
- `HookResult`: Determines whether the execution should `continue` or take alternative actions (e.g., `block`).

## Extension Points
Developers can extend the behavior of the Agent Execution subsystem through several mechanisms:

- **Custom ChatModels**: By implementing the `ChatModel` or `StreamingChatModel` interfaces, developers can add support for new LLM providers or local models.
- **Lifecycle Hooks**: Hooks can be registered to intercept execution. Unlike read-only events, hooks are functional and can block execution (e.g., awaiting user confirmation for sensitive tool calls) or modify the data passing through the loop.
- **Retry Logic**: The runner utilizes a `RetryConfig` to manage transient failures during LLM or tool interactions.
- **Tool Result Budgeting**: Developers can configure `ToolResultBudgetConfig` to limit the volume of data returned by tools to the LLM, preventing context window overflow.